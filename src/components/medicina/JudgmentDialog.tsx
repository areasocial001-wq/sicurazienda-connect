import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Check, ChevronsUpDown, Gavel, Printer, Upload, PenTool } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { MedicalJudgment, MedicalDoctor, MedicalVisit, MedicalProtocol } from '@/hooks/useMedicina';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { generateJudgmentPDF } from './judgmentPDF';
import { useAuth } from '@/hooks/useAuth';
import { Badge } from '@/components/ui/badge';
import { JudgmentHistoryList } from './JudgmentHistoryList';

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  judgment?: MedicalJudgment | null;
  doctors: MedicalDoctor[];
  visits: MedicalVisit[];
  protocols?: MedicalProtocol[];
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

export const JudgmentDialog = ({ open, onOpenChange, judgment, doctors, visits, protocols = [], defaultVisitId, defaultEmployeeId, onSave }: Props) => {
  const { user } = useAuth();
  const [form, setForm] = useState<Partial<MedicalJudgment>>({});
  const [employees, setEmployees] = useState<{ id: string; first_name: string; last_name: string; contact_id: string | null }[]>([]);
  const [empOpen, setEmpOpen] = useState(false);
  const [visitOpen, setVisitOpen] = useState(false);
  const [signatureFile, setSignatureFile] = useState<File | null>(null);
  const [signaturePreview, setSignaturePreview] = useState<string | null>(null);
  const [printing, setPrinting] = useState(false);

  useEffect(() => {
    if (judgment) {
      setForm(judgment);
      setSignaturePreview(null); setSignatureFile(null);
    } else {
      const v = defaultVisitId ? visits.find((x) => x.id === defaultVisitId) : null;
      const proto = v?.protocol_id ? protocols.find((p) => p.id === v.protocol_id) : null;
      setForm({
        judgment: 'idoneo',
        judgment_date: new Date().toISOString().slice(0, 10),
        visit_id: defaultVisitId ?? null,
        employee_id: defaultEmployeeId ?? v?.employee_id ?? null,
        doctor_id: v?.doctor_id ?? null,
        protocol_id: v?.protocol_id ?? null,
        contact_id: v?.contact_id ?? null,
        visit_type: v?.visit_type ?? null,
        visit_date: v?.execution_date ?? v?.scheduled_date ?? null,
        job_role: proto?.job_role ?? null,
        risks_evaluated: proto?.risks ?? [],
        exams_evaluated: v?.exams_performed ?? proto?.exams ?? null,
      });
      setSignaturePreview(null); setSignatureFile(null);
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
  const selectedDoctor = doctors.find((d) => d.id === form.doctor_id);
  const selectedProtocol = protocols.find((p) => p.id === form.protocol_id);

  // Filter visits by employee if selected
  const filteredVisits = useMemo(() => {
    if (!form.employee_id) return visits.filter((v) => v.execution_date).slice(0, 100);
    return visits.filter((v) => v.employee_id === form.employee_id);
  }, [visits, form.employee_id]);

  const onVisitSelected = (v: MedicalVisit) => {
    const proto = v.protocol_id ? protocols.find((p) => p.id === v.protocol_id) : null;
    setForm((f) => ({
      ...f,
      visit_id: v.id,
      employee_id: v.employee_id ?? f.employee_id,
      doctor_id: v.doctor_id ?? f.doctor_id,
      protocol_id: v.protocol_id ?? f.protocol_id,
      contact_id: v.contact_id ?? f.contact_id,
      visit_type: v.visit_type ?? f.visit_type,
      visit_date: v.execution_date ?? v.scheduled_date ?? f.visit_date,
      job_role: proto?.job_role ?? f.job_role,
      risks_evaluated: proto?.risks ?? f.risks_evaluated,
      exams_evaluated: v.exams_performed ?? f.exams_evaluated,
    }));
    setVisitOpen(false);
  };

  const onSignatureFile = async (file: File) => {
    setSignatureFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setSignaturePreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const uploadSignature = async (): Promise<string | null> => {
    if (!signatureFile || !user) return form.signature_path || null;
    const path = `${user.id}/signatures/judgment_${Date.now()}_${signatureFile.name.replace(/\s+/g, '_')}`;
    const { error } = await supabase.storage.from('medical-records').upload(path, signatureFile, { upsert: true });
    if (error) { toast.error('Errore upload firma'); return null; }
    return path;
  };

  const handle = async () => {
    if (!form.judgment || !form.judgment_date) return;
    let payload = { ...form };
    if (signatureFile) {
      const p = await uploadSignature();
      if (p) payload.signature_path = p;
    }
    await onSave(payload);
    onOpenChange(false);
  };

  const handlePrintAndArchive = async () => {
    if (!user || !form.employee_id || !form.judgment_date) { toast.error('Compila dipendente e data'); return; }
    setPrinting(true);
    try {
      let sigPath = form.signature_path || null;
      if (signatureFile) sigPath = await uploadSignature();
      const payload: any = { ...form, signature_path: sigPath };

      // Save/create judgment first to obtain id
      const saved = await onSave(payload);
      const judgmentRow: any = saved || payload;

      // Load company / employee full data
      const { data: emp } = await supabase.from('crm_employees').select('first_name,last_name,fiscal_code,birth_date,birth_place,contact_id').eq('id', form.employee_id).maybeSingle();
      let company: any = null;
      if (emp?.contact_id) {
        const { data: c } = await supabase.from('crm_contacts').select('name,company,vat_number,address').eq('id', emp.contact_id).maybeSingle();
        company = c;
      }

      const blob = await generateJudgmentPDF({
        judgment: judgmentRow,
        employee: emp as any,
        company,
        doctor: selectedDoctor ? { first_name: selectedDoctor.first_name, last_name: selectedDoctor.last_name, medical_order: selectedDoctor.medical_order, order_number: selectedDoctor.order_number, signature_path: selectedDoctor.signature_path as any } : null,
        protocol: selectedProtocol ? { name: selectedProtocol.name, job_role: selectedProtocol.job_role, risks: selectedProtocol.risks } : null,
        visit: selectedVisit ? { visit_type: selectedVisit.visit_type, execution_date: selectedVisit.execution_date, scheduled_date: selectedVisit.scheduled_date } : null,
        signatureDataUrl: signaturePreview,
      });

      const version = ((judgmentRow.signed_pdf_version || 0) as number) + 1;
      const fname = `giudizio_${(emp?.last_name || 'lav').toLowerCase()}_${form.judgment_date}_v${version}.pdf`;
      const path = `${user.id}/${form.employee_id}/judgments/${Date.now()}_${fname}`;
      const { error: upErr } = await supabase.storage.from('medical-records').upload(path, blob, { contentType: 'application/pdf', upsert: false });
      if (upErr) throw upErr;

      // Register file in health folder
      const { data: hf, error: hfErr } = await (supabase as any).from('medical_health_files').insert({
        user_id: user.id,
        uploaded_by: user.id,
        employee_id: form.employee_id,
        contact_id: emp?.contact_id || null,
        visit_id: form.visit_id || null,
        document_type: 'certificato_idoneita',
        document_date: form.judgment_date,
        description: `Giudizio idoneità v${version} — ${form.judgment}`,
        file_name: fname,
        file_path: path,
        file_size: blob.size,
        file_type: 'application/pdf',
      }).select().single();
      if (hfErr) throw hfErr;

      // Update judgment with PDF version + link
      if (judgmentRow.id) {
        await (supabase as any).from('medical_judgments').update({
          signed_pdf_path: path,
          signed_pdf_version: version,
          health_file_id: hf.id,
          signature_path: sigPath,
        }).eq('id', judgmentRow.id);
      }

      // Preview download
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');

      toast.success('Giudizio stampato e archiviato in cartella sanitaria');
      onOpenChange(false);
    } catch (e: any) {
      console.error(e); toast.error(e.message || 'Errore stampa/archiviazione');
    } finally { setPrinting(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
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
                            onVisitSelected(v);
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

          {/* Protocollo + Mansione + Rischi */}
          <div className="border-t pt-3 grid md:grid-cols-2 gap-3">
            <div>
              <Label>Protocollo sanitario</Label>
              <Select value={form.protocol_id ?? 'none'} onValueChange={(v) => {
                if (v === 'none') { setForm({ ...form, protocol_id: null }); return; }
                const p = protocols.find((x) => x.id === v);
                setForm({ ...form, protocol_id: v, job_role: p?.job_role ?? form.job_role, risks_evaluated: p?.risks ?? form.risks_evaluated, exams_evaluated: form.exams_evaluated ?? p?.exams ?? null });
              }}>
                <SelectTrigger><SelectValue placeholder="— Seleziona —" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— Nessuno —</SelectItem>
                  {protocols.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Mansione</Label>
              <Input value={form.job_role ?? ''} onChange={(e) => setForm({ ...form, job_role: e.target.value })} />
            </div>
          </div>
          {(form.risks_evaluated || []).length > 0 && (
            <div className="flex flex-wrap gap-1">
              {(form.risks_evaluated || []).map((r) => <Badge key={r} variant="outline">{r}</Badge>)}
            </div>
          )}

          {/* Firma grafica */}
          <div className="border-t pt-3">
            <Label className="flex items-center gap-2"><PenTool className="h-4 w-4" />Firma medico (immagine PNG/JPG)</Label>
            <div className="flex items-center gap-3 mt-1">
              <Input type="file" accept="image/png,image/jpeg" onChange={(e) => e.target.files?.[0] && onSignatureFile(e.target.files[0])} className="max-w-xs" />
              {(signaturePreview || form.signature_path || selectedDoctor?.signature_path) && (
                <div className="text-xs text-muted-foreground">
                  {signaturePreview ? <img src={signaturePreview} alt="firma" className="h-12 border rounded bg-white p-1" /> :
                    <span>Firma già presente {form.signature_path ? '(giudizio)' : '(medico)'}</span>}
                </div>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Se non caricata verrà utilizzata la firma predefinita del medico competente.</p>
          </div>

          {form.signed_pdf_path && (
            <div className="text-xs text-muted-foreground border rounded p-2 bg-muted/30">
              PDF firmato archiviato — versione {form.signed_pdf_version || 1}
            </div>
          )}

          {/* Riepilogo pre-firma */}
          <div className="border-2 border-primary/30 rounded p-3 bg-primary/5 space-y-1 text-sm">
            <div className="font-semibold text-primary mb-1">Riepilogo pre-firma</div>
            <div className="grid md:grid-cols-2 gap-x-4 gap-y-1">
              <div><span className="text-muted-foreground">Dipendente:</span> <strong>{selectedEmp ? `${selectedEmp.last_name} ${selectedEmp.first_name}` : '—'}</strong></div>
              <div><span className="text-muted-foreground">Visita:</span> <strong>{selectedVisit ? `${selectedVisit.visit_type} · ${selectedVisit.execution_date || selectedVisit.scheduled_date || '—'}` : '—'}</strong></div>
              <div><span className="text-muted-foreground">Protocollo:</span> <strong>{selectedProtocol?.name || '—'}</strong></div>
              <div><span className="text-muted-foreground">Mansione:</span> <strong>{form.job_role || '—'}</strong></div>
              <div className="md:col-span-2">
                <span className="text-muted-foreground">Rischi valutati:</span>{' '}
                {(form.risks_evaluated || []).length > 0
                  ? (form.risks_evaluated || []).map((r) => <Badge key={r} variant="outline" className="mr-1">{r}</Badge>)
                  : <span className="text-muted-foreground italic">nessuno</span>}
              </div>
              <div><span className="text-muted-foreground">Esito:</span> <strong>{JUDGMENT_OPTIONS.find((o) => o.value === form.judgment)?.label || form.judgment}</strong></div>
              <div><span className="text-muted-foreground">Medico:</span> <strong>{selectedDoctor ? `Dr. ${selectedDoctor.first_name} ${selectedDoctor.last_name}` : '—'}</strong></div>
            </div>
          </div>

          <JudgmentHistoryList
            visitId={form.visit_id}
            protocolId={form.protocol_id}
            employeeId={form.employee_id}
            doctors={doctors}
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annulla</Button>
          <Button variant="secondary" onClick={handlePrintAndArchive} disabled={printing}>
            <Printer className="h-4 w-4 mr-1" />{printing ? 'Generazione...' : 'Stampa + Archivia'}
          </Button>
          <Button onClick={handle}>Salva giudizio</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
