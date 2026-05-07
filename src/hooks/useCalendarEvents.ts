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
  linked_user_ids: string[];
  is_shared: boolean;
  created_by_name: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  contact_name?: string;
  employee_name?: string;
  linked_users_names?: string[];
  creator_name?: string;
  creator_color?: string;
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
  linked_user_ids?: string[];
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
      // Limit to a ±2 year window: there can be thousands of events in DB
      // and Supabase caps results at 1000 by default, which would otherwise
      // hide newly-created events behind the oldest ones.
      const now = new Date();
      const windowStart = new Date(now.getFullYear() - 2, 0, 1).toISOString();
      const windowEnd = new Date(now.getFullYear() + 2, 11, 31).toISOString();

      const { data, error } = await supabase
        .from('calendar_events')
        .select('*')
        .gte('start_datetime', windowStart)
        .lte('start_datetime', windowEnd)
        .order('start_datetime', { ascending: false })
        .limit(1000);

      if (error) throw error;

      const rawEvents = data || [];
      const contactIds = Array.from(new Set(rawEvents.map((e: any) => e.contact_id).filter(Boolean)));
      const employeeIds = Array.from(new Set(rawEvents.map((e: any) => e.employee_id).filter(Boolean)));
      const linkedUserIds = Array.from(
        new Set(rawEvents.flatMap((e: any) => (e.linked_user_ids || []) as string[]).filter(Boolean))
      );
      const creatorIds = Array.from(
        new Set(rawEvents.map((e: any) => e.user_id).filter(Boolean))
      );
      const allProfileIds = Array.from(new Set([...linkedUserIds, ...creatorIds]));

      const [contactsRes, employeesRes, profilesRes] = await Promise.all([
        contactIds.length
          ? supabase.from('crm_contacts').select('id, name, company').in('id', contactIds)
          : Promise.resolve({ data: [], error: null }),
        employeeIds.length
          ? supabase.from('crm_employees').select('id, first_name, last_name').in('id', employeeIds)
          : Promise.resolve({ data: [], error: null }),
        allProfileIds.length
          ? supabase.from('profiles').select('id, full_name, calendar_color').in('id', allProfileIds)
          : Promise.resolve({ data: [], error: null }),
      ]);

      if (contactsRes.error) throw contactsRes.error;
      if (employeesRes.error) throw employeesRes.error;
      if (profilesRes.error) throw profilesRes.error;

      const contactsById = new Map((contactsRes.data || []).map((contact: any) => [contact.id, contact]));
      const employeesById = new Map((employeesRes.data || []).map((employee: any) => [employee.id, employee]));
      const profilesById = new Map((profilesRes.data || []).map((p: any) => [p.id, p]));

      const mapped: CalendarEvent[] = rawEvents.map((e: any) => {
        const contact = e.contact_id ? contactsById.get(e.contact_id) : null;
        const employee = e.employee_id ? employeesById.get(e.employee_id) : null;
        const creator: any = e.user_id ? profilesById.get(e.user_id) : null;

        return {
          ...e,
          contact_name: contact ? (contact.company || contact.name) : null,
          employee_name: employee ? `${employee.first_name} ${employee.last_name}` : null,
          linked_users_names: ((e.linked_user_ids || []) as string[])
            .map((uid) => profilesById.get(uid)?.full_name)
            .filter(Boolean) as string[],
          creator_name: creator?.full_name || e.created_by_name || null,
          creator_color: creator?.calendar_color || null,
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

  // Realtime: aggiorna automaticamente quando un altro utente crea/modifica/elimina eventi
  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel('calendar_events_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'calendar_events' },
        () => {
          fetchEvents();
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, fetchEvents]);

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
