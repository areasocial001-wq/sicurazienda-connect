import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Check, ChevronsUpDown, Gavel } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { MedicalJudgment, MedicalDoctor, MedicalVisit } from '@/hooks/useMedicina';
import { supabase } from '@/integrations/supabase/client';

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  judgment?: MedicalJudgment | null;
  doctors: MedicalDoctor[];
  visits: MedicalVisit[];
  /** When set, pre-fills visit + employee + doctor. */
  defaultVisitId?: string | null;
  defaultEmployeeId?: string | null;
  onSave: (data: Partial<MedicalJudgment>) => Promise<any>;
}

export const JUDGMENT_OPTIONS = [
  { value: 'idoneo', label: 'Idoneo alla mansione', color: 'text-green-600' },
  { value: 'idoneo_con_limitazioni', label: 'Idoneo con limitazioni / prescrizioni', color: 'text-amber-600' },
  { value: 'idoneo_con_prescrizioni', label: 'Idoneo con prescrizioni', color: 'text-amber-600' },
  { value: 'non_idoneo_temporaneo', label: 'Non idoneo temporaneo', color: 'text-orange-600' },
  { value: 'non_idoneo_permanente', label: 'Non idoneo permanente', color: 'text-destructive' },
  { value: 'sospeso', label: 'Giudizio sospeso (accertamenti)', color: 'text-muted-foreground' },
];

export const JudgmentDialog = ({ open, onOpenChange, judgment, doctors, visits, defaultVisitId, defaultEmployeeId, onSave }: Props) => {
  const [form, setForm] = useState<Partial<MedicalJudgment>>({});
  const [employees, setEmployees] = useState<{ id: string; first_name: string; last_name: string; contact_id: string | null }[]>([]);
  const [empOpen, setEmpOpen] = useState(false);
  const [visitOpen, setVisitOpen] = useState(false);

  useEffect(() => {
    if (judgment) {
      setForm(judgment);
    } else {
      const v = defaultVisitId ? visits.find((x) => x.id === defaultVisitId) : null;
      setForm({
        judgment: 'idoneo',
        judgment_date: new Date().toISOString().slice(0, 10),
        visit_id: defaultVisitId ?? null,
        employee_id: defaultEmployeeId ?? v?.employee_id ?? null,
        doctor_id: v?.doctor_id ?? null,
      });
    }
  }, [judgment, defaultVisitId, defaultEmployeeId, open, visits]);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from('crm_employees').select('id, first_name, last_name, contact_id').order('last_name');
      setEmployees(data || []);
    };
    if (open) load();
  }, [open]);

  const selectedEmp = employees.find((e) => e.id === form.employee_id);
  const selectedVisit = visits.find((v) => v.id === form.visit_id);

  // Filter visits by employee if selected
  const filteredVisits = useMemo(() => {
    if (!form.employee_id) return visits.filter((v) => v.execution_date).slice(0, 100);
    return visits.filter((v) => v.employee_id === form.employee_id);
  }, [visits, form.employee_id]);

  const handle = async () => {
    if (!form.judgment || !form.judgment_date) return;
    await onSave(form);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Gavel className="h-5 w-5 text-primary" />
            {judgment ? 'Modifica giudizio' : 'Nuovo giudizio di idoneità'}
          </DialogTitle>
          <DialogDescription>
            Esito della sorveglianza sanitaria ai sensi dell'art. 41 D.Lgs. 81/08
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3">
          <div className="grid md:grid-cols-2 gap-3">
            <div>
              <Label>Dipendente *</Label>
              <Popover open={empOpen} onOpenChange={setEmpOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" role="combobox" className="w-full justify-between">
                    {selectedEmp ? `${selectedEmp.last_name} ${selectedEmp.first_name}` : 'Seleziona dipendente...'}
                    <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
                  <Command>
                    <CommandInput placeholder="Cerca dipendente..." />
                    <CommandList>
                      <CommandEmpty>Nessun dipendente</CommandEmpty>
                      <CommandGroup>
                        {employees.map((e) => (
                          <CommandItem key={e.id} value={`${e.last_name} ${e.first_name}`} onSelect={() => { setForm({ ...form, employee_id: e.id }); setEmpOpen(false); }}>
                            <Check className={cn('mr-2 h-4 w-4', form.employee_id === e.id ? 'opacity-100' : 'opacity-0')} />
                            {e.last_name} {e.first_name}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
            <div>
              <Label>Visita di riferimento</Label>
              <Popover open={visitOpen} onOpenChange={setVisitOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" role="combobox" className="w-full justify-between">
                    {selectedVisit ? `${selectedVisit.visit_type} · ${selectedVisit.execution_date || selectedVisit.scheduled_date || ''}` : '— Nessuna —'}
                    <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
                  <Command>
                    <CommandInput placeholder="Cerca visita..." />
                    <CommandList>
                      <CommandEmpty>Nessuna visita</CommandEmpty>
                      <CommandGroup>
                        <CommandItem onSelect={() => { setForm({ ...form, visit_id: null }); setVisitOpen(false); }}>— Nessuna —</CommandItem>
                        {filteredVisits.map((v) => (
                          <CommandItem key={v.id} value={`${v.visit_type} ${v.execution_date}`} onSelect={() => {
                            setForm({ ...form, visit_id: v.id, employee_id: v.employee_id ?? form.employee_id, doctor_id: v.doctor_id ?? form.doctor_id });
                            setVisitOpen(false);
                          }}>
                            <Check className={cn('mr-2 h-4 w-4', form.visit_id === v.id ? 'opacity-100' : 'opacity-0')} />
                            {v.visit_type} · {v.execution_date || v.scheduled_date || '—'}
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
              <Label>Esito giudizio *</Label>
              <Select value={form.judgment} onValueChange={(v) => setForm({ ...form, judgment: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {JUDGMENT_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      <span className={o.color}>{o.label}</span>
                    </SelectItem>
                  ))}
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

          <div className="grid md:grid-cols-2 gap-3">
            <div>
              <Label>Data giudizio *</Label>
              <Input type="date" value={form.judgment_date ?? ''} onChange={(e) => setForm({ ...form, judgment_date: e.target.value })} />
            </div>
            <div>
              <Label>Valido fino al</Label>
              <Input type="date" value={form.valid_until ?? ''} onChange={(e) => setForm({ ...form, valid_until: e.target.value || null })} />
            </div>
          </div>

          <div>
            <Label>Limitazioni</Label>
            <Textarea
              rows={2}
              value={form.limitations ?? ''}
              onChange={(e) => setForm({ ...form, limitations: e.target.value })}
              placeholder="Es: non sollevamento carichi > 10kg, no lavoro in altezza..."
            />
          </div>

          <div>
            <Label>Prescrizioni</Label>
            <Textarea
              rows={2}
              value={form.prescriptions ?? ''}
              onChange={(e) => setForm({ ...form, prescriptions: e.target.value })}
              placeholder="Es: utilizzo DPI specifici, controlli periodici..."
            />
          </div>

          <div>
            <Label>Note</Label>
            <Textarea rows={2} value={form.notes ?? ''} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annulla</Button>
          <Button onClick={handle}>Salva giudizio</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
