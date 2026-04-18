import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, FileSpreadsheet } from 'lucide-react';
import type { MedicalVisit, MedicalJudgment, MedicalInspection, MedicalDoctor } from '@/hooks/useMedicina';
import { format, parseISO } from 'date-fns';
import { toast } from 'sonner';
import { JUDGMENT_OPTIONS } from './JudgmentDialog';

interface Props {
  visits: MedicalVisit[];
  judgments: MedicalJudgment[];
  inspections: MedicalInspection[];
  doctors: MedicalDoctor[];
}

const fmtDate = (d?: string | null) => d ? format(parseISO(d), 'dd/MM/yyyy') : '';
const escape = (v: any) => {
  const s = String(v ?? '');
  if (/[;"\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
};
const downloadCSV = (filename: string, rows: any[][]) => {
  const csv = '\ufeff' + rows.map((r) => r.map(escape).join(';')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
  toast.success(`${filename} esportato`);
};

export const MedicalDataExport = ({ visits, judgments, inspections, doctors }: Props) => {
  const visitTypeLabel = (t: string) => ({
    preventiva: 'Preventiva', periodica: 'Periodica', cambio_mansione: 'Cambio mansione',
    rientro: 'Rientro', su_richiesta: 'Su richiesta', cessazione: 'Cessazione',
  }[t] || t);

  const exportVisits = () => {
    const rows = [
      ['Dipendente', 'Azienda', 'Tipo visita', 'Data programmata', 'Data esecuzione', 'Prossima scadenza', 'Medico', 'Sede', 'Stato', 'Costo €', 'Note'],
      ...visits.map((v) => [
        v.employee_name || '', v.contact_name || '', visitTypeLabel(v.visit_type),
        fmtDate(v.scheduled_date), fmtDate(v.execution_date), fmtDate(v.next_due_date),
        v.doctor_name || '', v.location || '', v.status,
        v.cost != null ? Number(v.cost).toFixed(2).replace('.', ',') : '',
        v.notes || '',
      ]),
    ];
    downloadCSV(`visite-mediche-${new Date().toISOString().slice(0, 10)}.csv`, rows);
  };

  const exportJudgments = () => {
    const rows = [
      ['Data giudizio', 'Dipendente', 'Esito', 'Limitazioni', 'Prescrizioni', 'Valido fino', 'Medico', 'Note'],
      ...judgments.map((j) => {
        const visit = visits.find((v) => v.id === j.visit_id);
        const empName = visit?.employee_name || visits.find((v) => v.employee_id === j.employee_id)?.employee_name || '';
        const doc = doctors.find((d) => d.id === j.doctor_id);
        const opt = JUDGMENT_OPTIONS.find((o) => o.value === j.judgment);
        return [
          fmtDate(j.judgment_date), empName, opt?.label || j.judgment,
          j.limitations || '', j.prescriptions || '', fmtDate(j.valid_until),
          doc ? `Dr. ${doc.first_name} ${doc.last_name}` : '', j.notes || '',
        ];
      }),
    ];
    downloadCSV(`giudizi-idoneita-${new Date().toISOString().slice(0, 10)}.csv`, rows);
  };

  const exportInspections = () => {
    const rows = [
      ['Data', 'Medico', 'Partecipanti', 'Argomenti', 'Rilievi', 'Raccomandazioni', 'Stato', 'Note'],
      ...inspections.map((i) => {
        const doc = doctors.find((d) => d.id === i.doctor_id);
        return [
          fmtDate(i.inspection_date), doc ? `Dr. ${doc.first_name} ${doc.last_name}` : '',
          i.participants || '', i.topics || '', i.findings || '', i.recommendations || '',
          i.status, i.notes || '',
        ];
      }),
    ];
    downloadCSV(`sopralluoghi-${new Date().toISOString().slice(0, 10)}.csv`, rows);
  };

  const exportDoctors = () => {
    const rows = [
      ['Nome', 'Cognome', 'Codice fiscale', 'Ordine', 'N° iscrizione', 'Email', 'Telefono', 'PEC', 'Struttura', 'Indirizzo', 'Tariffa oraria €', 'Tariffa visita €'],
      ...doctors.map((d) => [
        d.first_name, d.last_name, d.fiscal_code || '', d.medical_order || '', d.order_number || '',
        d.email || '', d.phone || '', d.pec || '', d.facility_name || '', d.facility_address || '',
        d.hourly_rate != null ? Number(d.hourly_rate).toFixed(2).replace('.', ',') : '',
        d.visit_rate != null ? Number(d.visit_rate).toFixed(2).replace('.', ',') : '',
      ]),
    ];
    downloadCSV(`medici-competenti-${new Date().toISOString().slice(0, 10)}.csv`, rows);
  };

  const items = [
    { title: 'Visite mediche', count: visits.length, action: exportVisits, desc: 'Tutte le visite (programmate ed eseguite)' },
    { title: 'Giudizi di idoneità', count: judgments.length, action: exportJudgments, desc: 'Esiti, limitazioni, scadenze' },
    { title: 'Sopralluoghi', count: inspections.length, action: exportInspections, desc: 'Verbali e raccomandazioni' },
    { title: 'Medici competenti', count: doctors.length, action: exportDoctors, desc: 'Anagrafica con tariffe' },
  ];

  return (
    <div className="space-y-4">
      <div className="text-sm text-muted-foreground">
        Esportazioni in formato CSV (separatore <code>;</code>) ottimizzate per Microsoft Excel e LibreOffice Calc.
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {items.map((it) => (
          <Card key={it.title}>
            <CardHeader>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <FileSpreadsheet className="h-4 w-4 text-primary" />{it.title}
                  </CardTitle>
                  <CardDescription>{it.desc} · {it.count} record</CardDescription>
                </div>
                <Button size="sm" onClick={it.action} disabled={it.count === 0}>
                  <Download className="h-4 w-4 mr-1" /> CSV
                </Button>
              </div>
            </CardHeader>
          </Card>
        ))}
      </div>
    </div>
  );
};
