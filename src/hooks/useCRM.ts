import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';

export interface CRMContact {
  id: string;
  user_id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  company?: string | null;
  role?: string | null;
  status: string;
  source?: string | null;
  notes?: string | null;
  tags?: string[] | null;
  last_contact_at?: string | null;
  next_followup_at?: string | null;
  created_at: string;
  updated_at: string;
  // Additional fields from database
  address?: string | null;
  client_user_id?: string | null;
  code?: string | null;
  rating?: string | null;
  owner_name?: string | null;
  website?: string | null;
  vat_number?: string | null;
  fiscal_code?: string | null;
  pec?: string | null;
  sdi_code?: string | null;
}

export interface CRMInteraction {
  id: string;
  contact_id: string;
  user_id: string;
  type: 'call' | 'email' | 'meeting' | 'note' | 'task';
  subject: string;
  description?: string;
  scheduled_at?: string;
  completed_at?: string;
  created_at: string;
}

export function useCRM() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [contacts, setContacts] = useState<CRMContact[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState({ loaded: 0, total: 0 });
  const [aiProcessing, setAiProcessing] = useState(false);

  const fetchContacts = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setLoadingProgress({ loaded: 0, total: 0 });
    try {
      // First, get total count
      const { count, error: countError } = await supabase
        .from('crm_contacts')
        .select('*', { count: 'exact', head: true });

      if (countError) throw countError;
      
      const totalCount = count || 0;
      setLoadingProgress({ loaded: 0, total: totalCount });

      // Fetch all contacts using pagination to overcome the 1000 row limit
      const allContacts: CRMContact[] = [];
      const pageSize = 1000;
      const totalPages = Math.ceil(totalCount / pageSize);
      
      for (let page = 0; page < totalPages; page++) {
        const fromIndex = page * pageSize;
        const toIndex = fromIndex + pageSize - 1;
        
        const { data, error } = await supabase
          .from('crm_contacts')
          .select('*')
          .order('updated_at', { ascending: false })
          .range(fromIndex, toIndex);

        if (error) {
          console.error(`Error fetching page ${page + 1}/${totalPages}:`, error);
          break;
        }
        
        if (data) {
          allContacts.push(...(data as CRMContact[]));
          setLoadingProgress({ loaded: allContacts.length, total: totalCount });
        }
        
        // If we got no data, stop
        if (!data || data.length === 0) {
          break;
        }
      }

      setContacts(allContacts);
    } catch (error) {
      console.error('Error fetching contacts:', error);
    } finally {
      setLoading(false);
      setLoadingProgress({ loaded: 0, total: 0 });
    }
  }, [user]);

  // Server-side search for better performance with large datasets
  const searchContacts = useCallback(async (searchTerm: string) => {
    if (!user) return [];
    if (!searchTerm.trim()) {
      return contacts;
    }
    
    try {
      const searchPattern = `%${searchTerm.toLowerCase()}%`;
      const { data, error } = await supabase
        .from('crm_contacts')
        .select('*')
        .or(`name.ilike.${searchPattern},company.ilike.${searchPattern},email.ilike.${searchPattern},phone.ilike.${searchPattern}`)
        .order('name', { ascending: true })
        .limit(500);

      if (error) throw error;
      return data as CRMContact[];
    } catch (error) {
      console.error('Error searching contacts:', error);
      return [];
    }
  }, [user, contacts]);

  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  const addContact = useCallback(async (contact: Omit<CRMContact, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
    if (!user) return null;
    try {
      const { data, error } = await supabase
        .from('crm_contacts')
        .insert({ ...contact, user_id: user.id })
        .select()
        .single();

      if (error) throw error;
      
      
      
      toast({ title: "Contatto aggiunto", description: `${contact.name} è stato aggiunto al CRM.` });
      await fetchContacts();
      return data as CRMContact;
    } catch (error: any) {
      toast({ title: "Errore", description: error.message, variant: "destructive" });
      return null;
    }
  }, [user, fetchContacts, toast]);

  const updateContact = useCallback(async (id: string, updates: Partial<CRMContact>) => {
    try {
      const { error } = await supabase
        .from('crm_contacts')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
      
      // Sync follow-up to Google Calendar if connected and follow-up date changed
      if (updates.next_followup_at && isGoogleConnected) {
        const contact = contacts.find(c => c.id === id);
        if (contact) {
          const followupDate = new Date(updates.next_followup_at);
          const endDate = new Date(followupDate.getTime() + 60 * 60 * 1000); // 1 hour duration
          
          await createGoogleEvent({
            title: `Follow-up: ${contact.name}${contact.company ? ` (${contact.company})` : ''}`,
            description: `Follow-up CRM per ${contact.name}\n${contact.notes || ''}`,
            start: followupDate.toISOString(),
            end: endDate.toISOString(),
            allDay: false,
            location: '',
          });
        }
      }
      
      toast({ title: "Contatto aggiornato" });
      await fetchContacts();
      return true;
    } catch (error: any) {
      toast({ title: "Errore", description: error.message, variant: "destructive" });
      return false;
    }
  }, [fetchContacts, toast, isGoogleConnected, createGoogleEvent, contacts]);

  const deleteContact = useCallback(async (id: string) => {
    try {
      const { error } = await supabase
        .from('crm_contacts')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      toast({ title: "Contatto eliminato" });
      await fetchContacts();
      return true;
    } catch (error: any) {
      toast({ title: "Errore", description: error.message, variant: "destructive" });
      return false;
    }
  }, [fetchContacts, toast]);

  const addInteraction = useCallback(async (interaction: Omit<CRMInteraction, 'id' | 'user_id' | 'created_at'>) => {
    if (!user) return null;
    try {
      const { data, error } = await supabase
        .from('crm_interactions')
        .insert({ ...interaction, user_id: user.id })
        .select()
        .single();

      if (error) throw error;

      // Update last_contact_at on the contact
      await supabase
        .from('crm_contacts')
        .update({ last_contact_at: new Date().toISOString() })
        .eq('id', interaction.contact_id);
      
      toast({ title: "Interazione registrata" });
      return data as CRMInteraction;
    } catch (error: any) {
      toast({ title: "Errore", description: error.message, variant: "destructive" });
      return null;
    }
  }, [user, toast]);

  const getInteractions = useCallback(async (contactId: string) => {
    try {
      const { data, error } = await supabase
        .from('crm_interactions')
        .select('*')
        .eq('contact_id', contactId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as CRMInteraction[];
    } catch (error) {
      console.error('Error fetching interactions:', error);
      return [];
    }
  }, []);

  // AI-powered functions
  const analyzeContact = useCallback(async (contactId: string) => {
    if (!user) return null;
    setAiProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke('crm-agent', {
        body: { action: 'analyze_contact', data: { contactId }, userId: user.id }
      });

      if (error) throw error;
      return data.result;
    } catch (error: any) {
      toast({ title: "Errore AI", description: error.message, variant: "destructive" });
      return null;
    } finally {
      setAiProcessing(false);
    }
  }, [user, toast]);

  const suggestFollowups = useCallback(async () => {
    if (!user) return null;
    setAiProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke('crm-agent', {
        body: { action: 'suggest_followup', data: {}, userId: user.id }
      });

      if (error) throw error;
      return data.result;
    } catch (error: any) {
      toast({ title: "Errore AI", description: error.message, variant: "destructive" });
      return null;
    } finally {
      setAiProcessing(false);
    }
  }, [user, toast]);

  const generateEmail = useCallback(async (contact: CRMContact, emailType: string, context?: string) => {
    if (!user) return null;
    setAiProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke('crm-agent', {
        body: { action: 'generate_email', data: { contact, emailType, context }, userId: user.id }
      });

      if (error) throw error;
      return data.result;
    } catch (error: any) {
      toast({ title: "Errore AI", description: error.message, variant: "destructive" });
      return null;
    } finally {
      setAiProcessing(false);
    }
  }, [user, toast]);

  return {
    contacts,
    loading,
    loadingProgress,
    aiProcessing,
    fetchContacts,
    searchContacts,
    addContact,
    updateContact,
    deleteContact,
    addInteraction,
    getInteractions,
    analyzeContact,
    suggestFollowups,
    generateEmail,
  };
}
