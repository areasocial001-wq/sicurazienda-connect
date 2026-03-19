import { useState, useRef } from 'react';
import { Upload, FileSpreadsheet, Loader2, Check, AlertCircle, History, Info } from 'lucide-react';
import * as XLSX from 'xlsx';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface ParsedAula {
  codice: string;
  corso: string;
  tipologia: string;
  stato: string;
}

interface ParsedFormazione {
  nome_corso: string;
  codice: string;
  edizione: string;
  data: string;
  ore: number | null;
  formatori: string;
  societa: string;
  sede: string;
  num_corsisti: number;
  num_presenti: number;
}

interface ParsedCorsista {
  corso: string;
  azienda_raw: string;
  azienda: string;
  denominazione: string;
  tipologia: string;
  tipo_corsista: string;
  stato: string;
  periodo_dal: string;
  periodo_al: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: () => void;
}

function parseExcelDate(val: any): string {
  if (!val) return '';
  if (typeof val === 'number') {
    const d = XLSX.SSF.parse_date_code(val);
    return `${d.y}-${String(d.m).padStart(2, '0')}-${String(d.d).padStart(2, '0')}`;
  }
  if (typeof val === 'string') {
    const m = val.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
    if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
    return val;
  }
  return '';
}

function parsePeriodo(periodo: string): { dal: string; al: string } {
  if (!periodo) return { dal: '', al: '' };
  const mDal = periodo.match(/Dal\s+(\d{2}\/\d{2}\/\d{4})/i);
  const mAl = periodo.match(/Al\s+(\d{2}\/\d{2}\/\d{4})/i);
  return {
    dal: mDal ? parseExcelDate(mDal[1]) : '',
    al: mAl ? parseExcelDate(mAl[1]) : '',
  };
}

function extractCompanyName(raw: string): string {
  if (!raw) return '';
  const parts = raw.split(' - ');
  return (parts[parts.length - 1] || raw).trim();
}

function guessCourseType(name: string): string {
  const n = name.toLowerCase();
  if (n.includes('carrelli') || n.includes('ple') || n.includes('gru') || n.includes('piattaform')) return 'attrezzature';
  if (n.includes('primo soccorso') || n.includes('a.p.s') || n.includes('aps')) return 'primo_soccorso';
  if (n.includes('antincendio') || n.includes('agea')) return 'antincendio';
  if (n.includes('rls') || n.includes('rappresentante')) return 'rls';
  if (n.includes('preposto') || n.includes('preposti')) return 'preposti';
  if (n.includes('dirigent')) return 'dirigenti';
  if (n.includes('rspp') || n.includes('sicurezza') || n.includes('lavorator') || n.includes('formazione')) return 'sicurezza';
  return 'altro';
}

const CourseHistoryImport = ({ open, onOpenChange, onComplete }: Props) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [aule, setAule] = useState<ParsedAula[]>([]);
  const [formazione, setFormazione] = useState<ParsedFormazione[]>([]);
  const [corsisti, setCorsisti] = useState<ParsedCorsista[]>([]);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [step, setStep] = useState('');
  const [result, setResult] = useState<{ courses: number; editions: number; enrollments: number; errors: number } | null>(null);

  const fileRefAule = useRef<HTMLInputElement>(null);
  const fileRefFormazione = useRef<HTMLInputElement>(null);
  const fileRefCorsisti = useRef<HTMLInputElement>(null);

  const loadAule = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const wb = XLSX.read(ev.target?.result, { type: 'binary' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows: any[] = XLSX.utils.sheet_to_json(ws, { defval: '', range: 1 });
      const parsed: ParsedAula[] = rows.map(r => ({
        codice: String(r['Codice/Piano'] || r['Codice'] || '').trim(),
        corso: String(r['Corso'] || '').trim(),
        tipologia: String(r['Tipologia'] || '').trim(),
        stato: String(r['Stato'] || '').trim(),
      })).filter(a => a.corso);
      setAule(parsed);
      toast({ title: `${parsed.length} aule caricate` });
    };
    reader.readAsBinaryString(file);
    e.target.value = '';
  };

  const loadFormazione = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const wb = XLSX.read(ev.target?.result, { type: 'binary' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows: any[] = XLSX.utils.sheet_to_json(ws, { defval: '', range: 3 });
      const parsed: ParsedFormazione[] = rows.map(r => ({
        nome_corso: String(r['Nome corso'] || '').trim(),
        codice: String(r['Codice/Piano'] || '').trim(),
        edizione: String(r['Edizione'] || '').trim(),
        data: parseExcelDate(r['Data']),
        ore: parseFloat(r['Numero ore corso'] || '') || null,
        formatori: String(r['Formatori'] || '').trim(),
        societa: String(r['Società'] || r['Societa'] || '').trim(),
        sede: String(r['Sede'] || '').trim(),
        num_corsisti: parseInt(r['Numero corsisti'] || '0') || 0,
        num_presenti: parseInt(r['Numero presenti'] || '0') || 0,
      })).filter(f => f.nome_corso);
      setFormazione(parsed);
      toast({ title: `${parsed.length} righe formazione caricate` });
    };
    reader.readAsBinaryString(file);
    e.target.value = '';
  };

  const loadCorsisti = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const wb = XLSX.read(ev.target?.result, { type: 'binary' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows: any[] = XLSX.utils.sheet_to_json(ws, { defval: '' });
      const parsed: ParsedCorsista[] = rows.map(r => {
        const periodo = String(r['Periodo Corso'] || '');
        const { dal, al } = parsePeriodo(periodo);
        const aziendaRaw = String(r['Azienda'] || '').trim();
        return {
          corso: String(r['Corso'] || '').trim(),
          azienda_raw: aziendaRaw,
          azienda: extractCompanyName(aziendaRaw),
          denominazione: String(r['Denominazione'] || '').trim(),
          tipologia: String(r['Tipologia'] || '').trim(),
          tipo_corsista: String(r['Tipo Corsista'] || '').trim(),
          stato: String(r['Stato'] || '').trim(),
          periodo_dal: dal,
          periodo_al: al,
        };
      }).filter(c => c.corso && c.denominazione);
      setCorsisti(parsed);
      toast({ title: `${parsed.length} corsisti caricati` });
    };
    reader.readAsBinaryString(file);
    e.target.value = '';
  };

  const runImport = async () => {
    if (!user) return;
    setImporting(true);
    setProgress(0);
    let coursesCreated = 0, editionsCreated = 0, enrollmentsCreated = 0, errors = 0;

    try {
      // Step 1: Extract unique courses from all sources
      setStep('Creazione corsi...');
      const courseNames = new Map<string, { ore: number | null; tipo: string }>();
      
      formazione.forEach(f => {
        if (!courseNames.has(f.nome_corso)) {
          courseNames.set(f.nome_corso, { ore: f.ore, tipo: guessCourseType(f.nome_corso) });
        }
      });
      aule.forEach(a => {
        if (!courseNames.has(a.corso)) {
          courseNames.set(a.corso, { ore: null, tipo: guessCourseType(a.corso) });
        }
      });
      corsisti.forEach(c => {
        if (!courseNames.has(c.corso)) {
          courseNames.set(c.corso, { ore: null, tipo: guessCourseType(c.corso) });
        }
      });

      // Fetch existing courses to avoid duplicates
      const { data: existingCourses } = await supabase.from('courses').select('id, name');
      const courseMap = new Map<string, string>();
      (existingCourses || []).forEach(c => courseMap.set(c.name.toLowerCase().trim(), c.id));

      const totalSteps = courseNames.size + formazione.length + corsisti.length;
      let done = 0;

      for (const [name, info] of courseNames) {
        if (!courseMap.has(name.toLowerCase().trim())) {
          const { data, error } = await supabase.from('courses').insert({
            name,
            course_type: info.tipo,
            duration_hours: info.ore,
            user_id: user.id,
            is_mandatory: false,
          }).select('id').single();
          if (data) {
            courseMap.set(name.toLowerCase().trim(), data.id);
            coursesCreated++;
          } else if (error) {
            errors++;
            console.error('Course create error:', error);
          }
        }
        done++;
        setProgress(Math.round((done / totalSteps) * 100));
      }

      // Step 2: Create editions from formazione report
      setStep('Creazione edizioni...');
      const editionMap = new Map<string, string>();

      for (const f of formazione) {
        const courseId = courseMap.get(f.nome_corso.toLowerCase().trim());
        if (!courseId) { errors++; done++; setProgress(Math.round((done / totalSteps) * 100)); continue; }

        const edKey = f.edizione || f.codice || `${f.nome_corso}-${f.data}`;
        if (!editionMap.has(edKey)) {
          const { data, error } = await supabase.from('course_editions').insert({
            course_id: courseId,
            edition_code: f.codice || null,
            start_date: f.data || null,
            end_date: f.data || null,
            location: f.sede || null,
            instructor_name: f.formatori || null,
            user_id: user.id,
            status: 'completata',
            notes: f.societa ? `Società: ${f.societa}` : null,
          }).select('id').single();
          if (data) {
            editionMap.set(edKey, data.id);
            editionsCreated++;
          } else if (error) {
            errors++;
            console.error('Edition create error:', error);
          }
        }
        done++;
        setProgress(Math.round((done / totalSteps) * 100));
      }

      // Also create editions from aule that don't have a matching formazione
      for (const a of aule) {
        if (editionMap.has(a.codice)) continue;
        const courseId = courseMap.get(a.corso.toLowerCase().trim());
        if (!courseId) continue;
        const statusMap: Record<string, string> = { 'Aperto': 'pianificata', 'Chiuso': 'completata' };
        const { data } = await supabase.from('course_editions').insert({
          course_id: courseId,
          edition_code: a.codice || null,
          user_id: user.id,
          status: statusMap[a.stato] || 'pianificata',
          notes: a.tipologia ? `Tipologia: ${a.tipologia}` : null,
        }).select('id').single();
        if (data) {
          editionMap.set(a.codice, data.id);
          editionsCreated++;
        }
      }

      // Step 3: Create enrollments from corsisti
      setStep('Creazione iscrizioni corsisti...');
      const { data: employees } = await supabase.from('crm_employees').select('id, first_name, last_name, contact_id');
      const { data: contacts } = await supabase.from('crm_contacts').select('id, name, company');
      const employeeList = employees || [];
      const contactByCompany = new Map<string, string>();
      (contacts || []).forEach(c => {
        if (c.company) contactByCompany.set(c.company.toLowerCase().trim(), c.id);
        contactByCompany.set(c.name.toLowerCase().trim(), c.id);
      });

      for (const c of corsisti) {
        const courseId = courseMap.get(c.corso.toLowerCase().trim());
        if (!courseId) { errors++; done++; setProgress(Math.round((done / totalSteps) * 100)); continue; }

        // Find matching edition by course + date
        let editionId: string | undefined;
        // Try to find edition by matching course_id and start_date
        for (const [key, id] of editionMap) {
          // Check if this edition belongs to this course by looking at formazione data
          const matchingFormazione = formazione.find(f => (f.edizione === key || f.codice === key || `${f.nome_corso}-${f.data}` === key) && f.nome_corso.toLowerCase().trim() === c.corso.toLowerCase().trim());
          if (matchingFormazione && matchingFormazione.data === c.periodo_dal) {
            editionId = id;
            break;
          }
        }

        // If no exact match, find any edition for this course
        if (!editionId) {
          for (const [key, id] of editionMap) {
            const matchingFormazione = formazione.find(f => (f.edizione === key || f.codice === key || `${f.nome_corso}-${f.data}` === key) && f.nome_corso.toLowerCase().trim() === c.corso.toLowerCase().trim());
            const matchingAula = aule.find(a => a.codice === key && a.corso.toLowerCase().trim() === c.corso.toLowerCase().trim());
            if (matchingFormazione || matchingAula) {
              editionId = id;
              break;
            }
          }
        }

        // If still no edition, create one
        if (!editionId) {
          const { data: newEd } = await supabase.from('course_editions').insert({
            course_id: courseId,
            start_date: c.periodo_dal || null,
            end_date: c.periodo_al || null,
            user_id: user.id,
            status: 'completata',
          }).select('id').single();
          if (newEd) {
            editionId = newEd.id;
            editionsCreated++;
          }
        }

        if (!editionId) { errors++; done++; setProgress(Math.round((done / totalSteps) * 100)); continue; }

        // Match employee by name (COGNOME NOME format)
        const empName = c.denominazione.toLowerCase().trim();
        const matchedEmp = employeeList.find(e => {
          const full = `${e.first_name} ${e.last_name}`.toLowerCase();
          const rev = `${e.last_name} ${e.first_name}`.toLowerCase();
          return full === empName || rev === empName;
        });

        // Match contact by company
        const contactId = contactByCompany.get(c.azienda.toLowerCase().trim()) || matchedEmp?.contact_id || null;

        const statusMap: Record<string, string> = {
          'Superato': 'completato',
          'Iscritto': 'iscritto',
          'Non Superato': 'non_superato',
          'Assente': 'assente',
        };

        const { error: insertErr } = await supabase.from('course_enrollments').insert({
          edition_id: editionId,
          employee_id: matchedEmp?.id || null,
          contact_id: contactId,
          enrollment_date: c.periodo_dal || null,
          status: statusMap[c.stato] || c.stato || 'iscritto',
          certificate_issued: c.stato === 'Superato',
          certificate_date: c.stato === 'Superato' ? (c.periodo_al || c.periodo_dal || null) : null,
          user_id: user.id,
          notes: matchedEmp ? null : `Corsista: ${c.denominazione} - ${c.azienda}`,
        });

        if (insertErr) { errors++; console.error('Enrollment error:', insertErr); }
        else enrollmentsCreated++;

        done++;
        setProgress(Math.round((done / totalSteps) * 100));
      }

      setResult({ courses: coursesCreated, editions: editionsCreated, enrollments: enrollmentsCreated, errors });
      if (coursesCreated > 0 || editionsCreated > 0 || enrollmentsCreated > 0) onComplete();
      toast({
        title: 'Importazione completata',
        description: `${coursesCreated} corsi, ${editionsCreated} edizioni, ${enrollmentsCreated} iscrizioni${errors > 0 ? ` (${errors} errori)` : ''}`,
      });
    } catch (err) {
      console.error('Import error:', err);
      toast({ title: 'Errore durante l\'importazione', variant: 'destructive' });
    } finally {
      setImporting(false);
      setStep('');
    }
  };

  const reset = () => {
    setAule([]);
    setFormazione([]);
    setCorsisti([]);
    setResult(null);
    setProgress(0);
    setStep('');
  };

  const totalLoaded = aule.length + formazione.length + corsisti.length;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-5 w-5" /> Importa Storico Formazione
          </DialogTitle>
        </DialogHeader>

        <div className="flex items-start gap-2 p-3 rounded-md bg-muted/50 text-sm text-muted-foreground">
          <Info className="h-4 w-4 mt-0.5 shrink-0" />
          <p>Carica i 3 file Excel dal gestionale precedente. L'importazione creerà automaticamente corsi, edizioni e iscrizioni, collegandoli ai contatti e dipendenti già presenti nel CRM.</p>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          {/* File 1: Aule */}
          <Card className={aule.length > 0 ? 'border-green-300 bg-green-50/50 dark:bg-green-950/20' : ''}>
            <CardContent className="p-4 space-y-2">
              <p className="font-medium text-sm">1. Elenco Aule</p>
              <p className="text-xs text-muted-foreground">elencoAuleVirtuali.xlsx</p>
              <input ref={fileRefAule} type="file" accept=".xlsx,.xls" onChange={loadAule} className="hidden" />
              <Button variant="outline" size="sm" onClick={() => fileRefAule.current?.click()} disabled={importing} className="w-full gap-2">
                <Upload className="h-3 w-3" />
                {aule.length > 0 ? <><Check className="h-3 w-3 text-green-600" /> {aule.length} aule</> : 'Carica'}
              </Button>
            </CardContent>
          </Card>

          {/* File 2: Formazione */}
          <Card className={formazione.length > 0 ? 'border-green-300 bg-green-50/50 dark:bg-green-950/20' : ''}>
            <CardContent className="p-4 space-y-2">
              <p className="font-medium text-sm">2. Report Formazione</p>
              <p className="text-xs text-muted-foreground">ReportFormazioneAula.xlsx</p>
              <input ref={fileRefFormazione} type="file" accept=".xlsx,.xls" onChange={loadFormazione} className="hidden" />
              <Button variant="outline" size="sm" onClick={() => fileRefFormazione.current?.click()} disabled={importing} className="w-full gap-2">
                <Upload className="h-3 w-3" />
                {formazione.length > 0 ? <><Check className="h-3 w-3 text-green-600" /> {formazione.length} righe</> : 'Carica'}
              </Button>
            </CardContent>
          </Card>

          {/* File 3: Corsisti */}
          <Card className={corsisti.length > 0 ? 'border-green-300 bg-green-50/50 dark:bg-green-950/20' : ''}>
            <CardContent className="p-4 space-y-2">
              <p className="font-medium text-sm">3. Report Corsisti</p>
              <p className="text-xs text-muted-foreground">reportCorsisti.xlsx</p>
              <input ref={fileRefCorsisti} type="file" accept=".xlsx,.xls" onChange={loadCorsisti} className="hidden" />
              <Button variant="outline" size="sm" onClick={() => fileRefCorsisti.current?.click()} disabled={importing} className="w-full gap-2">
                <Upload className="h-3 w-3" />
                {corsisti.length > 0 ? <><Check className="h-3 w-3 text-green-600" /> {corsisti.length} corsisti</> : 'Carica'}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Preview */}
        {totalLoaded > 0 && (
          <ScrollArea className="flex-1 min-h-0 max-h-[300px] border rounded-md">
            {formazione.length > 0 && (
              <div className="p-2">
                <p className="text-xs font-semibold text-muted-foreground mb-1">Anteprima Formazione (prime 10)</p>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Corso</TableHead>
                      <TableHead className="text-xs">Codice</TableHead>
                      <TableHead className="text-xs">Data</TableHead>
                      <TableHead className="text-xs">Ore</TableHead>
                      <TableHead className="text-xs">Società</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {formazione.slice(0, 10).map((f, i) => (
                      <TableRow key={i}>
                        <TableCell className="text-xs truncate max-w-[200px]">{f.nome_corso}</TableCell>
                        <TableCell className="text-xs">{f.codice}</TableCell>
                        <TableCell className="text-xs">{f.data}</TableCell>
                        <TableCell className="text-xs">{f.ore || '-'}</TableCell>
                        <TableCell className="text-xs truncate max-w-[150px]">{f.societa}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
            {corsisti.length > 0 && (
              <div className="p-2 border-t">
                <p className="text-xs font-semibold text-muted-foreground mb-1">Anteprima Corsisti (primi 10)</p>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Corso</TableHead>
                      <TableHead className="text-xs">Nome</TableHead>
                      <TableHead className="text-xs">Azienda</TableHead>
                      <TableHead className="text-xs">Stato</TableHead>
                      <TableHead className="text-xs">Periodo</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {corsisti.slice(0, 10).map((c, i) => (
                      <TableRow key={i}>
                        <TableCell className="text-xs truncate max-w-[200px]">{c.corso}</TableCell>
                        <TableCell className="text-xs">{c.denominazione}</TableCell>
                        <TableCell className="text-xs truncate max-w-[150px]">{c.azienda}</TableCell>
                        <TableCell className="text-xs">
                          <Badge variant={c.stato === 'Superato' ? 'default' : 'secondary'} className="text-[10px]">{c.stato || '-'}</Badge>
                        </TableCell>
                        <TableCell className="text-xs">{c.periodo_dal}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </ScrollArea>
        )}

        {/* Import button */}
        {totalLoaded > 0 && !result && (
          <Button onClick={runImport} disabled={importing} className="gap-2">
            {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSpreadsheet className="h-4 w-4" />}
            {importing ? step : `Importa storico (${totalLoaded} record)`}
          </Button>
        )}

        {importing && <Progress value={progress} />}

        {result && (
          <div className="flex items-center gap-3 p-3 rounded-md bg-muted">
            {result.errors === 0 ? (
              <Check className="h-5 w-5 text-green-600" />
            ) : (
              <AlertCircle className="h-5 w-5 text-orange-500" />
            )}
            <div className="text-sm space-y-0.5">
              <p><strong>{result.courses}</strong> corsi creati</p>
              <p><strong>{result.editions}</strong> edizioni create</p>
              <p><strong>{result.enrollments}</strong> iscrizioni create</p>
              {result.errors > 0 && <p className="text-orange-600">{result.errors} errori</p>}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default CourseHistoryImport;
