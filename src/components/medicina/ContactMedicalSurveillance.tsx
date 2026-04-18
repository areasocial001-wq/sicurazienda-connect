import { useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Stethoscope, Pencil, Trash2 } from 'lucide-react';
import { useMedicina } from '@/hooks/useMedicina';
import { useUserRole } from '@/hooks/useUserRole';
import { VisitDialog } from '@/components/medicina/VisitDialog';
import { HealthFolderPanel } from '@/components/medicina/HealthFolderPanel';
import { format, differenceInDays, parseISO } from 'date-fns';
import { it } from 'date-fns/locale';

interface Props {
  contactId: string;
}

export const ContactMedicalSurveillance = ({ contactId }: Props) => {
  const { isAdmin, isMedicina } = useUserRole();
  const m = useMedicina();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);

  const visits = useMemo(() => m.visits.filter((v) => v.contact_id === contactId), [m.visits, contactId]);

  if (!isAdmin && !isMedicina) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Stethoscope className="h-4 w-4" />
            Sorveglianza Sanitaria
          </CardTitle>
          <CardDescription>
            Dati riservati. Accesso limitato al personale Medicina del Lavoro.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const visitTypeLabel = (t: string) => ({
    preventiva: 'Preventiva', periodica: 'Periodica', cambio_mansione: 'Cambio mansione',
    rientro: 'Rientro', su_richiesta: 'Su richiesta', cessazione: 'Cessazione',
  }[t] || t);

  return (
    <div className="space-y-4">
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <Stethoscope className="h-4 w-4 text-primary" />
              Sorveglianza Sanitaria
            </CardTitle>
            <CardDescription>Visite mediche e scadenze dei dipendenti di questa azienda</CardDescription>
          </div>
          <Button size="sm" onClick={() => { setEditing(null); setOpen(true); }}>
            <Plus className="h-4 w-4 mr-1" /> Nuova visita
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Dipendente</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Data esec.</TableHead>
              <TableHead>Prossima</TableHead>
              <TableHead>Stato</TableHead>
              <TableHead className="w-20"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visits.map((v) => {
              const days = v.next_due_date ? differenceInDays(parseISO(v.next_due_date), new Date()) : null;
              return (
                <TableRow key={v.id}>
                  <TableCell>{v.employee_name || '—'}</TableCell>
                  <TableCell>{visitTypeLabel(v.visit_type)}</TableCell>
                  <TableCell>{v.execution_date ? format(parseISO(v.execution_date), 'dd/MM/yy', { locale: it }) : '—'}</TableCell>
                  <TableCell>
                    {v.next_due_date ? (
                      <div className="flex items-center gap-2">
                        {format(parseISO(v.next_due_date), 'dd/MM/yy', { locale: it })}
                        {days !== null && (
                          <Badge variant={days < 0 ? 'destructive' : days <= 30 ? 'secondary' : 'outline'} className="text-xs">
                            {days < 0 ? `-${-days}gg` : `${days}gg`}
                          </Badge>
                        )}
                      </div>
                    ) : '—'}
                  </TableCell>
                  <TableCell><Badge variant="outline">{v.status}</Badge></TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" onClick={() => { setEditing(v); setOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" onClick={() => m.deleteVisit(v.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
            {visits.length === 0 && (
              <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-6">Nessuna visita registrata</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>

      <VisitDialog
        open={open}
        onOpenChange={setOpen}
        visit={editing}
        defaultContactId={contactId}
        doctors={m.doctors}
        protocols={m.protocols}
        onSave={(d) => editing ? m.updateVisit(editing.id, d) : m.createVisit(d)}
      />
    </Card>

    <HealthFolderPanel contactId={contactId} />
    </div>
  );
};
