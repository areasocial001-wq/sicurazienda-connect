import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ShieldCheck, Download } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { it } from 'date-fns/locale';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import type { MedicalDoctor, MedicalProtocol } from '@/hooks/useMedicina';

interface Props {
  doctors: MedicalDoctor[];
  protocols: MedicalProtocol[];
  employeeId?: string;
  limit?: number;
}

const ACTION_LABEL: Record<string, { label: string; variant: any }> = {
  print: { label: 'Stampa', variant: 'default' },
  reprint: { label: 'Ristampa', variant: 'secondary' },
  sign: { label: 'Firma', variant: 'default' },
  download: { label: 'Download', variant: 'outline' },
  view: { label: 'Visualizzazione', variant: 'outline' },
};

/** Audit log delle stampe/firme/download del giudizio di idoneità (solo Medicina/admin). */
export const JudgmentAuditLog = ({ doctors, protocols, employeeId, limit = 100 }: Props) => {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [doctorFilter, setDoctorFilter] = useState<string>('all');
  const [protocolFilter, setProtocolFilter] = useState<string>('all');
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');

  useEffect(() => {
    (async () => {
      setLoading(true);
      let q = (supabase as any).from('medical_judgment_audit').select('*').order('created_at', { ascending: false }).limit(limit);
      if (employeeId) q = q.eq('employee_id', employeeId);
      const { data, error } = await q;
      setLoading(false);
      if (error) { console.error(error); return; }
      setRows(data || []);
    })();
  }, [employeeId, limit]);

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (doctorFilter !== 'all' && r.doctor_id !== doctorFilter) return false;
      if (protocolFilter !== 'all' && r.protocol_id !== protocolFilter) return false;
      if (fromDate && r.created_at < fromDate) return false;
      if (toDate && r.created_at > `${toDate}T23:59:59`) return false;
      return true;
    });
  }, [rows, doctorFilter, protocolFilter, fromDate, toDate]);

  const exportCsv = () => {
    if (filtered.length === 0) { toast.info('Nessuna riga da esportare'); return; }
    const escape = (v: any) => {
      const s = String(v ?? '');
      return /[;"\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const header = ['Data/ora', 'Azione', 'Versione', 'Medico', 'Protocollo', 'Dipendente', 'Visita', 'Giudizio', 'File'];
    const rowsCsv = filtered.map((r) => {
      const doc = doctors.find((d) => d.id === r.doctor_id);
      const proto = protocols.find((p) => p.id === r.protocol_id);
      return [
        format(parseISO(r.created_at), 'dd/MM/yyyy HH:mm', { locale: it }),
        r.action,
        r.version ?? '',
        doc ? `Dr. ${doc.first_name} ${doc.last_name}` : '',
        proto?.name ?? '',
        r.employee_id ?? '',
        r.visit_id ?? '',
        r.judgment_id ?? '',
        r.file_path ?? '',
      ];
    });
    const csv = '\ufeff' + [header, ...rowsCsv].map((r) => r.map(escape).join(';')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-giudizi-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Audit esportato');
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-2 flex-wrap">
          <div>
            <CardTitle className="flex items-center gap-2 text-base"><ShieldCheck className="h-4 w-4 text-primary" />Audit log giudizi idoneità</CardTitle>
            <CardDescription>Stampe, firme, ristampe e download tracciati con data, medico e protocollo (accesso riservato Medicina).</CardDescription>
          </div>
          <Button size="sm" variant="outline" onClick={exportCsv} disabled={filtered.length === 0}>
            <Download className="h-4 w-4 mr-1" />Esporta CSV
          </Button>
        </div>
        <div className="grid gap-2 md:grid-cols-4 mt-3">
          <div>
            <Label className="text-xs">Medico</Label>
            <Select value={doctorFilter} onValueChange={setDoctorFilter}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tutti i medici</SelectItem>
                {doctors.map((d) => <SelectItem key={d.id} value={d.id}>Dr. {d.first_name} {d.last_name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Protocollo</Label>
            <Select value={protocolFilter} onValueChange={setProtocolFilter}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tutti i protocolli</SelectItem>
                {protocols.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Dal</Label>
            <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Al</Label>
            <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data/ora</TableHead>
              <TableHead>Azione</TableHead>
              <TableHead>v</TableHead>
              <TableHead>Medico</TableHead>
              <TableHead>Protocollo</TableHead>
              <TableHead>File</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-6">Caricamento…</TableCell></TableRow>}
            {!loading && filtered.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-6">Nessuna azione registrata</TableCell></TableRow>}
            {filtered.map((r) => {
              const doc = doctors.find((d) => d.id === r.doctor_id);
              const proto = protocols.find((p) => p.id === r.protocol_id);
              const a = ACTION_LABEL[r.action] || { label: r.action, variant: 'outline' };
              return (
                <TableRow key={r.id}>
                  <TableCell className="text-xs">{format(parseISO(r.created_at), 'dd/MM/yyyy HH:mm', { locale: it })}</TableCell>
                  <TableCell><Badge variant={a.variant}>{a.label}</Badge></TableCell>
                  <TableCell className="text-xs">{r.version || '—'}</TableCell>
                  <TableCell className="text-xs">{doc ? `Dr. ${doc.first_name} ${doc.last_name}` : '—'}</TableCell>
                  <TableCell className="text-xs">{proto?.name || '—'}</TableCell>
                  <TableCell className="text-xs text-muted-foreground truncate max-w-[240px]">{r.file_path || '—'}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};