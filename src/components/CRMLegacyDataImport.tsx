import { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import {
  DatabaseZap,
  Loader2,
  Upload,
  CheckCircle,
  AlertCircle,
  UserCheck,
  UserPlus,
  Building2,
} from 'lucide-react';

interface CRMLegacyDataImportProps {
  onImportComplete?: () => void;
}

// ----- Tipi righe parsate -----
interface CompanyRow {
  external_id: string;
  name: string;
  legal_name?: string;
  vat_number?: string;
  fiscal_code?: string;
  city?: string;
  postal_code?: string;
  region?: string;
  address?: string;
  phone?: string;
  email?: string;
  pec?: string;
  pec_fe?: string;
  sdi_code?: string;
  ateco_code?: string;
  ateco_letter?: string;
  legal_form?: string;
  activity_start_date?: string | null;
  activity_end_date?: string | null;
  notes?: string;
  // Match info
  match_status: 'update' | 'create' | 'skip';
  matched_id?: string;
  match_reason?: string;
}

interface EmployeeRow {
  external_id: string;
  fiscal_code: string;
  first_name: string;
  last_name: string;
  birth_date?: string | null;
  birth_place?: string;
  role?: string;
  company_external_id?: string;
  company_name?: string;
  vat_number?: string;
  hire_date?: string | null;
  termination_date?: string | null;
  match_status: 'update' | 'create' | 'skip';
  matched_id?: string;
  match_reason?: string;
}

function toIsoDate(value: any): string | null {
  if (!value) return null;
  if (value instanceof Date) {
    if (isNaN(value.getTime())) return null;
    return value.toISOString().split('T')[0];
  }
  if (typeof value === 'number') {
    // Excel serial date
    const d = XLSX.SSF.parse_date_code(value);
    if (!d) return null;
    const dt = new Date(Date.UTC(d.y, d.m - 1, d.d));
    return dt.toISOString().split('T')[0];
  }
  if (typeof value === 'string') {
    const s = value.trim();
    if (!s) return null;
    const dt = new Date(s);
    if (!isNaN(dt.getTime())) return dt.toISOString().split('T')[0];
  }
  return null;
}

function cleanStr(v: any): string | undefined {
  if (v === null || v === undefined) return undefined;
  const s = String(v).trim();
  return s.length ? s : undefined;
}

function normalizeCF(v: any): string | undefined {
  const s = cleanStr(v);
  return s ? s.toUpperCase().replace(/\s+/g, '') : undefined;
}

function normalizeVAT(v: any): string | undefined {
  if (v === null || v === undefined) return undefined;
  let s = String(v).trim();
  if (!s) return undefined;
  // Handle scientific notation from Excel
  if (/^\d+\.?\d*e\+?\d+$/i.test(s)) {
    s = Number(s).toFixed(0);
  }
  s = s.replace(/[^0-9]/g, '');
  return s.length ? s.padStart(11, '0').slice(-11) : undefined;
}

export function CRMLegacyDataImport({ onImportComplete }: CRMLegacyDataImportProps) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [companies, setCompanies] = useState<CompanyRow[]>([]);
  const [employees, setEmployees] = useState<EmployeeRow[]>([]);
  const [importCompanies, setImportCompanies] = useState(true);
  const [importEmployees, setImportEmployees] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetState = () => {
    setCompanies([]);
    setEmployees([]);
    setProgress({ done: 0, total: 0 });
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleClose = () => {
    if (!importing) {
      resetState();
      setOpen(false);
    }
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setParsing(true);
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: 'array', cellDates: true });

      // Identifica i fogli per nome (parziale, case-insensitive)
      const sheetByKey = (key: string) =>
        wb.SheetNames.find((n) => n.toLowerCase().includes(key.toLowerCase()));

      const aziendeSheet = sheetByKey('aziend');
      const dipendentiDateSheet = sheetByKey('lavoratori') || sheetByKey('dipendenti.x');
      const formazioneSheet =
        wb.SheetNames.find((n) => n.toLowerCase().includes('formazione (2_001')) ||
        wb.SheetNames.find((n) => n.toLowerCase().includes('formazione'));

      if (!aziendeSheet && !formazioneSheet) {
        toast.error('File non riconosciuto: nessun foglio aziende/formazione trovato');
        return;
      }

      // ----- AZIENDE -----
      const parsedCompanies: CompanyRow[] = [];
      if (aziendeSheet) {
        const rows: any[] = XLSX.utils.sheet_to_json(wb.Sheets[aziendeSheet], { defval: null });
        for (const r of rows) {
          const id = cleanStr(r['ID AZIENDA']);
          const name = cleanStr(r['NOME AZIENDA']);
          if (!id || !name) continue;
          parsedCompanies.push({
            external_id: id,
            name,
            legal_name: cleanStr(r['RAGIONE SOCIALE AZIENDA']),
            vat_number: normalizeVAT(r['PARTITA IVA']),
            fiscal_code: cleanStr(r['CODICE FISCALE']),
            city: cleanStr(r['COMUNE']),
            postal_code: cleanStr(r['CAP']),
            region: cleanStr(r['REGIONE']),
            address: cleanStr(r['INDIRIZZO']),
            phone: cleanStr(r['TELEFONO']) || cleanStr(r['CELLULARE']),
            email: cleanStr(r['E-MAIL']),
            pec: cleanStr(r['PEC']),
            pec_fe: cleanStr(r['PECFE']),
            sdi_code: cleanStr(r['Codice Destinatario']),
            ateco_code: cleanStr(r['CODICE Ateco']),
            ateco_letter: cleanStr(r['LETTERA Ateco']),
            legal_form: cleanStr(r['FormaSocietaria']),
            activity_start_date: toIsoDate(r['Apertura Attivita']),
            activity_end_date: toIsoDate(r['Chiusura Attivita']),
            notes: cleanStr(r['NOTE']),
            match_status: 'create',
          });
        }

        // Match con DB
        const { data: existing } = await supabase
          .from('crm_contacts')
          .select('id, name, vat_number, external_id')
          .limit(10000);

        const byVat = new Map<string, any>();
        const byExt = new Map<string, any>();
        const byName = new Map<string, any>();
        (existing || []).forEach((c: any) => {
          if (c.vat_number) byVat.set(normalizeVAT(c.vat_number)!, c);
          if (c.external_id) byExt.set(c.external_id, c);
          if (c.name) byName.set(c.name.toLowerCase().trim(), c);
        });

        for (const c of parsedCompanies) {
          let m = c.external_id ? byExt.get(c.external_id) : null;
          if (!m && c.vat_number) m = byVat.get(c.vat_number);
          if (!m) m = byName.get(c.name.toLowerCase());
          if (m) {
            c.match_status = 'update';
            c.matched_id = m.id;
            c.match_reason = c.external_id && byExt.get(c.external_id)
              ? 'ID legacy'
              : c.vat_number && byVat.get(c.vat_number)
              ? 'P.IVA'
              : 'Nome';
          }
        }
      }

      // ----- DIPENDENTI: anagrafica completa da formazione + date da lavoratori -----
      const parsedEmployees: EmployeeRow[] = [];
      const empMap = new Map<string, EmployeeRow>(); // key = CF

      if (formazioneSheet) {
        const rows: any[] = XLSX.utils.sheet_to_json(wb.Sheets[formazioneSheet], { defval: null });
        for (const r of rows) {
          const cf = normalizeCF(r['CODICE FISCALE'] || r['Codice Fiscale']);
          if (!cf || cf.length < 11) continue;
          if (empMap.has(cf)) continue; // primo record vince per anagrafica

          const idDip = cleanStr(r['ID DIPENDENTE']);
          const idAz = cleanStr(r['ID AZIENDA']);
          const azNome = cleanStr(r['NOME AZIENDA'] || r['Azienda']);
          const piva = normalizeVAT(r['Partita Iva']);
          const cognome = cleanStr(r['Cognome']) || '';
          const nome = cleanStr(r['Nome']) || '';
          const profilo = cleanStr(r['Profilo'] || r['Mansione']);
          const dataNascita = toIsoDate(r['Data nascita'] || r['Data Nascita']);
          const luogoNascita = cleanStr(r['Luogo'] || r['Luogo Nascita']);

          empMap.set(cf, {
            external_id: idDip || cf,
            fiscal_code: cf,
            first_name: nome,
            last_name: cognome,
            birth_date: dataNascita,
            birth_place: luogoNascita,
            role: profilo,
            company_external_id: idAz,
            company_name: azNome,
            vat_number: piva,
            match_status: 'create',
          });
        }
      }

      // Date assunzione/cessazione: foglio lavoratori
      // Mappa idDip -> {hire, termination}
      const datesByExtId = new Map<string, { hire?: string | null; termination?: string | null }>();
      if (dipendentiDateSheet) {
        const rows: any[] = XLSX.utils.sheet_to_json(wb.Sheets[dipendentiDateSheet], { defval: null });
        for (const r of rows) {
          const idDip = cleanStr(r['ID DIPENDENTE']);
          if (!idDip) continue;
          const hire = toIsoDate(r['DIPENDENTE dal']);
          const term = toIsoDate(r['DIPENDENTE al']);
          // tieni il record più recente
          const prev = datesByExtId.get(idDip);
          if (!prev || (hire && (!prev.hire || hire > prev.hire))) {
            datesByExtId.set(idDip, { hire, termination: term });
          }
        }
      }

      // Applica date
      for (const e of empMap.values()) {
        if (e.external_id) {
          const d = datesByExtId.get(e.external_id);
          if (d) {
            e.hire_date = d.hire ?? null;
            e.termination_date = d.termination ?? null;
          }
        }
        parsedEmployees.push(e);
      }

      // Match dipendenti per CF
      const { data: existingEmp } = await supabase
        .from('crm_employees')
        .select('id, fiscal_code')
        .not('fiscal_code', 'is', null)
        .limit(20000);
      const empByCf = new Map<string, any>();
      (existingEmp || []).forEach((e: any) => {
        const cf = normalizeCF(e.fiscal_code);
        if (cf) empByCf.set(cf, e);
      });

      for (const e of parsedEmployees) {
        const m = empByCf.get(e.fiscal_code);
        if (m) {
          e.match_status = 'update';
          e.matched_id = m.id;
          e.match_reason = 'CF';
        }
      }

      setCompanies(parsedCompanies);
      setEmployees(parsedEmployees);
      toast.success(
        `Pronti: ${parsedCompanies.length} aziende, ${parsedEmployees.length} dipendenti`
      );
    } catch (err: any) {
      console.error(err);
      toast.error('Errore parsing file: ' + err.message);
    } finally {
      setParsing(false);
    }
  };

  const runImport = async () => {
    if (!user) return;
    setImporting(true);
    let totalDone = 0;
    const totalOps =
      (importCompanies ? companies.length : 0) +
      (importEmployees ? employees.length : 0);
    setProgress({ done: 0, total: totalOps });

    let companyIdByExt = new Map<string, string>();
    let companyIdByVat = new Map<string, string>();
    let companyIdByName = new Map<string, string>();

    // ------ AZIENDE ------
    if (importCompanies && companies.length) {
      const BATCH = 100;
      for (let i = 0; i < companies.length; i += BATCH) {
        const slice = companies.slice(i, i + BATCH);
        for (const c of slice) {
          const payload: any = {
            name: c.name,
            legal_name: c.legal_name,
            vat_number: c.vat_number,
            fiscal_code: c.fiscal_code,
            city: c.city,
            postal_code: c.postal_code,
            region: c.region,
            address: c.address,
            phone: c.phone,
            email: c.email,
            pec: c.pec,
            pec_fe: c.pec_fe,
            sdi_code: c.sdi_code,
            ateco_code: c.ateco_code,
            ateco_letter: c.ateco_letter,
            legal_form: c.legal_form,
            activity_start_date: c.activity_start_date,
            activity_end_date: c.activity_end_date,
            external_id: c.external_id,
          };
          // rimuovi campi undefined
          Object.keys(payload).forEach((k) => payload[k] === undefined && delete payload[k]);

          try {
            if (c.match_status === 'update' && c.matched_id) {
              await supabase.from('crm_contacts').update(payload).eq('id', c.matched_id);
              companyIdByExt.set(c.external_id, c.matched_id);
              if (c.vat_number) companyIdByVat.set(c.vat_number, c.matched_id);
              companyIdByName.set(c.name.toLowerCase(), c.matched_id);
            } else {
              const { data } = await supabase
                .from('crm_contacts')
                .insert({ ...payload, user_id: user.id, status: 'client' })
                .select('id')
                .single();
              if (data?.id) {
                companyIdByExt.set(c.external_id, data.id);
                if (c.vat_number) companyIdByVat.set(c.vat_number, data.id);
                companyIdByName.set(c.name.toLowerCase(), data.id);
              }
            }
          } catch (err) {
            console.error('Errore azienda', c.name, err);
          }
          totalDone++;
        }
        setProgress({ done: totalDone, total: totalOps });
      }
    } else {
      // Carica mappa aziende esistenti per il match dipendenti
      const { data: existing } = await supabase
        .from('crm_contacts')
        .select('id, name, vat_number, external_id')
        .limit(10000);
      (existing || []).forEach((c: any) => {
        if (c.external_id) companyIdByExt.set(c.external_id, c.id);
        if (c.vat_number) companyIdByVat.set(normalizeVAT(c.vat_number)!, c.id);
        if (c.name) companyIdByName.set(c.name.toLowerCase().trim(), c.id);
      });
    }

    // ------ DIPENDENTI ------
    if (importEmployees && employees.length) {
      const BATCH = 100;
      for (let i = 0; i < employees.length; i += BATCH) {
        const slice = employees.slice(i, i + BATCH);
        for (const e of slice) {
          // resolve contact_id
          let contactId: string | undefined;
          if (e.company_external_id) contactId = companyIdByExt.get(e.company_external_id);
          if (!contactId && e.vat_number) contactId = companyIdByVat.get(e.vat_number);
          if (!contactId && e.company_name) contactId = companyIdByName.get(e.company_name.toLowerCase());

          const payload: any = {
            first_name: e.first_name || 'N/D',
            last_name: e.last_name || 'N/D',
            fiscal_code: e.fiscal_code,
            birth_date: e.birth_date,
            birth_place: e.birth_place,
            role: e.role,
            hire_date: e.hire_date,
            termination_date: e.termination_date,
            external_id: e.external_id,
            status: e.termination_date ? 'inactive' : 'active',
          };
          if (contactId) payload.contact_id = contactId;
          Object.keys(payload).forEach((k) => payload[k] === undefined && delete payload[k]);

          try {
            if (e.match_status === 'update' && e.matched_id) {
              await supabase.from('crm_employees').update(payload).eq('id', e.matched_id);
            } else {
              await supabase
                .from('crm_employees')
                .insert({ ...payload, user_id: user.id });
            }
          } catch (err) {
            console.error('Errore dipendente', e.fiscal_code, err);
          }
          totalDone++;
        }
        setProgress({ done: totalDone, total: totalOps });
      }
    }

    setImporting(false);
    toast.success('Importazione completata');
    onImportComplete?.();
    setTimeout(() => handleClose(), 1500);
  };

  const compStats = {
    update: companies.filter((c) => c.match_status === 'update').length,
    create: companies.filter((c) => c.match_status === 'create').length,
  };
  const empStats = {
    update: employees.filter((e) => e.match_status === 'update').length,
    create: employees.filter((e) => e.match_status === 'create').length,
    withDates: employees.filter((e) => e.hire_date).length,
    withTermination: employees.filter((e) => e.termination_date).length,
  };

  const pct = progress.total ? Math.round((progress.done / progress.total) * 100) : 0;

  return (
    <Dialog open={open} onOpenChange={(v) => (v ? setOpen(true) : handleClose())}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <DatabaseZap className="h-4 w-4 mr-2" />
          Import dati legacy
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-5xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Importazione dati da gestionale precedente</DialogTitle>
          <DialogDescription>
            Carica il file Excel con i fogli <strong>Aziende</strong>, <strong>Lavoratori</strong> e{' '}
            <strong>Formazione</strong>. I dipendenti vengono uniti per Codice Fiscale; le aziende per
            ID legacy / P.IVA / Nome.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFile}
              disabled={parsing || importing}
              className="flex-1"
            />
            {parsing && <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />}
          </div>

          {(companies.length > 0 || employees.length > 0) && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div className="border rounded-md p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <Checkbox
                        checked={importCompanies}
                        onCheckedChange={(v) => setImportCompanies(!!v)}
                        disabled={importing}
                      />
                      <Building2 className="h-4 w-4" />
                      Aziende ({companies.length})
                    </div>
                  </div>
                  <div className="flex gap-2 text-xs">
                    <Badge variant="secondary">
                      <UserCheck className="h-3 w-3 mr-1" />
                      {compStats.update} aggiorna
                    </Badge>
                    <Badge variant="outline">
                      <UserPlus className="h-3 w-3 mr-1" />
                      {compStats.create} nuove
                    </Badge>
                  </div>
                </div>
                <div className="border rounded-md p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <Checkbox
                        checked={importEmployees}
                        onCheckedChange={(v) => setImportEmployees(!!v)}
                        disabled={importing}
                      />
                      <UserCheck className="h-4 w-4" />
                      Dipendenti ({employees.length})
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs">
                    <Badge variant="secondary">
                      <UserCheck className="h-3 w-3 mr-1" />
                      {empStats.update} aggiorna
                    </Badge>
                    <Badge variant="outline">
                      <UserPlus className="h-3 w-3 mr-1" />
                      {empStats.create} nuovi
                    </Badge>
                    <Badge variant="secondary">{empStats.withDates} con assunzione</Badge>
                    <Badge variant="destructive">{empStats.withTermination} cessati</Badge>
                  </div>
                </div>
              </div>

              {importing && (
                <div className="space-y-2">
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all duration-300"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <p className="text-sm text-center text-muted-foreground">
                    Importazione: {progress.done} / {progress.total} ({pct}%)
                  </p>
                </div>
              )}

              <Tabs defaultValue="employees">
                <TabsList>
                  <TabsTrigger value="employees">Dipendenti</TabsTrigger>
                  <TabsTrigger value="companies">Aziende</TabsTrigger>
                </TabsList>
                <TabsContent value="employees">
                  <ScrollArea className="h-[320px] border rounded-md">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>CF</TableHead>
                          <TableHead>Cognome Nome</TableHead>
                          <TableHead>Nascita</TableHead>
                          <TableHead>Mansione</TableHead>
                          <TableHead>Azienda</TableHead>
                          <TableHead>Assunto</TableHead>
                          <TableHead>Cessato</TableHead>
                          <TableHead>Stato</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {employees.slice(0, 200).map((e) => (
                          <TableRow key={e.fiscal_code}>
                            <TableCell className="font-mono text-xs">{e.fiscal_code}</TableCell>
                            <TableCell className="text-xs">
                              {e.last_name} {e.first_name}
                            </TableCell>
                            <TableCell className="text-xs">
                              {e.birth_date}
                              {e.birth_place && (
                                <span className="text-muted-foreground"> ({e.birth_place})</span>
                              )}
                            </TableCell>
                            <TableCell className="text-xs">{e.role || '-'}</TableCell>
                            <TableCell className="text-xs truncate max-w-[180px]">
                              {e.company_name || '-'}
                            </TableCell>
                            <TableCell className="text-xs">{e.hire_date || '-'}</TableCell>
                            <TableCell className="text-xs">{e.termination_date || '-'}</TableCell>
                            <TableCell>
                              {e.match_status === 'update' ? (
                                <Badge variant="secondary" className="text-xs">
                                  <CheckCircle className="h-3 w-3 mr-1" /> Match {e.match_reason}
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-xs">
                                  <UserPlus className="h-3 w-3 mr-1" /> Nuovo
                                </Badge>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    {employees.length > 200 && (
                      <p className="text-xs text-center text-muted-foreground p-2">
                        Mostrati primi 200 di {employees.length}
                      </p>
                    )}
                  </ScrollArea>
                </TabsContent>
                <TabsContent value="companies">
                  <ScrollArea className="h-[320px] border rounded-md">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>ID</TableHead>
                          <TableHead>Nome</TableHead>
                          <TableHead>P.IVA</TableHead>
                          <TableHead>Città</TableHead>
                          <TableHead>ATECO</TableHead>
                          <TableHead>Stato</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {companies.slice(0, 200).map((c) => (
                          <TableRow key={c.external_id}>
                            <TableCell className="text-xs">{c.external_id}</TableCell>
                            <TableCell className="text-xs truncate max-w-[200px]">
                              {c.name}
                            </TableCell>
                            <TableCell className="text-xs font-mono">{c.vat_number || '-'}</TableCell>
                            <TableCell className="text-xs">{c.city || '-'}</TableCell>
                            <TableCell className="text-xs">
                              {c.ateco_code} {c.ateco_letter}
                            </TableCell>
                            <TableCell>
                              {c.match_status === 'update' ? (
                                <Badge variant="secondary" className="text-xs">
                                  <CheckCircle className="h-3 w-3 mr-1" /> Match {c.match_reason}
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-xs">
                                  <UserPlus className="h-3 w-3 mr-1" /> Nuova
                                </Badge>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    {companies.length > 200 && (
                      <p className="text-xs text-center text-muted-foreground p-2">
                        Mostrate prime 200 di {companies.length}
                      </p>
                    )}
                  </ScrollArea>
                </TabsContent>
              </Tabs>
            </>
          )}

          {!companies.length && !employees.length && !parsing && (
            <div className="border-dashed border-2 rounded-md p-8 text-center text-sm text-muted-foreground">
              <AlertCircle className="h-6 w-6 mx-auto mb-2 opacity-50" />
              Carica il file Excel del vecchio gestionale per iniziare
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={handleClose} disabled={importing}>
            Chiudi
          </Button>
          {(companies.length > 0 || employees.length > 0) && (
            <Button onClick={runImport} disabled={importing || (!importCompanies && !importEmployees)}>
              {importing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Importazione...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" /> Avvia import
                </>
              )}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default CRMLegacyDataImport;