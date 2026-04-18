import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { MedicalVisit, MedicalDoctor, MedicalProtocol } from '@/hooks/useMedicina';
import { useCRM } from '@/hooks/useCRM';
import { supabase } from '@/integrations/supabase/client';

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  visit?: MedicalVisit | null;
  doctors: MedicalDoctor[];
  protocols: MedicalProtocol[];
  defaultContactId?: string | null;
  onSave: (data: Partial<MedicalVisit>) => Promise<any>;
}

const VISIT_TYPES = [
  { value: 'preventiva', label: 'Preventiva (assunzione)' },
  { value: 'periodica', label: 'Periodica' },
  { value: 'cambio_mansione', label: 'Cambio mansione' },
  { value: 'rientro', label: 'Rientro dopo assenza > 60 giorni' },
  { value: 'su_richiesta', label: 'Su richiesta del lavoratore' },
  { value: 'cessazione', label: 'Cessazione rapporto' },
];

const STATUSES = [
  { value: 'scheduled', label: 'Programmata' },
  { value: 'completed', label: 'Eseguita' },
  { value: 'missed', label: 'Non presentato' },
  { value: 'cancelled', label: 'Annullata' },
];

export const VisitDialog = ({ open, onOpenChange, visit, doctors, protocols, defaultContactId, onSave }: Props) => {
  const { contacts } = useCRM();
  const [form, setForm] = useState<Partial<MedicalVisit>>({});
  const [employees, setEmployees] = useState<{ id: string; first_name: string; last_name: string; contact_id: string | null }[]>([]);
  const [empOpen, setEmpOpen] = useState(false);
  const [conOpen, setConOpen] = useState(false);

  useEffect(() => {
    if (visit) setForm(visit);
    else setForm({ visit_type: 'periodica', status: 'scheduled', contact_id: defaultContactId ?? null });
  }, [visit, defaultContactId, open]);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from('crm_employees').select('id, first_name, last_name, contact_id').order('last_name');
      setEmployees(data || []);
    };
    if (open) load();
  }, [open]);

  const filteredEmployees = useMemo(() => {
    if (!form.contact_id) return employees;
    return employees.filter((e) => e.contact_id === form.contact_id);
  }, [employees, form.contact_id]);

  const selectedEmp = employees.find((e) => e.id === form.employee_id);
  const selectedCon = contacts.find((c) => c.id === form.contact_id);

  // Auto next due based on protocol periodicity
  useEffect(() => {
    if (form.execution_date && form.protocol_id && !visit?.next_due_date) {
      const proto = protocols.find((p) => p.id === form.protocol_id);
      if (proto?.periodicity_months) {
        const d = new Date(form.execution_date);
        d.setMonth(d.getMonth() + proto.periodicity_months);
        setForm((f) => ({ ...f, next_due_date: d.toISOString().slice(0, 10) }));
      }
    }
  }, [form.execution_date, form.protocol_id]);

  const handle = async () => {
    if (!form.visit_type) return;
    await onSave(form);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{visit ? 'Modifica visita' : 'Nuova visita medica'}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3">
          <div className="grid md:grid-cols-2 gap-3">
            <div>
              <Label>Azienda</Label>
              <Popover open={conOpen} onOpenChange={setConOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" role="combobox" className="w-full justify-between">
                    {selectedCon ? (selectedCon.company || selectedCon.name) : 'Seleziona azienda...'}
                    <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
                  <Command>
                    <CommandInput placeholder="Cerca azienda..." />
                    <CommandList>
                      <CommandEmpty>Nessuna azienda</CommandEmpty>
                      <CommandGroup>
                        <CommandItem onSelect={() => { setForm({ ...form, contact_id: null, employee_id: null }); setConOpen(false); }}>
                          — Nessuna —
                        </CommandItem>
                        {contacts.map((c) => (
                          <CommandItem key={c.id} value={`${c.company} ${c.name}`} onSelect={() => { setForm({ ...form, contact_id: c.id, employee_id: null }); setConOpen(false); }}>
                            <Check className={cn('mr-2 h-4 w-4', form.contact_id === c.id ? 'opacity-100' : 'opacity-0')} />
                            {c.company || c.name}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
            <div>
              <Label>Dipendente</Label>
              <Popover open={empOpen} onOpenChange={setEmpOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" role="combobox" className="w-full justify-between">
                    {selectedEmp ? `${selectedEmp.first_name} ${selectedEmp.last_name}` : 'Seleziona dipendente...'}
                    <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
                  <Command>
                    <CommandInput placeholder="Cerca dipendente..." />
                    <CommandList>
                      <CommandEmpty>Nessun dipendente</CommandEmpty>
                      <CommandGroup>
                        {filteredEmployees.map((e) => (
                          <CommandItem key={e.id} value={`${e.first_name} ${e.last_name}`} onSelect={() => { setForm({ ...form, employee_id: e.id, contact_id: e.contact_id ?? form.contact_id ?? null }); setEmpOpen(false); }}>
                            <Check className={cn('mr-2 h-4 w-4', form.employee_id === e.id ? 'opacity-100' : 'opacity-0')} />
                            {e.first_name} {e.last_name}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-3">
            <div>
              <Label>Tipo visita</Label>
              <Select value={form.visit_type} onValueChange={(v) => setForm({ ...form, visit_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {VISIT_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Stato</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUSES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-3">
            <div>
              <Label>Protocollo</Label>
              <Select value={form.protocol_id ?? 'none'} onValueChange={(v) => setForm({ ...form, protocol_id: v === 'none' ? null : v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— Nessuno —</SelectItem>
                  {protocols.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Medico competente</Label>
              <Select value={form.doctor_id ?? 'none'} onValueChange={(v) => setForm({ ...form, doctor_id: v === 'none' ? null : v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— Nessuno —</SelectItem>
                  {doctors.map((d) => <SelectItem key={d.id} value={d.id}>Dr. {d.first_name} {d.last_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-3">
            <div>
              <Label>Data programmata</Label>
              <Input type="date" value={form.scheduled_date ?? ''} onChange={(e) => setForm({ ...form, scheduled_date: e.target.value || null })} />
            </div>
            <div>
              <Label>Data esecuzione</Label>
              <Input type="date" value={form.execution_date ?? ''} onChange={(e) => setForm({ ...form, execution_date: e.target.value || null })} />
            </div>
            <div>
              <Label>Prossima scadenza</Label>
              <Input type="date" value={form.next_due_date ?? ''} onChange={(e) => setForm({ ...form, next_due_date: e.target.value || null })} />
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-3">
            <div>
              <Label>Sede / luogo</Label>
              <Input value={form.location ?? ''} onChange={(e) => setForm({ ...form, location: e.target.value })} />
            </div>
            <div>
              <Label>Costo (€)</Label>
              <Input type="number" step="0.01" value={form.cost ?? ''} onChange={(e) => setForm({ ...form, cost: e.target.value ? Number(e.target.value) : null })} />
            </div>
          </div>

          <div>
            <Label>Note</Label>
            <Textarea value={form.notes ?? ''} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annulla</Button>
          <Button onClick={handle}>Salva</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
