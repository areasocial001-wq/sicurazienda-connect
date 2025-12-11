import { useState, useEffect, useMemo } from 'react';
import { 
  Calendar as CalendarIcon, ArrowLeft, Loader2, Users, 
  Clock, AlertTriangle, FileText, Phone
} from 'lucide-react';
import { format, isSameDay, startOfMonth, endOfMonth, eachDayOfInterval, isToday } from 'date-fns';
import { it } from 'date-fns/locale';
import Header from '@/components/Header';
import BottomNav from '@/components/BottomNav';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useReminders } from '@/hooks/useReminders';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface CalendarEvent {
  id: string;
  title: string;
  date: Date;
  type: 'followup' | 'document_expiry' | 'course_expiry' | 'reminder';
  contactName?: string;
  contactId?: string;
  description?: string;
}

export default function CRMCalendar() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { reminders } = useReminders();
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [contacts, setContacts] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch contacts with followup dates
        const { data: contactsData } = await supabase
          .from('crm_contacts')
          .select('id, name, next_followup_at')
          .eq('user_id', user.id)
          .not('next_followup_at', 'is', null);

        // Fetch documents with expiry dates
        const { data: docsData } = await supabase
          .from('documents')
          .select('id, name, expiry_date, category')
          .eq('user_id', user.id)
          .not('expiry_date', 'is', null);

        setContacts(contactsData || []);
        setDocuments(docsData || []);
      } catch (error) {
        console.error('Error fetching calendar data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  // Build calendar events from all sources
  const events = useMemo<CalendarEvent[]>(() => {
    const allEvents: CalendarEvent[] = [];

    // Add followup events from contacts
    contacts.forEach(contact => {
      if (contact.next_followup_at) {
        allEvents.push({
          id: `followup-${contact.id}`,
          title: `Follow-up: ${contact.name}`,
          date: new Date(contact.next_followup_at),
          type: 'followup',
          contactName: contact.name,
          contactId: contact.id,
        });
      }
    });

    // Add document expiry events
    documents.forEach(doc => {
      if (doc.expiry_date) {
        const isAttestato = doc.category === 'attestato';
        allEvents.push({
          id: `doc-${doc.id}`,
          title: `Scadenza: ${doc.name}`,
          date: new Date(doc.expiry_date),
          type: isAttestato ? 'course_expiry' : 'document_expiry',
          description: isAttestato ? 'Attestato in scadenza' : 'Documento in scadenza',
        });
      }
    });

    // Add reminders
    reminders.forEach(reminder => {
      allEvents.push({
        id: `reminder-${reminder.id}`,
        title: reminder.title,
        date: new Date(reminder.due_date),
        type: 'reminder',
        description: reminder.description || undefined,
      });
    });

    return allEvents;
  }, [contacts, documents, reminders]);

  // Get events for selected date
  const selectedDateEvents = useMemo(() => {
    if (!selectedDate) return [];
    return events.filter(event => isSameDay(event.date, selectedDate));
  }, [events, selectedDate]);

  // Get days with events for highlighting
  const daysWithEvents = useMemo(() => {
    return events.map(event => event.date);
  }, [events]);

  const getEventTypeStyles = (type: CalendarEvent['type']) => {
    switch (type) {
      case 'followup':
        return 'bg-blue-500/20 text-blue-700 border-blue-500/30';
      case 'document_expiry':
        return 'bg-orange-500/20 text-orange-700 border-orange-500/30';
      case 'course_expiry':
        return 'bg-purple-500/20 text-purple-700 border-purple-500/30';
      case 'reminder':
        return 'bg-yellow-500/20 text-yellow-700 border-yellow-500/30';
      default:
        return 'bg-gray-500/20 text-gray-700 border-gray-500/30';
    }
  };

  const getEventIcon = (type: CalendarEvent['type']) => {
    switch (type) {
      case 'followup':
        return <Phone className="h-4 w-4" />;
      case 'document_expiry':
        return <FileText className="h-4 w-4" />;
      case 'course_expiry':
        return <AlertTriangle className="h-4 w-4" />;
      case 'reminder':
        return <Clock className="h-4 w-4" />;
      default:
        return <CalendarIcon className="h-4 w-4" />;
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!user) {
    navigate('/');
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto p-4 pb-24">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate('/crm')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <CalendarIcon className="h-6 w-6 text-primary" />
              Calendario CRM
            </h1>
            <p className="text-muted-foreground text-sm">
              Follow-up e scadenze programmate
            </p>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Calendar */}
          <Card className="lg:col-span-2">
            <CardContent className="p-4">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                month={currentMonth}
                onMonthChange={setCurrentMonth}
                locale={it}
                className="pointer-events-auto w-full"
                modifiers={{
                  hasEvent: daysWithEvents,
                }}
                modifiersStyles={{
                  hasEvent: {
                    fontWeight: 'bold',
                    backgroundColor: 'hsl(var(--primary) / 0.1)',
                    borderRadius: '50%',
                  },
                }}
                classNames={{
                  months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0 w-full",
                  month: "space-y-4 w-full",
                  table: "w-full border-collapse",
                  head_row: "flex w-full justify-around",
                  head_cell: "text-muted-foreground rounded-md w-12 font-normal text-[0.8rem]",
                  row: "flex w-full mt-2 justify-around",
                  cell: "h-12 w-12 text-center text-sm p-0 relative",
                  day: "h-12 w-12 p-0 font-normal aria-selected:opacity-100 hover:bg-accent rounded-md",
                  day_selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground",
                  day_today: "bg-accent text-accent-foreground",
                }}
              />
            </CardContent>
          </Card>

          {/* Events for selected date */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                {selectedDate 
                  ? format(selectedDate, 'd MMMM yyyy', { locale: it })
                  : 'Seleziona una data'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                {selectedDateEvents.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <CalendarIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>Nessun evento per questa data</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {selectedDateEvents.map((event) => (
                      <Card 
                        key={event.id} 
                        className={cn(
                          "cursor-pointer hover:shadow-md transition-shadow",
                          event.contactId && "cursor-pointer"
                        )}
                        onClick={() => event.contactId && navigate(`/crm`)}
                      >
                        <CardContent className="p-3">
                          <div className="flex items-start gap-3">
                            <div className={cn(
                              "p-2 rounded-md",
                              getEventTypeStyles(event.type)
                            )}>
                              {getEventIcon(event.type)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm truncate">{event.title}</p>
                              {event.description && (
                                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                  {event.description}
                                </p>
                              )}
                              <Badge 
                                variant="outline" 
                                className={cn("mt-2 text-xs", getEventTypeStyles(event.type))}
                              >
                                {event.type === 'followup' && 'Follow-up'}
                                {event.type === 'document_expiry' && 'Scadenza Doc'}
                                {event.type === 'course_expiry' && 'Scadenza Corso'}
                                {event.type === 'reminder' && 'Promemoria'}
                              </Badge>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* Legend */}
        <Card className="mt-6">
          <CardContent className="pt-4">
            <p className="text-sm font-medium mb-3">Legenda</p>
            <div className="flex flex-wrap gap-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-blue-500" />
                <span className="text-sm text-muted-foreground">Follow-up</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-orange-500" />
                <span className="text-sm text-muted-foreground">Scadenza Documento</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-purple-500" />
                <span className="text-sm text-muted-foreground">Scadenza Corso</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-yellow-500" />
                <span className="text-sm text-muted-foreground">Promemoria</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>

      <BottomNav />
    </div>
  );
}
