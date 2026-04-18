import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Upload, Download, Trash2, FileText, Lock, FolderOpen, Loader2 } from 'lucide-react';
import { useMedicalHealthFiles, DOCUMENT_TYPES, MedicalHealthFile } from '@/hooks/useMedicalHealthFiles';
import { format, parseISO } from 'date-fns';
import { it } from 'date-fns/locale';
import { toast } from 'sonner';

interface Employee {
  id: string;
  first_name: string;
  last_name: string;
  contact_id?: string | null;
}

interface Props {
  /** When provided restricts employees to this contact (CRM contact id). */
  contactId?: string;
  /** When provided pre-selects this employee (and hides selector if only one). */
  initialEmployeeId?: string;
  className?: string;
}

export const HealthFolderPanel = ({ contactId, initialEmployeeId, className }: Props) => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [employeeId, setEmployeeId] = useState<string | undefined>(initialEmployeeId);
  const [employeeFilter, setEmployeeFilter] = useState('');

  const { files, loading, uploading, uploadFile, downloadFile, deleteFile } = useMedicalHealthFiles(employeeId);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [docType, setDocType] = useState('referto');
  const [docDate, setDocDate] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    const load = async () => {
      let q = supabase.from('crm_employees').select('id, first_name, last_name, contact_id').order('last_name');
      if (contactId) q = q.eq('contact_id', contactId);
      const { data, error } = await q;
      if (error) {
        console.error(error);
        return;
      }
      setEmployees((data || []) as Employee[]);
      if (!employeeId && data && data.length === 1) setEmployeeId(data[0].id);
    };
    load();
  }, [contactId]);

  const employee = useMemo(() => employees.find((e) => e.id === employeeId), [employees, employeeId]);

  const filteredEmployees = useMemo(() => {
    if (!employeeFilter) return employees;
    const s = employeeFilter.toLowerCase();
    return employees.filter((e) => `${e.first_name} ${e.last_name}`.toLowerCase().includes(s));
  }, [employees, employeeFilter]);

  const handleUpload = async () => {
    if (!file || !employeeId) {
      toast.error('Seleziona un dipendente e un file');
      return;
    }
    const ok = await uploadFile({
      file,
      employee_id: employeeId,
      contact_id: employee?.contact_id || contactId || null,
      document_type: docType,
      document_date: docDate || null,
      description: description || null,
    });
    if (ok) {
      setDialogOpen(false);
      setFile(null);
      setDocDate('');
      setDescription('');
    }
  };

  const docTypeLabel = (v: string) => DOCUMENT_TYPES.find((d) => d.value === v)?.label || v;

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-start justify-between gap-2 flex-wrap">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <FolderOpen className="h-4 w-4 text-primary" />
              Cartella sanitaria e di rischio
              <Badge variant="outline" className="gap-1 text-xs"><Lock className="h-3 w-3" />Dati sensibili</Badge>
            </CardTitle>
            <CardDescription>
              Archivio digitale di referti, certificati e documentazione sanitaria. Accesso riservato.
            </CardDescription>
          </div>
          <Button size="sm" onClick={() => setDialogOpen(true)} disabled={!employeeId}>
            <Upload className="h-4 w-4 mr-1" /> Carica documento
          </Button>
        </div>

        {!initialEmployeeId && (
          <div className="grid sm:grid-cols-2 gap-2 mt-3">
            <div>
              <Label className="text-xs">Cerca dipendente</Label>
              <Input value={employeeFilter} onChange={(e) => setEmployeeFilter(e.target.value)} placeholder="Nome o cognome..." />
            </div>
            <div>
              <Label className="text-xs">Dipendente</Label>
              <Select value={employeeId} onValueChange={setEmployeeId}>
                <SelectTrigger><SelectValue placeholder="Seleziona dipendente" /></SelectTrigger>
                <SelectContent>
                  {filteredEmployees.map((e) => (
                    <SelectItem key={e.id} value={e.id}>{e.last_name} {e.first_name}</SelectItem>
                  ))}
                  {filteredEmployees.length === 0 && <div className="p-2 text-sm text-muted-foreground">Nessun dipendente</div>}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}
      </CardHeader>

      <CardContent className="p-0">
        {loading ? (
          <div className="flex items-center justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : !employeeId ? (
          <p className="text-center text-sm text-muted-foreground py-8">Seleziona un dipendente per visualizzare la cartella sanitaria.</p>
        ) : (
          <ScrollArea className="max-h-[500px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Documento</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Dimensione</TableHead>
                  <TableHead className="w-24"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {files.map((f) => (
                  <TableRow key={f.id}>
                    <TableCell><Badge variant="secondary">{docTypeLabel(f.document_type)}</Badge></TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                        <div className="min-w-0">
                          <div className="truncate font-medium text-sm">{f.file_name}</div>
                          {f.description && <div className="text-xs text-muted-foreground truncate">{f.description}</div>}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{f.document_date ? format(parseISO(f.document_date), 'dd/MM/yyyy', { locale: it }) : '—'}</TableCell>
                    <TableCell className="text-sm">{f.file_size ? `${(f.file_size / 1024).toFixed(0)} KB` : '—'}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button size="icon" variant="ghost" onClick={() => downloadFile(f)}><Download className="h-4 w-4" /></Button>
                        <Button size="icon" variant="ghost" onClick={() => {
                          if (confirm(`Eliminare definitivamente "${f.file_name}"?`)) deleteFile(f);
                        }}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {files.length === 0 && (
                  <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">Nessun documento sanitario</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        )}
      </CardContent>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Carica documento sanitario</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>File *</Label>
              <Input type="file" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" onChange={(e) => setFile(e.target.files?.[0] || null)} />
              {file && <p className="text-xs text-muted-foreground mt-1">{file.name} ({(file.size / 1024).toFixed(0)} KB)</p>}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Tipo documento</Label>
                <Select value={docType} onValueChange={setDocType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {DOCUMENT_TYPES.map((d) => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Data documento</Label>
                <Input type="date" value={docDate} onChange={(e) => setDocDate(e.target.value)} />
              </div>
            </div>
            <div>
              <Label>Descrizione / Note</Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} placeholder="Note interne, esito, anomalie..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={uploading}>Annulla</Button>
            <Button onClick={handleUpload} disabled={uploading || !file}>
              {uploading ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" />Caricamento...</> : <><Upload className="h-4 w-4 mr-1" />Carica</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};
