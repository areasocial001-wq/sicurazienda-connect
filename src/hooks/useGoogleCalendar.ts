import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface GoogleCalendarEvent {
  id: string;
  title: string;
  description: string;
  start: string;
  end: string;
  allDay: boolean;
  location: string;
}

export function useGoogleCalendar(userId: string | undefined) {
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [events, setEvents] = useState<GoogleCalendarEvent[]>([]);

  const checkConnection = useCallback(async () => {
    if (!userId) {
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('google-calendar-sync', {
        body: { action: 'check_connection', userId },
      });

      if (error) throw error;
      setIsConnected(data?.connected || false);
    } catch (error) {
      console.log('Not connected to Google Calendar');
      setIsConnected(false);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    checkConnection();
  }, [checkConnection]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'GOOGLE_CALENDAR_SUCCESS') {
        toast.success('Google Calendar collegato con successo!');
        setIsConnected(true);
        checkConnection();
      } else if (event.data?.type === 'GOOGLE_CALENDAR_ERROR') {
        toast.error(`Errore: ${event.data.error}`);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [checkConnection]);

  const connect = async () => {
    if (!userId) {
      toast.error('Devi essere autenticato');
      return;
    }

    try {
      const redirectUri = `https://obzflzotzvwlmgyjxfpv.supabase.co/functions/v1/google-calendar-callback`;
      
      const { data, error } = await supabase.functions.invoke('google-calendar-auth', {
        body: { action: 'get_auth_url', userId, redirectUri },
      });

      if (error) throw error;

      if (data?.authUrl) {
        // Open popup for OAuth
        const popup = window.open(
          data.authUrl,
          'Google Calendar Login',
          'width=500,height=600,scrollbars=yes'
        );

        if (!popup) {
          toast.error('Popup bloccato. Abilita i popup per questo sito.');
        }
      }
    } catch (error) {
      console.error('Error connecting:', error);
      toast.error('Errore durante la connessione');
    }
  };

  const disconnect = async () => {
    if (!userId) return;

    try {
      const { error } = await supabase.functions.invoke('google-calendar-sync', {
        body: { action: 'disconnect', userId },
      });

      if (error) throw error;

      setIsConnected(false);
      setEvents([]);
      toast.success('Google Calendar disconnesso');
    } catch (error) {
      console.error('Error disconnecting:', error);
      toast.error('Errore durante la disconnessione');
    }
  };

  const fetchEvents = async (): Promise<GoogleCalendarEvent[]> => {
    if (!userId || !isConnected) return [];

    try {
      // Add timeout to prevent hanging
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout

      const { data, error } = await supabase.functions.invoke('google-calendar-sync', {
        body: { action: 'list_events', userId },
      });

      clearTimeout(timeoutId);

      if (error) {
        console.error('Supabase function error:', error);
        throw error;
      }

      if (data?.needsAuth) {
        setIsConnected(false);
        toast.error('Sessione Google scaduta, riconnetti');
        return [];
      }

      if (data?.error) {
        console.error('Google API error:', data.error);
        throw new Error(data.error);
      }

      const fetchedEvents = data?.events || [];
      setEvents(fetchedEvents);
      
      if (fetchedEvents.length > 0) {
        toast.success(`${fetchedEvents.length} eventi importati`);
      } else {
        toast.info('Nessun evento nei prossimi 30 giorni');
      }
      
      return fetchedEvents;
    } catch (error: any) {
      console.error('Error fetching events:', error);
      
      if (error.name === 'AbortError') {
        toast.error('Timeout: riprova più tardi');
      } else {
        toast.error('Errore nel recupero eventi. Verifica la connessione.');
      }
      return [];
    }
  };

  const exportFollowups = async () => {
    if (!userId || !isConnected) {
      toast.error('Connetti prima Google Calendar');
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('google-calendar-sync', {
        body: { action: 'export_followups', userId },
      });

      if (error) throw error;

      if (data?.needsAuth) {
        setIsConnected(false);
        toast.error('Sessione scaduta, riconnetti Google Calendar');
        return;
      }

      toast.success(data?.message || 'Follow-up esportati');
    } catch (error) {
      console.error('Error exporting:', error);
      toast.error('Errore durante l\'esportazione');
    }
  };

  const createEvent = async (event: Omit<GoogleCalendarEvent, 'id'>) => {
    if (!userId || !isConnected) {
      toast.error('Connetti prima Google Calendar');
      return null;
    }

    try {
      const { data, error } = await supabase.functions.invoke('google-calendar-sync', {
        body: { action: 'create_event', userId, event },
      });

      if (error) throw error;

      if (data?.needsAuth) {
        setIsConnected(false);
        toast.error('Sessione scaduta, riconnetti Google Calendar');
        return null;
      }

      toast.success('Evento creato su Google Calendar');
      return data?.eventId;
    } catch (error) {
      console.error('Error creating event:', error);
      toast.error('Errore nella creazione evento');
      return null;
    }
  };

  return {
    isConnected,
    isLoading,
    events,
    connect,
    disconnect,
    fetchEvents,
    exportFollowups,
    createEvent,
  };
}
