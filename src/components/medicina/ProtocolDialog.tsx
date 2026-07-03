import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { MedicalProtocol } from '@/hooks/useMedicina';
import { useCRM } from '@/hooks/useCRM';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Wand2, ShieldAlert } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface RiskCatalogItem {
  id: string;
  risk_code: string;
  risk_name: string;
  category: string | null;
  suggested_exams: Array<{ name: string; mandatory?: boolean }>;
  default_periodicity_months: number | null;
  legal_reference: string | null;
}

interface StructuredExam { name: string; periodicity_months?: number | null; mandatory?: boolean }

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  protocol?: MedicalProtocol | null;
  onSave: (data: Partial<MedicalProtocol>) => Promise<any>;
}

export const ProtocolDialog = ({ open, onOpenChange, protocol, onSave }: Props) => {
  const { contacts } = useCRM();
  const [form, setForm] = useState<Partial<MedicalProtocol>>({});
  const [selectedRisks, setSelectedRisks] = useState<string[]>([]);
  const [exams, setExams] = useState<StructuredExam[]>([]);
  const [catalog, setCatalog] = useState<RiskCatalogItem[]>([]);
  const [loadingCatalog, setLoadingCatalog] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoadingCatalog(true);
    (supabase as any).from('medical_risk_catalog').select('*').order('category').order('risk_name').then(({ data, error }: any) => {
      if (!error) setCatalog(data || []);
      setLoadingCatalog(false);
    });
  }, [open]);

  useEffect(() => {
    if (protocol) {
      setForm(protocol);
      setSelectedRisks(protocol.risks ?? []);
      const raw = Array.isArray(protocol.exams) ? protocol.exams : [];
      setExams(raw.map((e: any) => typeof e === 'string'
        ? { name: e, mandatory: true, periodicity_months: null }
        : { name: e?.name || '', mandatory: e?.mandatory ?? true, periodicity_months: e?.periodicity_months ?? null }
      ).filter((e) => e.name));
    } else {
      setForm({ is_active: true, periodicity_months: 12 });
      setSelectedRisks([]);
      setExams([]);
    }
  }, [protocol, open]);

  const toggleRisk = (code: string) => {
    setSelectedRisks((prev) => prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]);
  };

  const autoBuildFromRisks = () => {
    const items = catalog.filter((c) => selectedRisks.includes(c.risk_code));
    if (items.length === 0) {
      toast.error('Seleziona almeno un rischio dal catalogo');
      return;
    }
    const merged = new Map<string, StructuredExam>();
    let minPeriod: number | null = null;
    for (const it of items) {
      if (it.default_periodicity_months != null) {
        minPeriod = minPeriod == null ? it.default_periodicity_months : Math.min(minPeriod, it.default_periodicity_months);
      }
      for (const ex of it.suggested_exams || []) {
        const key = ex.name.toLowerCase().trim();
        const prev = merged.get(key);
        merged.set(key, {
          name: ex.name,
          mandatory: (prev?.mandatory ?? false) || !!ex.mandatory,
          periodicity_months: it.default_periodicity_months ?? prev?.periodicity_months ?? null,
        });
      }
    }
    setExams(Array.from(merged.values()));
    if (minPeriod != null) setForm((f) => ({ ...f, periodicity_months: minPeriod }));
    toast.success(`Protocollo generato: ${merged.size} esami da ${items.length} rischi`);
  };

  const addExam = () => setExams((p) => [...p, { name: '', mandatory: true, periodicity_months: null }]);
  const updExam = (i: number, patch: Partial<StructuredExam>) => setExams((p) => p.map((e, idx) => idx === i ? { ...e, ...patch } : e));
  const rmExam = (i: number) => setExams((p) => p.filter((_, idx) => idx !== i));

  const handle = async () => {
    if (!form.name) { toast.error('Nome protocollo obbligatorio'); return; }
    const payload: Partial<MedicalProtocol> = {
      ...form,
      risks: selectedRisks,
      exams: exams.filter((e) => e.name.trim()).map((e) => ({
        name: e.name.trim(),
        mandatory: e.mandatory ?? true,
        periodicity_months: e.periodicity_months ?? null,
      })) as any,
    };
    await onSave(payload);
    onOpenChange(false);
  };

  const grouped = catalog.reduce<Record<string, RiskCatalogItem[]>>((acc, r) => {
    const k = r.category || 'Altro'; (acc[k] ||= []).push(r); return acc;
  }, {});

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{protocol ? 'Modifica protocollo' : 'Nuovo protocollo sanitario'}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <Label>Nome protocollo *</Label>
              <Input value={form.name ?? ''} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Es. Protocollo Videoterminalisti" />
            </div>
            <div>
              <Label>Mansione</Label>
              <Input value={form.job_role ?? ''} onChange={(e) => setForm({ ...form, job_role: e.target.value })} placeholder="Es. Impiegato amministrativo" />
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
              <Label>Periodicità di default (mesi)</Label>
              <Input type="number" value={form.periodicity_months ?? ''} onChange={(e) => setForm({ ...form, periodicity_months: e.target.value ? Number(e.target.value) : null })} />
            </div>
          </div>

          <div className="border rounded-lg p-3 bg-muted/30">
            <div className="flex items-center justify-between mb-2">
              <Label className="flex items-center gap-1 text-sm font-semibold">
                <ShieldAlert className="h-4 w-4 text-primary" /> Rischi della mansione (D.Lgs 81/08)
              </Label>
              <Button type="button" size="sm" variant="secondary" onClick={autoBuildFromRisks} disabled={selectedRisks.length === 0}>
                <Wand2 className="h-4 w-4 mr-1" /> Genera protocollo dai rischi
              </Button>
            </div>
            {loadingCatalog ? (
              <p className="text-xs text-muted-foreground">Caricamento catalogo…</p>
            ) : (
              <ScrollArea className="h-56 pr-3">
                <div className="space-y-3">
                  {Object.entries(grouped).map(([cat, items]) => (
                    <div key={cat}>
                      <div className="text-xs font-semibold text-muted-foreground uppercase mb-1">{cat}</div>
                      <div className="grid sm:grid-cols-2 gap-1">
                        {items.map((r) => (
                          <label key={r.id} className="flex items-start gap-2 text-sm p-1 rounded hover:bg-background cursor-pointer">
                            <Checkbox checked={selectedRisks.includes(r.risk_code)} onCheckedChange={() => toggleRisk(r.risk_code)} className="mt-0.5" />
                            <div className="flex-1">
                              <div>{r.risk_name}</div>
                              {r.legal_reference && <div className="text-[10px] text-muted-foreground">{r.legal_reference} · {r.default_periodicity_months}m</div>}
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
            {selectedRisks.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {selectedRisks.map((c) => <Badge key={c} variant="secondary" className="text-xs">{c}</Badge>)}
              </div>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-sm font-semibold">Esami previsti</Label>
              <Button type="button" size="sm" variant="outline" onClick={addExam}>+ Esame</Button>
            </div>
            {exams.length === 0 && <p className="text-xs text-muted-foreground italic">Nessun esame. Seleziona rischi e clicca "Genera protocollo" o aggiungi manualmente.</p>}
            <div className="space-y-1">
              {exams.map((e, i) => (
                <div key={i} className="grid grid-cols-[1fr_100px_90px_auto] gap-2 items-center">
                  <Input value={e.name} onChange={(ev) => updExam(i, { name: ev.target.value })} placeholder="Nome esame" />
                  <Input type="number" value={e.periodicity_months ?? ''} onChange={(ev) => updExam(i, { periodicity_months: ev.target.value ? Number(ev.target.value) : null })} placeholder="Mesi" />
                  <label className="flex items-center gap-1 text-xs">
                    <Checkbox checked={e.mandatory ?? true} onCheckedChange={(v) => updExam(i, { mandatory: !!v })} />
                    Obblig.
                  </label>
                  <Button type="button" size="sm" variant="ghost" onClick={() => rmExam(i)}>×</Button>
                </div>
              ))}
            </div>
          </div>

          <div>
            <Label>Descrizione</Label>
            <Textarea value={form.description ?? ''} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} />
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
