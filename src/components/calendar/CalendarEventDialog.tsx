import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { CalendarEvent, CalendarEventInput } from '@/hooks/useCalendarEvents';
import { supabase } from '@/integrations/supabase/client';
import { Trash2, Check, ChevronsUpDown, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { CalendarEventComments } from './CalendarEventComments';

interface CalendarEventDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event?: CalendarEvent | null;
  defaultDate?: Date;
  onSave: (input: CalendarEventInput) => Promise<any>;
  onUpdate?: (id: string, input: Partial<CalendarEventInput>) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
}

const CATEGORIES = [
  { value: 'appuntamento', label: '📅 Appuntamento' },
  { value: 'riunione', label: '🤝 Riunione' },
  { value: 'scadenza', label: '⚠️ Scadenza' },
  { value: 'formazione', label: '📚 Formazione' },
  { value: 'sopralluogo', label: '🏗️ Sopralluogo' },
  { value: 'altro', label: '📌 Altro' },
];

const COLORS = [
  '#3B82F6', '#EF4444', '#10B981', '#F59E0B',
  '#8B5CF6', '#EC4899', '#06B6D4', '#F97316',
];

interface ComboboxItem {
  value: string;
  label: string;
  searchText: string;
}

function SearchableCombobox({
  items,
  value,
  onChange,
  placeholder,
  searchPlaceholder,
  emptyText,
}: {
  items: ComboboxItem[];
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  searchPlaceholder: string;
  emptyText: string;
}) {
  const [open, setOpen] = useState(false);
  const selected = items.find((i) => i.value === value);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal"
        >
          <span className={cn("truncate", !selected && "text-muted-foreground")}>
            {selected ? selected.label : placeholder}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0 bg-popover z-50" align="start">
        <Command
          filter={(itemValue, search) => {
            const item = items.find((i) => i.value === itemValue);
            if (!item) return 0;
            return item.searchText.toLowerCase().includes(search.toLowerCase()) ? 1 : 0;
          }}
        >
          <CommandInput placeholder={searchPlaceholder} />
          <CommandList>
            <CommandEmpty>{emptyText}</CommandEmpty>
            <CommandGroup>
              <CommandItem
                value=""
                onSelect={() => {
                  onChange("");
                  setOpen(false);
                }}
              >
                <Check className={cn("mr-2 h-4 w-4", !value ? "opacity-100" : "opacity-0")} />
                {placeholder}
              </CommandItem>
              {items.map((item) => (
                <CommandItem
                  key={item.value}
                  value={item.value}
                  onSelect={() => {
                    onChange(item.value);
                    setOpen(false);
                  }}
                >
                  <Check className={cn("mr-2 h-4 w-4", value === item.value ? "opacity-100" : "opacity-0")} />
                  <span className="truncate">{item.label}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export function CalendarEventDialog({
  open, onOpenChange, event, defaultDate, onSave, onUpdate, onDelete,
}: CalendarEventDialogProps) {
  const isEdit = !!event;
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [endDate, setEndDate] = useState('');
  const [endTime, setEndTime] = useState('10:00');
  const [allDay, setAllDay] = useState(false);
  const [location, setLocation] = useState('');
  const [color, setColor] = useState('#3B82F6');
  const [category, setCategory] = useState('appuntamento');
  const [linkedUserIds, setLinkedUserIds] = useState<string[]>([]);
  const [isShared, setIsShared] = useState(false);
  const [saving, setSaving] = useState(false);

  const [staffUsers, setStaffUsers] = useState<{ id: string; full_name: string | null }[]>([]);

  useEffect(() => {
    if (open) {
      // Load staff users (utenti iscritti alle aree interne)
      (async () => {
        const { data: roles } = await supabase
          .from('user_roles')
          .select('user_id, role')
          .in('role', ['admin', 'contabilita', 'area_tecnica', 'gestione_corsi', 'consulenti_tecnici', 'medicina']);
        const ids = Array.from(new Set((roles || []).map((r: any) => r.user_id)));
        if (ids.length === 0) {
          setStaffUsers([]);
          return;
        }
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', ids)
          .order('full_name');
        setStaffUsers((profiles || []) as any);
      })();
    }
  }, [open]);

  useEffect(() => {
    if (event) {
      setTitle(event.title);
      setDescription(event.description || '');
      const start = new Date(event.start_datetime);
      const end = new Date(event.end_datetime);
      setStartDate(format(start, 'yyyy-MM-dd'));
      setStartTime(format(start, 'HH:mm'));
      setEndDate(format(end, 'yyyy-MM-dd'));
      setEndTime(format(end, 'HH:mm'));
      setAllDay(event.all_day);
      setLocation(event.location || '');
      setColor(event.color || '#3B82F6');
      setCategory(event.category);
      setLinkedUserIds(event.linked_user_ids || []);
      setIsShared(event.is_shared);
    } else {
      const d = defaultDate || new Date();
      // If defaultDate has a meaningful time (not midnight), use it as start time
      const hasTime = d.getHours() !== 0 || d.getMinutes() !== 0;
      const startH = hasTime ? format(d, 'HH:mm') : '09:00';
      const endDt = hasTime ? new Date(d.getTime() + 60 * 60 * 1000) : null;
      const endH = endDt ? format(endDt, 'HH:mm') : '10:00';
      setTitle('');
      setDescription('');
      setStartDate(format(d, 'yyyy-MM-dd'));
      setStartTime(startH);
      setEndDate(format(endDt || d, 'yyyy-MM-dd'));
      setEndTime(endH);
      setAllDay(false);
      setLocation('');
      setColor('#3B82F6');
      setCategory('appuntamento');
      setLinkedUserIds([]);
      setIsShared(false);
    }
  }, [event, defaultDate, open]);

  const handleSubmit = async () => {
    if (!title.trim() || !startDate) return;
    setSaving(true);

    const startDt = allDay
      ? `${startDate}T00:00:00`
      : `${startDate}T${startTime}:00`;
    const endDt = allDay
      ? `${endDate || startDate}T23:59:59`
      : `${endDate || startDate}T${endTime}:00`;

    const input: CalendarEventInput = {
      title: title.trim(),
      description: description.trim() || undefined,
      start_datetime: new Date(startDt).toISOString(),
      end_datetime: new Date(endDt).toISOString(),
      all_day: allDay,
      location: location.trim() || undefined,
      color,
      category,
      contact_id: null,
      employee_id: null,
      linked_user_ids: linkedUserIds,
      is_shared: isShared,
    };

    if (isEdit && onUpdate && event) {
      await onUpdate(event.id, input);
    } else {
      await onSave(input);
    }
    setSaving(false);
    onOpenChange(false);
  };

  const handleDelete = async () => {
    if (!event || !onDelete) return;
    await onDelete(event.id);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Modifica evento' : 'Nuovo evento'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Titolo *</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Titolo evento" />
          </div>

          <div>
            <Label>Categoria</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-3">
            <Switch checked={allDay} onCheckedChange={setAllDay} id="all-day" />
            <Label htmlFor="all-day">Tutto il giorno</Label>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Data inizio *</Label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            {!allDay && (
              <div>
                <Label>Ora inizio</Label>
                <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Data fine</Label>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
            {!allDay && (
              <div>
                <Label>Ora fine</Label>
                <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
              </div>
            )}
          </div>

          <div>
            <Label>Luogo</Label>
            <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Luogo dell'evento" />
          </div>

          <div>
            <Label>Descrizione</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Note aggiuntive..." rows={3} />
          </div>

          <div>
            <Label>Colore</Label>
            <div className="flex gap-2 mt-1">
              {COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`w-7 h-7 rounded-full border-2 transition-all ${color === c ? 'border-foreground scale-110' : 'border-transparent'}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          <div>
            <Label>Collega a utenti staff interni</Label>
            <SearchableCombobox
              items={staffUsers
                .filter((u) => !linkedUserIds.includes(u.id))
                .map((u) => ({
                  value: u.id,
                  label: u.full_name || 'Senza nome',
                  searchText: u.full_name || '',
                }))}
              value=""
              onChange={(v) => {
                if (v && !linkedUserIds.includes(v)) {
                  setLinkedUserIds([...linkedUserIds, v]);
                }
              }}
              placeholder="Aggiungi utente staff..."
              searchPlaceholder="Cerca utente..."
              emptyText="Nessun utente trovato"
            />
            {linkedUserIds.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {linkedUserIds.map((uid) => {
                  const u = staffUsers.find((s) => s.id === uid);
                  return (
                    <Badge key={uid} variant="secondary" className="gap-1">
                      {u?.full_name || uid.slice(0, 8)}
                      <button
                        type="button"
                        onClick={() => setLinkedUserIds(linkedUserIds.filter((x) => x !== uid))}
                        className="ml-1 hover:text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            <Switch checked={isShared} onCheckedChange={setIsShared} id="shared" />
            <Label htmlFor="shared">Visibile a tutto lo staff</Label>
          </div>

          {isEdit && event && (
            <CalendarEventComments eventId={event.id} />
          )}
        </div>

        <DialogFooter className="flex justify-between">
          <div>
            {isEdit && onDelete && (
              <Button variant="destructive" size="sm" onClick={handleDelete}>
                <Trash2 className="h-4 w-4 mr-1" /> Elimina
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Annulla</Button>
            <Button onClick={handleSubmit} disabled={saving || !title.trim()}>
              {saving ? 'Salvataggio...' : isEdit ? 'Aggiorna' : 'Crea evento'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
