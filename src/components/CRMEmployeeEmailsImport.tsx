import { useState, useMemo, useRef } from 'react';
import * as XLSX from 'xlsx';
import { Upload, Mail, Loader2, CheckCircle, AlertCircle, FileSpreadsheet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface ParsedRow {
  fileName: string;
  lastName: string;
  firstName: string;
  email: string;
  course: string;
  company: string;
}

type MatchStatus = 'matched' | 'ambiguous' | 'not_found' | 'invalid' | 'already_set' | 'skip';

interface PreviewRow extends ParsedRow {
  status: MatchStatus;
  matchedId?: string;
  matchedCompany?: string;
  matchedEmail?: string;
  candidates?: { id: string; company?: string | null }[];
}

const norm = (s: any) =>
  String(s ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

const isValidEmail = (e: string) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((e || '').trim());

const pickKey = (row: Record<string, any>, keys: string[], exclude: string[] = []) => {
  // 1) exact match first
  for (const k of Object.keys(row)) {
    const nk = norm(k);
    if (keys.some((target) => nk === target)) return row[k];
  }
  // 2) starts-with match
  for (const k of Object.keys(row)) {
    const nk = norm(k);
    if (exclude.some((ex) => nk.includes(ex))) continue;
    if (keys.some((target) => nk.startsWith(target))) return row[k];
  }
  // 3) fallback: substring
  for (const k of Object.keys(row)) {
    const nk = norm(k);
    if (exclude.some((ex) => nk.includes(ex))) continue;
    if (keys.some((target) => nk.includes(target))) return row[k];
  }
  return '';
};

interface Props {
  onImportComplete?: () => void;
}

export function CRMEmployeeEmailsImport({ onImportComplete }: Props) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [parsing, setParsing] = useState(false);
  const [preview, setPreview] = useState<PreviewRow[]>([]);
  const [overwrite, setOverwrite] = useState(false);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [done, setDone] = useState<{ updated: number; skipped: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragCounter = useRef(0);

  const counts = useMemo(() => {
    const c = { matched: 0, ambiguous: 0, not_found: 0, invalid: 0, already_set: 0, skip: 0 };
    preview.forEach((p) => { c[p.status]++; });
    return c;
  }, [preview]);

  const handleFilesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const list = Array.from(e.target.files || []);
    setFiles(list);
    setPreview([]);
    setDone(null);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current++;
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current--;
    if (dragCounter.current === 0) setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current = 0;
    setIsDragging(false);
    const dropped = Array.from(e.dataTransfer.files || []);
    const excelFiles = dropped.filter(
      (f) => f.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
             f.type === 'application/vnd.ms-excel' ||
             f.name.toLowerCase().endsWith('.xlsx') ||
             f.name.toLowerCase().endsWith('.xls')
    );
    if (excelFiles.length) {
      setFiles(excelFiles);
      setPreview([]);
      setDone(null);
      toast.success(`${excelFiles.length} file Excel aggiunti`);
    } else if (dropped.length) {
      toast.error('Trascina solo file Excel (.xlsx, .xls)');
    }
  };

  const parseFiles = async () => {
    if (!files.length || !user) return;
    setParsing(true);
    setDone(null);
    try {
      const rows: ParsedRow[] = [];
      for (const f of files) {
        const buf = await f.arrayBuffer();
        const wb = XLSX.read(buf, { type: 'array' });
        for (const sheetName of wb.SheetNames) {
          const ws = wb.Sheets[sheetName];
          const json = XLSX.utils.sheet_to_json<Record<string, any>>(ws, { defval: '' });
          for (const r of json) {
            const lastName = String(pickKey(r, ['cognome', 'last name', 'surname']) || '').trim();
            const firstName = String(pickKey(r, ['nome', 'first name', 'name'], ['cognome', 'azienda', 'utente', 'societa', 'company']) || '').trim();
            const email = String(pickKey(r, ['email', 'e-mail', 'mail', 'indirizzo mail']) || '').trim();
            const course = String(pickKey(r, ['corso', 'course']) || '').trim();
            const company = String(pickKey(r, ['azienda', 'company', 'ragione sociale', 'societa']) || '').trim();
            if (!lastName && !firstName && !email) continue;
            rows.push({ fileName: f.name, lastName, firstName, email, course, company });
          }
        }
      }

      if (!rows.length) {
        toast.error('Nessuna riga trovata nei file');
        setParsing(false);
        return;
      }

      // Fetch all employees once
      const { data: emps, error } = await supabase
        .from('crm_employees')
        .select('id, first_name, last_name, email, contact_id, crm_contacts(company, name)');
      if (error) throw error;

      const byNameKey = new Map<string, any[]>();
      (emps || []).forEach((e: any) => {
        const key = `${norm(e.first_name)}|${norm(e.last_name)}`;
        const arr = byNameKey.get(key) || [];
        arr.push(e);
        byNameKey.set(key, arr);
      });

      const result: PreviewRow[] = rows.map((r) => {
        if (!r.firstName || !r.lastName) {
          return { ...r, status: 'invalid' };
        }
        if (!isValidEmail(r.email)) {
          return { ...r, status: 'invalid' };
        }
        const key = `${norm(r.firstName)}|${norm(r.lastName)}`;
        let candidates = byNameKey.get(key) || [];
        if (!candidates.length) {
          return { ...r, status: 'not_found' };
        }
        // If company provided, narrow
        if (r.company && candidates.length > 1) {
          const nc = norm(r.company);
          const filtered = candidates.filter((c: any) => {
            const comp = norm(c.crm_contacts?.company || c.crm_contacts?.name || '');
            return comp && (comp === nc || comp.includes(nc) || nc.includes(comp));
          });
          if (filtered.length) candidates = filtered;
        }
        if (candidates.length > 1) {
          return {
            ...r,
            status: 'ambiguous',
            candidates: candidates.map((c: any) => ({
              id: c.id,
              company: c.crm_contacts?.company || c.crm_contacts?.name,
            })),
          };
        }
        const m = candidates[0];
        const mCompany = m.crm_contacts?.company || m.crm_contacts?.name || '';
        if (m.email && norm(m.email) === norm(r.email)) {
          return { ...r, status: 'already_set', matchedId: m.id, matchedCompany: mCompany, matchedEmail: m.email };
        }
        if (m.email && !overwrite) {
          return { ...r, status: 'skip', matchedId: m.id, matchedCompany: mCompany, matchedEmail: m.email };
        }
        return { ...r, status: 'matched', matchedId: m.id, matchedCompany: mCompany, matchedEmail: m.email };
      });

      setPreview(result);
    } catch (err: any) {
      console.error(err);
      toast.error(`Errore: ${err.message || 'parsing fallito'}`);
    } finally {
      setParsing(false);
    }
  };

  // Re-evaluate skip/matched when overwrite toggles
  const togglePreviewOnOverwrite = (next: boolean) => {
    setOverwrite(next);
    if (!preview.length) return;
    setPreview((prev) =>
      prev.map((p) => {
        if (p.status === 'skip' && next && p.matchedId) {
          return { ...p, status: 'matched' };
        }
        if (p.status === 'matched' && !next && p.matchedEmail) {
          return { ...p, status: 'skip' };
        }
        return p;
      })
    );
  };

  const runImport = async () => {
    const toUpdate = preview.filter((p) => p.status === 'matched' && p.matchedId);
    if (!toUpdate.length) {
      toast.error('Nessun record da aggiornare');
      return;
    }
    setImporting(true);
    setProgress(0);
    let updated = 0;
    let skipped = 0;
    for (let i = 0; i < toUpdate.length; i++) {
      const row = toUpdate[i];
      const { error } = await supabase
        .from('crm_employees')
        .update({ email: row.email })
        .eq('id', row.matchedId!);
      if (error) {
        console.error(error);
        skipped++;
      } else {
        updated++;
      }
      setProgress(Math.round(((i + 1) / toUpdate.length) * 100));
    }
    setImporting(false);
    setDone({ updated, skipped });
    toast.success(`${updated} email aggiornate`);
    onImportComplete?.();
  };

  const reset = () => {
    setFiles([]);
    setPreview([]);
    setDone(null);
    setProgress(0);
  };

  const statusBadge = (s: MatchStatus) => {
    const map: Record<MatchStatus, { label: string; cls: string }> = {
      matched: { label: 'Da aggiornare', cls: 'bg-green-500/20 text-green-700' },
      already_set: { label: 'Già presente', cls: 'bg-muted text-muted-foreground' },
      skip: { label: 'Email esistente (saltata)', cls: 'bg-yellow-500/20 text-yellow-700' },
      ambiguous: { label: 'Ambigua', cls: 'bg-orange-500/20 text-orange-700' },
      not_found: { label: 'Non trovato', cls: 'bg-red-500/20 text-red-700' },
      invalid: { label: 'Dato non valido', cls: 'bg-red-500/20 text-red-700' },
    };
    const v = map[s];
    return <Badge variant="secondary" className={v.cls}>{v.label}</Badge>;
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Mail className="h-4 w-4 mr-2" />
          Importa Email Dipendenti
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Importazione Email Dipendenti
          </DialogTitle>
          <DialogDescription>
            Carica uno o più file Excel con colonne: <b>Cognome, Nome, Email, Corso</b> e opzionalmente <b>Azienda</b>.
            Le email verranno associate ai dipendenti esistenti nell'anagrafica delle aziende, matching per nome e cognome.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 flex flex-col gap-4 overflow-hidden">
          {/* File picker */}
          <div
            onDragOver={handleDragOver}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
              isDragging ? 'border-primary bg-primary/10' : 'border-border'
            }`}
          >
            <input
              type="file"
              accept=".xlsx,.xls"
              multiple
              onChange={handleFilesChange}
              className="hidden"
              id="emails-file-input"
            />
            <label htmlFor="emails-file-input" className="cursor-pointer flex flex-col items-center gap-2">
              <Upload className={`h-8 w-8 ${isDragging ? 'text-primary' : 'text-muted-foreground'}`} />
              <span className="text-sm text-muted-foreground">
                {isDragging ? 'Rilascia i file Excel qui' : files.length > 0 ? `${files.length} file selezionati` : 'Trascina i file Excel qui o clicca per selezionarli'}
              </span>
            </label>
            {files.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2 justify-center">
                {files.map((f, i) => (
                  <Badge key={i} variant="outline" className="text-xs">
                    <FileSpreadsheet className="h-3 w-3 mr-1" />
                    {f.name}
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Checkbox
                id="overwrite"
                checked={overwrite}
                onCheckedChange={(v) => togglePreviewOnOverwrite(!!v)}
              />
              <Label htmlFor="overwrite" className="text-sm cursor-pointer">
                Sovrascrivi le email già presenti
              </Label>
            </div>
            <Button onClick={parseFiles} disabled={!files.length || parsing} variant="secondary">
              {parsing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FileSpreadsheet className="h-4 w-4 mr-2" />}
              Analizza file
            </Button>
          </div>

          {/* Preview */}
          {preview.length > 0 && (
            <div className="flex-1 overflow-hidden flex flex-col gap-2">
              <div className="flex flex-wrap gap-2">
                <Badge className="bg-green-500/20 text-green-700">Da aggiornare: {counts.matched}</Badge>
                <Badge className="bg-yellow-500/20 text-yellow-700">Saltate: {counts.skip}</Badge>
                <Badge className="bg-muted text-muted-foreground">Già OK: {counts.already_set}</Badge>
                <Badge className="bg-orange-500/20 text-orange-700">Ambigue: {counts.ambiguous}</Badge>
                <Badge className="bg-red-500/20 text-red-700">Non trovate: {counts.not_found}</Badge>
                <Badge className="bg-red-500/20 text-red-700">Non valide: {counts.invalid}</Badge>
              </div>

              <div className="flex-1 overflow-auto max-h-[40vh] border rounded-lg">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-background border-b">
                    <tr className="text-left">
                      <th className="p-2">Cognome</th>
                      <th className="p-2">Nome</th>
                      <th className="p-2">Email</th>
                      <th className="p-2">Azienda match</th>
                      <th className="p-2">Corso</th>
                      <th className="p-2">Stato</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.map((p, i) => (
                      <tr key={i} className="border-b hover:bg-muted/40">
                        <td className="p-2 font-medium">{p.lastName}</td>
                        <td className="p-2">{p.firstName}</td>
                        <td className="p-2">{p.email}</td>
                        <td className="p-2 text-muted-foreground">
                          {p.matchedCompany || p.company || '—'}
                          {p.status === 'ambiguous' && p.candidates && (
                            <div className="text-[10px] text-orange-700">
                              {p.candidates.length} omonimi
                            </div>
                          )}
                        </td>
                        <td className="p-2 text-muted-foreground">{p.course || '—'}</td>
                        <td className="p-2">{statusBadge(p.status)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {importing && (
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm">
                <Loader2 className="h-4 w-4 animate-spin" />
                Aggiornamento in corso...
              </div>
              <Progress value={progress} />
            </div>
          )}

          {done && (
            <div className="flex items-center gap-2 text-sm">
              <CheckCircle className="h-4 w-4 text-green-600" />
              {done.updated} email aggiornate
              {done.skipped > 0 && <span className="text-red-600 ml-2"><AlertCircle className="h-3 w-3 inline" /> {done.skipped} errori</span>}
            </div>
          )}

          <div className="flex gap-2 justify-end pt-2">
            <Button variant="outline" onClick={() => setOpen(false)}>Chiudi</Button>
            <Button onClick={runImport} disabled={importing || !preview.some((p) => p.status === 'matched')}>
              {importing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
              Importa {counts.matched} email
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default CRMEmployeeEmailsImport;