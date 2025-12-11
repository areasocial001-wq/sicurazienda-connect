import { useMemo, useState } from 'react';
import { 
  format, startOfWeek, endOfWeek, eachDayOfInterval, 
  isSameDay, addWeeks, subWeeks, isToday, parseISO
} from 'date-fns';
import { it } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Phone, FileText, AlertTriangle, Clock, Calendar as CalendarIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

interface CalendarEvent {
  id: string;
  title: string;
  date: Date;
  type: 'followup' | 'document_expiry' | 'course_expiry' | 'reminder';
  contactName?: string;
  contactId?: string;
  description?: string;
  time?: string;
}

interface CRMWeeklyCalendarProps {
  events: CalendarEvent[];
  onEventClick?: (event: CalendarEvent) => void;
  onDateClick?: (date: Date) => void;
}

const HOURS = Array.from({ length: 12 }, (_, i) => i + 8); // 8:00 - 19:00

export function CRMWeeklyCalendar({ events, onEventClick, onDateClick }: CRMWeeklyCalendarProps) {
  const [currentWeek, setCurrentWeek] = useState(new Date());

  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 }); // Monday
  const weekEnd = endOfWeek(currentWeek, { weekStartsOn: 1 });
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

  const goToPrevWeek = () => setCurrentWeek(subWeeks(currentWeek, 1));
  const goToNextWeek = () => setCurrentWeek(addWeeks(currentWeek, 1));
  const goToToday = () => setCurrentWeek(new Date());

  const getEventsForDay = (day: Date) => {
    return events.filter(event => isSameDay(event.date, day));
  };

  const getEventTypeStyles = (type: CalendarEvent['type']) => {
    switch (type) {
      case 'followup':
        return 'bg-blue-500/20 text-blue-700 border-l-blue-500';
      case 'document_expiry':
        return 'bg-orange-500/20 text-orange-700 border-l-orange-500';
      case 'course_expiry':
        return 'bg-purple-500/20 text-purple-700 border-l-purple-500';
      case 'reminder':
        return 'bg-yellow-500/20 text-yellow-700 border-l-yellow-500';
      default:
        return 'bg-gray-500/20 text-gray-700 border-l-gray-500';
    }
  };

  const getEventIcon = (type: CalendarEvent['type']) => {
    switch (type) {
      case 'followup':
        return <Phone className="h-3 w-3" />;
      case 'document_expiry':
        return <FileText className="h-3 w-3" />;
      case 'course_expiry':
        return <AlertTriangle className="h-3 w-3" />;
      case 'reminder':
        return <Clock className="h-3 w-3" />;
      default:
        return <CalendarIcon className="h-3 w-3" />;
    }
  };

  // Group events by hour for timeline view
  const getEventsByHour = (day: Date) => {
    const dayEvents = getEventsForDay(day);
    const eventsByHour: Record<number, CalendarEvent[]> = {};
    
    dayEvents.forEach(event => {
      const hour = event.date.getHours() || 9; // Default to 9 AM if no time
      if (!eventsByHour[hour]) {
        eventsByHour[hour] = [];
      }
      eventsByHour[hour].push(event);
    });
    
    return eventsByHour;
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <CalendarIcon className="h-5 w-5" />
            Vista Settimanale
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={goToToday}>
              Oggi
            </Button>
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={goToPrevWeek}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium min-w-[180px] text-center">
              {format(weekStart, 'd MMM', { locale: it })} - {format(weekEnd, 'd MMM yyyy', { locale: it })}
            </span>
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={goToNextWeek}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {/* Header with day names */}
        <div className="grid grid-cols-8 border-b">
          <div className="p-2 text-xs text-muted-foreground border-r bg-muted/30">
            Ora
          </div>
          {weekDays.map((day) => (
            <div
              key={day.toISOString()}
              className={cn(
                "p-2 text-center border-r last:border-r-0 cursor-pointer hover:bg-muted/50 transition-colors",
                isToday(day) && "bg-primary/10"
              )}
              onClick={() => onDateClick?.(day)}
            >
              <p className="text-xs text-muted-foreground uppercase">
                {format(day, 'EEE', { locale: it })}
              </p>
              <p className={cn(
                "text-lg font-semibold",
                isToday(day) && "text-primary"
              )}>
                {format(day, 'd')}
              </p>
              {getEventsForDay(day).length > 0 && (
                <Badge variant="secondary" className="text-xs mt-1">
                  {getEventsForDay(day).length}
                </Badge>
              )}
            </div>
          ))}
        </div>

        {/* Timeline grid */}
        <ScrollArea className="h-[400px]">
          <div className="grid grid-cols-8">
            {HOURS.map((hour) => (
              <div key={hour} className="contents">
                {/* Hour label */}
                <div className="p-2 text-xs text-muted-foreground border-r border-b bg-muted/30 sticky left-0">
                  {hour}:00
                </div>
                
                {/* Day cells */}
                {weekDays.map((day) => {
                  const eventsByHour = getEventsByHour(day);
                  const hourEvents = eventsByHour[hour] || [];
                  
                  return (
                    <div
                      key={`${day.toISOString()}-${hour}`}
                      className={cn(
                        "min-h-[60px] border-r border-b last:border-r-0 p-1 hover:bg-muted/30 transition-colors cursor-pointer",
                        isToday(day) && "bg-primary/5"
                      )}
                      onClick={() => onDateClick?.(day)}
                    >
                      {hourEvents.map((event) => (
                        <div
                          key={event.id}
                          className={cn(
                            "text-xs p-1 mb-1 rounded border-l-2 cursor-pointer hover:shadow-sm transition-shadow",
                            getEventTypeStyles(event.type)
                          )}
                          onClick={(e) => {
                            e.stopPropagation();
                            onEventClick?.(event);
                          }}
                        >
                          <div className="flex items-center gap-1">
                            {getEventIcon(event.type)}
                            <span className="truncate font-medium">{event.title}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </ScrollArea>

        {/* All-day events section */}
        <div className="border-t p-3 bg-muted/20">
          <p className="text-xs font-medium text-muted-foreground mb-2">Eventi della settimana</p>
          <div className="flex flex-wrap gap-2">
            {events
              .filter(event => {
                const eventDate = event.date;
                return eventDate >= weekStart && eventDate <= weekEnd;
              })
              .slice(0, 10)
              .map((event) => (
                <Badge
                  key={event.id}
                  variant="outline"
                  className={cn(
                    "cursor-pointer hover:shadow-sm transition-shadow text-xs",
                    getEventTypeStyles(event.type)
                  )}
                  onClick={() => onEventClick?.(event)}
                >
                  {getEventIcon(event.type)}
                  <span className="ml-1">{event.title}</span>
                  <span className="ml-1 opacity-70">
                    ({format(event.date, 'EEE', { locale: it })})
                  </span>
                </Badge>
              ))}
            {events.filter(event => {
              const eventDate = event.date;
              return eventDate >= weekStart && eventDate <= weekEnd;
            }).length === 0 && (
              <p className="text-xs text-muted-foreground">Nessun evento questa settimana</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
