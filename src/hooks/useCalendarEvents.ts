import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface CalendarEvent {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  start_datetime: string;
  end_datetime: string;
  all_day: boolean;
  location: string | null;
  color: string;
  category: string;
  contact_id: string | null;
  employee_id: string | null;
  is_shared: boolean;
  created_by_name: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  contact_name?: string;
  employee_name?: string;
}

export interface CalendarEventInput {
  title: string;
  description?: string;
  start_datetime: string;
  end_datetime: string;
  all_day?: boolean;
  location?: string;
  color?: string;
  category?: string;
  contact_id?: string | null;
  employee_id?: string | null;
  is_shared?: boolean;
}

export function useCalendarEvents(userId: string | undefined) {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchEvents = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('calendar_events')
        .select(`
          *,
          crm_contacts:contact_id(name, company),
          crm_employees:employee_id(first_name, last_name)
        `)
        .order('start_datetime', { ascending: true });

      if (error) throw error;

      const mapped: CalendarEvent[] = (data || []).map((e: any) => ({
        ...e,
        contact_name: e.crm_contacts
          ? (e.crm_contacts.company || e.crm_contacts.name)
          : null,
        employee_name: e.crm_employees
          ? `${e.crm_employees.first_name} ${e.crm_employees.last_name}`
          : null,
      }));

      setEvents(mapped);
    } catch (error: any) {
      console.error('Error fetching calendar events:', error);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const createEvent = async (input: CalendarEventInput) => {
    if (!userId) return null;
    try {
      // Get user's name
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', userId)
        .single();

      const { data, error } = await supabase
        .from('calendar_events')
        .insert({
          ...input,
          user_id: userId,
          created_by_name: profile?.full_name || null,
        })
        .select()
        .single();

      if (error) throw error;
      toast.success('Evento creato');
      await fetchEvents();
      return data;
    } catch (error: any) {
      console.error('Error creating event:', error);
      toast.error('Errore nella creazione dell\'evento');
      return null;
    }
  };

  const updateEvent = async (id: string, input: Partial<CalendarEventInput>) => {
    try {
      const { error } = await supabase
        .from('calendar_events')
        .update(input)
        .eq('id', id);

      if (error) throw error;
      toast.success('Evento aggiornato');
      await fetchEvents();
    } catch (error: any) {
      console.error('Error updating event:', error);
      toast.error('Errore nell\'aggiornamento');
    }
  };

  const deleteEvent = async (id: string) => {
    try {
      const { error } = await supabase
        .from('calendar_events')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Evento eliminato');
      await fetchEvents();
    } catch (error: any) {
      console.error('Error deleting event:', error);
      toast.error('Errore nell\'eliminazione');
    }
  };

  return {
    events,
    loading,
    fetchEvents,
    createEvent,
    updateEvent,
    deleteEvent,
  };
}
