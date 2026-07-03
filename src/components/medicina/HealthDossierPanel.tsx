import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { FolderLock, Lock } from 'lucide-react';
import { HealthFolderPanel } from './HealthFolderPanel';
import { AnamnesiPanel } from './AnamnesiPanel';
import { ExamHistoryPanel } from './ExamHistoryPanel';

interface Employee { id: string; first_name: string; last_name: string; contact_id?: string | null; }

export const HealthDossierPanel = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [employeeId, setEmployeeId] = useState<string | undefined>(undefined);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('crm_employees').select('id, first_name, last_name, contact_id').order('last_name');
      setEmployees((data || []) as Employee[]);
    })();
  }, []);

  const filtered = useMemo(() => {
    if (!filter) return employees;
    const s = filter.toLowerCase();
    return employees.filter((e) => `${e.first_name} ${e.last_name}`.toLowerCase().includes(s));
  }, [employees, filter]);

  const employee = employees.find((e) => e.id === employeeId);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start gap-2 flex-wrap">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <FolderLock className="h-4 w-4 text-primary" />
                Cartella sanitaria del lavoratore
                <Badge variant="outline" className="gap-1 text-xs"><Lock className="h-3 w-3" />Dati sensibili</Badge>
              </CardTitle>
              <CardDescription>Anamnesi, storico esami, documenti e cartella completa ex D.Lgs 81/08 art. 25.</CardDescription>
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-2 mt-3">
            <div>
              <Label className="text-xs">Cerca dipendente</Label>
              <Input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Nome o cognome..." />
            </div>
            <div>
              <Label className="text-xs">Dipendente</Label>
              <Select value={employeeId} onValueChange={setEmployeeId}>
                <SelectTrigger><SelectValue placeholder="Seleziona dipendente" /></SelectTrigger>
                <SelectContent>
                  {filtered.map((e) => <SelectItem key={e.id} value={e.id}>{e.last_name} {e.first_name}</SelectItem>)}
                  {filtered.length === 0 && <div className="p-2 text-sm text-muted-foreground">Nessun dipendente</div>}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        {employee && (
          <CardContent>
            <div className="text-sm text-muted-foreground">Cartella di <strong>{employee.last_name} {employee.first_name}</strong></div>
          </CardContent>
        )}
      </Card>

      {!employeeId ? (
        <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">Seleziona un dipendente per aprire la cartella sanitaria completa.</CardContent></Card>
      ) : (
        <Tabs defaultValue="anamnesi" className="space-y-4">
          <TabsList>
            <TabsTrigger value="anamnesi">Anamnesi</TabsTrigger>
            <TabsTrigger value="exams">Storico esami</TabsTrigger>
            <TabsTrigger value="docs">Documenti</TabsTrigger>
          </TabsList>
          <TabsContent value="anamnesi"><AnamnesiPanel employeeId={employeeId} contactId={employee?.contact_id ?? null} /></TabsContent>
          <TabsContent value="exams"><ExamHistoryPanel employeeId={employeeId} /></TabsContent>
          <TabsContent value="docs"><HealthFolderPanel initialEmployeeId={employeeId} /></TabsContent>
        </Tabs>
      )}
    </div>
  );
};
