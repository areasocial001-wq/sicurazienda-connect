import { useState, useMemo, useCallback, useEffect } from 'react';
import {
  Calendar as CalendarIcon, Loader2, Plus,
  LayoutGrid, CalendarDays, List, Clock,
  MapPin, Users, Share2, ChevronLeft, ChevronRight,
} from 'lucide-react';
import {
  format, isSameDay, startOfWeek, endOfWeek, eachDayOfInterval,
  addWeeks, subWeeks, addMonths, subMonths, isToday,
  startOfMonth, endOfMonth, eachHourOfInterval, startOfDay, endOfDay,
  isSameMonth, addDays,
} from 'date-fns';
import { it } from 'date-fns/locale';
import Header from '@/components/Header';
import BottomNav from '@/components/BottomNav';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useCalendarEvents, CalendarEvent } from '@/hooks/useCalendarEvents';
import { CalendarEventDialog } from '@/components/calendar/CalendarEventDialog';
import { useReminders } from '@/hooks/useReminders';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

type CalendarView = 'month' | 'week' | 'day';

// Unified display event for both custom events and system events
interface DisplayEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  allDay: boolean;
  color: string;
  category: string;
  isSystem: boolean; // non-editable system events (followups, expiries, etc.)
  sourceEvent?: CalendarEvent;
  description?: string;
  location?: string;
  contactName?: string;
  employeeName?: string;
  isShared?: boolean;
  createdByName?: string;
}

export default function CRMCalendar() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { events: calendarEvents, loading, createEvent, updateEvent, deleteEvent } = useCalendarEvents(user?.id);
  const { reminders } = useReminders();

  const [calendarView, setCalendarView] = useState<CalendarView>('month');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [dialogDefaultDate, setDialogDefaultDate] = useState<Date>(new Date());

  // System data
  const [contacts, setContacts] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [courseEditions, setCourseEditions] = useState<any[]>([]);

  const fetchSystemData = useCallback(async () => {
    if (!user) return;
    const [contactsRes, docsRes, editionsRes] = await Promise.all([
      supabase.from('crm_contacts').select('id, name, company, next_followup_at').not('next_followup_at', 'is', null),
      supabase.from('documents').select('id, name, expiry_date, category').eq('user_id', user.id).not('expiry_date', 'is', null),
      supabase.from('course_editions').select('id, edition_code, start_date, end_date, location, status, course:courses(name)').in('status', ['pianificata', 'in_corso']),
    ]);
    setContacts(contactsRes.data || []);
    setDocuments(docsRes.data || []);
    setCourseEditions(editionsRes.data || []);
  }, [user]);

  useEffect(() => { fetchSystemData(); }, [fetchSystemData]);

  // Build unified display events
  const displayEvents = useMemo<DisplayEvent[]>(() => {
    const all: DisplayEvent[] = [];

    // Custom calendar events
    calendarEvents.forEach(e => {
      all.push({
        id: e.id,
        title: e.title,
        start: new Date(e.start_datetime),
        end: new Date(e.end_datetime),
        allDay: e.all_day,
        color: e.color || '#3B82F6',
        category: e.category,
        isSystem: false,
        sourceEvent: e,
        description: e.description || undefined,
        location: e.location || undefined,
        contactName: e.contact_name || undefined,
        employeeName: e.employee_name || undefined,
        isShared: e.is_shared,
        createdByName: e.created_by_name || undefined,
      });
    });

    // Follow-ups
    contacts.forEach(c => {
      if (c.next_followup_at) {
        const d = new Date(c.next_followup_at);
        all.push({
          id: `followup-${c.id}`,
          title: `Follow-up: ${c.company || c.name}`,
          start: d, end: d, allDay: false,
          color: '#3B82F6', category: 'followup', isSystem: true,
          contactName: c.company || c.name,
        });
      }
    });

    // Document expiries
    documents.forEach(doc => {
      if (doc.expiry_date) {
        const d = new Date(doc.expiry_date);
        all.push({
          id: `doc-${doc.id}`,
          title: `Scadenza: ${doc.name}`,
          start: d, end: d, allDay: true,
          color: doc.category === 'attestato' ? '#8B5CF6' : '#F97316',
          category: 'scadenza', isSystem: true,
        });
      }
    });

    // Reminders
    reminders.forEach(r => {
      const d = new Date(r.due_date);
      all.push({
        id: `reminder-${r.id}`,
        title: r.title,
        start: d, end: d, allDay: true,
        color: '#F59E0B', category: 'promemoria', isSystem: true,
        description: r.description || undefined,
      });
    });

    // Course editions
    courseEditions.forEach(ed => {
      if (ed.start_date) {
        const courseName = (ed.course as any)?.name || 'Corso';
        all.push({
          id: `course-${ed.id}`,
          title: `📚 ${courseName}`,
          start: new Date(ed.start_date),
          end: ed.end_date ? new Date(ed.end_date) : new Date(ed.start_date),
          allDay: true, color: '#6366F1', category: 'formazione', isSystem: true,
          location: ed.location || undefined,
        });
      }
    });

    return all.sort((a, b) => a.start.getTime() - b.start.getTime());
  }, [calendarEvents, contacts, documents, reminders, courseEditions]);

  // Navigation
  const navigateCalendar = (dir: number) => {
    if (calendarView === 'month') setCurrentDate(d => dir > 0 ? addMonths(d, 1) : subMonths(d, 1));
    else if (calendarView === 'week') setCurrentDate(d => dir > 0 ? addWeeks(d, 1) : subWeeks(d, 1));
    else setCurrentDate(d => addDays(d, dir));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
    setSelectedDate(new Date());
  };

  const openNewEvent = (date?: Date) => {
    setEditingEvent(null);
    setDialogDefaultDate(date || selectedDate);
    setDialogOpen(true);
  };

  const openEditEvent = (event: DisplayEvent) => {
    if (event.isSystem || !event.sourceEvent) return;
    setEditingEvent(event.sourceEvent);
    setDialogOpen(true);
  };

  // Get events for a specific day
  const getEventsForDay = (date: Date) => displayEvents.filter(e => isSameDay(e.start, date));

  // Current period title
  const periodTitle = useMemo(() => {
    if (calendarView === 'month') return format(currentDate, 'MMMM yyyy', { locale: it });
    if (calendarView === 'week') {
      const start = startOfWeek(currentDate, { weekStartsOn: 1 });
      const end = endOfWeek(currentDate, { weekStartsOn: 1 });
      return `${format(start, 'd', { locale: it })} - ${format(end, 'd MMMM yyyy', { locale: it })}`;
    }
    return format(currentDate, 'EEEE d MMMM yyyy', { locale: it });
  }, [currentDate, calendarView]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!user) { navigate('/'); return null; }

  // Month grid
  const renderMonth = () => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
    const days = eachDayOfInterval({ start: calStart, end: calEnd });
    const weekDays = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];

    return (
      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <div className="grid grid-cols-7">
          {weekDays.map(d => (
            <div key={d} className="p-2 text-center text-xs font-medium text-muted-foreground border-b border-border bg-muted/30">
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {days.map((day, i) => {
            const dayEvents = getEventsForDay(day);
            const isCurrentMonth = isSameMonth(day, currentDate);
            const isSelected = isSameDay(day, selectedDate);
            return (
              <div
                key={i}
                onClick={() => { setSelectedDate(day); }}
                onDoubleClick={() => openNewEvent(day)}
                className={cn(
                  "min-h-[80px] md:min-h-[100px] p-1 border-b border-r border-border cursor-pointer transition-colors hover:bg-accent/50",
                  !isCurrentMonth && "bg-muted/20 text-muted-foreground",
                  isSelected && "bg-primary/5 ring-1 ring-primary",
                  isToday(day) && "bg-accent/30",
                )}
              >
                <div className={cn(
                  "text-xs font-medium mb-0.5 w-6 h-6 flex items-center justify-center rounded-full",
                  isToday(day) && "bg-primary text-primary-foreground",
                )}>
                  {format(day, 'd')}
                </div>
                <div className="space-y-0.5">
                  {dayEvents.slice(0, 3).map(ev => (
                    <div
                      key={ev.id}
                      onClick={(e) => { e.stopPropagation(); openEditEvent(ev); }}
                      className="text-[10px] md:text-xs px-1 py-0.5 rounded truncate cursor-pointer hover:opacity-80"
                      style={{ backgroundColor: `${ev.color}20`, color: ev.color, borderLeft: `2px solid ${ev.color}` }}
                    >
                      {ev.title}
                    </div>
                  ))}
                  {dayEvents.length > 3 && (
                    <div className="text-[10px] text-muted-foreground pl-1">
                      +{dayEvents.length - 3} altri
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // Week view
  const renderWeek = () => {
    const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
    const days = eachDayOfInterval({ start: weekStart, end: weekEnd });
    const hours = Array.from({ length: 14 }, (_, i) => i + 7); // 7:00 - 20:00

    return (
      <div className="bg-card rounded-lg border border-border overflow-x-auto">
        {/* Header */}
        <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-border sticky top-0 bg-card z-10">
          <div className="p-2 border-r border-border" />
          {days.map((day, i) => (
            <div
              key={i}
              onClick={() => { setSelectedDate(day); setCalendarView('day'); }}
              className={cn(
                "p-2 text-center border-r border-border cursor-pointer hover:bg-accent/50",
                isToday(day) && "bg-primary/10",
              )}
            >
              <div className="text-xs text-muted-foreground">{format(day, 'EEE', { locale: it })}</div>
              <div className={cn(
                "text-sm font-medium w-7 h-7 mx-auto flex items-center justify-center rounded-full",
                isToday(day) && "bg-primary text-primary-foreground",
              )}>
                {format(day, 'd')}
              </div>
            </div>
          ))}
        </div>
        {/* Time grid */}
        <div className="max-h-[60vh] overflow-y-auto">
          {hours.map(hour => (
            <div key={hour} className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-border min-h-[50px]">
              <div className="p-1 text-[10px] text-muted-foreground text-right pr-2 border-r border-border">
                {`${hour}:00`}
              </div>
              {days.map((day, i) => {
                const dayEvents = getEventsForDay(day).filter(e => {
                  if (e.allDay) return hour === 7; // show all-day at top
                  return e.start.getHours() === hour;
                });
                return (
                  <div
                    key={i}
                    className="border-r border-border p-0.5 hover:bg-accent/30 cursor-pointer"
                    onDoubleClick={() => {
                      const d = new Date(day);
                      d.setHours(hour, 0);
                      openNewEvent(d);
                    }}
                  >
                    {dayEvents.map(ev => (
                      <div
                        key={ev.id}
                        onClick={() => openEditEvent(ev)}
                        className="text-[10px] px-1 py-0.5 rounded truncate mb-0.5 cursor-pointer"
                        style={{ backgroundColor: `${ev.color}30`, color: ev.color, borderLeft: `2px solid ${ev.color}` }}
                      >
                        {!ev.allDay && <span className="font-medium">{format(ev.start, 'HH:mm')} </span>}
                        {ev.title}
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Day view
  const renderDay = () => {
    const hours = Array.from({ length: 16 }, (_, i) => i + 6); // 6:00 - 21:00
    const dayEvents = getEventsForDay(currentDate);
    const allDayEvents = dayEvents.filter(e => e.allDay);
    const timedEvents = dayEvents.filter(e => !e.allDay);

    return (
      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-card rounded-lg border border-border">
          {/* All-day events */}
          {allDayEvents.length > 0 && (
            <div className="p-2 border-b border-border bg-muted/30">
              <span className="text-xs text-muted-foreground mr-2">Tutto il giorno:</span>
              <div className="flex flex-wrap gap-1 mt-1">
                {allDayEvents.map(ev => (
                  <Badge
                    key={ev.id}
                    variant="secondary"
                    className="cursor-pointer text-xs"
                    style={{ backgroundColor: `${ev.color}20`, color: ev.color }}
                    onClick={() => openEditEvent(ev)}
                  >
                    {ev.title}
                  </Badge>
                ))}
              </div>
            </div>
          )}
          {/* Time slots */}
          <div className="max-h-[60vh] overflow-y-auto">
            {hours.map(hour => {
              const hourEvents = timedEvents.filter(e => e.start.getHours() === hour);
              return (
                <div
                  key={hour}
                  className="flex border-b border-border min-h-[50px] hover:bg-accent/30 cursor-pointer"
                  onDoubleClick={() => {
                    const d = new Date(currentDate);
                    d.setHours(hour, 0);
                    openNewEvent(d);
                  }}
                >
                  <div className="w-16 p-2 text-xs text-muted-foreground text-right border-r border-border shrink-0">
                    {`${hour}:00`}
                  </div>
                  <div className="flex-1 p-1">
                    {hourEvents.map(ev => (
                      <div
                        key={ev.id}
                        onClick={() => openEditEvent(ev)}
                        className="text-sm px-2 py-1 rounded cursor-pointer mb-1"
                        style={{ backgroundColor: `${ev.color}20`, color: ev.color, borderLeft: `3px solid ${ev.color}` }}
                      >
                        <div className="font-medium">{format(ev.start, 'HH:mm')} - {format(ev.end, 'HH:mm')}</div>
                        <div>{ev.title}</div>
                        {ev.location && (
                          <div className="text-xs opacity-70 flex items-center gap-1 mt-0.5">
                            <MapPin className="h-3 w-3" /> {ev.location}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Sidebar with day details */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {format(currentDate, 'EEEE d MMMM', { locale: it })}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {dayEvents.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                <CalendarIcon className="h-10 w-10 mx-auto mb-2 opacity-40" />
                <p className="text-sm">Nessun evento</p>
                <Button size="sm" variant="outline" className="mt-3" onClick={() => openNewEvent(currentDate)}>
                  <Plus className="h-3.5 w-3.5 mr-1" /> Aggiungi
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {dayEvents.map(ev => (
                  <div
                    key={ev.id}
                    onClick={() => openEditEvent(ev)}
                    className={cn("p-3 rounded-lg border cursor-pointer transition-colors hover:bg-accent/50", ev.isSystem && "cursor-default opacity-80")}
                    style={{ borderLeftColor: ev.color, borderLeftWidth: 3 }}
                  >
                    <p className="font-medium text-sm">{ev.title}</p>
                    {!ev.allDay && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                        <Clock className="h-3 w-3" />
                        {format(ev.start, 'HH:mm')} - {format(ev.end, 'HH:mm')}
                      </p>
                    )}
                    {ev.location && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                        <MapPin className="h-3 w-3" /> {ev.location}
                      </p>
                    )}
                    {ev.contactName && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                        <Users className="h-3 w-3" /> {ev.contactName}
                      </p>
                    )}
                    {ev.isShared && (
                      <Badge variant="secondary" className="text-[10px] mt-1">
                        <Share2 className="h-3 w-3 mr-0.5" /> Condiviso
                      </Badge>
                    )}
                    {ev.isSystem && (
                      <Badge variant="outline" className="text-[10px] mt-1">Sistema</Badge>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  };

  // Selected date events for month view sidebar
  const selectedDayEvents = getEventsForDay(selectedDate);

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto p-4 pb-24">
        {/* Top bar */}
        <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div>
              <h1 className="text-xl md:text-2xl font-bold flex items-center gap-2">
                <CalendarIcon className="h-5 w-5 md:h-6 md:w-6 text-primary" />
                Calendario
              </h1>
              <p className="text-muted-foreground text-xs md:text-sm">
                Gestisci appuntamenti, scadenze e attività
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Button size="sm" variant="outline" onClick={goToToday}>Oggi</Button>
            <Tabs value={calendarView} onValueChange={(v) => setCalendarView(v as CalendarView)}>
              <TabsList className="h-8">
                <TabsTrigger value="month" className="text-xs gap-1 h-7 px-2">
                  <LayoutGrid className="h-3.5 w-3.5" /> Mese
                </TabsTrigger>
                <TabsTrigger value="week" className="text-xs gap-1 h-7 px-2">
                  <CalendarDays className="h-3.5 w-3.5" /> Settimana
                </TabsTrigger>
                <TabsTrigger value="day" className="text-xs gap-1 h-7 px-2">
                  <List className="h-3.5 w-3.5" /> Giorno
                </TabsTrigger>
              </TabsList>
            </Tabs>
            <Button size="sm" onClick={() => openNewEvent()}>
              <Plus className="h-4 w-4 mr-1" /> Evento
            </Button>
          </div>
        </div>

        {/* Period navigation */}
        <div className="flex items-center justify-center gap-3 mb-4">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigateCalendar(-1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h2 className="text-base md:text-lg font-semibold capitalize min-w-[200px] text-center">
            {periodTitle}
          </h2>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigateCalendar(1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Calendar view */}
        {calendarView === 'month' && (
          <div className="grid lg:grid-cols-4 gap-4">
            <div className="lg:col-span-3">
              {renderMonth()}
            </div>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">
                  {format(selectedDate, 'd MMMM yyyy', { locale: it })}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {selectedDayEvents.length === 0 ? (
                  <div className="text-center py-4 text-muted-foreground">
                    <p className="text-xs">Nessun evento</p>
                    <Button size="sm" variant="ghost" className="mt-2 text-xs" onClick={() => openNewEvent(selectedDate)}>
                      <Plus className="h-3 w-3 mr-1" /> Aggiungi
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[50vh] overflow-y-auto">
                    {selectedDayEvents.map(ev => (
                      <div
                        key={ev.id}
                        onClick={() => openEditEvent(ev)}
                        className={cn("p-2 rounded border text-xs cursor-pointer hover:bg-accent/50", ev.isSystem && "cursor-default opacity-80")}
                        style={{ borderLeftColor: ev.color, borderLeftWidth: 3 }}
                      >
                        <p className="font-medium truncate">{ev.title}</p>
                        {!ev.allDay && (
                          <p className="text-muted-foreground mt-0.5">
                            {format(ev.start, 'HH:mm')} - {format(ev.end, 'HH:mm')}
                          </p>
                        )}
                        {ev.contactName && (
                          <p className="text-muted-foreground mt-0.5 flex items-center gap-1">
                            <Users className="h-3 w-3" /> {ev.contactName}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {calendarView === 'week' && renderWeek()}
        {calendarView === 'day' && renderDay()}

        {/* Legend */}
        <div className="mt-4 flex flex-wrap gap-3 text-xs text-muted-foreground">
          <span className="font-medium text-foreground">Suggerimento:</span>
          <span>Doppio click su una cella per creare un evento</span>
          <span>•</span>
          <span>Click su un evento per modificarlo</span>
        </div>
      </main>

      <BottomNav />

      <CalendarEventDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        event={editingEvent}
        defaultDate={dialogDefaultDate}
        onSave={createEvent}
        onUpdate={updateEvent}
        onDelete={deleteEvent}
      />
    </div>
  );
}
