import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Loader2, Wand2, FileUp, Check, X, AlertTriangle, RotateCcw, FileText } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ExtractedContact {
  name?: string;
  email?: string;
  phone?: string;
  mobile?: string;
  referente_email?: string;
  referente_phone?: string;
  referente_mobile?: string;
  company?: string;
  role?: string;
  address?: string;
  postal_code?: string;
  city?: string;
  province?: string;
  website?: string;
  vat_number?: string;
  fiscal_code?: string;
  pec?: string;
  sdi_code?: string;
  ateco_code?: string;
  legal_form?: string;
  rea_number?: string;
  partners_count?: number;
  activity_start_date?: string;
  cdl_reference?: string;
  fondo_appartenenza?: string;
  segnalatore_name?: string;
  technical_consultant?: string;
  payment_method?: string;
  payment_terms?: string;
  exemption_number?: string;
  exemption_issue_date?: string;
  exemption_valid_until?: string;
  exemption_amount?: number;
  notes?: string;
}

interface AIContactAutoFillProps {
  onExtracted: (data: ExtractedContact) => void;
}

// Etichette leggibili per i campi
const FIELD_LABELS: Record<keyof ExtractedContact, string> = {
  company: 'Ragione sociale',
  name: 'Legale rappresentante / Referente',
  role: 'Ruolo / Settore',
  email: 'Email azienda',
  phone: 'Telefono azienda',
  mobile: 'Cellulare azienda',
  pec: 'PEC',
  website: 'Sito web',
  address: 'Indirizzo',
  postal_code: 'CAP',
  city: 'Città',
  province: 'Provincia',
  vat_number: 'Partita IVA',
  fiscal_code: 'Codice Fiscale',
  sdi_code: 'Codice SDI',
  ateco_code: 'Codice ATECO',
  legal_form: 'Natura giuridica',
  rea_number: 'Numero REA',
  partners_count: 'Numero soci',
  activity_start_date: 'Data inizio attività',
  referente_email: 'Email referente',
  referente_phone: 'Telefono referente',
  referente_mobile: 'Cellulare referente',
  cdl_reference: 'CDL di riferimento',
  fondo_appartenenza: 'Fondo di appartenenza',
  segnalatore_name: 'Nominativo segnalatore',
  technical_consultant: 'Consulente tecnico',
  payment_method: 'Modalità pagamento',
  payment_terms: 'Termini pagamento',
  exemption_number: 'N° esenzione IVA',
  exemption_issue_date: 'Data emissione esenzione',
  exemption_valid_until: 'Validità esenzione fino al',
  exemption_amount: 'Importo esenzione',
  notes: 'Note',
};

const FIELD_ORDER: (keyof ExtractedContact)[] = [
  'company', 'legal_form', 'vat_number', 'fiscal_code', 'rea_number', 'ateco_code',
  'activity_start_date', 'partners_count',
  'address', 'postal_code', 'city', 'province',
  'email', 'phone', 'mobile', 'pec', 'sdi_code', 'website',
  'name', 'role',
  'referente_email', 'referente_phone', 'referente_mobile',
  'cdl_reference', 'fondo_appartenenza', 'segnalatore_name', 'technical_consultant',
  'payment_method', 'payment_terms',
  'exemption_number', 'exemption_issue_date', 'exemption_valid_until', 'exemption_amount',
  'notes',
];

// Validazione per evidenziare valori "incerti"
function isUncertain(field: keyof ExtractedContact, value: any): boolean {
  if (value === null || value === undefined || value === '') return false;
  const v = String(value).trim();
  switch (field) {
    case 'vat_number': return !/^\d{11}$/.test(v);
    case 'fiscal_code': return !/^([A-Z0-9]{11}|[A-Z0-9]{16})$/i.test(v);
    case 'postal_code': return !/^\d{5}$/.test(v);
    case 'province': return !/^[A-Z]{2}$/.test(v);
    case 'rea_number': return !/^[A-Z]{2}[- ]?\d{4,8}$/i.test(v);
    case 'ateco_code': return !/^\d{2}(\.\d{1,2}){0,2}$/.test(v);
    case 'activity_start_date':
    case 'exemption_issue_date':
    case 'exemption_valid_until':
      return !/^\d{4}-\d{2}-\d{2}$/.test(v);
    case 'email':
    case 'referente_email':
    case 'pec':
      return !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
    case 'phone':
    case 'mobile':
    case 'referente_phone':
    case 'referente_mobile':
      return !/^[+\d][\d\s./()-]{5,}$/.test(v);
    case 'partners_count':
      return !(Number.isFinite(Number(value)) && Number(value) >= 0);
    case 'exemption_amount':
      return !Number.isFinite(Number(value));
    default:
      return false;
  }
}

interface SourceInfo {
  filename: string;
  fields: number;
}

export function AIContactAutoFill({ onExtracted }: AIContactAutoFillProps) {
  const [rawText, setRawText] = useState('');
  const [isExtracting, setIsExtracting] = useState(false);
  const [isParsingPdf, setIsParsingPdf] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [merged, setMerged] = useState<ExtractedContact>({});
  const [conflicts, setConflicts] = useState<Record<string, string[]>>({});
  const [sources, setSources] = useState<SourceInfo[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const mergeIntoState = (incoming: ExtractedContact, sourceName: string) => {
    let added = 0;
    setMerged((prev) => {
      const next: any = { ...prev };
      const newConflicts: Record<string, string[]> = { ...conflicts };
      for (const [k, v] of Object.entries(incoming)) {
        if (v === null || v === undefined || v === '') continue;
        const current = (prev as any)[k];
        if (current === null || current === undefined || current === '') {
          next[k] = v;
          added++;
        } else if (String(current).trim().toLowerCase() !== String(v).trim().toLowerCase()) {
          const arr = newConflicts[k] || [String(current)];
          if (!arr.includes(String(v))) arr.push(String(v));
          newConflicts[k] = arr;
        }
      }
      setConflicts(newConflicts);
      return next;
    });
    setSources((prev) => [...prev, { filename: sourceName, fields: Object.values(incoming).filter((x) => x !== null && x !== undefined && x !== '').length }]);
    toast.success(`${sourceName}: ${added} campi aggiunti`);
  };

  const callExtract = async (
    payload: { text?: string; pdfBase64?: string },
    sourceName: string,
  ) => {
    setIsExtracting(true);
    try {
      const { data, error } = await supabase.functions.invoke('crm-agent', {
        body: { action: 'extract_contact', data: payload },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Errore estrazione');
      mergeIntoState(data.result as ExtractedContact, sourceName);
      setRawText('');
    } catch (e: any) {
      console.error('AI extract error:', e);
      toast.error(e.message || "Errore nell'estrazione AI");
    } finally {
      setIsExtracting(false);
    }
  };

  const handleExtract = async () => {
    if (!rawText.trim()) {
      toast.error('Incolla del testo da analizzare');
      return;
    }
    await callExtract({ text: rawText }, `Testo #${sources.length + 1}`);
  };

  const handlePdfUpload = async (file: File) => {
    if (file.size > 20 * 1024 * 1024) {
      toast.error(`${file.name}: troppo grande (max 20MB)`);
      return;
    }
    setIsParsingPdf(true);
    try {
      const pdfjsLib: any = await import('pdfjs-dist/legacy/build/pdf.mjs');
      pdfjsLib.GlobalWorkerOptions.workerSrc = (
        await import('pdfjs-dist/legacy/build/pdf.worker.mjs?url')
      ).default;
      const buf = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
      let fullText = '';
      const maxPages = Math.min(pdf.numPages, 40);
      for (let i = 1; i <= maxPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        const lines = new Map<number, string[]>();
        for (const it of content.items as any[]) {
          if (!it.str) continue;
          const y = Math.round(it.transform?.[5] ?? 0);
          if (!lines.has(y)) lines.set(y, []);
          lines.get(y)!.push(it.str);
        }
        const sortedY = Array.from(lines.keys()).sort((a, b) => b - a);
        const pageText = sortedY
          .map((y) => lines.get(y)!.join(' ').replace(/\s+/g, ' ').trim())
          .filter(Boolean)
          .join('\n');
        fullText += `\n\n--- Pagina ${i} ---\n${pageText}`;
      }
      const letters = (fullText.match(/[a-zA-Z]/g) || []).length;
      const poorQuality = fullText.trim().length < 500 || letters < 100;
      if (poorQuality) {
        toast.info(`${file.name}: PDF scansionato, OCR AI in corso...`);
        const bytes = new Uint8Array(buf);
        let binary = '';
        const chunk = 0x8000;
        for (let i = 0; i < bytes.length; i += chunk) {
          binary += String.fromCharCode.apply(
            null,
            Array.from(bytes.subarray(i, i + chunk)) as any,
          );
        }
        const base64 = btoa(binary);
        await callExtract({ pdfBase64: base64 }, file.name);
      } else {
        toast.info(`${file.name}: estrazione AI in corso...`);
        await callExtract({ text: fullText }, file.name);
      }
    } catch (e: any) {
      console.error('PDF parse error:', e);
      toast.error('Errore lettura PDF: ' + (e.message || 'sconosciuto'));
    } finally {
      setIsParsingPdf(false);
    }
  };

  const handleFiles = async (files: FileList | File[]) => {
    const arr = Array.from(files).filter(
      (f) => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf')
    );
    if (arr.length === 0) {
      toast.error('Carica almeno un file PDF');
      return;
    }
    for (const f of arr) {
      await handlePdfUpload(f);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const busy = isExtracting || isParsingPdf;

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (busy) return;
    const files = e.dataTransfer.files;
    if (files && files.length > 0) handleFiles(files);
  };

  const resetAll = () => {
    setMerged({});
    setConflicts({});
    setSources([]);
    toast.info('Anteprima azzerata');
  };

  const applyToForm = () => {
    const populated = Object.entries(merged).filter(([, v]) => v !== null && v !== undefined && v !== '');
    if (populated.length === 0) {
      toast.error('Nessun dato da applicare');
      return;
    }
    onExtracted(merged);
    toast.success(`${populated.length} campi applicati al form. Rivedi e salva.`);
  };

  const resolveConflict = (field: string, value: string) => {
    setMerged((prev) => ({ ...prev, [field]: value }));
    setConflicts((prev) => {
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const clearField = (field: string) => {
    setMerged((prev) => {
      const next: any = { ...prev };
      delete next[field];
      return next;
    });
    setConflicts((prev) => {
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const populatedEntries = FIELD_ORDER
    .map((k) => [k, (merged as any)[k]] as const)
    .filter(([, v]) => v !== null && v !== undefined && v !== '');

  const uncertainCount = populatedEntries.filter(([k, v]) => isUncertain(k, v)).length;
  const conflictCount = Object.keys(conflicts).length;

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Wand2 className="h-4 w-4 text-primary" />
          Auto-fill AI — Visure multiple
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <Label className="text-xs text-muted-foreground">
            Carica una o più Visure camerali (PDF) — i dati estratti verranno uniti automaticamente
          </Label>
          <div
            onDragOver={(e) => { e.preventDefault(); if (!busy) setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            className={`mt-1 border-2 border-dashed rounded-md p-4 text-center transition-colors cursor-pointer ${
              isDragging ? 'border-primary bg-primary/10' : 'border-muted-foreground/30 hover:border-primary/50 hover:bg-primary/5'
            } ${busy ? 'opacity-60 pointer-events-none' : ''}`}
            onClick={() => fileInputRef.current?.click()}
            role="button"
            tabIndex={0}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf"
              multiple
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files.length > 0) handleFiles(e.target.files);
              }}
            />
            <div className="flex flex-col items-center gap-1.5 pointer-events-none">
              {isParsingPdf ? (
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              ) : (
                <FileUp className="h-6 w-6 text-primary" />
              )}
              <p className="text-sm font-medium">
                {isParsingPdf ? 'Lettura PDF in corso...' : isDragging ? 'Rilascia i file qui' : 'Trascina una o più Visure PDF qui'}
              </p>
              <p className="text-xs text-muted-foreground">
                o clicca per selezionarli (max 20MB ciascuno)
              </p>
            </div>
          </div>

          <Textarea
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
            placeholder="Oppure incolla testo libero (email, biglietto da visita, note)..."
            rows={2}
            className="mt-2"
            disabled={busy}
          />
          <Button onClick={handleExtract} disabled={busy || !rawText.trim()} size="sm" className="w-full mt-2">
            {isExtracting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
            Aggiungi dati dal testo
          </Button>
        </div>

        {sources.length > 0 && (
          <div className="rounded-md border bg-background/60 p-2 space-y-1">
            <div className="text-xs font-medium text-muted-foreground flex items-center gap-1">
              <FileText className="h-3 w-3" /> Fonti elaborate ({sources.length})
            </div>
            {sources.map((s, i) => (
              <div key={i} className="text-xs flex justify-between gap-2">
                <span className="truncate">{s.filename}</span>
                <span className="text-muted-foreground shrink-0">{s.fields} campi</span>
              </div>
            ))}
          </div>
        )}

        {populatedEntries.length > 0 && (
          <div className="rounded-md border bg-background p-3 space-y-2">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="text-sm font-semibold flex items-center gap-2">
                Anteprima campi estratti
                <Badge variant="secondary">{populatedEntries.length}</Badge>
                {uncertainCount > 0 && (
                  <Badge variant="outline" className="border-amber-500 text-amber-600">
                    <AlertTriangle className="h-3 w-3 mr-1" />{uncertainCount} da verificare
                  </Badge>
                )}
                {conflictCount > 0 && (
                  <Badge variant="destructive">{conflictCount} conflitti</Badge>
                )}
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="ghost" onClick={resetAll}>
                  <RotateCcw className="h-3 w-3 mr-1" /> Azzera
                </Button>
                <Button size="sm" onClick={applyToForm}>
                  <Check className="h-4 w-4 mr-1" /> Applica al form
                </Button>
              </div>
            </div>

            <div className="max-h-[40vh] overflow-y-auto divide-y">
              {populatedEntries.map(([key, value]) => {
                const uncertain = isUncertain(key, value);
                const conflict = conflicts[key];
                return (
                  <div key={key} className={`py-2 flex items-start gap-2 ${conflict ? 'bg-destructive/5' : uncertain ? 'bg-amber-50 dark:bg-amber-950/20' : ''} -mx-1 px-1 rounded`}>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs text-muted-foreground flex items-center gap-1">
                        {FIELD_LABELS[key] || key}
                        {uncertain && <AlertTriangle className="h-3 w-3 text-amber-500" />}
                        {conflict && <Badge variant="destructive" className="text-[10px] h-4">Conflitto</Badge>}
                      </div>
                      <div className={`text-sm break-words ${uncertain ? 'text-amber-700 dark:text-amber-400 font-medium' : ''}`}>
                        {String(value)}
                      </div>
                      {conflict && (
                        <div className="mt-1 flex flex-wrap gap-1">
                          <span className="text-[11px] text-muted-foreground">Alternative:</span>
                          {conflict.filter((c) => c !== String(value)).map((c, i) => (
                            <button
                              key={i}
                              onClick={() => resolveConflict(key, c)}
                              className="text-[11px] px-1.5 py-0.5 rounded bg-muted hover:bg-primary hover:text-primary-foreground transition-colors"
                            >
                              {c}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    <Button size="sm" variant="ghost" className="h-6 w-6 p-0 shrink-0" onClick={() => clearField(key)} title="Rimuovi">
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
