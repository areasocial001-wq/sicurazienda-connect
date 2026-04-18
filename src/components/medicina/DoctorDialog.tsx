import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import type { MedicalDoctor } from '@/hooks/useMedicina';

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  doctor?: MedicalDoctor | null;
  onSave: (data: Partial<MedicalDoctor>) => Promise<any>;
}

export const DoctorDialog = ({ open, onOpenChange, doctor, onSave }: Props) => {
  const [form, setForm] = useState<Partial<MedicalDoctor>>({});

  useEffect(() => {
    setForm(doctor ?? { is_active: true });
  }, [doctor, open]);

  const handle = async () => {
    if (!form.first_name || !form.last_name) return;
    await onSave(form);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{doctor ? 'Modifica medico' : 'Nuovo medico competente'}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Nome *</Label>
              <Input value={form.first_name ?? ''} onChange={(e) => setForm({ ...form, first_name: e.target.value })} />
            </div>
            <div>
              <Label>Cognome *</Label>
              <Input value={form.last_name ?? ''} onChange={(e) => setForm({ ...form, last_name: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Codice fiscale</Label>
              <Input value={form.fiscal_code ?? ''} onChange={(e) => setForm({ ...form, fiscal_code: e.target.value.toUpperCase() })} />
            </div>
            <div>
              <Label>N° Ordine</Label>
              <Input value={form.order_number ?? ''} onChange={(e) => setForm({ ...form, order_number: e.target.value })} />
            </div>
          </div>
          <div>
            <Label>Ordine medici (provincia)</Label>
            <Input value={form.medical_order ?? ''} onChange={(e) => setForm({ ...form, medical_order: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Email</Label>
              <Input type="email" value={form.email ?? ''} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div>
              <Label>Telefono</Label>
              <Input value={form.phone ?? ''} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
          </div>
          <div>
            <Label>PEC</Label>
            <Input value={form.pec ?? ''} onChange={(e) => setForm({ ...form, pec: e.target.value })} />
          </div>
          <div>
            <Label>Struttura sanitaria convenzionata</Label>
            <Input value={form.facility_name ?? ''} onChange={(e) => setForm({ ...form, facility_name: e.target.value })} />
          </div>
          <div>
            <Label>Indirizzo struttura</Label>
            <Input value={form.facility_address ?? ''} onChange={(e) => setForm({ ...form, facility_address: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Tariffa oraria (€)</Label>
              <Input type="number" step="0.01" value={form.hourly_rate ?? ''} onChange={(e) => setForm({ ...form, hourly_rate: e.target.value ? Number(e.target.value) : null })} />
            </div>
            <div>
              <Label>Tariffa visita (€)</Label>
              <Input type="number" step="0.01" value={form.visit_rate ?? ''} onChange={(e) => setForm({ ...form, visit_rate: e.target.value ? Number(e.target.value) : null })} />
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
