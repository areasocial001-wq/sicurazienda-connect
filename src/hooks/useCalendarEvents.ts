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
  const [initialLoad, setInitialLoad] = useState(true);

  const fetchEvents = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('calendar_events')
        .select('*')
        .order('start_datetime', { ascending: true });

      if (error) throw error;

      const rawEvents = data || [];
      const contactIds = Array.from(new Set(rawEvents.map((e: any) => e.contact_id).filter(Boolean)));
      const employeeIds = Array.from(new Set(rawEvents.map((e: any) => e.employee_id).filter(Boolean)));

      const [contactsRes, employeesRes] = await Promise.all([
        contactIds.length
          ? supabase.from('crm_contacts').select('id, name, company').in('id', contactIds)
          : Promise.resolve({ data: [], error: null }),
        employeeIds.length
          ? supabase.from('crm_employees').select('id, first_name, last_name').in('id', employeeIds)
          : Promise.resolve({ data: [], error: null }),
      ]);

      if (contactsRes.error) throw contactsRes.error;
      if (employeesRes.error) throw employeesRes.error;

      const contactsById = new Map((contactsRes.data || []).map((contact: any) => [contact.id, contact]));
      const employeesById = new Map((employeesRes.data || []).map((employee: any) => [employee.id, employee]));

      const mapped: CalendarEvent[] = rawEvents.map((e: any) => {
        const contact = e.contact_id ? contactsById.get(e.contact_id) : null;
        const employee = e.employee_id ? employeesById.get(e.employee_id) : null;

        return {
          ...e,
          contact_name: contact ? (contact.company || contact.name) : null,
          employee_name: employee ? `${employee.first_name} ${employee.last_name}` : null,
        };
      });

      setEvents(mapped);
    } catch (error: any) {
      console.error('Error fetching calendar events:', error);
      toast.error('Errore nel caricamento del calendario');
    } finally {
      setLoading(false);
      setInitialLoad(false);
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
    loading: initialLoad,
    refreshing: loading,
    fetchEvents,
    createEvent,
    updateEvent,
    deleteEvent,
  };
}
