import { useState, useRef } from 'react';
import { Upload, FileSpreadsheet, Loader2, Check, AlertCircle, Users } from 'lucide-react';
import * as XLSX from 'xlsx';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';

interface ParsedEmployeeActivity {
  employeeName: string;
  activityType: string;
  activityName: string;
  executionDate: string;
  expiryDate: string;
  notes: string;
}

interface ImportResult {
  success: number;
  failed: number;
  notFound: number;
  errors: string[];
}

interface Employee {
  id: string;
  first_name: string;
  last_name: string;
  contact_id: string | null;
}

export function CRMEmployeeActivitiesImport({ 
  contactId, 
  onImportComplete 
}: { 
  contactId?: string;
  onImportComplete?: () => void;
}) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [selectedContactId, setSelectedContactId] = useState(contactId || '');
  const [contacts, setContacts] = useState<{ id: string; name: string; company: string }[]>([]);
  
  const [parsedActivities, setParsedActivities] = useState<ParsedEmployeeActivity[]>([]);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<ImportResult | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);

  const parseDate = (dateStr: string): string | null => {
    if (!dateStr) return null;
    const str = dateStr.toString().trim();
    
    // Handle Excel serial dates
    if (!isNaN(Number(str))) {
      const serial = Number(str);
      if (serial > 25000 && serial < 100000) {
        const date = new Date((serial - 25569) * 86400 * 1000);
        if (!isNaN(date.getTime())) {
          return date.toISOString().split('T')[0];
        }
      }
    }
    
    // Try DD/MM/YYYY format
    const parts = str.split(/[\/\-\.]/);
    if (parts.length >= 3) {
      const day = parseInt(parts[0]);
      const month = parseInt(parts[1]) - 1;
      const year = parseInt(parts[2]);
      if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
        const date = new Date(year, month, day);
        if (!isNaN(date.getTime())) {
          return date.toISOString().split('T')[0];
        }
      }
    }
    return null;
  };

  const loadContacts = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('crm_contacts')
      .select('id, name, company')
      .eq('user_id', user.id)
      .order('name');
    
    setContacts(data || []);
  };

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (isOpen && !contactId) {
      loadContacts();
    }
    if (!isOpen) {
      // Reset state
      setParsedActivities([]);
      setResult(null);
      setProgress(0);
    }
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setResult(null);

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];

      // Find header row
      let headerRowIndex = 0;
      for (let i = 0; i < Math.min(10, jsonData.length); i++) {
        const row = jsonData[i];
        if (row && row.some((cell: any) => {
          const c = (cell || '').toString().toLowerCase();
          return c.includes('dipendente') || c.includes('nome') || c.includes('cognome');
        })) {
          headerRowIndex = i;
          break;
        }
      }

      const headerRow = jsonData[headerRowIndex];
      if (!headerRow) throw new Error('Riga intestazione non trovata');

      // Map column indices
      const colMap: Record<string, number> = {};
      headerRow.forEach((header: string, index: number) => {
        const h = (header || '').toString().toLowerCase().trim();
        if (h.includes('dipendente') || h === 'nome' || h.includes('nome e cognome')) colMap.employeeName = index;
        if (h.includes('cognome') && colMap.lastName === undefined) colMap.lastName = index;
        if (h.includes('tipo') && !h.includes('attività')) colMap.activityType = index;
        if (h.includes('attività') || h.includes('corso') || h.includes('descrizione')) colMap.activityName = index;
        if (h.includes('esecuzione') || h.includes('data esecuzione') || h.includes('effettuata')) colMap.executionDate = index;
        if (h.includes('scadenza') || h.includes('data scadenza') || h.includes('validità')) colMap.expiryDate = index;
        if (h.includes('note') || h.includes('osservazioni')) colMap.notes = index;
      });

      // Parse data rows
      const activities: ParsedEmployeeActivity[] = [];
      for (let i = headerRowIndex + 1; i < jsonData.length; i++) {
        const row = jsonData[i];
        if (!row) continue;
        
        let employeeName = '';
        if (colMap.employeeName !== undefined) {
          employeeName = (row[colMap.employeeName] || '').toString().trim();
        }
        if (!employeeName && colMap.lastName !== undefined) {
          const firstName = colMap.employeeName !== undefined ? (row[colMap.employeeName] || '').toString().trim() : '';
          const lastName = (row[colMap.lastName] || '').toString().trim();
          employeeName = `${firstName} ${lastName}`.trim();
        }
        
        if (!employeeName) continue;

        const activityName = (row[colMap.activityName] || '').toString().trim();
        if (!activityName) continue;

        activities.push({
          employeeName,
          activityType: (row[colMap.activityType] || 'formazione').toString().trim().toLowerCase(),
          activityName,
          executionDate: (row[colMap.executionDate] || '').toString().trim(),
          expiryDate: (row[colMap.expiryDate] || '').toString().trim(),
          notes: (row[colMap.notes] || '').toString().trim(),
        });
      }

      setParsedActivities(activities);
      toast({ title: `${activities.length} attività trovate nel file` });
    } catch (error: any) {
      toast({ title: 'Errore lettura file', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const importActivities = async () => {
    if (!user || parsedActivities.length === 0) return;

    const targetContactId = contactId || selectedContactId;
    if (!targetContactId) {
      toast({ title: 'Seleziona un contatto', variant: 'destructive' });
      return;
    }

    setImporting(true);
    setProgress(0);

    // Get employees for the contact
    const { data: employeesData } = await supabase
      .from('crm_employees')
      .select('id, first_name, last_name, contact_id')
      .eq('contact_id', targetContactId);

    const employees = employeesData || [];
    
    // Create name-to-id map
    const employeeMap = new Map<string, string>();
    employees.forEach(emp => {
      const fullName = `${emp.first_name} ${emp.last_name}`.toLowerCase().trim();
      const reverseName = `${emp.last_name} ${emp.first_name}`.toLowerCase().trim();
      employeeMap.set(fullName, emp.id);
      employeeMap.set(reverseName, emp.id);
      // Also add just last name as fallback
      employeeMap.set(emp.last_name.toLowerCase().trim(), emp.id);
    });

    const result: ImportResult = { success: 0, failed: 0, notFound: 0, errors: [] };
    const batchSize = 50;

    const activitiesToInsert: any[] = [];
    const notFoundEmployees: Set<string> = new Set();

    for (const activity of parsedActivities) {
      const searchName = activity.employeeName.toLowerCase().trim();
      const employeeId = employeeMap.get(searchName);

      if (!employeeId) {
        notFoundEmployees.add(activity.employeeName);
        result.notFound++;
        continue;
      }

      // Normalize activity type
      let activityType = 'formazione';
      const typeStr = activity.activityType.toLowerCase();
      if (typeStr.includes('visita') || typeStr.includes('medica')) {
        activityType = 'visita_medica';
      } else if (typeStr.includes('cartella') || typeStr.includes('sanitaria')) {
        activityType = 'cartella_sanitaria';
      }

      activitiesToInsert.push({
        user_id: user.id,
        employee_id: employeeId,
        activity_type: activityType,
        activity_name: activity.activityName,
        execution_date: parseDate(activity.executionDate),
        expiry_date: parseDate(activity.expiryDate),
        notes: activity.notes || null,
        status: 'completed',
      });
    }

    if (notFoundEmployees.size > 0) {
      result.errors.push(`Dipendenti non trovati: ${Array.from(notFoundEmployees).slice(0, 5).join(', ')}${notFoundEmployees.size > 5 ? ` e altri ${notFoundEmployees.size - 5}` : ''}`);
    }

    // Insert in batches
    for (let i = 0; i < activitiesToInsert.length; i += batchSize) {
      const batch = activitiesToInsert.slice(i, i + batchSize);
      
      const { error } = await supabase
        .from('crm_employee_activities')
        .insert(batch);

      if (error) {
        result.failed += batch.length;
        result.errors.push(`Batch ${Math.floor(i/batchSize) + 1}: ${error.message}`);
      } else {
        result.success += batch.length;
      }

      setProgress(Math.min(100, Math.round(((i + batch.length) / activitiesToInsert.length) * 100)));
    }

    setResult(result);
    setImporting(false);

    if (result.success > 0) {
      toast({ title: `${result.success} attività importate con successo` });
      onImportComplete?.();
    }
  };

  const getActivityTypeLabel = (type: string) => {
    const t = type.toLowerCase();
    if (t.includes('visita') || t.includes('medica')) return 'Visita Medica';
    if (t.includes('cartella') || t.includes('sanitaria')) return 'Cartella Sanitaria';
    return 'Formazione';
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Upload className="h-4 w-4 mr-2" />
          Importa Attività
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Importa Attività Dipendenti da Excel
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Contact selector (if not provided) */}
          {!contactId && (
            <div className="space-y-2">
              <Label>Seleziona Azienda</Label>
              <Select value={selectedContactId} onValueChange={setSelectedContactId}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleziona un'azienda..." />
                </SelectTrigger>
                <SelectContent>
                  {contacts.map(c => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.company || c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* File upload */}
          <div className="border-2 border-dashed rounded-lg p-6 text-center">
            <input
              ref={inputRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFile}
              className="hidden"
              id="employee-activities-upload"
            />
            <label
              htmlFor="employee-activities-upload"
              className="cursor-pointer flex flex-col items-center gap-2"
            >
              {loading ? (
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              ) : (
                <FileSpreadsheet className="h-8 w-8 text-muted-foreground" />
              )}
              <span className="text-sm text-muted-foreground">
                {loading ? 'Elaborazione...' : 'Clicca o trascina un file Excel'}
              </span>
            </label>
          </div>

          {/* Format hint */}
          <div className="text-xs text-muted-foreground bg-muted/50 p-3 rounded-lg">
            <strong>Formato atteso:</strong> Il file deve contenere colonne come "Dipendente" o "Nome e Cognome", 
            "Tipo" (formazione/visita medica), "Attività" o "Corso", "Data Esecuzione", "Data Scadenza".
            I nomi dei dipendenti devono corrispondere a quelli già presenti nel sistema.
          </div>

          {/* Preview */}
          {parsedActivities.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">
                  Anteprima ({parsedActivities.length} attività)
                </h4>
                <Badge variant="secondary">
                  {parsedActivities.length} righe
                </Badge>
              </div>
              <div className="border rounded-lg max-h-[300px] overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Dipendente</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Attività</TableHead>
                      <TableHead>Esecuzione</TableHead>
                      <TableHead>Scadenza</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parsedActivities.slice(0, 10).map((activity, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="font-medium">{activity.employeeName}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {getActivityTypeLabel(activity.activityType)}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate">{activity.activityName}</TableCell>
                        <TableCell>{activity.executionDate || '-'}</TableCell>
                        <TableCell>{activity.expiryDate || '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {parsedActivities.length > 10 && (
                <p className="text-xs text-muted-foreground text-center">
                  ...e altre {parsedActivities.length - 10} righe
                </p>
              )}
            </div>
          )}

          {/* Progress */}
          {importing && (
            <div className="space-y-2">
              <Progress value={progress} />
              <p className="text-sm text-center text-muted-foreground">
                Importazione in corso... {progress}%
              </p>
            </div>
          )}

          {/* Result */}
          {result && (
            <div className="space-y-2">
              <div className="flex gap-4 justify-center">
                {result.success > 0 && (
                  <Badge variant="default" className="bg-green-500">
                    <Check className="h-3 w-3 mr-1" />
                    {result.success} importate
                  </Badge>
                )}
                {result.notFound > 0 && (
                  <Badge variant="secondary">
                    <AlertCircle className="h-3 w-3 mr-1" />
                    {result.notFound} dipendenti non trovati
                  </Badge>
                )}
                {result.failed > 0 && (
                  <Badge variant="destructive">
                    <AlertCircle className="h-3 w-3 mr-1" />
                    {result.failed} fallite
                  </Badge>
                )}
              </div>
              {result.errors.length > 0 && (
                <div className="text-xs text-destructive bg-destructive/10 p-2 rounded max-h-24 overflow-auto">
                  {result.errors.map((err, i) => (
                    <p key={i}>{err}</p>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Chiudi
            </Button>
            <Button 
              onClick={importActivities} 
              disabled={parsedActivities.length === 0 || importing || (!contactId && !selectedContactId)}
            >
              {importing ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Upload className="h-4 w-4 mr-2" />
              )}
              Importa {parsedActivities.length} Attività
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
