import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Download, AlertCircle, CheckCircle2, Database, Search, Stethoscope, ClipboardList, CalendarClock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';
import { it } from 'date-fns/locale';

interface CRMActivity {
  id: string;
  employee_id: string | null;
  activity_name: string;
  activity_type: string;
  execution_date: string | null;
  expiry_date: string | null;
  status: string | null;
  notes: string | null;
}

interface EmployeeRef {
  id: string;
  first_name: string;
  last_name: string;
  contact_id: string | null;
  role?: string | null;
}

interface GroupedVisit {
  key: string;
  employee_id: string;
  employee_name: string;
  contact_id: string | null;
  contact_name: string;
  date: string | null;
  isScheduled: boolean;
  visit_type: string;
  exams: { name: string; type: string }[];
  next_due_date: string | null;
  source_ids: string[];
}

interface DoctorCandidate {
  id: string;
  name: string;
  company: string | null;
  email: string | null;
  phone: string | null;
  pec: string | null;
  address: string | null;
  matchReason: string;
}

interface EmployeeProtocol {
  employee_id: string;
  employee_name: string;
  contact_id: string | null;
  contact_name: string;
  role_guess: string;
  exam_frequencies: { name: string; count: number; lastDate: string | null }[];
  periodicity_months: number;
}

const MEDICAL_KEYWORDS = ['medic', 'visit', 'sanitar', 'idone', 'spirometr', 'audiometr', 'visiotest', 'ecg', 'elettrocardio', 'ematochim', 'glicemia', 'rachide', 'alcole', 'drug test', 'epatite', 'antitetan', 'visiva', 'audiometric', 'apparato nervoso', 'arti superiori'];
const STRONG_DOCTOR_KEYWORDS = ['medico competente', 'medicina del lavoro', 'medico del lavoro'];
const WEAK_DOCTOR_KEYWORDS = ['dott.', 'dr.', 'dottor', 'studio medico'];
const EXCLUDE_DOCTOR_KEYWORDS = ['veterin', 'dentist', 'commercialist', 'farmac', 'omeopat', 'ingegne', 'avvocat', 'architett', 'geometr', 'notai'];

const inferVisitType = (name: string): string => {
  const n = name.toLowerCase();
  if (n.includes('preventiva')) return 'preventiva';
  if (n.includes('periodica')) return 'periodica';
  if (n.includes('cambio mansione')) return 'cambio_mansione';
  if (n.includes('rientro')) return 'rientro';
  if (n.includes('cessazione')) return 'cessazione';
  if (n.includes('su richiesta') || n.includes('a richiesta')) return 'su_richiesta';
  return 'periodica';
};

const splitDoctorName = (full: string): { first: string; last: string } => {
  const cleaned = full
    .replace(/dott\.?ssa/gi, '')
    .replace(/dott\.?/gi, '')
    .replace(/dr\.?/gi, '')
    .replace(/medico competente|medicina del lavoro/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
  const parts = cleaned.split(' ').filter(Boolean);
  if (parts.length === 0) return { first: 'N/D', last: 'N/D' };
  if (parts.length === 1) return { first: parts[0], last: '—' };
  return { first: parts[0], last: parts.slice(1).join(' ') };
};

export function MedicalCRMImporter({ onImportComplete }: { onImportComplete?: () => void }) {
  const { user } = useAuth();

  // Visits import state
  const [scanning, setScanning] = useState(false);
  const [loading, setLoading] = useState(false);
  const [imported, setImported] = useState<{ ok: number; skipped: number; failed: number } | null>(null);
  const [groupedVisits, setGroupedVisits] = useState<GroupedVisit[]>([]);
  const [selectedVisits, setSelectedVisits] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');
  const [includeScheduled, setIncludeScheduled] = useState(true);

  // Doctors import state
  const [scanningDocs, setScanningDocs] = useState(false);
  const [importingDocs, setImportingDocs] = useState(false);
  const [doctorCandidates, setDoctorCandidates] = useState<DoctorCandidate[]>([]);
  const [selectedDocs, setSelectedDocs] = useState<Set<string>>(new Set());
  const [doctorImportResult, setDoctorImportResult] = useState<{ ok: number; failed: number } | null>(null);

  // Protocols generation state
  const [scanningProtos, setScanningProtos] = useState(false);
  const [importingProtos, setImportingProtos] = useState(false);
  const [employeeProtocols, setEmployeeProtocols] = useState<EmployeeProtocol[]>([]);
  const [selectedProtos, setSelectedProtos] = useState<Set<string>>(new Set());
  const [minExams, setMinExams] = useState(3);
  const [protoImportResult, setProtoImportResult] = useState<{ ok: number; failed: number } | null>(null);

  // ============ VISITS IMPORT (existing) ============
  const scanCRM = async () => {
    setScanning(true);
    setImported(null);
    try {
      const allActivities: CRMActivity[] = [];
      let from = 0;
      const pageSize = 1000;
      while (true) {
        const { data, error } = await supabase
          .from('crm_employee_activities')
          .select('id, employee_id, activity_name, activity_type, execution_date, expiry_date, status, notes')
          .not('employee_id', 'is', null)
          .range(from, from + pageSize - 1);
        if (error) throw error;
        if (!data || data.length === 0) break;
        allActivities.push(...(data as CRMActivity[]));
        if (data.length < pageSize) break;
        from += pageSize;
      }

      const medical = allActivities.filter((a) => {
        const t = (a.activity_type || '').toLowerCase();
        const n = (a.activity_name || '').toLowerCase();
        return MEDICAL_KEYWORDS.some((k) => t.includes(k) || n.includes(k));
      });

      if (medical.length === 0) {
        toast.info('Nessuna attività medica trovata nel CRM');
        setGroupedVisits([]);
        return;
      }

      const employeeIds = [...new Set(medical.map((a) => a.employee_id!).filter(Boolean))];
      const employees: Record<string, EmployeeRef> = {};
      for (let i = 0; i < employeeIds.length; i += 1000) {
        const slice = employeeIds.slice(i, i + 1000);
        const { data: emps } = await supabase
          .from('crm_employees')
          .select('id, first_name, last_name, contact_id, role')
          .in('id', slice);
        (emps || []).forEach((e: any) => { employees[e.id] = e; });
      }

      const contactIds = [...new Set(Object.values(employees).map((e) => e.contact_id).filter(Boolean) as string[])];
      const contactsMap: Record<string, string> = {};
      for (let i = 0; i < contactIds.length; i += 1000) {
        const slice = contactIds.slice(i, i + 1000);
        const { data: cs } = await supabase
          .from('crm_contacts')
          .select('id, name, company')
          .in('id', slice);
        (cs || []).forEach((c: any) => { contactsMap[c.id] = c.company || c.name; });
      }

      const { data: existingVisits } = await supabase
        .from('medical_visits')
        .select('employee_id, execution_date, scheduled_date')
        .eq('user_id', user!.id);
      const existingKeys = new Set(
        (existingVisits || []).map((v: any) => `${v.employee_id}|${v.execution_date || v.scheduled_date || ''}`)
      );

      const groups: Map<string, GroupedVisit> = new Map();
      for (const a of medical) {
        const emp = employees[a.employee_id!];
        if (!emp) continue;
        const date = a.execution_date || a.expiry_date;
        if (!date) continue;
        const isScheduled = !a.execution_date;
        const key = `${a.employee_id}|${date}|${isScheduled ? 'sch' : 'exec'}`;
        if (existingKeys.has(`${a.employee_id}|${date}`)) continue;

        const empName = `${emp.first_name} ${emp.last_name}`;
        const contactName = emp.contact_id ? contactsMap[emp.contact_id] || '—' : '—';

        if (!groups.has(key)) {
          groups.set(key, {
            key, employee_id: a.employee_id!, employee_name: empName,
            contact_id: emp.contact_id, contact_name: contactName,
            date, isScheduled, visit_type: inferVisitType(a.activity_name),
            exams: [], next_due_date: a.expiry_date, source_ids: [],
          });
        }
        const g = groups.get(key)!;
        g.exams.push({ name: a.activity_name, type: a.activity_type });
        g.source_ids.push(a.id);
        if (/visita\s*medica/i.test(a.activity_name)) g.visit_type = inferVisitType(a.activity_name);
        if (a.expiry_date && (!g.next_due_date || a.expiry_date > g.next_due_date)) g.next_due_date = a.expiry_date;
      }

      const list = Array.from(groups.values()).sort((a, b) => (b.date || '').localeCompare(a.date || ''));
      setGroupedVisits(list);
      setSelectedVisits(new Set(list.map((g) => g.key)));
      toast.success(`Trovate ${list.length} visite raggruppate`);
    } catch (e: any) {
      toast.error('Errore: ' + e.message);
    } finally {
      setScanning(false);
    }
  };

  const filteredVisits = useMemo(() => {
    let list = groupedVisits;
    if (!includeScheduled) list = list.filter((g) => !g.isScheduled);
    if (search) {
      const s = search.toLowerCase();
      list = list.filter((g) => g.employee_name.toLowerCase().includes(s) || g.contact_name.toLowerCase().includes(s));
    }
    return list;
  }, [groupedVisits, search, includeScheduled]);

  const importVisits = async () => {
    if (!user) return;
    const toImport = filteredVisits.filter((g) => selectedVisits.has(g.key));
    if (toImport.length === 0) { toast.warning('Seleziona almeno una visita'); return; }
    setLoading(true);
    let ok = 0, failed = 0;
    const skipped = groupedVisits.length - toImport.length;
    for (let i = 0; i < toImport.length; i += 100) {
      const batch = toImport.slice(i, i + 100);
      const rows = batch.map((g) => ({
        user_id: user.id, employee_id: g.employee_id, contact_id: g.contact_id,
        visit_type: g.visit_type,
        execution_date: g.isScheduled ? null : g.date,
        scheduled_date: g.isScheduled ? g.date : null,
        next_due_date: g.next_due_date,
        status: g.isScheduled ? 'scheduled' : 'completed',
        exams_performed: g.exams,
        notes: `Importato dal CRM (${g.exams.length} esami)`,
      }));
      const { error } = await supabase.from('medical_visits').insert(rows);
      if (error) { failed += batch.length; } else { ok += batch.length; }
    }
    setImported({ ok, skipped, failed });
    setLoading(false);
    if (ok > 0) { toast.success(`Importate ${ok} visite`); onImportComplete?.(); }
    if (failed > 0) toast.error(`${failed} visite fallite`);
  };

  // ============ DOCTORS IMPORT ============
  const scanDoctors = async () => {
    setScanningDocs(true);
    setDoctorImportResult(null);
    try {
      const { data, error } = await supabase
        .from('crm_contacts')
        .select('id, name, company, email, phone, pec, address, role')
        .or(`role.ilike.%medic%,company.ilike.%medico%,company.ilike.%medicina del lavoro%,name.ilike.%dott%,name.ilike.%dr.%`)
        .limit(500);
      if (error) throw error;

      const { data: existingDocs } = await supabase
        .from('medical_doctors')
        .select('email, fiscal_code, first_name, last_name')
        .eq('user_id', user!.id);
      const existingKeys = new Set((existingDocs || []).map((d: any) =>
        `${(d.first_name || '').toLowerCase()}|${(d.last_name || '').toLowerCase()}`
      ));

      const candidates: DoctorCandidate[] = (data || [])
        .map((c: any) => {
          const fullText = `${c.name || ''} ${c.company || ''} ${c.role || ''}`.toLowerCase();
          if (EXCLUDE_DOCTOR_KEYWORDS.some((k) => fullText.includes(k))) return null;

          let reason = '';
          if (STRONG_DOCTOR_KEYWORDS.some((k) => fullText.includes(k))) reason = 'Medico del lavoro (forte)';
          else if ((c.role || '').toLowerCase().includes('medic')) reason = `Ruolo: ${c.role}`;
          else if (WEAK_DOCTOR_KEYWORDS.some((k) => fullText.includes(k))) reason = 'Titolo dottore (debole)';
          else return null;

          const { first, last } = splitDoctorName(c.name || c.company || '');
          const dupKey = `${first.toLowerCase()}|${last.toLowerCase()}`;
          if (existingKeys.has(dupKey)) return null;

          return {
            id: c.id, name: c.name || c.company,
            company: c.company, email: c.email, phone: c.phone, pec: c.pec, address: c.address,
            matchReason: reason,
          };
        })
        .filter(Boolean) as DoctorCandidate[];

      candidates.sort((a, b) => {
        const pa = a.matchReason.includes('forte') ? 0 : a.matchReason.startsWith('Ruolo') ? 1 : 2;
        const pb = b.matchReason.includes('forte') ? 0 : b.matchReason.startsWith('Ruolo') ? 1 : 2;
        return pa - pb;
      });

      setDoctorCandidates(candidates);
      // Pre-select only strong matches
      setSelectedDocs(new Set(candidates.filter((c) => c.matchReason.includes('forte') || c.matchReason.startsWith('Ruolo')).map((c) => c.id)));
      toast.success(`Trovati ${candidates.length} candidati medici`);
    } catch (e: any) {
      toast.error('Errore: ' + e.message);
    } finally {
      setScanningDocs(false);
    }
  };

  const importDoctors = async () => {
    if (!user) return;
    const toImport = doctorCandidates.filter((c) => selectedDocs.has(c.id));
    if (toImport.length === 0) { toast.warning('Seleziona almeno un medico'); return; }
    setImportingDocs(true);
    let ok = 0, failed = 0;
    for (const c of toImport) {
      const { first, last } = splitDoctorName(c.name);
      const { error } = await supabase.from('medical_doctors').insert({
        user_id: user.id,
        first_name: first, last_name: last,
        email: c.email, phone: c.phone, pec: c.pec,
        facility_address: c.address,
        facility_name: c.company !== c.name ? c.company : null,
        is_active: true,
        notes: `Importato dal CRM (${c.matchReason})`,
      });
      if (error) failed++; else ok++;
    }
    setDoctorImportResult({ ok, failed });
    setImportingDocs(false);
    if (ok > 0) { toast.success(`Importati ${ok} medici`); onImportComplete?.(); }
    if (failed > 0) toast.error(`${failed} medici falliti`);
  };

  // ============ PROTOCOLS GENERATION ============
  const scanProtocols = async () => {
    setScanningProtos(true);
    setProtoImportResult(null);
    try {
      const allActivities: CRMActivity[] = [];
      let from = 0;
      while (true) {
        const { data, error } = await supabase
          .from('crm_employee_activities')
          .select('id, employee_id, activity_name, activity_type, execution_date, expiry_date, status, notes')
          .not('employee_id', 'is', null)
          .not('execution_date', 'is', null)
          .range(from, from + 999);
        if (error) throw error;
        if (!data || data.length === 0) break;
        allActivities.push(...(data as CRMActivity[]));
        if (data.length < 1000) break;
        from += 1000;
      }

      const medical = allActivities.filter((a) => {
        const t = (a.activity_type || '').toLowerCase();
        const n = (a.activity_name || '').toLowerCase();
        return MEDICAL_KEYWORDS.some((k) => t.includes(k) || n.includes(k));
      });

      // Group by employee
      const byEmp: Map<string, CRMActivity[]> = new Map();
      medical.forEach((a) => {
        if (!byEmp.has(a.employee_id!)) byEmp.set(a.employee_id!, []);
        byEmp.get(a.employee_id!)!.push(a);
      });

      // Fetch employees
      const empIds = [...byEmp.keys()];
      const employees: Record<string, EmployeeRef> = {};
      for (let i = 0; i < empIds.length; i += 1000) {
        const { data: emps } = await supabase
          .from('crm_employees')
          .select('id, first_name, last_name, contact_id, role')
          .in('id', empIds.slice(i, i + 1000));
        (emps || []).forEach((e: any) => { employees[e.id] = e; });
      }

      const contactIds = [...new Set(Object.values(employees).map((e) => e.contact_id).filter(Boolean) as string[])];
      const contactsMap: Record<string, string> = {};
      for (let i = 0; i < contactIds.length; i += 1000) {
        const { data: cs } = await supabase
          .from('crm_contacts')
          .select('id, name, company')
          .in('id', contactIds.slice(i, i + 1000));
        (cs || []).forEach((c: any) => { contactsMap[c.id] = c.company || c.name; });
      }

      // Existing protocols (skip dups by employee_name+contact)
      const { data: existingProtos } = await supabase
        .from('medical_protocols')
        .select('name, contact_id')
        .eq('user_id', user!.id);
      const existingProtoKeys = new Set((existingProtos || []).map((p: any) => `${p.contact_id || ''}|${p.name}`));

      const list: EmployeeProtocol[] = [];
      byEmp.forEach((acts, empId) => {
        const emp = employees[empId];
        if (!emp) return;
        const empName = `${emp.first_name} ${emp.last_name}`;
        const contactName = emp.contact_id ? contactsMap[emp.contact_id] || '—' : '—';

        // Filter out plain "Visita Medica" container, keep specific exams
        const exams = acts.filter((a) => !/^visita\s*medica$/i.test(a.activity_name));
        if (exams.length < minExams) return;

        // Aggregate frequencies
        const freqMap: Map<string, { count: number; lastDate: string | null }> = new Map();
        exams.forEach((e) => {
          const key = e.activity_name;
          if (!freqMap.has(key)) freqMap.set(key, { count: 0, lastDate: null });
          const f = freqMap.get(key)!;
          f.count++;
          if (e.execution_date && (!f.lastDate || e.execution_date > f.lastDate)) f.lastDate = e.execution_date;
        });
        const exam_frequencies = Array.from(freqMap.entries())
          .map(([name, { count, lastDate }]) => ({ name, count, lastDate }))
          .sort((a, b) => b.count - a.count);

        // Estimate periodicity from execution dates
        const sortedDates = exams.map((e) => e.execution_date!).filter(Boolean).sort();
        let periodicity_months = 12;
        if (sortedDates.length >= 2) {
          const first = parseISO(sortedDates[0]);
          const last = parseISO(sortedDates[sortedDates.length - 1]);
          const months = (last.getFullYear() - first.getFullYear()) * 12 + (last.getMonth() - first.getMonth());
          const visitDays = [...new Set(sortedDates.map((d) => d.slice(0, 10)))];
          if (visitDays.length >= 2 && months > 0) {
            periodicity_months = Math.max(6, Math.min(60, Math.round(months / (visitDays.length - 1))));
          }
        }

        const protoName = `Protocollo ${empName}`;
        if (existingProtoKeys.has(`${emp.contact_id || ''}|${protoName}`)) return;

        list.push({
          employee_id: empId, employee_name: empName,
          contact_id: emp.contact_id, contact_name: contactName,
          role_guess: emp.role || 'Mansione non specificata',
          exam_frequencies, periodicity_months,
        });
      });

      list.sort((a, b) => b.exam_frequencies.length - a.exam_frequencies.length);
      setEmployeeProtocols(list);
      setSelectedProtos(new Set(list.map((p) => p.employee_id)));
      toast.success(`Generati ${list.length} protocolli candidati`);
    } catch (e: any) {
      toast.error('Errore: ' + e.message);
    } finally {
      setScanningProtos(false);
    }
  };

  const importProtocols = async () => {
    if (!user) return;
    const toImport = employeeProtocols.filter((p) => selectedProtos.has(p.employee_id));
    if (toImport.length === 0) { toast.warning('Seleziona almeno un protocollo'); return; }
    setImportingProtos(true);
    let ok = 0, failed = 0;
    for (let i = 0; i < toImport.length; i += 50) {
      const batch = toImport.slice(i, i + 50);
      const rows = batch.map((p) => ({
        user_id: user.id, contact_id: p.contact_id,
        name: `Protocollo ${p.employee_name}`,
        job_role: p.role_guess,
        periodicity_months: p.periodicity_months,
        exams: p.exam_frequencies.map((e) => ({ name: e.name, frequency_months: p.periodicity_months })),
        description: `Protocollo personalizzato generato da ${p.exam_frequencies.reduce((acc, e) => acc + e.count, 0)} esami eseguiti`,
        is_active: true,
      }));
      const { error } = await supabase.from('medical_protocols').insert(rows);
      if (error) failed += batch.length; else ok += batch.length;
    }
    setProtoImportResult({ ok, failed });
    setImportingProtos(false);
    if (ok > 0) { toast.success(`Importati ${ok} protocolli`); onImportComplete?.(); }
    if (failed > 0) toast.error(`${failed} protocolli falliti`);
  };

  return (
    <Tabs defaultValue="visits" className="space-y-4">
      <TabsList>
        <TabsTrigger value="visits" className="gap-1"><CalendarClock className="h-4 w-4" />Visite</TabsTrigger>
        <TabsTrigger value="doctors" className="gap-1"><Stethoscope className="h-4 w-4" />Medici</TabsTrigger>
        <TabsTrigger value="protocols" className="gap-1"><ClipboardList className="h-4 w-4" />Protocolli</TabsTrigger>
      </TabsList>

      {/* ========== VISITS ========== */}
      <TabsContent value="visits" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Database className="h-5 w-5 text-primary" />Importa visite mediche dal CRM</CardTitle>
            <CardDescription>Converte le attività mediche dei dipendenti in visite raggruppate per dipendente e data.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Come funziona</AlertTitle>
              <AlertDescription className="space-y-1 text-sm">
                <div>• Più esami nello stesso giorno per lo stesso dipendente diventano <strong>1 visita</strong> con esami multipli.</div>
                <div>• Le attività future (con data scadenza ma senza esecuzione) diventano visite <strong>programmate</strong>.</div>
                <div>• Le visite già esistenti vengono <strong>saltate automaticamente</strong>.</div>
              </AlertDescription>
            </Alert>
            <div className="flex gap-2 flex-wrap">
              <Button onClick={scanCRM} disabled={scanning || loading}>
                {scanning ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Search className="h-4 w-4 mr-2" />}
                Analizza CRM
              </Button>
              {groupedVisits.length > 0 && (
                <Button onClick={importVisits} disabled={loading || selectedVisits.size === 0}>
                  {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
                  Importa {selectedVisits.size} visite
                </Button>
              )}
            </div>
            {imported && (
              <Alert variant={imported.failed > 0 ? 'destructive' : 'default'}>
                <CheckCircle2 className="h-4 w-4" />
                <AlertTitle>Completato</AlertTitle>
                <AlertDescription>✅ {imported.ok} importate · ⏭ {imported.skipped} non selezionate · ❌ {imported.failed} fallite</AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {groupedVisits.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Anteprima visite</CardTitle>
              <CardDescription>{filteredVisits.length} visite · {filteredVisits.reduce((acc, g) => acc + g.exams.length, 0)} esami totali</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-2 items-center flex-wrap">
                <div className="relative flex-1 min-w-[200px] max-w-sm">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input className="pl-8" placeholder="Cerca dipendente o azienda..." value={search} onChange={(e) => setSearch(e.target.value)} />
                </div>
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox checked={includeScheduled} onCheckedChange={(c) => setIncludeScheduled(!!c)} />
                  Includi programmate
                </label>
              </div>
              <div className="border rounded-lg max-h-[500px] overflow-y-auto">
                <Table>
                  <TableHeader className="sticky top-0 bg-background z-10">
                    <TableRow>
                      <TableHead className="w-10">
                        <Checkbox
                          checked={filteredVisits.length > 0 && filteredVisits.every((g) => selectedVisits.has(g.key))}
                          onCheckedChange={(c) => setSelectedVisits(c ? new Set(filteredVisits.map((g) => g.key)) : new Set())}
                        />
                      </TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead>Dipendente</TableHead>
                      <TableHead>Azienda</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Esami</TableHead>
                      <TableHead>Stato</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredVisits.slice(0, 500).map((g) => (
                      <TableRow key={g.key}>
                        <TableCell>
                          <Checkbox checked={selectedVisits.has(g.key)} onCheckedChange={(c) => {
                            const next = new Set(selectedVisits);
                            if (c) next.add(g.key); else next.delete(g.key);
                            setSelectedVisits(next);
                          }} />
                        </TableCell>
                        <TableCell className="whitespace-nowrap">{g.date ? format(parseISO(g.date), 'dd/MM/yyyy', { locale: it }) : '—'}</TableCell>
                        <TableCell className="font-medium">{g.employee_name}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{g.contact_name}</TableCell>
                        <TableCell><Badge variant="outline">{g.visit_type}</Badge></TableCell>
                        <TableCell>
                          <Badge variant="secondary">{g.exams.length}</Badge>
                          <span className="text-xs text-muted-foreground ml-2 truncate max-w-[200px] inline-block align-middle" title={g.exams.map((e) => e.name).join(', ')}>
                            {g.exams[0]?.name}{g.exams.length > 1 ? ` +${g.exams.length - 1}` : ''}
                          </span>
                        </TableCell>
                        <TableCell><Badge variant={g.isScheduled ? 'secondary' : 'default'}>{g.isScheduled ? 'Programmata' : 'Eseguita'}</Badge></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {filteredVisits.length > 500 && (
                  <div className="p-3 text-center text-sm text-muted-foreground border-t">
                    Mostrate prime 500 di {filteredVisits.length}.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </TabsContent>

      {/* ========== DOCTORS ========== */}
      <TabsContent value="doctors" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Stethoscope className="h-5 w-5 text-primary" />Importa medici competenti dal CRM</CardTitle>
            <CardDescription>Cerca contatti CRM con ruolo "medico" o azienda contenente termini medici. Filtra automaticamente veterinari, dentisti, commercialisti.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Selezione manuale richiesta</AlertTitle>
              <AlertDescription className="text-sm">
                Verranno mostrati i candidati con un punteggio di affidabilità. <strong>Pre-selezionati solo i match forti</strong> (es. "medico competente"). Verifica e seleziona manualmente eventuali medici aggiuntivi.
              </AlertDescription>
            </Alert>
            <div className="flex gap-2 flex-wrap">
              <Button onClick={scanDoctors} disabled={scanningDocs || importingDocs}>
                {scanningDocs ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Search className="h-4 w-4 mr-2" />}
                Analizza CRM
              </Button>
              {doctorCandidates.length > 0 && (
                <Button onClick={importDoctors} disabled={importingDocs || selectedDocs.size === 0}>
                  {importingDocs ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
                  Importa {selectedDocs.size} medici
                </Button>
              )}
            </div>
            {doctorImportResult && (
              <Alert variant={doctorImportResult.failed > 0 ? 'destructive' : 'default'}>
                <CheckCircle2 className="h-4 w-4" />
                <AlertTitle>Completato</AlertTitle>
                <AlertDescription>✅ {doctorImportResult.ok} medici importati · ❌ {doctorImportResult.failed} falliti</AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {doctorCandidates.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Candidati medici ({doctorCandidates.length})</CardTitle>
              <CardDescription>Verifica manualmente: i candidati "deboli" potrebbero non essere medici del lavoro.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="border rounded-lg max-h-[600px] overflow-y-auto">
                <Table>
                  <TableHeader className="sticky top-0 bg-background z-10">
                    <TableRow>
                      <TableHead className="w-10">
                        <Checkbox
                          checked={doctorCandidates.length > 0 && doctorCandidates.every((c) => selectedDocs.has(c.id))}
                          onCheckedChange={(c) => setSelectedDocs(c ? new Set(doctorCandidates.map((d) => d.id)) : new Set())}
                        />
                      </TableHead>
                      <TableHead>Nome</TableHead>
                      <TableHead>Match</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Telefono</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {doctorCandidates.map((c) => {
                      const isStrong = c.matchReason.includes('forte') || c.matchReason.startsWith('Ruolo');
                      return (
                        <TableRow key={c.id}>
                          <TableCell>
                            <Checkbox checked={selectedDocs.has(c.id)} onCheckedChange={(ch) => {
                              const next = new Set(selectedDocs);
                              if (ch) next.add(c.id); else next.delete(c.id);
                              setSelectedDocs(next);
                            }} />
                          </TableCell>
                          <TableCell className="font-medium">{c.name}</TableCell>
                          <TableCell><Badge variant={isStrong ? 'default' : 'outline'}>{c.matchReason}</Badge></TableCell>
                          <TableCell className="text-sm">{c.email || '—'}</TableCell>
                          <TableCell className="text-sm">{c.phone || '—'}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}
      </TabsContent>

      {/* ========== PROTOCOLS ========== */}
      <TabsContent value="protocols" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><ClipboardList className="h-5 w-5 text-primary" />Genera protocolli sanitari per dipendente</CardTitle>
            <CardDescription>Ricostruisce un protocollo personalizzato dagli esami storicamente eseguiti per ciascun dipendente.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Logica di generazione</AlertTitle>
              <AlertDescription className="space-y-1 text-sm">
                <div>• Vengono raggruppati gli esami eseguiti dal CRM per dipendente.</div>
                <div>• Periodicità stimata dalla cadenza media tra le visite.</div>
                <div>• Sono esclusi i dipendenti con meno di <strong>{minExams}</strong> esami eseguiti (parametro modificabile).</div>
              </AlertDescription>
            </Alert>
            <div className="flex gap-2 flex-wrap items-end">
              <div>
                <label className="text-sm text-muted-foreground block mb-1">Min esami per dipendente</label>
                <Input type="number" min={1} max={20} value={minExams} onChange={(e) => setMinExams(Math.max(1, parseInt(e.target.value) || 3))} className="w-32" />
              </div>
              <Button onClick={scanProtocols} disabled={scanningProtos || importingProtos}>
                {scanningProtos ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Search className="h-4 w-4 mr-2" />}
                Analizza
              </Button>
              {employeeProtocols.length > 0 && (
                <Button onClick={importProtocols} disabled={importingProtos || selectedProtos.size === 0}>
                  {importingProtos ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
                  Crea {selectedProtos.size} protocolli
                </Button>
              )}
            </div>
            {protoImportResult && (
              <Alert variant={protoImportResult.failed > 0 ? 'destructive' : 'default'}>
                <CheckCircle2 className="h-4 w-4" />
                <AlertTitle>Completato</AlertTitle>
                <AlertDescription>✅ {protoImportResult.ok} protocolli creati · ❌ {protoImportResult.failed} falliti</AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {employeeProtocols.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Protocolli candidati ({employeeProtocols.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="border rounded-lg max-h-[600px] overflow-y-auto">
                <Table>
                  <TableHeader className="sticky top-0 bg-background z-10">
                    <TableRow>
                      <TableHead className="w-10">
                        <Checkbox
                          checked={employeeProtocols.length > 0 && employeeProtocols.every((p) => selectedProtos.has(p.employee_id))}
                          onCheckedChange={(c) => setSelectedProtos(c ? new Set(employeeProtocols.map((p) => p.employee_id)) : new Set())}
                        />
                      </TableHead>
                      <TableHead>Dipendente</TableHead>
                      <TableHead>Azienda</TableHead>
                      <TableHead>Esami unici</TableHead>
                      <TableHead>Periodicità</TableHead>
                      <TableHead>Esami principali</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {employeeProtocols.slice(0, 500).map((p) => (
                      <TableRow key={p.employee_id}>
                        <TableCell>
                          <Checkbox checked={selectedProtos.has(p.employee_id)} onCheckedChange={(c) => {
                            const next = new Set(selectedProtos);
                            if (c) next.add(p.employee_id); else next.delete(p.employee_id);
                            setSelectedProtos(next);
                          }} />
                        </TableCell>
                        <TableCell className="font-medium">{p.employee_name}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{p.contact_name}</TableCell>
                        <TableCell><Badge variant="secondary">{p.exam_frequencies.length}</Badge></TableCell>
                        <TableCell><Badge variant="outline">{p.periodicity_months}m</Badge></TableCell>
                        <TableCell className="text-xs max-w-[300px] truncate" title={p.exam_frequencies.map((e) => `${e.name} (${e.count}x)`).join(', ')}>
                          {p.exam_frequencies.slice(0, 3).map((e) => e.name).join(', ')}
                          {p.exam_frequencies.length > 3 ? ` +${p.exam_frequencies.length - 3}` : ''}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {employeeProtocols.length > 500 && (
                  <div className="p-3 text-center text-sm text-muted-foreground border-t">Mostrati primi 500 di {employeeProtocols.length}.</div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </TabsContent>
    </Tabs>
  );
}
