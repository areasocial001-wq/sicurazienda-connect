import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
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
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, Upload, FileSpreadsheet, CheckCircle, XCircle, AlertCircle, Download } from 'lucide-react';

interface AdminBulkImportUsersProps {
  onUsersImported?: () => void;
}

interface ParsedUser {
  email: string;
  password: string;
  fullName?: string;
  companyName?: string;
  role?: string;
  status: 'pending' | 'success' | 'error';
  message?: string;
}

const VALID_ROLES = ['user', 'admin', 'contabilita', 'area_tecnica', 'gestione_corsi', 'consulenti_tecnici'];

export default function AdminBulkImportUsers({ onUsersImported }: AdminBulkImportUsersProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [parsedUsers, setParsedUsers] = useState<ParsedUser[]>([]);
  const [importProgress, setImportProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const downloadTemplate = () => {
    const template = 'email,password,full_name,company_name,role\nutente1@esempio.com,Password123!,Mario Rossi,Azienda Srl,user\nutente2@esempio.com,Password456!,Laura Bianchi,Altra Azienda,contabilita';
    const blob = new Blob([template], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'template_importazione_utenti.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  const parseCSV = (text: string): ParsedUser[] => {
    const lines = text.split('\n').filter(line => line.trim());
    if (lines.length < 2) return [];

    const headers = lines[0].toLowerCase().split(',').map(h => h.trim());
    const emailIndex = headers.findIndex(h => h === 'email');
    const passwordIndex = headers.findIndex(h => h === 'password');
    const fullNameIndex = headers.findIndex(h => h === 'full_name' || h === 'fullname' || h === 'nome');
    const companyIndex = headers.findIndex(h => h === 'company_name' || h === 'company' || h === 'azienda');
    const roleIndex = headers.findIndex(h => h === 'role' || h === 'ruolo');

    if (emailIndex === -1 || passwordIndex === -1) {
      toast.error('Il file CSV deve contenere le colonne "email" e "password"');
      return [];
    }

    const users: ParsedUser[] = [];
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      const email = values[emailIndex] || '';
      const password = values[passwordIndex] || '';

      if (!email || !password) continue;

      const role = roleIndex !== -1 ? values[roleIndex]?.toLowerCase() : 'user';
      
      users.push({
        email,
        password,
        fullName: fullNameIndex !== -1 ? values[fullNameIndex] : undefined,
        companyName: companyIndex !== -1 ? values[companyIndex] : undefined,
        role: VALID_ROLES.includes(role) ? role : 'user',
        status: 'pending'
      });
    }

    return users;
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      toast.error('Seleziona un file CSV');
      return;
    }

    setLoading(true);
    try {
      const text = await file.text();
      const users = parseCSV(text);
      
      if (users.length === 0) {
        toast.error('Nessun utente valido trovato nel file');
      } else {
        setParsedUsers(users);
        toast.success(`${users.length} utenti trovati nel file`);
      }
    } catch (error) {
      console.error('Error parsing CSV:', error);
      toast.error('Errore nel parsing del file CSV');
    } finally {
      setLoading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const importUsers = async () => {
    if (parsedUsers.length === 0) return;

    setImporting(true);
    setImportProgress(0);

    const updatedUsers = [...parsedUsers];
    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < updatedUsers.length; i++) {
      const user = updatedUsers[i];
      
      try {
        const { data, error } = await supabase.functions.invoke('admin-create-user', {
          body: {
            email: user.email,
            password: user.password,
            fullName: user.fullName,
            companyName: user.companyName,
            role: user.role,
          },
        });

        if (error) throw error;

        updatedUsers[i] = { ...user, status: 'success', message: 'Creato con successo' };
        successCount++;
      } catch (error: any) {
        updatedUsers[i] = { ...user, status: 'error', message: error.message || 'Errore sconosciuto' };
        errorCount++;
      }

      setImportProgress(Math.round(((i + 1) / updatedUsers.length) * 100));
      setParsedUsers([...updatedUsers]);
    }

    setImporting(false);

    if (successCount > 0) {
      toast.success(`${successCount} utenti creati con successo`);
      onUsersImported?.();
    }
    if (errorCount > 0) {
      toast.error(`${errorCount} utenti non creati per errori`);
    }
  };

  const handleClose = () => {
    if (!importing) {
      setParsedUsers([]);
      setImportProgress(0);
      setOpen(false);
    }
  };

  const getStatusBadge = (status: ParsedUser['status']) => {
    switch (status) {
      case 'success':
        return <Badge className="bg-green-500/20 text-green-700"><CheckCircle className="h-3 w-3 mr-1" />Creato</Badge>;
      case 'error':
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Errore</Badge>;
      default:
        return <Badge variant="secondary"><AlertCircle className="h-3 w-3 mr-1" />In attesa</Badge>;
    }
  };

  const getRoleLabel = (role?: string) => {
    const roleLabels: Record<string, string> = {
      'user': 'Utente',
      'admin': 'Admin',
      'contabilita': 'Contabilità',
      'area_tecnica': 'Area Tecnica',
      'gestione_corsi': 'Gestione Corsi',
      'consulenti_tecnici': 'Consulenti Tecnici',
    };
    return roleLabels[role || 'user'] || 'Utente';
  };

  const pendingCount = parsedUsers.filter(u => u.status === 'pending').length;
  const successCount = parsedUsers.filter(u => u.status === 'success').length;
  const errorCount = parsedUsers.filter(u => u.status === 'error').length;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <FileSpreadsheet className="h-4 w-4 mr-2" />
          Importa da CSV
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[700px] max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Importa Utenti da CSV</DialogTitle>
          <DialogDescription>
            Carica un file CSV con le colonne: email, password, full_name (opzionale), company_name (opzionale), role (opzionale).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Template download and file upload */}
          <div className="flex items-center gap-4">
            <Button variant="outline" size="sm" onClick={downloadTemplate}>
              <Download className="h-4 w-4 mr-2" />
              Scarica Template
            </Button>
            
            <div className="flex-1">
              <Label htmlFor="csv-file" className="sr-only">File CSV</Label>
              <Input
                id="csv-file"
                type="file"
                accept=".csv"
                ref={fileInputRef}
                onChange={handleFileChange}
                disabled={loading || importing}
              />
            </div>
          </div>

          {/* Parsed users preview */}
          {parsedUsers.length > 0 && (
            <>
              <div className="flex items-center justify-between text-sm">
                <span>
                  <strong>{parsedUsers.length}</strong> utenti totali
                </span>
                <div className="flex gap-4">
                  <span className="text-muted-foreground">In attesa: {pendingCount}</span>
                  <span className="text-green-600">Creati: {successCount}</span>
                  <span className="text-red-600">Errori: {errorCount}</span>
                </div>
              </div>

              {importing && (
                <div className="space-y-2">
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-primary transition-all duration-300" 
                      style={{ width: `${importProgress}%` }}
                    />
                  </div>
                  <p className="text-sm text-center text-muted-foreground">
                    Importazione in corso... {importProgress}%
                  </p>
                </div>
              )}

              <ScrollArea className="h-[300px] border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Email</TableHead>
                      <TableHead>Nome</TableHead>
                      <TableHead>Azienda</TableHead>
                      <TableHead>Ruolo</TableHead>
                      <TableHead>Stato</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parsedUsers.map((user, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{user.email}</TableCell>
                        <TableCell>{user.fullName || '-'}</TableCell>
                        <TableCell>{user.companyName || '-'}</TableCell>
                        <TableCell>{getRoleLabel(user.role)}</TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            {getStatusBadge(user.status)}
                            {user.message && user.status === 'error' && (
                              <p className="text-xs text-destructive">{user.message}</p>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </>
          )}
        </div>

        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={handleClose} disabled={importing}>
            {parsedUsers.length > 0 && successCount === parsedUsers.length ? 'Chiudi' : 'Annulla'}
          </Button>
          {parsedUsers.length > 0 && pendingCount > 0 && (
            <Button onClick={importUsers} disabled={importing}>
              {importing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Importazione...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Importa {pendingCount} Utenti
                </>
              )}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
