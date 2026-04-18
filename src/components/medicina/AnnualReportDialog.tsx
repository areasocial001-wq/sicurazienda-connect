import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { MedicalAnnualReport, MedicalDoctor } from '@/hooks/useMedicina';
import { useCRM } from '@/hooks/useCRM';

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  report?: MedicalAnnualReport | null;
  doctors: MedicalDoctor[];
  onSave: (data: Partial<MedicalAnnualReport>) => Promise<any>;
}

const STATUSES = [
  { value: 'bozza', label: 'Bozza' },
  { value: 'definitiva', label: 'Definitiva' },
  { value: 'inviata', label: 'Inviata' },
];

export const AnnualReportDialog = ({ open, onOpenChange, report, doctors, onSave }: Props) => {
  const { contacts } = useCRM();
  const [form, setForm] = useState<Partial<MedicalAnnualReport>>({});

  useEffect(() => {
    if (report) setForm(report);
    else setForm({ status: 'bozza', reference_year: new Date().getFullYear() });
  }, [report, open]);

  const handle = async () => {
    if (!form.reference_year) return;
    await onSave(form);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{report ? 'Modifica relazione annuale' : 'Nuova relazione annuale (art. 25)'}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>Anno *</Label>
              <Input type="number" value={form.reference_year ?? ''} onChange={(e) => setForm({ ...form, reference_year: Number(e.target.value) })} />
            </div>
            <div>
              <Label>Data relazione</Label>
              <Input type="date" value={form.report_date ?? ''} onChange={(e) => setForm({ ...form, report_date: e.target.value || null })} />
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
              <Label>Azienda</Label>
              <Select value={form.contact_id ?? 'none'} onValueChange={(v) => setForm({ ...form, contact_id: v === 'none' ? null : v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— Nessuna —</SelectItem>
                  {contacts.map((c) => <SelectItem key={c.id} value={c.id}>{c.company || c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Medico</Label>
              <Select value={form.doctor_id ?? 'none'} onValueChange={(v) => setForm({ ...form, doctor_id: v === 'none' ? null : v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— Nessuno —</SelectItem>
                  {doctors.map((d) => <SelectItem key={d.id} value={d.id}>Dr. {d.first_name} {d.last_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <div>
              <Label>Lavoratori</Label>
              <Input type="number" value={form.total_workers ?? ''} onChange={(e) => setForm({ ...form, total_workers: e.target.value ? Number(e.target.value) : null })} />
            </div>
            <div>
              <Label>Visite eseguite</Label>
              <Input type="number" value={form.visits_performed ?? ''} onChange={(e) => setForm({ ...form, visits_performed: e.target.value ? Number(e.target.value) : null })} />
            </div>
            <div>
              <Label>Idonei</Label>
              <Input type="number" value={form.fit_count ?? ''} onChange={(e) => setForm({ ...form, fit_count: e.target.value ? Number(e.target.value) : null })} />
            </div>
            <div>
              <Label>Con limit.</Label>
              <Input type="number" value={form.fit_with_limitations_count ?? ''} onChange={(e) => setForm({ ...form, fit_with_limitations_count: e.target.value ? Number(e.target.value) : null })} />
            </div>
            <div>
              <Label>Non idonei</Label>
              <Input type="number" value={form.unfit_count ?? ''} onChange={(e) => setForm({ ...form, unfit_count: e.target.value ? Number(e.target.value) : null })} />
            </div>
          </div>
          <div>
            <Label>Contenuto / sintesi</Label>
            <Textarea value={form.content ?? ''} onChange={(e) => setForm({ ...form, content: e.target.value })} rows={5} />
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
