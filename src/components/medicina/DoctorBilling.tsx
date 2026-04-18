import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Download, Euro, Receipt } from 'lucide-react';
import type { MedicalDoctor, MedicalVisit, MedicalInspection } from '@/hooks/useMedicina';
import { format, parseISO } from 'date-fns';
import { it } from 'date-fns/locale';

interface Props {
  doctors: MedicalDoctor[];
  visits: MedicalVisit[];
  inspections: MedicalInspection[];
}

const YEARS = [new Date().getFullYear(), new Date().getFullYear() - 1, new Date().getFullYear() - 2];

export const DoctorBilling = ({ doctors, visits, inspections }: Props) => {
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [doctorId, setDoctorId] = useState<string>('all');

  const stats = useMemo(() => {
    const byDoctor = new Map<string, {
      doctor: MedicalDoctor;
      visits: MedicalVisit[];
      inspections: MedicalInspection[];
      visitsCost: number;
      inspectionsCost: number;
      total: number;
    }>();

    doctors.forEach((d) => byDoctor.set(d.id, { doctor: d, visits: [], inspections: [], visitsCost: 0, inspectionsCost: 0, total: 0 }));

    visits.forEach((v) => {
      if (!v.doctor_id) return;
      const date = v.execution_date || v.scheduled_date;
      if (!date || new Date(date).getFullYear() !== year) return;
      const entry = byDoctor.get(v.doctor_id);
      if (!entry) return;
      entry.visits.push(v);
      const cost = v.cost ?? entry.doctor.visit_rate ?? 0;
      entry.visitsCost += Number(cost) || 0;
    });

    inspections.forEach((i) => {
      if (!i.doctor_id) return;
      if (new Date(i.inspection_date).getFullYear() !== year) return;
      const entry = byDoctor.get(i.doctor_id);
      if (!entry) return;
      entry.inspections.push(i);
      // estimate 2h per inspection at hourly_rate
      const cost = (entry.doctor.hourly_rate ?? 0) * 2;
      entry.inspectionsCost += Number(cost) || 0;
    });

    byDoctor.forEach((e) => { e.total = e.visitsCost + e.inspectionsCost; });

    let entries = Array.from(byDoctor.values()).filter((e) => e.visits.length || e.inspections.length);
    if (doctorId !== 'all') entries = entries.filter((e) => e.doctor.id === doctorId);
    entries.sort((a, b) => b.total - a.total);
    return entries;
  }, [doctors, visits, inspections, year, doctorId]);

  const grandTotal = stats.reduce((s, e) => s + e.total, 0);
  const totalVisits = stats.reduce((s, e) => s + e.visits.length, 0);
  const totalInspections = stats.reduce((s, e) => s + e.inspections.length, 0);

  const fmt = (n: number) => `€ ${n.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const exportCSV = () => {
    const rows: string[] = ['Medico;Visite;Costo Visite;Sopralluoghi;Costo Sopralluoghi;Totale'];
    stats.forEach((e) => {
      rows.push([
        `Dr. ${e.doctor.first_name} ${e.doctor.last_name}`,
        e.visits.length,
        e.visitsCost.toFixed(2).replace('.', ','),
        e.inspections.length,
        e.inspectionsCost.toFixed(2).replace('.', ','),
        e.total.toFixed(2).replace('.', ','),
      ].join(';'));
    });
    rows.push('');
    rows.push(`Totale;${totalVisits};;${totalInspections};;${grandTotal.toFixed(2).replace('.', ',')}`);
    const blob = new Blob(['\ufeff' + rows.join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `fatturazione-medici-${year}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <div className="text-xs text-muted-foreground mb-1">Anno</div>
          <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
            <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
            <SelectContent>{YEARS.map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div>
          <div className="text-xs text-muted-foreground mb-1">Medico</div>
          <Select value={doctorId} onValueChange={setDoctorId}>
            <SelectTrigger className="w-64"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tutti i medici</SelectItem>
              {doctors.map((d) => <SelectItem key={d.id} value={d.id}>Dr. {d.first_name} {d.last_name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <Button variant="outline" className="ml-auto" onClick={exportCSV}>
          <Download className="h-4 w-4 mr-1" /> Esporta CSV
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Totale fatturato {year}</CardDescription>
            <CardTitle className="text-3xl text-primary flex items-center gap-2"><Euro className="h-6 w-6" />{fmt(grandTotal)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Visite eseguite</CardDescription>
            <CardTitle className="text-3xl">{totalVisits}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Sopralluoghi effettuati</CardDescription>
            <CardTitle className="text-3xl">{totalInspections}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><Receipt className="h-4 w-4" />Dettaglio per medico</CardTitle>
          <CardDescription>Calcolato da: tariffa visita registrata oppure tariffa visita del medico. Sopralluoghi: 2h × tariffa oraria.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Medico</TableHead>
                <TableHead className="text-right">Visite</TableHead>
                <TableHead className="text-right">Costo visite</TableHead>
                <TableHead className="text-right">Sopralluoghi</TableHead>
                <TableHead className="text-right">Costo sopralluoghi</TableHead>
                <TableHead className="text-right">Totale</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stats.map((e) => (
                <TableRow key={e.doctor.id}>
                  <TableCell className="font-medium">Dr. {e.doctor.first_name} {e.doctor.last_name}</TableCell>
                  <TableCell className="text-right">{e.visits.length}</TableCell>
                  <TableCell className="text-right">{fmt(e.visitsCost)}</TableCell>
                  <TableCell className="text-right">{e.inspections.length}</TableCell>
                  <TableCell className="text-right">{fmt(e.inspectionsCost)}</TableCell>
                  <TableCell className="text-right"><Badge>{fmt(e.total)}</Badge></TableCell>
                </TableRow>
              ))}
              {stats.length === 0 && (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Nessuna prestazione registrata per l'anno {year}</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};
