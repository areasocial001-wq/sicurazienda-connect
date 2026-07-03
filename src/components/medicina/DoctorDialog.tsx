import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import type { MedicalDoctor } from '@/hooks/useMedicina';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { PenTool } from 'lucide-react';

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  doctor?: MedicalDoctor | null;
  onSave: (data: Partial<MedicalDoctor>) => Promise<any>;
}

export const DoctorDialog = ({ open, onOpenChange, doctor, onSave }: Props) => {
  const [form, setForm] = useState<Partial<MedicalDoctor>>({});
  const { user } = useAuth();
  const [sigFile, setSigFile] = useState<File | null>(null);
  const [sigPreview, setSigPreview] = useState<string | null>(null);

  useEffect(() => {
    setForm(doctor ?? { is_active: true });
    setSigFile(null); setSigPreview(null);
  }, [doctor, open]);

  const handle = async () => {
    if (!form.first_name || !form.last_name) return;
    let signature_path = form.signature_path || null;
    if (sigFile && user) {
      const path = `${user.id}/signatures/doctor_${Date.now()}_${sigFile.name.replace(/\s+/g, '_')}`;
      const { error } = await supabase.storage.from('medical-records').upload(path, sigFile, { upsert: true });
      if (error) { toast.error('Errore upload firma'); return; }
      signature_path = path;
    }
    await onSave({ ...form, signature_path });
    onOpenChange(false);
  };

  const onSigChange = (f: File) => {
    setSigFile(f);
    const r = new FileReader(); r.onloadend = () => setSigPreview(r.result as string); r.readAsDataURL(f);
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

          <div className="border-t pt-2">
            <Label className="flex items-center gap-2"><PenTool className="h-4 w-4" />Firma grafica (per giudizi di idoneità)</Label>
            <div className="flex items-center gap-3 mt-1">
              <Input type="file" accept="image/png,image/jpeg" onChange={(e) => e.target.files?.[0] && onSigChange(e.target.files[0])} />
              {sigPreview && <img src={sigPreview} alt="firma" className="h-10 border rounded bg-white p-1" />}
              {!sigPreview && form.signature_path && <span className="text-xs text-muted-foreground">Firma caricata</span>}
            </div>
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
