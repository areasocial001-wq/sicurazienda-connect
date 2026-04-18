import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ChevronLeft, ChevronRight, Stethoscope, MapPinned, CalendarDays } from 'lucide-react';
import {
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  isSameMonth,
  isSameDay,
  parseISO,
  isToday,
} from 'date-fns';
import { it } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import type { MedicalVisit, MedicalInspection } from '@/hooks/useMedicina';

interface MedicalCalendarProps {
  visits: MedicalVisit[];
  inspections: MedicalInspection[];
  contacts?: Array<{ id: string; name: string; company?: string | null }>;
  locations?: Array<{ id: string; name: string }>;
  onVisitClick?: (visit: MedicalVisit) => void;
  onInspectionClick?: (inspection: MedicalInspection) => void;
}

type CalendarItem =
  | { kind: 'visit'; date: string; data: MedicalVisit }
  | { kind: 'inspection'; date: string; data: MedicalInspection };

const visitTypeLabel = (t: string) => ({
  preventiva: 'Preventiva',
  periodica: 'Periodica',
  cambio_mansione: 'Cambio mansione',
  rientro: 'Rientro',
  su_richiesta: 'Su richiesta',
  cessazione: 'Cessazione',
}[t] || t);

export function MedicalCalendar({ visits, inspections, contacts = [], locations = [], onVisitClick, onInspectionClick }: MedicalCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(new Date());

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const items: CalendarItem[] = useMemo(() => {
    const list: CalendarItem[] = [];
    visits.forEach((v) => {
      const date = v.execution_date || v.scheduled_date;
      if (date) list.push({ kind: 'visit', date, data: v });
    });
    inspections.forEach((i) => {
      if (i.inspection_date) list.push({ kind: 'inspection', date: i.inspection_date, data: i });
    });
    return list;
  }, [visits, inspections]);

  const itemsByDay = useMemo(() => {
    const map = new Map<string, CalendarItem[]>();
    items.forEach((it) => {
      const key = format(parseISO(it.date), 'yyyy-MM-dd');
      const arr = map.get(key) || [];
      arr.push(it);
      map.set(key, arr);
    });
    return map;
  }, [items]);

  const selectedItems = selectedDay
    ? itemsByDay.get(format(selectedDay, 'yyyy-MM-dd')) || []
    : [];

  const monthVisitCount = items.filter((i) => i.kind === 'visit' && isSameMonth(parseISO(i.date), currentMonth)).length;
  const monthInspCount = items.filter((i) => i.kind === 'inspection' && isSameMonth(parseISO(i.date), currentMonth)).length;

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <div className="flex items-center gap-2">
            <CardTitle className="text-lg capitalize">
              {format(currentMonth, 'MMMM yyyy', { locale: it })}
            </CardTitle>
            <div className="flex gap-1.5 text-xs">
              <Badge variant="outline" className="gap-1"><Stethoscope className="h-3 w-3" />{monthVisitCount}</Badge>
              <Badge variant="outline" className="gap-1"><MapPinned className="h-3 w-3" />{monthInspCount}</Badge>
            </div>
          </div>
          <div className="flex gap-1">
            <Button size="sm" variant="outline" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button size="sm" variant="outline" onClick={() => { setCurrentMonth(new Date()); setSelectedDay(new Date()); }}>
              Oggi
            </Button>
            <Button size="sm" variant="outline" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-1 text-xs font-medium text-muted-foreground mb-1">
            {['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'].map((d) => (
              <div key={d} className="text-center py-1">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {days.map((day) => {
              const key = format(day, 'yyyy-MM-dd');
              const dayItems = itemsByDay.get(key) || [];
              const isCurrentMonth = isSameMonth(day, currentMonth);
              const isSelected = selectedDay && isSameDay(day, selectedDay);
              const visitCount = dayItems.filter((i) => i.kind === 'visit').length;
              const inspCount = dayItems.filter((i) => i.kind === 'inspection').length;

              return (
                <button
                  key={key}
                  onClick={() => setSelectedDay(day)}
                  className={cn(
                    'min-h-[68px] p-1.5 rounded-md border text-left transition-colors hover:bg-accent',
                    !isCurrentMonth && 'text-muted-foreground/50 bg-muted/20',
                    isToday(day) && 'border-primary',
                    isSelected && 'bg-accent ring-2 ring-primary',
                  )}
                >
                  <div className={cn('text-sm font-medium', isToday(day) && 'text-primary')}>
                    {format(day, 'd')}
                  </div>
                  <div className="flex flex-wrap gap-0.5 mt-1">
                    {visitCount > 0 && (
                      <Badge variant="secondary" className="h-4 px-1 text-[10px] gap-0.5">
                        <Stethoscope className="h-2.5 w-2.5" />{visitCount}
                      </Badge>
                    )}
                    {inspCount > 0 && (
                      <Badge className="h-4 px-1 text-[10px] gap-0.5 bg-accent text-accent-foreground">
                        <MapPinned className="h-2.5 w-2.5" />{inspCount}
                      </Badge>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <CalendarDays className="h-4 w-4" />
            {selectedDay ? format(selectedDay, "EEEE d MMMM", { locale: it }) : 'Seleziona un giorno'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[420px] pr-2">
            {selectedItems.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Nessun evento</p>
            ) : (
              <div className="space-y-2">
                {selectedItems.map((it, idx) => {
                  if (it.kind === 'visit') {
                    const v = it.data;
                    return (
                      <button
                        key={`v-${v.id}-${idx}`}
                        onClick={() => onVisitClick?.(v)}
                        className="w-full text-left p-3 rounded-md border hover:bg-accent transition-colors"
                      >
                        <div className="flex items-start gap-2">
                          <Stethoscope className="h-4 w-4 mt-0.5 text-primary shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm">{v.employee_name || 'Dipendente'}</div>
                            <div className="text-xs text-muted-foreground">{visitTypeLabel(v.visit_type)}</div>
                            {v.contact_name && <div className="text-xs text-muted-foreground truncate">{v.contact_name}</div>}
                            {v.doctor_name && <div className="text-xs mt-1">{v.doctor_name}</div>}
                          </div>
                        </div>
                      </button>
                    );
                  }
                  const i = it.data;
                  return (
                    <button
                      key={`i-${i.id}-${idx}`}
                      onClick={() => onInspectionClick?.(i)}
                      className="w-full text-left p-3 rounded-md border hover:bg-accent transition-colors"
                    >
                      <div className="flex items-start gap-2">
                        <MapPinned className="h-4 w-4 mt-0.5 text-accent-foreground shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm">Sopralluogo</div>
                          {i.contact_name && <div className="text-xs text-muted-foreground truncate">{i.contact_name}</div>}
                          {i.location_name && <div className="text-xs text-muted-foreground truncate">{i.location_name}</div>}
                          <Badge variant="outline" className="mt-1 text-[10px]">{i.status}</Badge>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
