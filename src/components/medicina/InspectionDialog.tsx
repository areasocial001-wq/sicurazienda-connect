import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { MedicalInspection, MedicalDoctor } from '@/hooks/useMedicina';
import { useCRM } from '@/hooks/useCRM';

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  inspection?: MedicalInspection | null;
  doctors: MedicalDoctor[];
  onSave: (data: Partial<MedicalInspection>) => Promise<any>;
}

const STATUSES = [
  { value: 'pianificato', label: 'Pianificato' },
  { value: 'eseguito', label: 'Eseguito' },
  { value: 'annullato', label: 'Annullato' },
];

export const InspectionDialog = ({ open, onOpenChange, inspection, doctors, onSave }: Props) => {
  const { contacts } = useCRM();
  const [form, setForm] = useState<Partial<MedicalInspection>>({});

  useEffect(() => {
    if (inspection) setForm(inspection);
    else setForm({ status: 'pianificato', inspection_date: new Date().toISOString().slice(0, 10) });
  }, [inspection, open]);

  const handle = async () => {
    if (!form.inspection_date) return;
    await onSave(form);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{inspection ? 'Modifica sopralluogo' : 'Nuovo sopralluogo medico'}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Data *</Label>
              <Input type="date" value={form.inspection_date ?? ''} onChange={(e) => setForm({ ...form, inspection_date: e.target.value })} />
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
          <div>
            <Label>Partecipanti</Label>
            <Input value={form.participants ?? ''} onChange={(e) => setForm({ ...form, participants: e.target.value })} placeholder="RSPP, RLS, datore di lavoro..." />
          </div>
          <div>
            <Label>Argomenti / aree visitate</Label>
            <Textarea value={form.topics ?? ''} onChange={(e) => setForm({ ...form, topics: e.target.value })} />
          </div>
          <div>
            <Label>Rilievi</Label>
            <Textarea value={form.findings ?? ''} onChange={(e) => setForm({ ...form, findings: e.target.value })} />
          </div>
          <div>
            <Label>Raccomandazioni</Label>
            <Textarea value={form.recommendations ?? ''} onChange={(e) => setForm({ ...form, recommendations: e.target.value })} />
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
