import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calculator, FileDown, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import type { MedicalAnnualReport, MedicalDoctor } from '@/hooks/useMedicina';
import { useCRM } from '@/hooks/useCRM';
import { useMedicina } from '@/hooks/useMedicina';
import { computeAnnualStats, generateAndDownloadAnnualReport } from './annualReportPDF';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

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
  const { user } = useAuth();
  const m = useMedicina();
  const [form, setForm] = useState<Partial<MedicalAnnualReport>>({});
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    if (report) setForm(report);
    else setForm({ status: 'bozza', reference_year: new Date().getFullYear() });
  }, [report, open]);

  const handle = async () => {
    if (!form.reference_year) return;
    await onSave(form);
    onOpenChange(false);
  };

  const autoCalc = () => {
    if (!form.reference_year) {
      toast.error('Imposta un anno di riferimento');
      return;
    }
    const stats = computeAnnualStats(m.visits, m.judgments, form.reference_year, form.contact_id);
    setForm({
      ...form,
      total_workers: stats.total_workers,
      visits_performed: stats.visits_performed,
      fit_count: stats.fit_count,
      fit_with_limitations_count: stats.fit_with_limitations_count,
      unfit_count: stats.unfit_count,
    });
    toast.success(`Calcolo: ${stats.visits_performed} visite, ${stats.total_workers} lavoratori`);
  };

  const generatePDF = async () => {
    if (!form.reference_year) {
      toast.error('Imposta un anno di riferimento');
      return;
    }
    setGenerating(true);
    try {
      // Save first if new
      let saved = report;
      if (!saved?.id) {
        saved = await onSave(form);
        if (!saved?.id) {
          toast.error('Salva prima la relazione');
          return;
        }
      }

      const { data: branding } = await supabase
        .from('course_branding_settings')
        .select('*')
        .limit(1)
        .maybeSingle();

      const contact = form.contact_id ? contacts.find((c) => c.id === form.contact_id) : null;
      const doctor = form.doctor_id ? doctors.find((d) => d.id === form.doctor_id) : null;

      await generateAndDownloadAnnualReport(
        {
          report: { ...saved, ...form } as MedicalAnnualReport,
          doctor,
          contact: contact ? {
            id: contact.id,
            name: contact.name,
            company: contact.company,
            address: contact.address,
            vat_number: contact.vat_number,
            fiscal_code: contact.fiscal_code,
          } : null,
          branding: branding as any,
          visits: m.visits,
          judgments: m.judgments,
        },
        { upload: true, userId: user?.id }
      );
      toast.success('PDF generato e archiviato');
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || 'Errore generazione PDF');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{report ? 'Modifica relazione annuale' : 'Nuova relazione annuale (art. 25)'}</DialogTitle>
          <DialogDescription>
            Allegato 3B — Riepilogo dati anonimi collettivi della sorveglianza sanitaria
          </DialogDescription>
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

          <div className="flex items-center justify-between bg-muted/50 rounded-md px-3 py-2">
            <div>
              <p className="text-sm font-medium">Dati Allegato 3B</p>
              <p className="text-xs text-muted-foreground">Calcola automaticamente da visite e giudizi dell'anno selezionato</p>
            </div>
            <Button type="button" size="sm" variant="outline" onClick={autoCalc}>
              <Calculator className="h-4 w-4 mr-1" /> Auto-calcola
            </Button>
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
            <Label>Considerazioni del Medico Competente</Label>
            <Textarea value={form.content ?? ''} onChange={(e) => setForm({ ...form, content: e.target.value })} rows={5} placeholder="Sintesi degli esiti, criticità rilevate, proposte di miglioramento..." />
          </div>
          <div>
            <Label>Note interne</Label>
            <Textarea value={form.notes ?? ''} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>
        </div>
        <DialogFooter className="gap-2 sm:justify-between">
          <Button type="button" variant="secondary" onClick={generatePDF} disabled={generating}>
            {generating ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" />Generazione...</> : <><FileDown className="h-4 w-4 mr-1" />Genera PDF Allegato 3B</>}
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Annulla</Button>
            <Button onClick={handle}>Salva</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
