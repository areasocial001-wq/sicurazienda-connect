import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ShieldCheck } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { it } from 'date-fns/locale';
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

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base"><ShieldCheck className="h-4 w-4 text-primary" />Audit log giudizi idoneità</CardTitle>
        <CardDescription>Stampe, firme e download tracciati con data, medico e protocollo (accesso riservato Medicina).</CardDescription>
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
            {!loading && rows.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-6">Nessuna azione registrata</TableCell></TableRow>}
            {rows.map((r) => {
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