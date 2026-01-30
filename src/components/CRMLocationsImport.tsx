import { useState, useCallback } from 'react';
import { Upload, FileSpreadsheet, Loader2, CheckCircle, AlertCircle, MapPin } from 'lucide-react';
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
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface LocationData {
  company: string;
  locationName: string;
  code: string;
  address: string;
  city: string;
  province: string;
  phone: string;
  pec: string;
  email: string;
}

interface EmployeeData {
  lastName: string;
  firstName: string;
  activityType: string;
  activityName: string;
  status: string;
  executionDate: string;
  expiryDate: string;
}

interface ParsedFile {
  fileName: string;
  location: LocationData;
  employees: Map<string, EmployeeData[]>; // key: "lastName|firstName"
}

interface ImportResult {
  fileName: string;
  success: boolean;
  error?: string;
  locationsCreated: number;
  employeesCreated: number;
  activitiesCreated: number;
}

interface CRMLocationsImportProps {
  onImportComplete?: () => void;
}

export function CRMLocationsImport({ onImportComplete }: CRMLocationsImportProps) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<ImportResult[]>([]);
  const [currentFile, setCurrentFile] = useState('');

  const parseExcelDate = (value: any): string | null => {
    if (!value) return null;
    
    // If it's already a string in dd/mm/yyyy format
    if (typeof value === 'string') {
      const parts = value.split('/');
      if (parts.length === 3) {
        const [day, month, year] = parts;
        return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      }
      return null;
    }
    
    // If it's an Excel serial date number
    if (typeof value === 'number') {
      const date = new Date((value - 25569) * 86400 * 1000);
      return date.toISOString().split('T')[0];
    }
    
    return null;
  };

  const parseFile = async (file: File): Promise<ParsedFile | null> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

          // Skip header rows and find data
          let locationData: LocationData | null = null;
          const employeesMap = new Map<string, EmployeeData[]>();

          for (let i = 2; i < jsonData.length; i++) {
            const row = jsonData[i];
            if (!row || row.length === 0) continue;

            // First data row contains location info
            if (!locationData && row[0]) {
              locationData = {
                company: String(row[0] || '').trim(),
                locationName: String(row[1] || '').trim(),
                code: String(row[2] || '').trim(),
                address: String(row[5] || '').trim(),
                city: String(row[6] || '').trim(),
                province: String(row[7] || '').trim(),
                phone: String(row[8] || '').trim(),
                pec: String(row[9] || '').replace('\\@', '@').trim(),
                email: String(row[10] || '').replace('\\@', '@').trim(),
              };
            }

            // Employee data is in columns 11-17
            const lastName = String(row[11] || '').trim();
            const firstName = String(row[12] || '').trim();
            if (lastName && firstName) {
              const key = `${lastName}|${firstName}`;
              const activity: EmployeeData = {
                lastName,
                firstName,
                activityType: String(row[13] || '').trim().toLowerCase(),
                activityName: String(row[14] || '').trim(),
                status: String(row[15] || '').trim().toLowerCase(),
                executionDate: parseExcelDate(row[16]) || '',
                expiryDate: parseExcelDate(row[17]) || '',
              };

              if (!employeesMap.has(key)) {
                employeesMap.set(key, []);
              }
              employeesMap.get(key)!.push(activity);
            }
          }

          if (locationData) {
            resolve({
              fileName: file.name,
              location: locationData,
              employees: employeesMap,
            });
          } else {
            resolve(null);
          }
        } catch (error) {
          console.error('Error parsing file:', file.name, error);
          resolve(null);
        }
      };
      reader.readAsArrayBuffer(file);
    });
  };

  const findOrCreateContact = async (companyName: string): Promise<string | null> => {
    if (!user || !companyName) return null;

    // Try to find existing contact by company name
    const { data: existing } = await supabase
      .from('crm_contacts')
      .select('id')
      .eq('user_id', user.id)
      .or(`name.ilike.%${companyName}%,company.ilike.%${companyName}%`)
      .limit(1)
      .single();

    if (existing) {
      return existing.id;
    }

    // Create new contact
    const { data: newContact, error } = await supabase
      .from('crm_contacts')
      .insert({
        user_id: user.id,
        name: companyName,
        company: companyName,
        status: 'client',
      })
      .select('id')
      .single();

    if (error) {
      console.error('Error creating contact:', error);
      return null;
    }

    return newContact?.id || null;
  };

  const importFile = async (parsedFile: ParsedFile): Promise<ImportResult> => {
    const result: ImportResult = {
      fileName: parsedFile.fileName,
      success: false,
      locationsCreated: 0,
      employeesCreated: 0,
      activitiesCreated: 0,
    };

    try {
      if (!user) throw new Error('Utente non autenticato');

      // Find or create contact
      const contactId = await findOrCreateContact(parsedFile.location.company);

      // Create location
      const { data: location, error: locationError } = await supabase
        .from('crm_locations')
        .insert({
          user_id: user.id,
          contact_id: contactId,
          name: parsedFile.location.locationName || parsedFile.location.company,
          code: parsedFile.location.code || null,
          address: parsedFile.location.address || null,
          city: parsedFile.location.city || null,
          province: parsedFile.location.province || null,
          phone: parsedFile.location.phone || null,
          pec: parsedFile.location.pec || null,
          email: parsedFile.location.email || null,
        })
        .select('id')
        .single();

      if (locationError) throw locationError;
      result.locationsCreated = 1;

      // Create employees and their activities
      for (const [key, activities] of parsedFile.employees) {
        const [lastName, firstName] = key.split('|');

        const { data: employee, error: employeeError } = await supabase
          .from('crm_employees')
          .insert({
            user_id: user.id,
            location_id: location.id,
            contact_id: contactId,
            first_name: firstName,
            last_name: lastName,
            status: 'active',
          })
          .select('id')
          .single();

        if (employeeError) {
          console.error('Error creating employee:', employeeError);
          continue;
        }
        result.employeesCreated++;

        // Create activities for this employee
        const activityInserts = activities
          .filter(a => a.activityName)
          .map(a => ({
            user_id: user.id,
            employee_id: employee.id,
            activity_type: a.activityType || 'formazione',
            activity_name: a.activityName,
            status: a.status === 'eseguita' ? 'completed' : 'scheduled',
            execution_date: a.executionDate || null,
            expiry_date: a.expiryDate || null,
          }));

        if (activityInserts.length > 0) {
          const { error: activitiesError } = await supabase
            .from('crm_employee_activities')
            .insert(activityInserts);

          if (!activitiesError) {
            result.activitiesCreated += activityInserts.length;
          }
        }
      }

      result.success = true;
    } catch (error: any) {
      result.error = error.message;
    }

    return result;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(Array.from(e.target.files));
      setResults([]);
    }
  };

  const handleImport = async () => {
    if (!user || files.length === 0) return;

    setImporting(true);
    setProgress(0);
    setResults([]);

    const importResults: ImportResult[] = [];
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      setCurrentFile(file.name);
      setProgress(Math.round((i / files.length) * 100));

      const parsed = await parseFile(file);
      if (parsed) {
        const result = await importFile(parsed);
        importResults.push(result);
      } else {
        importResults.push({
          fileName: file.name,
          success: false,
          error: 'Impossibile leggere il file',
          locationsCreated: 0,
          employeesCreated: 0,
          activitiesCreated: 0,
        });
      }
    }

    setResults(importResults);
    setProgress(100);
    setImporting(false);
    setCurrentFile('');

    const successCount = importResults.filter(r => r.success).length;
    const totalLocations = importResults.reduce((sum, r) => sum + r.locationsCreated, 0);
    const totalEmployees = importResults.reduce((sum, r) => sum + r.employeesCreated, 0);
    const totalActivities = importResults.reduce((sum, r) => sum + r.activitiesCreated, 0);

    toast.success(
      `Importazione completata: ${successCount}/${files.length} file. ` +
      `${totalLocations} sedi, ${totalEmployees} dipendenti, ${totalActivities} attività.`
    );

    if (onImportComplete) {
      onImportComplete();
    }
  };

  const successCount = results.filter(r => r.success).length;
  const errorCount = results.filter(r => !r.success).length;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <MapPin className="h-4 w-4 mr-2" />
          Importa Sedi
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Importa Sedi da Excel
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
          {/* File Selection */}
          <div className="border-2 border-dashed rounded-lg p-6 text-center">
            <input
              type="file"
              accept=".xlsx,.xls"
              multiple
              onChange={handleFileChange}
              className="hidden"
              id="locations-file-input"
              disabled={importing}
            />
            <label
              htmlFor="locations-file-input"
              className="cursor-pointer flex flex-col items-center gap-2"
            >
              <Upload className="h-8 w-8 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                {files.length > 0 
                  ? `${files.length} file selezionati` 
                  : 'Clicca per selezionare i file Excel delle sedi'}
              </span>
              <span className="text-xs text-muted-foreground">
                Puoi selezionare più file contemporaneamente
              </span>
            </label>
          </div>

          {/* Progress */}
          {importing && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm">Importazione in corso...</span>
              </div>
              <Progress value={progress} />
              <p className="text-xs text-muted-foreground truncate">
                {currentFile}
              </p>
            </div>
          )}

          {/* Results */}
          {results.length > 0 && (
            <div className="flex-1 overflow-hidden flex flex-col">
              <div className="flex items-center gap-4 mb-2">
                {successCount > 0 && (
                  <Badge variant="secondary" className="bg-green-500/20 text-green-700">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    {successCount} riusciti
                  </Badge>
                )}
                {errorCount > 0 && (
                  <Badge variant="secondary" className="bg-red-500/20 text-red-700">
                    <AlertCircle className="h-3 w-3 mr-1" />
                    {errorCount} errori
                  </Badge>
                )}
              </div>
              <ScrollArea className="flex-1 max-h-[300px]">
                <div className="space-y-1 pr-4">
                  {results.map((r, i) => (
                    <div 
                      key={i} 
                      className={`text-xs p-2 rounded flex items-center justify-between ${
                        r.success ? 'bg-green-500/10' : 'bg-red-500/10'
                      }`}
                    >
                      <span className="truncate flex-1 mr-2">{r.fileName}</span>
                      {r.success ? (
                        <span className="text-green-700 whitespace-nowrap">
                          {r.employeesCreated} dip, {r.activitiesCreated} att
                        </span>
                      ) : (
                        <span className="text-red-700 whitespace-nowrap">{r.error}</span>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 justify-end pt-2">
            <Button
              variant="outline"
              onClick={() => {
                setOpen(false);
                setFiles([]);
                setResults([]);
              }}
            >
              Chiudi
            </Button>
            <Button
              onClick={handleImport}
              disabled={files.length === 0 || importing}
            >
              {importing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Importazione...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Importa {files.length} file
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
