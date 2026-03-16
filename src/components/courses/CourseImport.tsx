import { useState, useRef } from 'react';
import { Upload, FileSpreadsheet, Loader2, Check, AlertCircle } from 'lucide-react';
import * as XLSX from 'xlsx';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface ParsedCourse {
  name: string;
  course_type: string;
  description: string;
  duration_hours: number | null;
  max_participants: number | null;
  is_mandatory: boolean;
  renewal_months: number | null;
  category: string;
}

interface ParsedEnrollment {
  course_name: string;
  employee_name: string;
  company_name: string;
  edition_code: string;
  start_date: string;
  end_date: string;
  location: string;
  instructor: string;
  enrollment_date: string;
  status: string;
  certificate_issued: boolean;
  certificate_date: string;
  certificate_expiry: string;
}

interface CourseImportProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: () => void;
}

const COURSE_TYPE_MAP: Record<string, string> = {
  'sicurezza': 'sicurezza',
  'primo soccorso': 'primo_soccorso',
  'antincendio': 'antincendio',
  'rls': 'rls',
  'preposti': 'preposti',
  'dirigenti': 'dirigenti',
  'attrezzature': 'attrezzature',
};

function parseExcelDate(val: any): string {
  if (!val) return '';
  if (typeof val === 'number') {
    const d = XLSX.SSF.parse_date_code(val);
    return `${d.y}-${String(d.m).padStart(2, '0')}-${String(d.d).padStart(2, '0')}`;
  }
  if (typeof val === 'string') {
    // Try DD/MM/YYYY
    const m = val.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
    if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
    return val;
  }
  return '';
}

function normalizeType(raw: string): string {
  const lower = (raw || '').toLowerCase().trim();
  return COURSE_TYPE_MAP[lower] || 'altro';
}

const CourseImport = ({ open, onOpenChange, onComplete }: CourseImportProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [tab, setTab] = useState<'corsi' | 'iscrizioni'>('corsi');
  const [parsedCourses, setParsedCourses] = useState<ParsedCourse[]>([]);
  const [parsedEnrollments, setParsedEnrollments] = useState<ParsedEnrollment[]>([]);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<{ success: number; errors: number } | null>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const wb = XLSX.read(ev.target?.result, { type: 'binary' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows: any[] = XLSX.utils.sheet_to_json(ws, { defval: '' });

      if (tab === 'corsi') {
        const courses: ParsedCourse[] = rows.map(r => ({
          name: r['Nome'] || r['nome'] || r['Name'] || r['name'] || '',
          course_type: normalizeType(r['Tipo'] || r['tipo'] || r['Type'] || r['type'] || ''),
          description: r['Descrizione'] || r['descrizione'] || r['Description'] || '',
          duration_hours: parseFloat(r['Ore'] || r['ore'] || r['Durata'] || r['durata'] || r['Hours'] || '') || null,
          max_participants: parseInt(r['Max Partecipanti'] || r['max_partecipanti'] || r['Max'] || '') || null,
          is_mandatory: ['si', 'sì', 'yes', 'true', '1'].includes(String(r['Obbligatorio'] || r['obbligatorio'] || r['Mandatory'] || '').toLowerCase()),
          renewal_months: parseInt(r['Rinnovo Mesi'] || r['rinnovo_mesi'] || r['Renewal'] || '') || null,
          category: r['Categoria'] || r['categoria'] || r['Category'] || '',
        })).filter(c => c.name);
        setParsedCourses(courses);
      } else {
        const enrollments: ParsedEnrollment[] = rows.map(r => ({
          course_name: r['Corso'] || r['corso'] || r['Course'] || '',
          employee_name: r['Dipendente'] || r['dipendente'] || r['Employee'] || '',
          company_name: r['Azienda'] || r['azienda'] || r['Company'] || '',
          edition_code: r['Edizione'] || r['edizione'] || r['Edition'] || '',
          start_date: parseExcelDate(r['Data Inizio'] || r['data_inizio'] || r['Start']),
          end_date: parseExcelDate(r['Data Fine'] || r['data_fine'] || r['End']),
          location: r['Sede'] || r['sede'] || r['Location'] || '',
          instructor: r['Docente'] || r['docente'] || r['Instructor'] || '',
          enrollment_date: parseExcelDate(r['Data Iscrizione'] || r['data_iscrizione']),
          status: r['Stato'] || r['stato'] || r['Status'] || 'iscritto',
          certificate_issued: ['si', 'sì', 'yes', 'true', '1'].includes(String(r['Attestato'] || r['attestato'] || '').toLowerCase()),
          certificate_date: parseExcelDate(r['Data Attestato'] || r['data_attestato']),
          certificate_expiry: parseExcelDate(r['Scadenza Attestato'] || r['scadenza_attestato']),
        })).filter(e => e.course_name && e.employee_name);
        setParsedEnrollments(enrollments);
      }
    };
    reader.readAsBinaryString(file);
    e.target.value = '';
  };

  const importCourses = async () => {
    if (!user || parsedCourses.length === 0) return;
    setImporting(true);
    setProgress(0);
    let success = 0, errors = 0;

    for (let i = 0; i < parsedCourses.length; i++) {
      const c = parsedCourses[i];
      const { error } = await supabase.from('courses').insert({
        name: c.name,
        course_type: c.course_type,
        description: c.description || null,
        duration_hours: c.duration_hours,
        max_participants: c.max_participants,
        is_mandatory: c.is_mandatory,
        renewal_months: c.renewal_months,
        category: c.category || null,
        user_id: user.id,
      });
      if (error) { errors++; console.error('Import course error:', error); }
      else success++;
      setProgress(Math.round(((i + 1) / parsedCourses.length) * 100));
    }

    setResult({ success, errors });
    setImporting(false);
    if (success > 0) onComplete();
    toast({ title: `Importati ${success} corsi`, description: errors > 0 ? `${errors} errori` : undefined });
  };

  const importEnrollments = async () => {
    if (!user || parsedEnrollments.length === 0) return;
    setImporting(true);
    setProgress(0);
    let success = 0, errors = 0;

    // Pre-fetch courses, contacts, employees for matching
    const { data: courses } = await supabase.from('courses').select('id, name');
    const { data: contacts } = await supabase.from('crm_contacts').select('id, name, company');
    const { data: employees } = await supabase.from('crm_employees').select('id, first_name, last_name, contact_id');

    const courseMap = new Map((courses || []).map(c => [c.name.toLowerCase().trim(), c.id]));
    const contactMap = new Map((contacts || []).map(c => [(c.company || c.name).toLowerCase().trim(), c.id]));
    const employeeList = employees || [];

    // Group by course+edition to create editions efficiently
    const editionCache = new Map<string, string>();

    for (let i = 0; i < parsedEnrollments.length; i++) {
      const enr = parsedEnrollments[i];
      try {
        // Match course
        let courseId = courseMap.get(enr.course_name.toLowerCase().trim());
        if (!courseId) {
          // Auto-create course
          const { data: newCourse } = await supabase.from('courses').insert({
            name: enr.course_name, course_type: 'altro', user_id: user.id,
          }).select('id').single();
          if (newCourse) { courseId = newCourse.id; courseMap.set(enr.course_name.toLowerCase().trim(), newCourse.id); }
        }
        if (!courseId) { errors++; continue; }

        // Get or create edition
        const edKey = `${courseId}-${enr.edition_code || enr.start_date || 'default'}`;
        let editionId = editionCache.get(edKey);
        if (!editionId) {
          const { data: newEd } = await supabase.from('course_editions').insert({
            course_id: courseId,
            edition_code: enr.edition_code || null,
            start_date: enr.start_date || null,
            end_date: enr.end_date || null,
            location: enr.location || null,
            instructor_name: enr.instructor || null,
            user_id: user.id,
            status: 'completata',
          }).select('id').single();
          if (newEd) { editionId = newEd.id; editionCache.set(edKey, newEd.id); }
        }
        if (!editionId) { errors++; continue; }

        // Match employee
        const empParts = enr.employee_name.trim().split(/\s+/);
        const matchedEmp = employeeList.find(e => {
          const fullName = `${e.first_name} ${e.last_name}`.toLowerCase();
          const reverseName = `${e.last_name} ${e.first_name}`.toLowerCase();
          const target = enr.employee_name.toLowerCase().trim();
          return fullName === target || reverseName === target;
        });

        // Match contact
        const contactId = contactMap.get(enr.company_name.toLowerCase().trim()) || matchedEmp?.contact_id || null;

        const { error: insertErr } = await supabase.from('course_enrollments').insert({
          edition_id: editionId,
          employee_id: matchedEmp?.id || null,
          contact_id: contactId,
          enrollment_date: enr.enrollment_date || null,
          status: enr.status || 'iscritto',
          certificate_issued: enr.certificate_issued,
          certificate_date: enr.certificate_date || null,
          certificate_expiry: enr.certificate_expiry || null,
          user_id: user.id,
        });

        if (insertErr) { errors++; console.error('Enrollment import error:', insertErr); }
        else success++;
      } catch (err) {
        errors++;
        console.error('Enrollment processing error:', err);
      }
      setProgress(Math.round(((i + 1) / parsedEnrollments.length) * 100));
    }

    setResult({ success, errors });
    setImporting(false);
    if (success > 0) onComplete();
    toast({ title: `Importate ${success} iscrizioni`, description: errors > 0 ? `${errors} errori` : undefined });
  };

  const reset = () => {
    setParsedCourses([]);
    setParsedEnrollments([]);
    setResult(null);
    setProgress(0);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" /> Importa Corsi da Excel
          </DialogTitle>
        </DialogHeader>

        <Tabs value={tab} onValueChange={v => { setTab(v as any); reset(); }}>
          <TabsList className="w-full">
            <TabsTrigger value="corsi" className="flex-1">Catalogo Corsi</TabsTrigger>
            <TabsTrigger value="iscrizioni" className="flex-1">Iscrizioni & Attestati</TabsTrigger>
          </TabsList>

          <TabsContent value="corsi" className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Colonne riconosciute: <strong>Nome, Tipo, Descrizione, Ore, Max Partecipanti, Obbligatorio, Rinnovo Mesi, Categoria</strong>
            </p>
            <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" onChange={handleFile} className="hidden" />
            <Button variant="outline" onClick={() => fileRef.current?.click()} className="gap-2" disabled={importing}>
              <Upload className="h-4 w-4" /> Seleziona file Excel
            </Button>

            {parsedCourses.length > 0 && (
              <>
                <Badge variant="secondary">{parsedCourses.length} corsi trovati</Badge>
                <ScrollArea className="h-[300px] border rounded-md">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nome</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Ore</TableHead>
                        <TableHead>Obbl.</TableHead>
                        <TableHead>Rinnovo</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {parsedCourses.map((c, i) => (
                        <TableRow key={i}>
                          <TableCell className="font-medium">{c.name}</TableCell>
                          <TableCell>{c.course_type}</TableCell>
                          <TableCell>{c.duration_hours || '-'}</TableCell>
                          <TableCell>{c.is_mandatory ? 'Sì' : 'No'}</TableCell>
                          <TableCell>{c.renewal_months ? `${c.renewal_months}m` : '-'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
                <Button onClick={importCourses} disabled={importing} className="gap-2">
                  {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                  Importa {parsedCourses.length} corsi
                </Button>
              </>
            )}
          </TabsContent>

          <TabsContent value="iscrizioni" className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Colonne riconosciute: <strong>Corso, Dipendente, Azienda, Edizione, Data Inizio, Data Fine, Sede, Docente, Data Iscrizione, Stato, Attestato, Data Attestato, Scadenza Attestato</strong>
            </p>
            <input type="file" accept=".xlsx,.xls,.csv" onChange={handleFile} className="hidden" id="enroll-file" />
            <Button variant="outline" onClick={() => document.getElementById('enroll-file')?.click()} className="gap-2" disabled={importing}>
              <Upload className="h-4 w-4" /> Seleziona file Excel
            </Button>

            {parsedEnrollments.length > 0 && (
              <>
                <Badge variant="secondary">{parsedEnrollments.length} iscrizioni trovate</Badge>
                <ScrollArea className="h-[300px] border rounded-md">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Corso</TableHead>
                        <TableHead>Dipendente</TableHead>
                        <TableHead>Azienda</TableHead>
                        <TableHead>Attestato</TableHead>
                        <TableHead>Scadenza</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {parsedEnrollments.map((e, i) => (
                        <TableRow key={i}>
                          <TableCell className="font-medium">{e.course_name}</TableCell>
                          <TableCell>{e.employee_name}</TableCell>
                          <TableCell>{e.company_name}</TableCell>
                          <TableCell>{e.certificate_issued ? 'Sì' : 'No'}</TableCell>
                          <TableCell>{e.certificate_expiry || '-'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
                <Button onClick={importEnrollments} disabled={importing} className="gap-2">
                  {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                  Importa {parsedEnrollments.length} iscrizioni
                </Button>
              </>
            )}
          </TabsContent>
        </Tabs>

        {importing && <Progress value={progress} className="mt-2" />}

        {result && (
          <div className="flex items-center gap-3 mt-2 p-3 rounded-md bg-muted">
            {result.errors === 0 ? (
              <Check className="h-5 w-5 text-green-600" />
            ) : (
              <AlertCircle className="h-5 w-5 text-orange-500" />
            )}
            <span className="text-sm">
              {result.success} importati con successo{result.errors > 0 ? `, ${result.errors} errori` : ''}
            </span>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default CourseImport;
