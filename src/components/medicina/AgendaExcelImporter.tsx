import { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Upload, FileSpreadsheet, AlertTriangle, CheckCircle2, Loader2, Users, Stethoscope, ClipboardCheck } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface AgendaRow {
  societa?: string;
  sede?: string;
  cognome?: string;
  nome?: string;
  cf?: string;
  mansione?: string;
  email?: string;
  tipologia?: string;
  avviso?: string;
  scadenza?: string;
  medico?: string;
  idoneita?: string;
  sorveglianza?: string;
  vdt?: string;
}

interface AggregatedVisit {
  key: string;
  cf: string;
  cognome: string;
  nome: string;
  societa: string;
  mansione: string;
  scadenza: string;
  medico: string;
  idoneita: string;
  visit_type: string;
  exams: { name: string; type: string }[];
  source_rows: number;
}

interface MatchedVisit extends AggregatedVisit {
  employee_id: string | null;
  contact_id: string | null;
  doctor_id: string | null;
  already_exists: boolean;
  selected: boolean;
}

const NON_VISIT_KEYWORDS = ['piattaformafad', 'aggiornati al', 'agenda medico'];

const inferVisitType = (tipologia?: string, avviso?: string): string => {
  const t = `${tipologia ?? ''} ${avviso ?? ''}`.toLowerCase();
  if (t.includes('preventiv')) return 'preventiva';
  if (t.includes('cessazione') || t.includes('cessaz')) return 'cessazione';
  if (t.includes('cambio mansione')) return 'cambio_mansione';
  if (t.includes('rientro')) return 'rientro';
  if (t.includes('richiesta')) return 'richiesta';
  if (t.includes('straordinaria')) return 'straordinaria';
  return 'periodica';
};

const parseExcelDate = (val: any): string | null => {
  if (!val) return null;
  if (val instanceof Date) return val.toISOString().split('T')[0];
  if (typeof val === 'number') {
    const d = new Date(Math.round((val - 25569) * 86400 * 1000));
    return d.toISOString().split('T')[0];
  }
  const s = String(val).trim();
  if (!s) return null;
  const isoMatch = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
  const itMatch = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})/);
  if (itMatch) return `${itMatch[3]}-${itMatch[2].padStart(2, '0')}-${itMatch[1].padStart(2, '0')}`;
  return null;
};

const cleanExamName = (avviso?: string): string => {
  if (!avviso) return '';
  return String(avviso)
    .replace(/Da effettuare!?/gi, '')
    .replace(/Scaduta!?/gi, '')
    .replace(/In scadenza!?/gi, '')
    .trim();
};

const normalizeJudgment = (idoneita?: string): string | null => {
  if (!idoneita) return null;
  const s = idoneita.toLowerCase();
  if (s.includes('non idoneo')) return 'non_idoneo';
  if (s.includes('limitazion')) return 'idoneo_limitazioni';
  if (s.includes('prescrizion')) return 'idoneo_prescrizioni';
  if (s.includes('idoneo')) return 'idoneo';
  return null;
};

export const AgendaExcelImporter = () => {
  const { user } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState('');
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [visits, setVisits] = useState<MatchedVisit[]>([]);
  const [stats, setStats] = useState<{
    total: number;
    matched: number;
    unmatched: number;
    duplicates: number;
    doctors_to_create: string[];
    judgments: number;
  } | null>(null);
  const [createdReport, setCreatedReport] = useState<{
    visits: number;
    judgments: number;
    doctors: number;
    crm_synced: number;
  } | null>(null);

  const handleFile = async (file: File) => {
    if (!user) return;
    setParsing(true);
    setFileName(file.name);
    setVisits([]);
    setStats(null);
    setCreatedReport(null);
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: 'array', cellDates: true });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const raw: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: null });
      let headerIdx = -1;
      for (let i = 0; i < Math.min(raw.length, 10); i++) {
        const row = raw[i] || [];
        if (row.includes('Codice Fiscale') || row.includes('Cognome')) {
          headerIdx = i;
          break;
        }
      }
      if (headerIdx === -1) {
        toast.error('Header non trovato nel file');
        setParsing(false);
        return;
      }
      const headers = raw[headerIdx].map((h: any) => String(h ?? '').trim());
      const idx = (name: string) => headers.findIndex((h) => h.toLowerCase() === name.toLowerCase());

      const colSoc = idx('Società');
      const colSede = idx('Sede');
      const colCog = idx('Cognome');
      const colNom = idx('Nome');
      const colCF = idx('Codice Fiscale');
      const colMan = idx('Mansione');
      const colEmail = idx('Email');
      const colTip = idx('Tipologia');
      const colAvv = idx('Avviso');
      const colScad = idx('Scadenza');
      const colMed = idx('Medico Competente');
      const colIdo = idx('Idoneità');

      const rows: AgendaRow[] = [];
      for (let i = headerIdx + 1; i < raw.length; i++) {
        const r = raw[i] || [];
        const cf = r[colCF];
        if (!cf) continue;
        const cfStr = String(cf).trim();
        if (NON_VISIT_KEYWORDS.some((kw) => cfStr.toLowerCase().includes(kw))) continue;
        if (cfStr.length < 11) continue;
        rows.push({
          societa: r[colSoc] ? String(r[colSoc]).trim() : undefined,
          sede: colSede >= 0 && r[colSede] ? String(r[colSede]).trim() : undefined,
          cognome: r[colCog] ? String(r[colCog]).trim() : undefined,
          nome: r[colNom] ? String(r[colNom]).trim() : undefined,
          cf: cfStr.toUpperCase(),
          mansione: r[colMan] ? String(r[colMan]).trim() : undefined,
          email: colEmail >= 0 && r[colEmail] ? String(r[colEmail]).trim() : undefined,
          tipologia: r[colTip] ? String(r[colTip]).trim() : undefined,
          avviso: r[colAvv] ? String(r[colAvv]).trim() : undefined,
          scadenza: parseExcelDate(r[colScad]) ?? undefined,
          medico: r[colMed] ? String(r[colMed]).trim() : undefined,
          idoneita: r[colIdo] ? String(r[colIdo]).trim() : undefined,
        });
      }

      const groups = new Map<string, AggregatedVisit>();
      for (const r of rows) {
        if (!r.cf || !r.scadenza) continue;
        const key = `${r.cf}|${r.scadenza}|${r.medico ?? ''}`;
        if (!groups.has(key)) {
          groups.set(key, {
            key,
            cf: r.cf,
            cognome: r.cognome ?? '',
            nome: r.nome ?? '',
            societa: r.societa ?? '',
            mansione: r.mansione ?? '',
            scadenza: r.scadenza,
            medico: r.medico ?? '',
            idoneita: r.idoneita ?? '',
            visit_type: inferVisitType(r.tipologia, r.avviso),
            exams: [],
            source_rows: 0,
          });
        }
        const g = groups.get(key)!;
        const examName = cleanExamName(r.avviso);
        if (examName && !g.exams.some((e) => e.name.toLowerCase() === examName.toLowerCase())) {
          g.exams.push({ name: examName, type: r.tipologia ?? '' });
        }
        if (!g.idoneita && r.idoneita) g.idoneita = r.idoneita;
        if (r.tipologia?.toLowerCase().includes('visita medica')) {
          g.visit_type = inferVisitType(r.tipologia, r.avviso);
        }
        g.source_rows += 1;
      }

      const aggregated = Array.from(groups.values());

      const cfs = [...new Set(aggregated.map((g) => g.cf))];
      const { data: employees } = await supabase
        .from('crm_employees')
        .select('id, fiscal_code, contact_id')
        .in('fiscal_code', cfs);
      const empMap = new Map((employees ?? []).map((e: any) => [String(e.fiscal_code).toUpperCase(), e]));

      const docNames = [...new Set(aggregated.map((g) => g.medico).filter(Boolean))];
      const { data: doctors } = await (supabase as any)
        .from('medical_doctors')
        .select('id, first_name, last_name');
      const docMap = new Map<string, string>();
      for (const d of (doctors ?? []) as any[]) {
        const full = `${d.last_name} ${d.first_name}`.toLowerCase();
        const fullRev = `${d.first_name} ${d.last_name}`.toLowerCase();
        docMap.set(full, d.id);
        docMap.set(fullRev, d.id);
      }
      const findDoctorId = (name: string) => {
        const n = name.toLowerCase().trim();
        if (docMap.has(n)) return docMap.get(n)!;
        for (const [k, v] of docMap) if (k.includes(n) || n.includes(k)) return v;
        return null;
      };
      const doctorsToCreate = docNames.filter((n) => !findDoctorId(n));

      const empIds = (employees ?? []).map((e: any) => e.id);
      const { data: existingVisits } = empIds.length
        ? await (supabase as any)
            .from('medical_visits')
            .select('employee_id, scheduled_date, next_due_date')
            .in('employee_id', empIds)
        : { data: [] };
      const existingSet = new Set<string>();
      for (const v of (existingVisits ?? []) as any[]) {
        if (v.scheduled_date) existingSet.add(`${v.employee_id}|${v.scheduled_date}`);
        if (v.next_due_date) existingSet.add(`${v.employee_id}|${v.next_due_date}`);
      }

      const matched: MatchedVisit[] = aggregated.map((g) => {
        const emp = empMap.get(g.cf) as any;
        const employee_id = emp?.id ?? null;
        const contact_id = emp?.contact_id ?? null;
        const doctor_id = g.medico ? findDoctorId(g.medico) : null;
        const already_exists = employee_id ? existingSet.has(`${employee_id}|${g.scadenza}`) : false;
        return { ...g, employee_id, contact_id, doctor_id, already_exists, selected: !!employee_id && !already_exists };
      });

      const judgmentCount = matched.filter((m) => normalizeJudgment(m.idoneita)).length;

      setVisits(matched);
      setStats({
        total: matched.length,
        matched: matched.filter((m) => m.employee_id).length,
        unmatched: matched.filter((m) => !m.employee_id).length,
        duplicates: matched.filter((m) => m.already_exists).length,
        doctors_to_create: doctorsToCreate,
        judgments: judgmentCount,
      });
      toast.success(`File analizzato: ${matched.length} visite aggregate da ${rows.length} righe`);
    } catch (e: any) {
      toast.error(`Errore parsing: ${e.message}`);
    } finally {
      setParsing(false);
    }
  };

  const toggleAll = (checked: boolean) => {
    setVisits((prev) => prev.map((v) => ({ ...v, selected: checked && !!v.employee_id && !v.already_exists })));
  };
  const toggleOne = (key: string, checked: boolean) => {
    setVisits((prev) => prev.map((v) => (v.key === key ? { ...v, selected: checked } : v)));
  };

  const runImport = async () => {
    if (!user) return;
    const selected = visits.filter((v) => v.selected && v.employee_id);
    if (selected.length === 0) {
      toast.error('Nessuna visita selezionata');
      return;
    }
    setImporting(true);
    setProgress(0);

    let createdDoctors = 0;
    let createdVisits = 0;
    let createdJudgments = 0;
    let crmSynced = 0;

    try {
      const docNamesNeeded = [...new Set(selected.map((v) => v.medico).filter(Boolean))];
      const { data: existingDocs } = await (supabase as any)
        .from('medical_doctors')
        .select('id, first_name, last_name');
      const docLookup = new Map<string, string>();
      for (const d of (existingDocs ?? []) as any[]) {
        docLookup.set(`${d.last_name} ${d.first_name}`.toLowerCase(), d.id);
        docLookup.set(`${d.first_name} ${d.last_name}`.toLowerCase(), d.id);
      }
      const findDoc = (name: string) => {
        const n = name.toLowerCase().trim();
        if (docLookup.has(n)) return docLookup.get(n)!;
        for (const [k, v] of docLookup) if (k.includes(n) || n.includes(k)) return v;
        return null;
      };
      for (const name of docNamesNeeded) {
        if (findDoc(name)) continue;
        const parts = name.trim().split(/\s+/);
        let last_name = parts[0];
        let first_name = parts.slice(1).join(' ') || '-';
        if (parts.length >= 2) {
          last_name = parts[0];
          first_name = parts.slice(1).join(' ');
        }
        const { data: newDoc } = await (supabase as any)
          .from('medical_doctors')
          .insert({ user_id: user.id, first_name, last_name, is_active: true })
          .select()
          .single();
        if (newDoc) {
          docLookup.set(`${last_name} ${first_name}`.toLowerCase(), newDoc.id);
          createdDoctors++;
        }
      }

      const BATCH = 50;
      for (let i = 0; i < selected.length; i += BATCH) {
        const chunk = selected.slice(i, i + BATCH);
        const visitRows = chunk.map((v) => {
          const isFuture = new Date(v.scadenza) > new Date();
          const doctor_id = v.medico ? findDoc(v.medico) : null;
          return {
            user_id: user.id,
            employee_id: v.employee_id,
            contact_id: v.contact_id,
            doctor_id,
            visit_type: v.visit_type,
            scheduled_date: isFuture ? v.scadenza : null,
            execution_date: isFuture ? null : v.scadenza,
            next_due_date: v.scadenza,
            status: isFuture ? 'scheduled' : 'completed',
            exams_performed: v.exams,
            notes: `Importato da agenda ${fileName} (${v.exams.length} esami, mansione: ${v.mansione || 'n/d'})`,
          };
        });
        const { data: insertedVisits, error } = await (supabase as any)
          .from('medical_visits')
          .insert(visitRows)
          .select('id, employee_id, doctor_id, execution_date, scheduled_date, next_due_date, exams_performed, status, visit_type, notes');
        if (error) {
          console.error('insert visits error', error);
          toast.error(`Errore batch ${i}: ${error.message}`);
          continue;
        }
        createdVisits += insertedVisits?.length ?? 0;

        const judgmentRows: any[] = [];
        (insertedVisits ?? []).forEach((iv: any, idx: number) => {
          const src = chunk[idx];
          const judgment = normalizeJudgment(src.idoneita);
          if (judgment && iv.employee_id) {
            judgmentRows.push({
              user_id: user.id,
              visit_id: iv.id,
              employee_id: iv.employee_id,
              doctor_id: iv.doctor_id,
              judgment_date: src.scadenza,
              judgment,
              valid_until: src.scadenza,
              notes: `Importato da agenda ${fileName}`,
            });
          }
        });
        if (judgmentRows.length > 0) {
          const { error: jErr } = await (supabase as any).from('medical_judgments').insert(judgmentRows);
          if (!jErr) createdJudgments += judgmentRows.length;
          else console.error('judgments error', jErr);
        }

        const crmRows = (insertedVisits ?? []).map((iv: any, idx: number) => {
          const src = chunk[idx];
          const examNames = src.exams.map((e) => e.name).join(', ').slice(0, 200);
          return {
            user_id: user.id,
            employee_id: iv.employee_id,
            activity_name: `Visita Medica (${src.exams.length} esami: ${examNames})`,
            activity_type: 'visita',
            execution_date: iv.execution_date,
            expiry_date: iv.next_due_date,
            status: iv.status,
            notes: `[sync da agenda Medicina ${fileName}]`,
          };
        });
        if (crmRows.length > 0) {
          const { error: cErr } = await (supabase as any).from('crm_employee_activities').insert(crmRows);
          if (!cErr) crmSynced += crmRows.length;
          else console.error('crm sync error', cErr);
        }

        setProgress(Math.round(((i + chunk.length) / selected.length) * 100));
      }

      setCreatedReport({ visits: createdVisits, judgments: createdJudgments, doctors: createdDoctors, crm_synced: crmSynced });
      toast.success(`Import completato: ${createdVisits} visite, ${createdJudgments} giudizi, ${createdDoctors} medici nuovi`);
    } catch (e: any) {
      toast.error(`Errore: ${e.message}`);
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Importa agenda da Excel
          </CardTitle>
          <CardDescription>
            Importa l'agenda esportata dal precedente gestionale. Il sistema aggrega righe per dipendente+data+medico,
            crea giudizi di idoneità e sincronizza il CRM.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
          />
          <div className="flex items-center gap-3">
            <Button onClick={() => fileRef.current?.click()} disabled={parsing || importing}>
              <Upload className="h-4 w-4 mr-2" />
              {parsing ? 'Analisi in corso...' : 'Seleziona file Excel'}
            </Button>
            {fileName && <span className="text-sm text-muted-foreground">{fileName}</span>}
          </div>

          {stats && (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 pt-2">
              <Card><CardContent className="p-3"><div className="text-xs text-muted-foreground">Visite aggregate</div><div className="text-2xl font-bold">{stats.total}</div></CardContent></Card>
              <Card><CardContent className="p-3"><div className="text-xs text-muted-foreground flex items-center gap-1"><Users className="h-3 w-3"/>Match CF</div><div className="text-2xl font-bold text-green-600">{stats.matched}</div></CardContent></Card>
              <Card><CardContent className="p-3"><div className="text-xs text-muted-foreground">Senza match</div><div className="text-2xl font-bold text-amber-600">{stats.unmatched}</div></CardContent></Card>
              <Card><CardContent className="p-3"><div className="text-xs text-muted-foreground">Duplicati</div><div className="text-2xl font-bold text-muted-foreground">{stats.duplicates}</div></CardContent></Card>
              <Card><CardContent className="p-3"><div className="text-xs text-muted-foreground flex items-center gap-1"><ClipboardCheck className="h-3 w-3"/>Giudizi</div><div className="text-2xl font-bold">{stats.judgments}</div></CardContent></Card>
            </div>
          )}

          {stats && stats.doctors_to_create.length > 0 && (
            <Alert>
              <Stethoscope className="h-4 w-4" />
              <AlertTitle>Medici da creare</AlertTitle>
              <AlertDescription>
                Verranno creati: {stats.doctors_to_create.map((d) => <Badge key={d} variant="outline" className="mr-1">{d}</Badge>)}
              </AlertDescription>
            </Alert>
          )}

          {stats && stats.unmatched > 0 && (
            <Alert variant="default" className="border-amber-500/50">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Dipendenti non trovati nel CRM</AlertTitle>
              <AlertDescription>
                {stats.unmatched} visite non hanno un dipendente CRM corrispondente (match strict su Codice Fiscale).
                Saranno saltate. Importa prima i dipendenti dal CRM o aggiungi manualmente i CF.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {visits.length > 0 && !createdReport && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg">Anteprima visite</CardTitle>
              <CardDescription>
                {visits.filter((v) => v.selected).length} di {visits.length} selezionate per import
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => toggleAll(true)}>Seleziona match</Button>
              <Button variant="outline" size="sm" onClick={() => toggleAll(false)}>Deseleziona tutto</Button>
              <Button onClick={runImport} disabled={importing || visits.filter((v) => v.selected).length === 0}>
                {importing ? <><Loader2 className="h-4 w-4 mr-2 animate-spin"/>Importazione...</> : <>Importa selezionate</>}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {importing && <Progress value={progress} className="mb-3" />}
            <ScrollArea className="h-[500px] border rounded-md">
              <Table>
                <TableHeader className="sticky top-0 bg-background">
                  <TableRow>
                    <TableHead className="w-12"></TableHead>
                    <TableHead>Dipendente</TableHead>
                    <TableHead>Azienda</TableHead>
                    <TableHead>Scadenza</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Esami</TableHead>
                    <TableHead>Medico</TableHead>
                    <TableHead>Idoneità</TableHead>
                    <TableHead>Stato</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visits.slice(0, 200).map((v) => (
                    <TableRow key={v.key} className={!v.employee_id ? 'opacity-50' : v.already_exists ? 'opacity-60' : ''}>
                      <TableCell>
                        <Checkbox
                          checked={v.selected}
                          disabled={!v.employee_id || v.already_exists}
                          onCheckedChange={(c) => toggleOne(v.key, !!c)}
                        />
                      </TableCell>
                      <TableCell className="font-medium">
                        {v.cognome} {v.nome}
                        <div className="text-xs text-muted-foreground font-mono">{v.cf}</div>
                      </TableCell>
                      <TableCell className="max-w-[180px] truncate" title={v.societa}>{v.societa}</TableCell>
                      <TableCell>{v.scadenza}</TableCell>
                      <TableCell><Badge variant="outline">{v.visit_type}</Badge></TableCell>
                      <TableCell>
                        <Badge variant="secondary">{v.exams.length}</Badge>
                        <span className="text-xs text-muted-foreground ml-2 truncate max-w-[200px] inline-block align-middle" title={v.exams.map((e) => e.name).join(', ')}>
                          {v.exams[0]?.name}{v.exams.length > 1 ? ` +${v.exams.length - 1}` : ''}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs">{v.medico}</TableCell>
                      <TableCell className="text-xs">{v.idoneita || '—'}</TableCell>
                      <TableCell>
                        {!v.employee_id ? <Badge variant="destructive">No CF</Badge>
                          : v.already_exists ? <Badge variant="secondary">Esiste</Badge>
                          : <Badge className="bg-green-600">Pronto</Badge>}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {visits.length > 200 && (
                <div className="p-3 text-center text-sm text-muted-foreground">
                  Mostrate prime 200 di {visits.length} righe (tutte verranno importate se selezionate)
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {createdReport && (
        <Alert className="border-green-500/50">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertTitle>Importazione completata</AlertTitle>
          <AlertDescription>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li><strong>{createdReport.visits}</strong> visite mediche create</li>
              <li><strong>{createdReport.judgments}</strong> giudizi di idoneità registrati</li>
              <li><strong>{createdReport.doctors}</strong> medici nuovi creati</li>
              <li><strong>{createdReport.crm_synced}</strong> attività sincronizzate nel CRM dipendenti</li>
            </ul>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};
