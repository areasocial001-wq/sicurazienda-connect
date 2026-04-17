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
import { Trash2, Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

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
  const [contactId, setContactId] = useState<string>('');
  const [employeeId, setEmployeeId] = useState<string>('');
  const [isShared, setIsShared] = useState(false);
  const [saving, setSaving] = useState(false);

  const [contacts, setContacts] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);

  useEffect(() => {
    if (open) {
      // Load contacts and employees
      supabase.from('crm_contacts').select('id, name, company').order('company').then(({ data }) => {
        setContacts(data || []);
      });
      supabase.from('crm_employees').select('id, first_name, last_name, contact_id').order('last_name').then(({ data }) => {
        setEmployees(data || []);
      });
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
      setContactId(event.contact_id || '');
      setEmployeeId(event.employee_id || '');
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
      setContactId('');
      setEmployeeId('');
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
      contact_id: contactId || null,
      employee_id: employeeId || null,
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
            <Label>Collega a contatto CRM</Label>
            <SearchableCombobox
              items={contacts.map((c) => ({
                value: c.id,
                label: c.company || c.name,
                searchText: `${c.company || ''} ${c.name || ''}`.trim(),
              }))}
              value={contactId}
              onChange={setContactId}
              placeholder="Nessuno"
              searchPlaceholder="Cerca contatto..."
              emptyText="Nessun contatto trovato"
            />
          </div>

          <div>
            <Label>Collega a dipendente</Label>
            <SearchableCombobox
              items={employees.map((e) => ({
                value: e.id,
                label: `${e.last_name} ${e.first_name}`,
                searchText: `${e.last_name} ${e.first_name} ${e.first_name} ${e.last_name}`,
              }))}
              value={employeeId}
              onChange={setEmployeeId}
              placeholder="Nessuno"
              searchPlaceholder="Cerca dipendente..."
              emptyText="Nessun dipendente trovato"
            />
          </div>

          <div className="flex items-center gap-3">
            <Switch checked={isShared} onCheckedChange={setIsShared} id="shared" />
            <Label htmlFor="shared">Visibile a tutto lo staff</Label>
          </div>
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
