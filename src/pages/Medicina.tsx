import { useMemo, useState } from 'react';
import Header from '@/components/Header';
import BottomNav from '@/components/BottomNav';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { useMedicina } from '@/hooks/useMedicina';
import { useUserRole } from '@/hooks/useUserRole';
import { Navigate } from 'react-router-dom';
import { Plus, Stethoscope, ClipboardList, CalendarClock, MapPinned, FileText, AlertTriangle, Pencil, Trash2, ShieldAlert, Loader2, Search, FolderLock, Gavel, CalendarDays, Euro, BarChart3, Download, Database, FileSpreadsheet } from 'lucide-react';
import { MedicalCRMImporter } from '@/components/medicina/MedicalCRMImporter';
import { AgendaExcelImporter } from '@/components/medicina/AgendaExcelImporter';
import { DoctorDialog } from '@/components/medicina/DoctorDialog';
import { DoctorBilling } from '@/components/medicina/DoctorBilling';
import { MedicalAnalytics } from '@/components/medicina/MedicalAnalytics';
import { MedicalDataExport } from '@/components/medicina/MedicalDataExport';
import { ProtocolDialog } from '@/components/medicina/ProtocolDialog';
import { VisitDialog } from '@/components/medicina/VisitDialog';
import { InspectionDialog } from '@/components/medicina/InspectionDialog';
import { AnnualReportDialog } from '@/components/medicina/AnnualReportDialog';
import { HealthFolderPanel } from '@/components/medicina/HealthFolderPanel';
import { JudgmentDialog, JUDGMENT_OPTIONS } from '@/components/medicina/JudgmentDialog';
import { MedicalCalendar } from '@/components/medicina/MedicalCalendar';
import { ConvocationDialog } from '@/components/medicina/ConvocationDialog';
import { Mail } from 'lucide-react';
import { useCRM } from '@/hooks/useCRM';
import { format, differenceInDays, parseISO } from 'date-fns';
import { it } from 'date-fns/locale';

const Medicina = () => {
  const { isAdmin, isMedicina, loading: roleLoading } = useUserRole();
  const m = useMedicina();
  const { contacts } = useCRM();
  const [tab, setTab] = useState('dashboard');
  const [search, setSearch] = useState('');

  // Dialogs state
  const [doctorOpen, setDoctorOpen] = useState(false);
  const [editingDoctor, setEditingDoctor] = useState<any>(null);
  const [protocolOpen, setProtocolOpen] = useState(false);
  const [editingProtocol, setEditingProtocol] = useState<any>(null);
  const [visitOpen, setVisitOpen] = useState(false);
  const [editingVisit, setEditingVisit] = useState<any>(null);
  const [inspOpen, setInspOpen] = useState(false);
  const [editingInsp, setEditingInsp] = useState<any>(null);
  const [reportOpen, setReportOpen] = useState(false);
  const [editingReport, setEditingReport] = useState<any>(null);
  const [judgmentOpen, setJudgmentOpen] = useState(false);
  const [editingJudgment, setEditingJudgment] = useState<any>(null);
  const [defaultJudgmentVisitId, setDefaultJudgmentVisitId] = useState<string | null>(null);
  const [judgmentSearch, setJudgmentSearch] = useState('');
  const [protocolSearch, setProtocolSearch] = useState('');
  const [convocationOpen, setConvocationOpen] = useState(false);
  const [convocationVisit, setConvocationVisit] = useState<any>(null);

  const upcomingVisits = useMemo(() => {
    const today = new Date();
    return m.visits
      .filter((v) => v.next_due_date)
      .map((v) => ({ ...v, daysLeft: differenceInDays(parseISO(v.next_due_date as string), today) }))
      .sort((a, b) => a.daysLeft - b.daysLeft);
  }, [m.visits]);

  const expired = upcomingVisits.filter((v) => v.daysLeft < 0);
  const next30 = upcomingVisits.filter((v) => v.daysLeft >= 0 && v.daysLeft <= 30);
  const next90 = upcomingVisits.filter((v) => v.daysLeft > 30 && v.daysLeft <= 90);

  const filteredVisits = m.visits.filter((v) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (v.employee_name || '').toLowerCase().includes(s)
      || (v.contact_name || '').toLowerCase().includes(s)
      || (v.doctor_name || '').toLowerCase().includes(s)
      || (v.visit_type || '').toLowerCase().includes(s);
  });

  if (roleLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin && !isMedicina) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-12 max-w-2xl">
          <Card>
            <CardHeader className="text-center">
              <ShieldAlert className="h-12 w-12 mx-auto text-destructive mb-2" />
              <CardTitle>Accesso negato</CardTitle>
              <CardDescription>
                I dati sanitari sono riservati per legge (GDPR / D.Lgs 81/08). Solo il personale con ruolo "Medicina" o "Amministratore" può accedere a questo modulo.
              </CardDescription>
            </CardHeader>
          </Card>
        </main>
        <BottomNav />
      </div>
    );
  }

  const visitTypeLabel = (t: string) => ({
    preventiva: 'Preventiva',
    periodica: 'Periodica',
    cambio_mansione: 'Cambio mansione',
    rientro: 'Rientro',
    su_richiesta: 'Su richiesta',
    cessazione: 'Cessazione',
  }[t] || t);

  const statusBadge = (s: string) => {
    const map: Record<string, { v: any; label: string }> = {
      scheduled: { v: 'secondary', label: 'Programmata' },
      completed: { v: 'default', label: 'Eseguita' },
      missed: { v: 'destructive', label: 'Non presentato' },
      cancelled: { v: 'outline', label: 'Annullata' },
    };
    const x = map[s] || { v: 'outline', label: s };
    return <Badge variant={x.v}>{x.label}</Badge>;
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-3 sm:px-4 pb-24 pt-4 max-w-7xl">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Stethoscope className="h-6 w-6 text-primary" />
              Medicina del Lavoro
            </h1>
            <p className="text-sm text-muted-foreground">Sorveglianza sanitaria, protocolli, idoneità e relazioni annuali</p>
          </div>
        </div>

        <Tabs value={tab} onValueChange={setTab} className="space-y-4">
          <TabsList className="flex-wrap h-auto">
            <TabsTrigger value="dashboard" className="gap-1"><AlertTriangle className="h-4 w-4" />Scadenze</TabsTrigger>
            <TabsTrigger value="agenda" className="gap-1"><CalendarDays className="h-4 w-4" />Agenda</TabsTrigger>
            <TabsTrigger value="visits" className="gap-1"><CalendarClock className="h-4 w-4" />Visite</TabsTrigger>
            <TabsTrigger value="protocols" className="gap-1"><ClipboardList className="h-4 w-4" />Protocolli</TabsTrigger>
            <TabsTrigger value="doctors" className="gap-1"><Stethoscope className="h-4 w-4" />Medici</TabsTrigger>
            <TabsTrigger value="health-files" className="gap-1"><FolderLock className="h-4 w-4" />Cartella Sanitaria</TabsTrigger>
            <TabsTrigger value="judgments" className="gap-1"><Gavel className="h-4 w-4" />Idoneità</TabsTrigger>
            <TabsTrigger value="inspections" className="gap-1"><MapPinned className="h-4 w-4" />Sopralluoghi</TabsTrigger>
            <TabsTrigger value="reports" className="gap-1"><FileText className="h-4 w-4" />Relazioni 3B</TabsTrigger>
            <TabsTrigger value="analytics" className="gap-1"><BarChart3 className="h-4 w-4" />Statistiche</TabsTrigger>
            <TabsTrigger value="billing" className="gap-1"><Euro className="h-4 w-4" />Fatturazione</TabsTrigger>
            <TabsTrigger value="export" className="gap-1"><Download className="h-4 w-4" />Esporta</TabsTrigger>
            <TabsTrigger value="import" className="gap-1"><Database className="h-4 w-4" />Importa CRM</TabsTrigger>
            <TabsTrigger value="import-excel" className="gap-1"><FileSpreadsheet className="h-4 w-4" />Importa Excel</TabsTrigger>
          </TabsList>

          <TabsContent value="analytics" className="space-y-4">
            <MedicalAnalytics visits={m.visits} judgments={m.judgments} />
          </TabsContent>

          <TabsContent value="billing" className="space-y-4">
            <DoctorBilling doctors={m.doctors} visits={m.visits} inspections={m.inspections} />
          </TabsContent>

          <TabsContent value="export" className="space-y-4">
            <MedicalDataExport visits={m.visits} judgments={m.judgments} inspections={m.inspections} doctors={m.doctors} />
          </TabsContent>

          <TabsContent value="import" className="space-y-4">
            <MedicalCRMImporter onImportComplete={() => window.location.reload()} />
          </TabsContent>

          <TabsContent value="import-excel" className="space-y-4">
            <AgendaExcelImporter />
          </TabsContent>

          {/* AGENDA */}
          <TabsContent value="agenda" className="space-y-4">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="text-sm text-muted-foreground">Pianifica visite e sopralluoghi su calendario mensile.</div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => { setEditingInsp(null); setInspOpen(true); }}>
                  <MapPinned className="h-4 w-4 mr-1" /> Nuovo sopralluogo
                </Button>
                <Button onClick={() => { setEditingVisit(null); setVisitOpen(true); }}>
                  <Plus className="h-4 w-4 mr-1" /> Nuova visita
                </Button>
              </div>
            </div>
            <MedicalCalendar
              visits={m.visits}
              inspections={m.inspections}
              contacts={contacts.map((c) => ({ id: c.id, name: c.name, company: c.company }))}
              onVisitClick={(v) => { setEditingVisit(v); setVisitOpen(true); }}
              onInspectionClick={(i) => { setEditingInsp(i); setInspOpen(true); }}
            />
          </TabsContent>

          {/* HEALTH FILES */}
          <TabsContent value="health-files" className="space-y-4">
            <HealthFolderPanel />
          </TabsContent>

          {/* JUDGMENTS */}
          <TabsContent value="judgments" className="space-y-4">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input className="pl-8" placeholder="Cerca per dipendente o esito..." value={judgmentSearch} onChange={(e) => setJudgmentSearch(e.target.value)} />
              </div>
              <Button onClick={() => { setEditingJudgment(null); setDefaultJudgmentVisitId(null); setJudgmentOpen(true); }}>
                <Plus className="h-4 w-4 mr-1" /> Nuovo giudizio
              </Button>
            </div>
            <Card>
              <CardContent className="p-0">
                <ScrollArea className="h-[600px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Data</TableHead>
                        <TableHead>Dipendente</TableHead>
                        <TableHead>Esito</TableHead>
                        <TableHead>Limitazioni</TableHead>
                        <TableHead>Valido fino al</TableHead>
                        <TableHead>Medico</TableHead>
                        <TableHead className="w-20"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {m.judgments
                        .map((j) => {
                          const visit = m.visits.find((v) => v.id === j.visit_id);
                          const empName = visit?.employee_name || (() => {
                            const v2 = m.visits.find((v) => v.employee_id === j.employee_id);
                            return v2?.employee_name;
                          })() || '—';
                          const docName = m.doctors.find((d) => d.id === j.doctor_id);
                          return { ...j, _empName: empName, _docName: docName ? `Dr. ${docName.first_name} ${docName.last_name}` : '—' };
                        })
                        .filter((j) => {
                          if (!judgmentSearch) return true;
                          const s = judgmentSearch.toLowerCase();
                          return j._empName.toLowerCase().includes(s) || j.judgment.toLowerCase().includes(s);
                        })
                        .map((j) => {
                          const opt = JUDGMENT_OPTIONS.find((o) => o.value === j.judgment);
                          const expired = j.valid_until && new Date(j.valid_until) < new Date();
                          return (
                            <TableRow key={j.id}>
                              <TableCell>{format(parseISO(j.judgment_date), 'dd/MM/yyyy', { locale: it })}</TableCell>
                              <TableCell className="font-medium">{j._empName}</TableCell>
                              <TableCell><span className={opt?.color}>{opt?.label || j.judgment}</span></TableCell>
                              <TableCell className="max-w-[200px] truncate text-sm" title={j.limitations || ''}>{j.limitations || '—'}</TableCell>
                              <TableCell>
                                {j.valid_until ? (
                                  <Badge variant={expired ? 'destructive' : 'outline'}>
                                    {format(parseISO(j.valid_until), 'dd/MM/yyyy', { locale: it })}
                                  </Badge>
                                ) : '—'}
                              </TableCell>
                              <TableCell className="text-sm">{j._docName}</TableCell>
                              <TableCell>
                                <div className="flex gap-1">
                                  <Button size="icon" variant="ghost" onClick={() => { setEditingJudgment(j); setJudgmentOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                                  <Button size="icon" variant="ghost" onClick={() => { if (confirm('Eliminare il giudizio?')) m.deleteJudgment(j.id); }}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      {m.judgments.length === 0 && <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">Nessun giudizio registrato</TableCell></TableRow>}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          {/* DASHBOARD */}
          <TabsContent value="dashboard" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <Card className="border-destructive/40">
                <CardHeader className="pb-2">
                  <CardDescription>Visite scadute</CardDescription>
                  <CardTitle className="text-3xl text-destructive">{expired.length}</CardTitle>
                </CardHeader>
              </Card>
              <Card className="border-secondary/40">
                <CardHeader className="pb-2">
                  <CardDescription>In scadenza ≤ 30gg</CardDescription>
                  <CardTitle className="text-3xl text-secondary">{next30.length}</CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>In scadenza 30-90gg</CardDescription>
                  <CardTitle className="text-3xl">{next90.length}</CardTitle>
                </CardHeader>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Prossime scadenze sorveglianza</CardTitle>
              </CardHeader>
              <CardContent>
                {upcomingVisits.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nessuna visita con scadenza programmata.</p>
                ) : (
                  <ScrollArea className="h-[400px]">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Dipendente</TableHead>
                          <TableHead>Azienda</TableHead>
                          <TableHead>Tipo</TableHead>
                          <TableHead>Scadenza</TableHead>
                          <TableHead>Giorni</TableHead>
                          <TableHead className="w-16"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {upcomingVisits.slice(0, 50).map((v) => (
                          <TableRow key={v.id}>
                            <TableCell>{v.employee_name || '—'}</TableCell>
                            <TableCell>{v.contact_name || '—'}</TableCell>
                            <TableCell>{visitTypeLabel(v.visit_type)}</TableCell>
                            <TableCell>{format(parseISO(v.next_due_date as string), 'dd/MM/yyyy', { locale: it })}</TableCell>
                            <TableCell>
                              <Badge variant={v.daysLeft < 0 ? 'destructive' : v.daysLeft <= 30 ? 'secondary' : 'outline'}>
                                {v.daysLeft < 0 ? `Scaduta da ${-v.daysLeft}gg` : `${v.daysLeft}gg`}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Button size="icon" variant="ghost" title="Convoca via email" onClick={() => { setConvocationVisit(v); setConvocationOpen(true); }}><Mail className="h-4 w-4 text-primary" /></Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* VISITS */}
          <TabsContent value="visits" className="space-y-4">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input className="pl-8" placeholder="Cerca dipendente, azienda..." value={search} onChange={(e) => setSearch(e.target.value)} />
              </div>
              <Button onClick={() => { setEditingVisit(null); setVisitOpen(true); }}>
                <Plus className="h-4 w-4 mr-1" /> Nuova visita
              </Button>
            </div>
            <Card>
              <CardContent className="p-0">
                <ScrollArea className="h-[600px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Dipendente</TableHead>
                        <TableHead>Azienda</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Data</TableHead>
                        <TableHead>Prossima</TableHead>
                        <TableHead>Medico</TableHead>
                        <TableHead>Stato</TableHead>
                        <TableHead className="w-20"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredVisits.map((v) => (
                        <TableRow key={v.id}>
                          <TableCell>{v.employee_name || '—'}</TableCell>
                          <TableCell>{v.contact_name || '—'}</TableCell>
                          <TableCell>{visitTypeLabel(v.visit_type)}</TableCell>
                          <TableCell>{v.execution_date ? format(parseISO(v.execution_date), 'dd/MM/yyyy', { locale: it }) : v.scheduled_date ? format(parseISO(v.scheduled_date), 'dd/MM/yyyy', { locale: it }) : '—'}</TableCell>
                          <TableCell>{v.next_due_date ? format(parseISO(v.next_due_date), 'dd/MM/yyyy', { locale: it }) : '—'}</TableCell>
                          <TableCell>{v.doctor_name || '—'}</TableCell>
                          <TableCell>{statusBadge(v.status)}</TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button size="icon" variant="ghost" title="Aggiungi giudizio" onClick={() => { setEditingJudgment(null); setDefaultJudgmentVisitId(v.id); setJudgmentOpen(true); }}><Gavel className="h-4 w-4" /></Button>
                              <Button size="icon" variant="ghost" title="Convoca via email" onClick={() => { setConvocationVisit(v); setConvocationOpen(true); }}><Mail className="h-4 w-4 text-primary" /></Button>
                              <Button size="icon" variant="ghost" onClick={() => { setEditingVisit(v); setVisitOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                              <Button size="icon" variant="ghost" onClick={() => m.deleteVisit(v.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                      {filteredVisits.length === 0 && (
                        <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">Nessuna visita</TableCell></TableRow>
                      )}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          {/* PROTOCOLS */}
          <TabsContent value="protocols" className="space-y-4">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input className="pl-8" placeholder="Cerca per nome, mansione, rischio o esame..." value={protocolSearch} onChange={(e) => setProtocolSearch(e.target.value)} />
              </div>
              <Button onClick={() => { setEditingProtocol(null); setProtocolOpen(true); }}>
                <Plus className="h-4 w-4 mr-1" /> Nuovo protocollo
              </Button>
            </div>
            {(() => {
              const s = protocolSearch.trim().toLowerCase();
              const filtered = !s ? m.protocols : m.protocols.filter((p) => {
                const examsText = Array.isArray(p.exams)
                  ? p.exams.map((e: any) => (typeof e === 'string' ? e : e?.name ?? '')).join(' ')
                  : '';
                return (
                  (p.name || '').toLowerCase().includes(s) ||
                  (p.job_role || '').toLowerCase().includes(s) ||
                  (p.description || '').toLowerCase().includes(s) ||
                  (p.risks || []).some((r) => r.toLowerCase().includes(s)) ||
                  examsText.toLowerCase().includes(s)
                );
              });
              return (
                <div className="grid gap-3 md:grid-cols-2">
                  {filtered.map((p) => (
                    <Card key={p.id}>
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div>
                            <CardTitle className="text-base">{p.name}</CardTitle>
                            <CardDescription>{p.job_role || '—'} · ogni {p.periodicity_months || '—'} mesi</CardDescription>
                          </div>
                          <div className="flex gap-1">
                            <Button size="icon" variant="ghost" onClick={() => { setEditingProtocol(p); setProtocolOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                            <Button size="icon" variant="ghost" onClick={() => m.deleteProtocol(p.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        {p.risks && p.risks.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {p.risks.map((r, i) => <Badge key={i} variant="outline">{r}</Badge>)}
                          </div>
                        )}
                        {Array.isArray(p.exams) && p.exams.length > 0 && (
                          <ul className="text-sm list-disc pl-5 text-muted-foreground">
                            {p.exams.map((e: any, i: number) => (
                              <li key={i}>{typeof e === 'string' ? e : e?.name ?? JSON.stringify(e)}{typeof e === 'object' && e?.frequency_months ? ` (ogni ${e.frequency_months} mesi)` : ''}</li>
                            ))}
                          </ul>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                  {m.protocols.length === 0 && <p className="text-muted-foreground text-sm">Nessun protocollo configurato.</p>}
                  {m.protocols.length > 0 && filtered.length === 0 && <p className="text-muted-foreground text-sm">Nessun protocollo corrisponde alla ricerca.</p>}
                </div>
              );
            })()}
          </TabsContent>

          {/* DOCTORS */}
          <TabsContent value="doctors" className="space-y-4">
            <div className="flex justify-end">
              <Button onClick={() => { setEditingDoctor(null); setDoctorOpen(true); }}>
                <Plus className="h-4 w-4 mr-1" /> Nuovo medico
              </Button>
            </div>
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Ordine</TableHead>
                      <TableHead>Struttura</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Telefono</TableHead>
                      <TableHead className="w-20"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {m.doctors.map((d) => (
                      <TableRow key={d.id}>
                        <TableCell>Dr. {d.first_name} {d.last_name}</TableCell>
                        <TableCell>{d.medical_order || '—'} {d.order_number ? `#${d.order_number}` : ''}</TableCell>
                        <TableCell>{d.facility_name || '—'}</TableCell>
                        <TableCell>{d.email || '—'}</TableCell>
                        <TableCell>{d.phone || '—'}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button size="icon" variant="ghost" onClick={() => { setEditingDoctor(d); setDoctorOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                            <Button size="icon" variant="ghost" onClick={() => m.deleteDoctor(d.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {m.doctors.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Nessun medico</TableCell></TableRow>}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* INSPECTIONS */}
          <TabsContent value="inspections" className="space-y-4">
            <div className="flex justify-end">
              <Button onClick={() => { setEditingInsp(null); setInspOpen(true); }}>
                <Plus className="h-4 w-4 mr-1" /> Nuovo sopralluogo
              </Button>
            </div>
            <div className="grid gap-3">
              {m.inspections.map((i) => (
                <Card key={i.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-base">{format(parseISO(i.inspection_date), 'dd/MM/yyyy', { locale: it })}</CardTitle>
                        <CardDescription><Badge variant="outline">{i.status}</Badge></CardDescription>
                      </div>
                      <div className="flex gap-1">
                        <Button size="icon" variant="ghost" onClick={() => { setEditingInsp(i); setInspOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                        <Button size="icon" variant="ghost" onClick={() => m.deleteInspection(i.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                      </div>
                    </div>
                  </CardHeader>
                  {(i.topics || i.findings || i.recommendations) && (
                    <CardContent className="space-y-2 text-sm">
                      {i.topics && <div><strong>Argomenti:</strong> {i.topics}</div>}
                      {i.findings && <div><strong>Rilievi:</strong> {i.findings}</div>}
                      {i.recommendations && <div><strong>Raccomandazioni:</strong> {i.recommendations}</div>}
                    </CardContent>
                  )}
                </Card>
              ))}
              {m.inspections.length === 0 && <p className="text-muted-foreground text-sm">Nessun sopralluogo registrato.</p>}
            </div>
          </TabsContent>

          {/* ANNUAL REPORTS */}
          <TabsContent value="reports" className="space-y-4">
            <div className="flex justify-end">
              <Button onClick={() => { setEditingReport(null); setReportOpen(true); }}>
                <Plus className="h-4 w-4 mr-1" /> Nuova relazione
              </Button>
            </div>
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Anno</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead>Lavoratori</TableHead>
                      <TableHead>Visite</TableHead>
                      <TableHead>Idonei / Limit / Non id.</TableHead>
                      <TableHead>Stato</TableHead>
                      <TableHead className="w-20"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {m.annualReports.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell className="font-semibold">{r.reference_year}</TableCell>
                        <TableCell>{r.report_date ? format(parseISO(r.report_date), 'dd/MM/yyyy', { locale: it }) : '—'}</TableCell>
                        <TableCell>{r.total_workers ?? '—'}</TableCell>
                        <TableCell>{r.visits_performed ?? '—'}</TableCell>
                        <TableCell>{(r.fit_count ?? 0)} / {(r.fit_with_limitations_count ?? 0)} / {(r.unfit_count ?? 0)}</TableCell>
                        <TableCell><Badge variant="outline">{r.status}</Badge></TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button size="icon" variant="ghost" title="Genera PDF Allegato 3B" onClick={async () => {
                              const { generateAndDownloadAnnualReport } = await import('@/components/medicina/annualReportPDF');
                              const { data: branding } = await (await import('@/integrations/supabase/client')).supabase
                                .from('course_branding_settings').select('*').limit(1).maybeSingle();
                              const { data: contact } = r.contact_id ? await (await import('@/integrations/supabase/client')).supabase
                                .from('crm_contacts').select('id, name, company, address, vat_number, fiscal_code').eq('id', r.contact_id).maybeSingle() : { data: null } as any;
                              const doctor = m.doctors.find((d) => d.id === r.doctor_id);
                              await generateAndDownloadAnnualReport({
                                report: r, doctor, contact: contact as any, branding: branding as any,
                                visits: m.visits, judgments: m.judgments,
                              });
                            }}><FileText className="h-4 w-4" /></Button>
                            <Button size="icon" variant="ghost" onClick={() => { setEditingReport(r); setReportOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                            <Button size="icon" variant="ghost" onClick={() => m.deleteAnnualReport(r.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {m.annualReports.length === 0 && <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">Nessuna relazione</TableCell></TableRow>}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* DIALOGS */}
        <DoctorDialog open={doctorOpen} onOpenChange={setDoctorOpen} doctor={editingDoctor} onSave={(d) => editingDoctor ? m.updateDoctor(editingDoctor.id, d) : m.createDoctor(d)} />
        <ProtocolDialog open={protocolOpen} onOpenChange={setProtocolOpen} protocol={editingProtocol} onSave={(d) => editingProtocol ? m.updateProtocol(editingProtocol.id, d) : m.createProtocol(d)} />
        <VisitDialog open={visitOpen} onOpenChange={setVisitOpen} visit={editingVisit} doctors={m.doctors} protocols={m.protocols} onSave={(d) => editingVisit ? m.updateVisit(editingVisit.id, d) : m.createVisit(d)} />
        <InspectionDialog open={inspOpen} onOpenChange={setInspOpen} inspection={editingInsp} doctors={m.doctors} onSave={(d) => editingInsp ? m.updateInspection(editingInsp.id, d) : m.createInspection(d)} />
        <AnnualReportDialog open={reportOpen} onOpenChange={setReportOpen} report={editingReport} doctors={m.doctors} onSave={(d) => editingReport ? m.updateAnnualReport(editingReport.id, d) : m.createAnnualReport(d)} />
        <JudgmentDialog
          open={judgmentOpen}
          onOpenChange={setJudgmentOpen}
          judgment={editingJudgment}
          doctors={m.doctors}
          visits={m.visits}
          defaultVisitId={defaultJudgmentVisitId}
          onSave={(d) => editingJudgment ? m.updateJudgment(editingJudgment.id, d) : m.createJudgment(d)}
        />
        {convocationVisit && (
          <ConvocationDialog
            open={convocationOpen}
            onOpenChange={(o) => { setConvocationOpen(o); if (!o) setConvocationVisit(null); }}
            visit={convocationVisit}
            contactName={convocationVisit.contact_name}
            doctorName={convocationVisit.doctor_name}
            onSent={() => m.fetchVisits()}
          />
        )}
      </main>
      <BottomNav />
    </div>
  );
};

export default Medicina;
