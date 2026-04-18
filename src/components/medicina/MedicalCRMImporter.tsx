import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, Download, AlertCircle, CheckCircle2, Database, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
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
  contact_name?: string;
}

interface GroupedVisit {
  key: string;
  employee_id: string;
  employee_name: string;
  contact_id: string | null;
  contact_name: string;
  date: string | null; // execution or expected
  isScheduled: boolean;
  visit_type: string;
  exams: { name: string; type: string }[];
  next_due_date: string | null;
  source_ids: string[];
}

const MEDICAL_KEYWORDS = ['medic', 'visit', 'sanitar', 'idone', 'spirometr', 'audiometr', 'visiotest', 'ecg', 'elettrocardio', 'ematochim', 'glicemia', 'rachide', 'alcole', 'drug test', 'epatite', 'antitetan', 'visiva', 'audiometric', 'apparato nervoso', 'arti superiori'];

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

export function MedicalCRMImporter({ onImportComplete }: { onImportComplete?: () => void }) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [imported, setImported] = useState<{ ok: number; skipped: number; failed: number } | null>(null);
  const [groupedVisits, setGroupedVisits] = useState<GroupedVisit[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');
  const [includeScheduled, setIncludeScheduled] = useState(true);

  const scanCRM = async () => {
    setScanning(true);
    setImported(null);
    try {
      // Fetch all medical-related employee activities (paginate to bypass 1000 row limit)
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

      // Filter to medical-related only
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

      // Get all referenced employees
      const employeeIds = [...new Set(medical.map((a) => a.employee_id!).filter(Boolean))];
      const employees: Record<string, EmployeeRef> = {};
      const empPageSize = 1000;
      for (let i = 0; i < employeeIds.length; i += empPageSize) {
        const slice = employeeIds.slice(i, i + empPageSize);
        const { data: emps } = await supabase
          .from('crm_employees')
          .select('id, first_name, last_name, contact_id')
          .in('id', slice);
        (emps || []).forEach((e: any) => { employees[e.id] = e; });
      }

      // Get contact names
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

      // Check existing visits to skip duplicates
      const { data: existingVisits } = await supabase
        .from('medical_visits')
        .select('employee_id, execution_date, scheduled_date')
        .eq('user_id', user!.id);
      const existingKeys = new Set(
        (existingVisits || []).map((v: any) =>
          `${v.employee_id}|${v.execution_date || v.scheduled_date || ''}`
        )
      );

      // Group by employee + date
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
            key,
            employee_id: a.employee_id!,
            employee_name: empName,
            contact_id: emp.contact_id,
            contact_name: contactName,
            date,
            isScheduled,
            visit_type: inferVisitType(a.activity_name),
            exams: [],
            next_due_date: a.expiry_date,
            source_ids: [],
          });
        }
        const g = groups.get(key)!;
        g.exams.push({ name: a.activity_name, type: a.activity_type });
        g.source_ids.push(a.id);
        // Refine visit type if a "Visita Medica" entry is present
        if (/visita\s*medica/i.test(a.activity_name)) {
          g.visit_type = inferVisitType(a.activity_name);
        }
        // Take latest expiry as next_due_date
        if (a.expiry_date && (!g.next_due_date || a.expiry_date > g.next_due_date)) {
          g.next_due_date = a.expiry_date;
        }
      }

      const list = Array.from(groups.values()).sort((a, b) => (b.date || '').localeCompare(a.date || ''));
      setGroupedVisits(list);
      setSelected(new Set(list.map((g) => g.key)));
      toast.success(`Trovate ${list.length} visite raggruppate (${medical.length} attività mediche, ${Object.keys(employees).length} dipendenti)`);
    } catch (e: any) {
      console.error(e);
      toast.error('Errore durante la scansione: ' + e.message);
    } finally {
      setScanning(false);
    }
  };

  const filteredVisits = useMemo(() => {
    let list = groupedVisits;
    if (!includeScheduled) list = list.filter((g) => !g.isScheduled);
    if (search) {
      const s = search.toLowerCase();
      list = list.filter((g) =>
        g.employee_name.toLowerCase().includes(s) ||
        g.contact_name.toLowerCase().includes(s)
      );
    }
    return list;
  }, [groupedVisits, search, includeScheduled]);

  const toggleAll = (checked: boolean) => {
    if (checked) setSelected(new Set(filteredVisits.map((g) => g.key)));
    else setSelected(new Set());
  };

  const importSelected = async () => {
    if (!user) return;
    const toImport = filteredVisits.filter((g) => selected.has(g.key));
    if (toImport.length === 0) {
      toast.warning('Seleziona almeno una visita da importare');
      return;
    }
    setLoading(true);
    let ok = 0, failed = 0;
    const skipped = groupedVisits.length - toImport.length;

    // Insert in batches of 100
    const batchSize = 100;
    for (let i = 0; i < toImport.length; i += batchSize) {
      const batch = toImport.slice(i, i + batchSize);
      const rows = batch.map((g) => ({
        user_id: user.id,
        employee_id: g.employee_id,
        contact_id: g.contact_id,
        visit_type: g.visit_type,
        execution_date: g.isScheduled ? null : g.date,
        scheduled_date: g.isScheduled ? g.date : null,
        next_due_date: g.next_due_date,
        status: g.isScheduled ? 'scheduled' : 'completed',
        exams_performed: g.exams,
        notes: `Importato dal CRM (${g.exams.length} esami)`,
      }));
      const { error } = await supabase.from('medical_visits').insert(rows);
      if (error) {
        console.error('Batch import error:', error);
        failed += batch.length;
      } else {
        ok += batch.length;
      }
    }

    setImported({ ok, skipped, failed });
    setLoading(false);
    if (ok > 0) {
      toast.success(`Importate ${ok} visite mediche`);
      onImportComplete?.();
    }
    if (failed > 0) toast.error(`${failed} visite non importate`);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5 text-primary" />
            Importa dati medici dal CRM
          </CardTitle>
          <CardDescription>
            Converte le attività mediche dei dipendenti (visite, esami, valutazioni) registrate nel CRM in visite mediche raggruppate per dipendente e data.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Come funziona</AlertTitle>
            <AlertDescription className="space-y-1 text-sm">
              <div>• Vengono identificate solo le attività di tipo medico (visite, esami clinici, valutazioni).</div>
              <div>• Più esami nello stesso giorno per lo stesso dipendente diventano <strong>1 visita medica</strong> con esami multipli.</div>
              <div>• Le attività future (con data scadenza ma senza esecuzione) diventano visite <strong>programmate</strong>.</div>
              <div>• Le visite già esistenti (stesso dipendente + data) vengono <strong>saltate automaticamente</strong>.</div>
            </AlertDescription>
          </Alert>

          <div className="flex gap-2 flex-wrap">
            <Button onClick={scanCRM} disabled={scanning || loading}>
              {scanning ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Search className="h-4 w-4 mr-2" />}
              Analizza dati CRM
            </Button>
            {groupedVisits.length > 0 && (
              <Button onClick={importSelected} disabled={loading || selected.size === 0} variant="default">
                {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
                Importa {selected.size} visite selezionate
              </Button>
            )}
          </div>

          {imported && (
            <Alert variant={imported.failed > 0 ? 'destructive' : 'default'}>
              <CheckCircle2 className="h-4 w-4" />
              <AlertTitle>Importazione completata</AlertTitle>
              <AlertDescription>
                ✅ {imported.ok} importate · ⏭ {imported.skipped} non selezionate · ❌ {imported.failed} fallite
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {groupedVisits.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Anteprima visite da importare</CardTitle>
            <CardDescription>
              {filteredVisits.length} visite · {filteredVisits.reduce((acc, g) => acc + g.exams.length, 0)} esami totali
            </CardDescription>
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
                        checked={filteredVisits.length > 0 && filteredVisits.every((g) => selected.has(g.key))}
                        onCheckedChange={(c) => toggleAll(!!c)}
                      />
                    </TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Dipendente</TableHead>
                    <TableHead>Azienda</TableHead>
                    <TableHead>Tipo visita</TableHead>
                    <TableHead>Esami</TableHead>
                    <TableHead>Stato</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredVisits.slice(0, 500).map((g) => (
                    <TableRow key={g.key}>
                      <TableCell>
                        <Checkbox
                          checked={selected.has(g.key)}
                          onCheckedChange={(c) => {
                            const next = new Set(selected);
                            if (c) next.add(g.key); else next.delete(g.key);
                            setSelected(next);
                          }}
                        />
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {g.date ? format(parseISO(g.date), 'dd/MM/yyyy', { locale: it }) : '—'}
                      </TableCell>
                      <TableCell className="font-medium">{g.employee_name}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{g.contact_name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{g.visit_type}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{g.exams.length}</Badge>
                        <span className="text-xs text-muted-foreground ml-2 truncate max-w-[200px] inline-block align-middle" title={g.exams.map((e) => e.name).join(', ')}>
                          {g.exams[0]?.name}{g.exams.length > 1 ? ` +${g.exams.length - 1}` : ''}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant={g.isScheduled ? 'secondary' : 'default'}>
                          {g.isScheduled ? 'Programmata' : 'Eseguita'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {filteredVisits.length > 500 && (
                <div className="p-3 text-center text-sm text-muted-foreground border-t">
                  Mostrate prime 500 di {filteredVisits.length}. L'importazione include tutte le selezionate.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
