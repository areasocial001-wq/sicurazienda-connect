import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { Loader2, Mail, Send, FileDown } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { it } from 'date-fns/locale';

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  visit: any; // MedicalVisit
  contactName?: string;
  doctorName?: string;
  onSent?: () => void;
}

export const ConvocationDialog = ({ open, onOpenChange, visit, contactName, doctorName, onSent }: Props) => {
  const { user } = useAuth();
  const [employee, setEmployee] = useState<any>(null);
  const [protocol, setProtocol] = useState<any>(null);
  const [recipient, setRecipient] = useState('');
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [location, setLocation] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!open || !visit) return;
    (async () => {
      if (visit.employee_id) {
        const { data } = await supabase.from('crm_employees').select('id, first_name, last_name, email, fiscal_code').eq('id', visit.employee_id).maybeSingle();
        setEmployee(data);
        setRecipient(data?.email || '');
      }
      if (visit.protocol_id) {
        const { data } = await (supabase as any).from('medical_protocols').select('*').eq('id', visit.protocol_id).maybeSingle();
        setProtocol(data);
      } else {
        setProtocol(null);
      }
      setScheduledDate(visit.scheduled_date || '');
      setScheduledTime('');
      setLocation(visit.location || '');
    })();
  }, [open, visit]);

  const examsList = useMemo(() => {
    const raw = Array.isArray(protocol?.exams) ? protocol.exams : [];
    return raw.map((e: any) => typeof e === 'string' ? e : e?.name).filter(Boolean);
  }, [protocol]);

  const buildTemplate = () => {
    const empName = employee ? `${employee.first_name} ${employee.last_name}` : '[Nome Cognome dipendente]';
    const dateStr = scheduledDate ? format(parseISO(scheduledDate), 'EEEE d MMMM yyyy', { locale: it }) : '[data]';
    const timeStr = scheduledTime ? ` alle ore ${scheduledTime}` : '';
    const loc = location || '[luogo della visita]';
    const doc = doctorName || '[Medico Competente]';
    const company = contactName || '';
    const typeLbl = ({ preventiva: 'preventiva', periodica: 'periodica', cambio_mansione: 'per cambio mansione', rientro: 'di rientro', su_richiesta: 'su richiesta del lavoratore', cessazione: 'in fase di cessazione' } as any)[visit.visit_type] || visit.visit_type;

    const examsHtml = examsList.length
      ? `<p><strong>Accertamenti previsti dal protocollo sanitario:</strong></p><ul>${examsList.map((e: string) => `<li>${e}</li>`).join('')}</ul>`
      : '';

    setSubject(`Convocazione visita medica ${typeLbl} - ${empName}`);
    setBody(`
<div style="font-family: Arial, sans-serif; color:#222; max-width:640px;">
  <p>Gentile <strong>${empName}</strong>,</p>
  <p>ai sensi del D.Lgs. 81/08 e s.m.i., ${company ? `su richiesta del datore di lavoro <strong>${company}</strong>, ` : ''}è convocato/a per la visita medica <strong>${typeLbl}</strong> di sorveglianza sanitaria.</p>
  <table style="border-collapse:collapse;margin:12px 0;">
    <tr><td style="padding:4px 12px 4px 0;"><strong>Data:</strong></td><td>${dateStr}${timeStr}</td></tr>
    <tr><td style="padding:4px 12px 4px 0;"><strong>Luogo:</strong></td><td>${loc}</td></tr>
    <tr><td style="padding:4px 12px 4px 0;"><strong>Medico Competente:</strong></td><td>${doc}</td></tr>
  </table>
  ${examsHtml}
  <p><strong>Si raccomanda di:</strong></p>
  <ul>
    <li>presentarsi con documento d'identità in corso di validità e tessera sanitaria;</li>
    <li>portare eventuale documentazione sanitaria pregressa pertinente;</li>
    <li>essere a digiuno da almeno 8 ore in caso di prelievo ematico;</li>
    <li>segnalare tempestivamente ogni impossibilità a presentarsi.</li>
  </ul>
  <p>La mancata presentazione, salvo giustificato motivo, comporta l'impossibilità di esprimere il giudizio di idoneità alla mansione con le conseguenze previste dalla normativa vigente.</p>
  <p>Cordiali saluti,<br/>${doc}</p>
  <hr style="border:none;border-top:1px solid #ddd;margin-top:16px;"/>
  <p style="font-size:11px;color:#666;">Comunicazione automatica dal sistema di gestione della Medicina del Lavoro. Trattamento dati ex art. 25 D.Lgs. 81/08 e Reg. UE 2016/679.</p>
</div>`.trim());
  };

  useEffect(() => { if (open && !body) buildTemplate(); }, [open, employee, protocol, scheduledDate, scheduledTime, location]);

  const saveDraft = async (): Promise<string | null> => {
    if (!user) return null;
    setSaving(true);
    try {
      const payload: any = {
        user_id: user.id,
        visit_id: visit.id,
        employee_id: visit.employee_id,
        contact_id: visit.contact_id,
        protocol_id: visit.protocol_id,
        doctor_id: visit.doctor_id,
        scheduled_date: scheduledDate || visit.scheduled_date || null,
        scheduled_time: scheduledTime || null,
        location: location || null,
        visit_type: visit.visit_type,
        recipient_email: recipient || null,
        subject,
        body_html: body,
        status: 'draft',
      };
      const { data, error } = await (supabase as any).from('medical_convocations').insert(payload).select().single();
      if (error) { toast.error(error.message); return null; }
      toast.success('Bozza salvata');
      return data.id;
    } finally {
      setSaving(false);
    }
  };

  const sendEmail = async () => {
    if (!recipient) { toast.error('Email destinatario mancante'); return; }
    setSending(true);
    try {
      const id = await saveDraft();
      if (!id) return;
      const { error } = await supabase.functions.invoke('send-medical-convocation', { body: { convocation_id: id } });
      if (error) { toast.error(`Invio fallito: ${error.message}`); return; }
      toast.success('Convocazione inviata');
      onSent?.();
      onOpenChange(false);
    } finally {
      setSending(false);
    }
  };

  const downloadPdf = () => {
    const w = window.open('', '_blank', 'width=800,height=900');
    if (!w) return;
    w.document.write(`<!doctype html><html><head><meta charset="utf-8"/><title>${subject}</title></head><body>${body}<script>window.onload=()=>{setTimeout(()=>window.print(),300)}<\/script></body></html>`);
    w.document.close();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Mail className="h-5 w-5 text-primary" />Lettera di convocazione visita medica</DialogTitle>
        </DialogHeader>

        <div className="grid gap-3">
          <div className="grid sm:grid-cols-3 gap-2">
            <div>
              <Label>Data visita</Label>
              <Input type="date" value={scheduledDate} onChange={(e) => { setScheduledDate(e.target.value); setBody(''); }} />
            </div>
            <div>
              <Label>Ora</Label>
              <Input type="time" value={scheduledTime} onChange={(e) => { setScheduledTime(e.target.value); setBody(''); }} />
            </div>
            <div>
              <Label>Luogo</Label>
              <Input value={location} onChange={(e) => { setLocation(e.target.value); setBody(''); }} placeholder="Studio medico / sede aziendale" />
            </div>
          </div>
          <div>
            <Label>Email destinatario</Label>
            <Input type="email" value={recipient} onChange={(e) => setRecipient(e.target.value)} placeholder="dipendente@azienda.it" />
            {employee && !employee.email && <p className="text-xs text-amber-600 mt-1">⚠ Il dipendente non ha email in anagrafica</p>}
          </div>
          <div>
            <Label>Oggetto</Label>
            <Input value={subject} onChange={(e) => setSubject(e.target.value)} />
          </div>
          <div>
            <div className="flex items-center justify-between">
              <Label>Testo email (HTML)</Label>
              <Button type="button" size="sm" variant="ghost" onClick={buildTemplate}>Rigenera dal template</Button>
            </div>
            <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={12} className="font-mono text-xs" />
          </div>
          {body && (
            <div>
              <Label className="text-xs text-muted-foreground">Anteprima</Label>
              <div className="border rounded p-3 bg-muted/20 max-h-64 overflow-y-auto" dangerouslySetInnerHTML={{ __html: body }} />
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Chiudi</Button>
          <Button variant="outline" onClick={downloadPdf} disabled={!body}><FileDown className="h-4 w-4 mr-1" />Stampa PDF</Button>
          <Button variant="secondary" onClick={saveDraft} disabled={saving || !body}>{saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : null}Salva bozza</Button>
          <Button onClick={sendEmail} disabled={sending || !recipient || !body}>
            {sending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Send className="h-4 w-4 mr-1" />}
            Invia email
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};