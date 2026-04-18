import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { MedicalProtocol } from '@/hooks/useMedicina';
import { useCRM } from '@/hooks/useCRM';

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  protocol?: MedicalProtocol | null;
  onSave: (data: Partial<MedicalProtocol>) => Promise<any>;
}

export const ProtocolDialog = ({ open, onOpenChange, protocol, onSave }: Props) => {
  const { contacts } = useCRM();
  const [form, setForm] = useState<Partial<MedicalProtocol>>({});
  const [risksText, setRisksText] = useState('');
  const [examsText, setExamsText] = useState('');

  useEffect(() => {
    if (protocol) {
      setForm(protocol);
      setRisksText((protocol.risks ?? []).join(', '));
      setExamsText(
        Array.isArray(protocol.exams)
          ? protocol.exams.map((e: any) => (typeof e === 'string' ? e : e?.name ?? '')).filter(Boolean).join('\n')
          : ''
      );
    } else {
      setForm({ is_active: true, periodicity_months: 12 });
      setRisksText('');
      setExamsText('');
    }
  }, [protocol, open]);

  const handle = async () => {
    if (!form.name) return;
    const payload: Partial<MedicalProtocol> = {
      ...form,
      risks: risksText.split(',').map((r) => r.trim()).filter(Boolean),
      exams: examsText.split('\n').map((e) => e.trim()).filter(Boolean),
    };
    await onSave(payload);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{protocol ? 'Modifica protocollo' : 'Nuovo protocollo sanitario'}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3">
          <div>
            <Label>Nome protocollo *</Label>
            <Input value={form.name ?? ''} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Es. Protocollo Videoterminalisti" />
          </div>
          <div>
            <Label>Mansione</Label>
            <Input value={form.job_role ?? ''} onChange={(e) => setForm({ ...form, job_role: e.target.value })} />
          </div>
          <div>
            <Label>Azienda (opzionale)</Label>
            <Select value={form.contact_id ?? 'none'} onValueChange={(v) => setForm({ ...form, contact_id: v === 'none' ? null : v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Generico (tutti i clienti)</SelectItem>
                {contacts.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.company || c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Rischi associati (separati da virgola)</Label>
            <Input value={risksText} onChange={(e) => setRisksText(e.target.value)} placeholder="Videoterminale, Movimentazione carichi" />
          </div>
          <div>
            <Label>Esami previsti (uno per riga)</Label>
            <Textarea value={examsText} onChange={(e) => setExamsText(e.target.value)} placeholder="Visita medica generale&#10;Esame oculistico&#10;Audiometria" rows={4} />
          </div>
          <div>
            <Label>Periodicità (mesi)</Label>
            <Input type="number" value={form.periodicity_months ?? ''} onChange={(e) => setForm({ ...form, periodicity_months: e.target.value ? Number(e.target.value) : null })} />
          </div>
          <div>
            <Label>Descrizione</Label>
            <Textarea value={form.description ?? ''} onChange={(e) => setForm({ ...form, description: e.target.value })} />
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
