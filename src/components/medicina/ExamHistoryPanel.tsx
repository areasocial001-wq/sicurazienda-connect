import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Trash2, FlaskConical, Search, Filter } from 'lucide-react';
import { useExamHistory, EXAM_OUTCOMES, MedicalExam } from '@/hooks/useExamHistory';
import { supabase } from '@/integrations/supabase/client';
import { format, parseISO } from 'date-fns';
import { it } from 'date-fns/locale';

interface Props { employeeId?: string; }

export const ExamHistoryPanel = ({ employeeId }: Props) => {
  const [riskFilter, setRiskFilter] = useState<string>('');
  const [roleFilter, setRoleFilter] = useState<string>('');
  const [textFilter, setTextFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [outcomeFilter, setOutcomeFilter] = useState<string>('');
  const [sortBy, setSortBy] = useState<'date_desc' | 'date_asc' | 'outcome'>('date_desc');
  const { exams, create, remove } = useExamHistory({ employeeId, riskCategory: riskFilter || undefined, jobRole: roleFilter || undefined });

  const [risks, setRisks] = useState<{ risk_code: string; risk_name: string }[]>([]);
  const [doctors, setDoctors] = useState<{ id: string; first_name: string; last_name: string }[]>([]);
  useEffect(() => {
    (async () => {
      const [r, d] = await Promise.all([
        (supabase as any).from('medical_risk_catalog').select('risk_code,risk_name').order('risk_name'),
        (supabase as any).from('medical_doctors').select('id,first_name,last_name').order('last_name'),
      ]);
      setRisks(r.data || []); setDoctors(d.data || []);
    })();
  }, []);

  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState<Partial<MedicalExam>>({});
  const openNew = () => { setForm({ exam_date: new Date().toISOString().slice(0, 10), outcome: 'normale' }); setAddOpen(true); };

  const filtered = useMemo(() => {
    let list = exams;
    if (textFilter) {
      const s = textFilter.toLowerCase();
      list = list.filter((e) => (e.exam_type || '').toLowerCase().includes(s) || (e.outcome_value || '').toLowerCase().includes(s));
    }
    if (typeFilter) {
      const s = typeFilter.toLowerCase();
      list = list.filter((e) => (e.exam_type || '').toLowerCase().includes(s));
    }
    if (outcomeFilter) list = list.filter((e) => e.outcome === outcomeFilter);
    const sorted = [...list];
    if (sortBy === 'date_asc') sorted.sort((a, b) => a.exam_date.localeCompare(b.exam_date));
    else if (sortBy === 'date_desc') sorted.sort((a, b) => b.exam_date.localeCompare(a.exam_date));
    else if (sortBy === 'outcome') sorted.sort((a, b) => (a.outcome || '').localeCompare(b.outcome || ''));
    return sorted;
  }, [exams, textFilter, typeFilter, outcomeFilter, sortBy]);

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start gap-2 flex-wrap">
          <div>
            <CardTitle className="flex items-center gap-2 text-base"><FlaskConical className="h-4 w-4 text-primary" />Storico esami</CardTitle>
            <CardDescription>Tipologia, esito, data, medico. Ricercabile per rischio e mansione.</CardDescription>
          </div>
          <Button size="sm" onClick={openNew} disabled={!employeeId}><Plus className="h-4 w-4 mr-1" />Nuovo esame</Button>
        </div>
        <div className="flex flex-wrap gap-2 mt-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input className="pl-8" placeholder="Cerca esame..." value={textFilter} onChange={(e) => setTextFilter(e.target.value)} />
          </div>
          <Select value={riskFilter || 'all'} onValueChange={(v) => setRiskFilter(v === 'all' ? '' : v)}>
            <SelectTrigger className="w-[200px]"><Filter className="h-3 w-3 mr-1" /><SelectValue placeholder="Rischio" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tutti i rischi</SelectItem>
              {risks.map((r) => <SelectItem key={r.risk_code} value={r.risk_code}>{r.risk_name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Input className="w-[200px]" placeholder="Filtra mansione" value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} />
          <Input className="w-[180px]" placeholder="Filtra tipologia" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} />
          <Select value={outcomeFilter || 'all'} onValueChange={(v) => setOutcomeFilter(v === 'all' ? '' : v)}>
            <SelectTrigger className="w-[170px]"><SelectValue placeholder="Esito" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tutti gli esiti</SelectItem>
              {EXAM_OUTCOMES.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as any)}>
            <SelectTrigger className="w-[170px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="date_desc">Data ↓ (recenti)</SelectItem>
              <SelectItem value="date_asc">Data ↑ (vecchi)</SelectItem>
              <SelectItem value="outcome">Ordina per esito</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data</TableHead>
              <TableHead>Tipologia</TableHead>
              <TableHead>Rischio</TableHead>
              <TableHead>Mansione</TableHead>
              <TableHead>Esito</TableHead>
              <TableHead>Medico</TableHead>
              <TableHead className="w-16"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((e) => {
              const doc = doctors.find((d) => d.id === e.doctor_id);
              const outcomeLabel = EXAM_OUTCOMES.find((o) => o.value === e.outcome)?.label || e.outcome;
              return (
                <TableRow key={e.id}>
                  <TableCell>{format(parseISO(e.exam_date), 'dd/MM/yyyy', { locale: it })}</TableCell>
                  <TableCell className="font-medium">{e.exam_type}{e.outcome_value && <div className="text-xs text-muted-foreground">{e.outcome_value}</div>}</TableCell>
                  <TableCell><Badge variant="outline">{e.risk_category || '—'}</Badge></TableCell>
                  <TableCell className="text-sm">{e.job_role || '—'}</TableCell>
                  <TableCell>
                    <Badge variant={e.outcome === 'anomalo' ? 'destructive' : e.outcome === 'da_ripetere' ? 'secondary' : 'default'}>
                      {outcomeLabel || '—'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">{doc ? `Dr. ${doc.first_name} ${doc.last_name}` : '—'}</TableCell>
                  <TableCell>
                    <Button size="icon" variant="ghost" onClick={() => { if (confirm('Eliminare esame?')) remove(e.id); }}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
            {filtered.length === 0 && <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">Nessun esame</TableCell></TableRow>}
          </TableBody>
        </Table>
      </CardContent>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Registra esame</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Data *</Label><Input type="date" value={form.exam_date || ''} onChange={(e) => setForm({ ...form, exam_date: e.target.value })} /></div>
              <div><Label>Tipologia *</Label><Input value={form.exam_type || ''} onChange={(e) => setForm({ ...form, exam_type: e.target.value })} placeholder="Es. Audiometria, Spirometria..." /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Rischio</Label>
                <Select value={form.risk_category || undefined} onValueChange={(v) => setForm({ ...form, risk_category: v })}>
                  <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>{risks.map((r) => <SelectItem key={r.risk_code} value={r.risk_code}>{r.risk_name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Mansione</Label><Input value={form.job_role || ''} onChange={(e) => setForm({ ...form, job_role: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Esito</Label>
                <Select value={form.outcome || undefined} onValueChange={(v) => setForm({ ...form, outcome: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{EXAM_OUTCOMES.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Medico</Label>
                <Select value={form.doctor_id || undefined} onValueChange={(v) => setForm({ ...form, doctor_id: v })}>
                  <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>{doctors.map((d) => <SelectItem key={d.id} value={d.id}>Dr. {d.first_name} {d.last_name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Valore</Label><Input value={form.outcome_value || ''} onChange={(e) => setForm({ ...form, outcome_value: e.target.value })} placeholder="Es. 118/78 mmHg" /></div>
              <div><Label>Range di riferimento</Label><Input value={form.reference_range || ''} onChange={(e) => setForm({ ...form, reference_range: e.target.value })} /></div>
            </div>
            <div><Label>Note</Label><Textarea rows={2} value={form.notes || ''} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Annulla</Button>
            <Button onClick={async () => {
              if (!employeeId || !form.exam_type || !form.exam_date) return;
              await create({ ...form, employee_id: employeeId });
              setAddOpen(false);
            }}>Salva esame</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};
