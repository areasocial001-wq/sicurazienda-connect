import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { History, ExternalLink, Printer } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { it } from 'date-fns/locale';
import { toast } from 'sonner';
import type { MedicalDoctor } from '@/hooks/useMedicina';

interface Props {
  visitId?: string | null;
  protocolId?: string | null;
  employeeId?: string | null;
  doctors: MedicalDoctor[];
}

/** Cronologia versioni giudizi (per visita/protocollo/dipendente). */
export const JudgmentHistoryList = ({ visitId, protocolId, employeeId, doctors }: Props) => {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      if (!visitId && !protocolId && !employeeId) return;
      setLoading(true);
      let q = (supabase as any).from('medical_judgments').select('*').order('judgment_date', { ascending: false });
      if (visitId) q = q.eq('visit_id', visitId);
      else if (protocolId) q = q.eq('protocol_id', protocolId);
      else if (employeeId) q = q.eq('employee_id', employeeId);
      const { data, error } = await q;
      setLoading(false);
      if (error) { console.error(error); return; }
      setRows(data || []);
    })();
  }, [visitId, protocolId, employeeId]);

  const openPdf = async (path?: string | null) => {
    if (!path) { toast.info('Nessun PDF firmato per questa versione'); return; }
    const { data, error } = await supabase.storage.from('medical-records').createSignedUrl(path, 60);
    if (error || !data) { toast.error('Impossibile aprire il PDF'); return; }
    window.open(data.signedUrl, '_blank');
  };

  if (!visitId && !protocolId && !employeeId) return null;

  return (
    <div className="border rounded p-3 bg-muted/20">
      <div className="flex items-center gap-2 mb-2 text-sm font-medium">
        <History className="h-4 w-4" />Cronologia versioni giudizio
        {rows.length > 0 && <Badge variant="secondary">{rows.length}</Badge>}
      </div>
      {loading ? (
        <div className="text-xs text-muted-foreground">Caricamento...</div>
      ) : rows.length === 0 ? (
        <div className="text-xs text-muted-foreground">Nessuna versione archiviata.</div>
      ) : (
        <ul className="space-y-1">
          {rows.map((r) => {
            const doc = doctors.find((d) => d.id === r.doctor_id);
            return (
              <li key={r.id} className="flex items-center justify-between gap-2 text-xs border-b last:border-b-0 py-1">
                <div className="flex-1 min-w-0">
                  <span className="font-medium">v{r.signed_pdf_version || 1}</span>
                  <span className="mx-1">·</span>
                  <span>{r.judgment_date ? format(parseISO(r.judgment_date), 'dd/MM/yyyy', { locale: it }) : '—'}</span>
                  <span className="mx-1">·</span>
                  <span className="text-muted-foreground">{doc ? `Dr. ${doc.first_name} ${doc.last_name}` : 'Medico n/d'}</span>
                  <span className="mx-1">·</span>
                  <Badge variant="outline" className="text-[10px]">{r.judgment}</Badge>
                </div>
                <Button size="sm" variant="ghost" onClick={() => openPdf(r.signed_pdf_path)}>
                  {r.signed_pdf_path ? <><ExternalLink className="h-3 w-3 mr-1" />Apri</> : <><Printer className="h-3 w-3 mr-1" />No PDF</>}
                </Button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};