import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';
import { useGoogleCalendar } from './useGoogleCalendar';

export interface CRMContact {
  id: string;
  user_id: string;
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  role?: string;
  status: 'lead' | 'prospect' | 'client' | 'inactive';
  source?: string;
  notes?: string;
  tags?: string[];
  last_contact_at?: string;
  next_followup_at?: string;
  created_at: string;
  updated_at: string;
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
  const { isConnected: isGoogleConnected, createEvent: createGoogleEvent } = useGoogleCalendar(user?.id);
  const [contacts, setContacts] = useState<CRMContact[]>([]);
  const [loading, setLoading] = useState(false);
  const [aiProcessing, setAiProcessing] = useState(false);

  const fetchContacts = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      // Fetch all contacts using pagination to overcome the 1000 row limit
      const allContacts: CRMContact[] = [];
      const pageSize = 1000;
      let page = 0;
      let hasMore = true;

      while (hasMore) {
        const { data, error } = await supabase
          .from('crm_contacts')
          .select('*')
          .eq('user_id', user.id)
          .order('updated_at', { ascending: false })
          .range(page * pageSize, (page + 1) * pageSize - 1);

        if (error) throw error;
        
        if (data && data.length > 0) {
          allContacts.push(...(data as CRMContact[]));
          hasMore = data.length === pageSize;
          page++;
        } else {
          hasMore = false;
        }
      }

      setContacts(allContacts);
    } catch (error) {
      console.error('Error fetching contacts:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

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
      
      // Sync follow-up to Google Calendar if connected
      if (contact.next_followup_at && isGoogleConnected) {
        const followupDate = new Date(contact.next_followup_at);
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
      
      toast({ title: "Contatto aggiunto", description: `${contact.name} è stato aggiunto al CRM.` });
      await fetchContacts();
      return data as CRMContact;
    } catch (error: any) {
      toast({ title: "Errore", description: error.message, variant: "destructive" });
      return null;
    }
  }, [user, fetchContacts, toast, isGoogleConnected, createGoogleEvent]);

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
    aiProcessing,
    fetchContacts,
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
