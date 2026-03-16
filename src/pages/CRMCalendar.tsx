import { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Calendar as CalendarIcon, ArrowLeft, Loader2, Users, 
  Clock, AlertTriangle, FileText, Phone, GripVertical,
  LayoutGrid, CalendarDays, Link2
} from 'lucide-react';
import { format, isSameDay } from 'date-fns';
import { it } from 'date-fns/locale';
import Header from '@/components/Header';
import BottomNav from '@/components/BottomNav';
import GoogleCalendarSync from '@/components/GoogleCalendarSync';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useReminders } from '@/hooks/useReminders';
import { useGoogleCalendar } from '@/hooks/useGoogleCalendar';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { CRMWeeklyCalendar } from '@/components/CRMWeeklyCalendar';

interface CalendarEvent {
  id: string;
  title: string;
  date: Date;
  type: 'followup' | 'document_expiry' | 'course_expiry' | 'reminder' | 'google_calendar' | 'course_edition';
  contactName?: string;
  contactId?: string;
  documentId?: string;
  description?: string;
  draggable: boolean;
  time?: string;
}

type CalendarView = 'month' | 'week';

export default function CRMCalendar() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { reminders } = useReminders();
  const { isConnected: googleConnected, events: googleEvents, fetchEvents: fetchGoogleEvents } = useGoogleCalendar(user?.id);
  const [loading, setLoading] = useState(true);
  const [calendarView, setCalendarView] = useState<CalendarView>('month');
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [contacts, setContacts] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [draggedEvent, setDraggedEvent] = useState<CalendarEvent | null>(null);
  const [courseEditions, setCourseEditions] = useState<any[]>([]);

  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      // Fetch contacts with followup dates
      const { data: contactsData } = await supabase
        .from('crm_contacts')
        .select('id, name, next_followup_at')
        .not('next_followup_at', 'is', null);

      // Fetch documents with expiry dates
      const { data: docsData } = await supabase
        .from('documents')
        .select('id, name, expiry_date, category')
        .eq('user_id', user.id)
        .not('expiry_date', 'is', null);

      // Fetch course editions with dates
      const { data: editionsData } = await supabase
        .from('course_editions')
        .select('id, edition_code, start_date, end_date, location, status, course:courses(name)')
        .in('status', ['pianificata', 'in_corso']);

      setContacts(contactsData || []);
      setDocuments(docsData || []);
      setCourseEditions(editionsData || []);
    } catch (error) {
      console.error('Error fetching calendar data:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchData();
    if (googleConnected) {
      fetchGoogleEvents();
    }
  }, [fetchData, googleConnected, fetchGoogleEvents]);

  // Build calendar events from all sources
  const events = useMemo<CalendarEvent[]>(() => {
    const allEvents: CalendarEvent[] = [];

    // Add followup events from contacts (draggable)
    contacts.forEach(contact => {
      if (contact.next_followup_at) {
        const followupDate = new Date(contact.next_followup_at);
        allEvents.push({
          id: `followup-${contact.id}`,
          title: `Follow-up: ${contact.name}`,
          date: followupDate,
          type: 'followup',
          contactName: contact.name,
          contactId: contact.id,
          draggable: true,
          time: format(followupDate, 'HH:mm'),
        });
      }
    });

    // Add document expiry events (not draggable - system dates)
    documents.forEach(doc => {
      if (doc.expiry_date) {
        const isAttestato = doc.category === 'attestato';
        allEvents.push({
          id: `doc-${doc.id}`,
          title: `Scadenza: ${doc.name}`,
          date: new Date(doc.expiry_date),
          type: isAttestato ? 'course_expiry' : 'document_expiry',
          description: isAttestato ? 'Attestato in scadenza' : 'Documento in scadenza',
          documentId: doc.id,
          draggable: false,
        });
      }
    });

    // Add reminders (not draggable for now)
    reminders.forEach(reminder => {
      allEvents.push({
        id: `reminder-${reminder.id}`,
        title: reminder.title,
        date: new Date(reminder.due_date),
        type: 'reminder',
        description: reminder.description || undefined,
        draggable: false,
      });
    });

    // Add Google Calendar events (not draggable - external)
    googleEvents.forEach(gEvent => {
      const eventDate = new Date(gEvent.start);
      allEvents.push({
        id: `google-${gEvent.id}`,
        title: gEvent.title,
        date: eventDate,
        type: 'google_calendar',
        description: gEvent.description || undefined,
        draggable: false,
        time: gEvent.allDay ? undefined : format(eventDate, 'HH:mm'),
      });
    });

    // Add course editions
    courseEditions.forEach(ed => {
      if (ed.start_date) {
        const courseName = (ed.course as any)?.name || 'Corso';
        allEvents.push({
          id: `course-${ed.id}`,
          title: `📚 ${courseName}${ed.edition_code ? ` (${ed.edition_code})` : ''}`,
          date: new Date(ed.start_date),
          type: 'course_edition',
          description: `${ed.location || ''} ${ed.status === 'in_corso' ? '• In corso' : '• Pianificata'}`.trim(),
          draggable: false,
        });
      }
      if (ed.end_date && ed.end_date !== ed.start_date) {
        const courseName = (ed.course as any)?.name || 'Corso';
        allEvents.push({
          id: `course-end-${ed.id}`,
          title: `📚 Fine: ${courseName}`,
          date: new Date(ed.end_date),
          type: 'course_edition',
          description: 'Fine corso',
          draggable: false,
        });
      }
    });

    return allEvents;
  }, [contacts, documents, reminders, googleEvents, courseEditions]);

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
      case 'course_edition':
        return 'bg-indigo-500/20 text-indigo-700 border-indigo-500/30';
      case 'reminder':
        return 'bg-yellow-500/20 text-yellow-700 border-yellow-500/30';
      case 'google_calendar':
        return 'bg-green-500/20 text-green-700 border-green-500/30';
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
      case 'course_edition':
        return <CalendarIcon className="h-4 w-4" />;
      case 'reminder':
        return <Clock className="h-4 w-4" />;
      case 'google_calendar':
        return <Link2 className="h-4 w-4" />;
      default:
        return <CalendarIcon className="h-4 w-4" />;
    }
  };

  // Drag and drop handlers
  const handleDragStart = (event: CalendarEvent) => {
    if (!event.draggable) return;
    setDraggedEvent(event);
  };

  const handleDragEnd = () => {
    setDraggedEvent(null);
  };

  const handleDateSelect = async (date: Date | undefined) => {
    if (draggedEvent && date && draggedEvent.draggable) {
      // Move the event to the new date
      try {
        if (draggedEvent.type === 'followup' && draggedEvent.contactId) {
          await supabase
            .from('crm_contacts')
            .update({ next_followup_at: date.toISOString() })
            .eq('id', draggedEvent.contactId);
          
          toast.success(`Follow-up spostato al ${format(date, 'dd/MM/yyyy', { locale: it })}`);
          await fetchData();
        }
      } catch (error) {
        console.error('Error moving event:', error);
        toast.error('Errore nello spostamento');
      }
      setDraggedEvent(null);
    } else {
      setSelectedDate(date);
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
        <div className="flex items-center justify-between gap-3 mb-6 flex-wrap">
          <div className="flex items-center gap-3">
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
          
          {/* View Toggle */}
          <Tabs value={calendarView} onValueChange={(v) => setCalendarView(v as CalendarView)}>
            <TabsList>
              <TabsTrigger value="month" className="gap-2">
                <LayoutGrid className="h-4 w-4" />
                Mese
              </TabsTrigger>
              <TabsTrigger value="week" className="gap-2">
                <CalendarDays className="h-4 w-4" />
                Settimana
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Google Calendar Integration Card */}
        <div className="mb-6">
          <GoogleCalendarSync userId={user?.id} />
        </div>

        {/* Drag indicator */}
        {draggedEvent && calendarView === 'month' && (
          <Card className="mb-4 border-primary bg-primary/5">
            <CardContent className="py-3">
              <p className="text-sm flex items-center gap-2">
                <GripVertical className="h-4 w-4" />
                Trascinando: <strong>{draggedEvent.title}</strong> - Seleziona una data nel calendario
              </p>
            </CardContent>
          </Card>
        )}

        {/* Weekly View */}
        {calendarView === 'week' && (
          <CRMWeeklyCalendar
            events={events.map(e => ({ ...e, draggable: undefined })) as any}
            onEventClick={(event) => {
              if (event.contactId) {
                navigate('/crm');
              }
            }}
            onDateClick={(date) => {
              setSelectedDate(date);
              setCalendarView('month');
            }}
          />
        )}

        {/* Monthly View */}
        {calendarView === 'month' && (

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Calendar */}
          <Card className="lg:col-span-2">
            <CardContent className="p-4">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={handleDateSelect}
                month={currentMonth}
                onMonthChange={setCurrentMonth}
                locale={it}
                className={cn("pointer-events-auto w-full", draggedEvent && "ring-2 ring-primary")}
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
                          "transition-all",
                          event.draggable && "cursor-grab active:cursor-grabbing hover:shadow-md",
                          draggedEvent?.id === event.id && "opacity-50"
                        )}
                        draggable={event.draggable}
                        onDragStart={() => handleDragStart(event)}
                        onDragEnd={handleDragEnd}
                      >
                        <CardContent className="p-3">
                          <div className="flex items-start gap-3">
                            {event.draggable && (
                              <GripVertical className="h-4 w-4 text-muted-foreground mt-1 flex-shrink-0" />
                            )}
                            <div className={cn(
                              "p-2 rounded-md flex-shrink-0",
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
                              <div className="flex items-center gap-2 mt-2 flex-wrap">
                                {event.time && (
                                  <Badge variant="secondary" className="text-xs">
                                    <Clock className="h-3 w-3 mr-1" />
                                    {event.time}
                                  </Badge>
                                )}
                                <Badge 
                                  variant="outline" 
                                  className={cn("text-xs", getEventTypeStyles(event.type))}
                                >
                                  {event.type === 'followup' && 'Follow-up'}
                                  {event.type === 'document_expiry' && 'Scadenza Doc'}
                                  {event.type === 'course_expiry' && 'Scadenza Corso'}
                                  {event.type === 'reminder' && 'Promemoria'}
                                  {event.type === 'google_calendar' && 'Google Calendar'}
                                </Badge>
                                {event.draggable && (
                                  <Badge variant="secondary" className="text-xs">
                                    Trascinabile
                                  </Badge>
                                )}
                              </div>
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
        )}

        {/* Legend */}
        <Card className="mt-6">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
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
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-green-500" />
                    <span className="text-sm text-muted-foreground">Google Calendar</span>
                  </div>
                </div>
              </div>
              {calendarView === 'month' && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <GripVertical className="h-4 w-4" />
                  <span>Trascina i follow-up su una nuova data per spostarli</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </main>

      <BottomNav />
    </div>
  );
}
