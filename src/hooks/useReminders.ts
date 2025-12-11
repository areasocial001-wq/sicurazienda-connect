import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';
import { addMinutes, addHours, addDays } from 'date-fns';

export interface Reminder {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  type: 'followup' | 'deadline' | 'course_expiry' | 'document_expiry' | 'custom';
  reference_id?: string;
  reference_type?: string;
  due_date: string;
  is_read: boolean;
  is_completed: boolean;
  created_at: string;
}

export type SnoozeOption = '15m' | '1h' | '3h' | '1d' | '1w';

export function useReminders() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const fetchReminders = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('reminders')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_completed', false)
        .order('due_date', { ascending: true });

      if (error) throw error;
      
      const reminderData = data as Reminder[] || [];
      setReminders(reminderData);
      setUnreadCount(reminderData.filter(r => !r.is_read).length);
    } catch (error) {
      console.error('Error fetching reminders:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchReminders();
  }, [fetchReminders]);

  // Real-time subscription for new reminders
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('reminders-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'reminders',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('Reminder change:', payload);
          fetchReminders();
          
          if (payload.eventType === 'INSERT') {
            const newReminder = payload.new as Reminder;
            // Show browser notification if supported
            if ('Notification' in window && Notification.permission === 'granted') {
              new Notification('Nuovo promemoria', {
                body: newReminder.title,
                icon: '/icon-512x512.png',
                tag: newReminder.id,
                requireInteraction: true,
              });
            }
            toast({
              title: "Nuovo promemoria",
              description: newReminder.title,
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchReminders, toast]);

  const addReminder = useCallback(async (reminder: Omit<Reminder, 'id' | 'user_id' | 'is_read' | 'is_completed' | 'created_at'>) => {
    if (!user) return null;
    try {
      const { data, error } = await supabase
        .from('reminders')
        .insert({ ...reminder, user_id: user.id })
        .select()
        .single();

      if (error) throw error;
      
      toast({ title: "Promemoria creato" });
      await fetchReminders();
      return data as Reminder;
    } catch (error: any) {
      toast({ title: "Errore", description: error.message, variant: "destructive" });
      return null;
    }
  }, [user, fetchReminders, toast]);

  const markAsRead = useCallback(async (id: string) => {
    try {
      const { error } = await supabase
        .from('reminders')
        .update({ is_read: true })
        .eq('id', id);

      if (error) throw error;
      await fetchReminders();
    } catch (error) {
      console.error('Error marking reminder as read:', error);
    }
  }, [fetchReminders]);

  const markAsCompleted = useCallback(async (id: string) => {
    try {
      const { error } = await supabase
        .from('reminders')
        .update({ is_completed: true })
        .eq('id', id);

      if (error) throw error;
      
      toast({ title: "Promemoria completato" });
      await fetchReminders();
    } catch (error: any) {
      toast({ title: "Errore", description: error.message, variant: "destructive" });
    }
  }, [fetchReminders, toast]);

  const snoozeReminder = useCallback(async (id: string, option: SnoozeOption) => {
    try {
      const now = new Date();
      let newDueDate: Date;

      switch (option) {
        case '15m':
          newDueDate = addMinutes(now, 15);
          break;
        case '1h':
          newDueDate = addHours(now, 1);
          break;
        case '3h':
          newDueDate = addHours(now, 3);
          break;
        case '1d':
          newDueDate = addDays(now, 1);
          break;
        case '1w':
          newDueDate = addDays(now, 7);
          break;
        default:
          newDueDate = addHours(now, 1);
      }

      const { error } = await supabase
        .from('reminders')
        .update({ 
          due_date: newDueDate.toISOString(),
          is_read: false 
        })
        .eq('id', id);

      if (error) throw error;
      
      const snoozeLabels: Record<SnoozeOption, string> = {
        '15m': '15 minuti',
        '1h': '1 ora',
        '3h': '3 ore',
        '1d': '1 giorno',
        '1w': '1 settimana',
      };
      
      toast({ 
        title: "Promemoria posticipato", 
        description: `Riceverai un nuovo promemoria tra ${snoozeLabels[option]}` 
      });
      await fetchReminders();
    } catch (error: any) {
      toast({ title: "Errore", description: error.message, variant: "destructive" });
    }
  }, [fetchReminders, toast]);

  const deleteReminder = useCallback(async (id: string) => {
    try {
      const { error } = await supabase
        .from('reminders')
        .delete()
        .eq('id', id);

      if (error) throw error;
      await fetchReminders();
    } catch (error) {
      console.error('Error deleting reminder:', error);
    }
  }, [fetchReminders]);

  const requestNotificationPermission = useCallback(async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        toast({ title: "Notifiche attivate", description: "Riceverai notifiche per i tuoi promemoria." });
      }
      return permission;
    }
    return 'denied';
  }, [toast]);

  return {
    reminders,
    unreadCount,
    loading,
    fetchReminders,
    addReminder,
    markAsRead,
    markAsCompleted,
    snoozeReminder,
    deleteReminder,
    requestNotificationPermission,
  };
}
