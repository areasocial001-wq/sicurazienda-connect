import { useState, useRef } from 'react';
import { Upload, FileSpreadsheet, Loader2, Check, AlertCircle, Building2, ListTodo, FileText } from 'lucide-react';
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
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface ParsedCompany {
  code: string;
  name: string;
  owner: string;
  vatNumber: string;
  rating: string;
  responsible: string;
}

interface ParsedActivity {
  type: string;
  name: string;
  workType: string;
  company: string;
  project: string;
  owner: string;
  assignee: string;
  status: string;
  priority: string;
  description: string;
  startDate: string;
  endDate: string;
  completionDate: string;
  actualTime: string;
  actualCost: string;
  isInvoiced: boolean;
  invoiceNumber: string;
  invoiceDate: string;
  invoicedHours: string;
}

interface ParsedContract {
  name: string;
  description: string;
  status: string;
  company: string;
  responsible: string;
  group: string;
  quoteAmount: string;
  startDate: string;
  endDate: string;
  contractDate: string;
  contractAmount: string;
  contractType: string;
  docDeliveryDate: string;
  contractExpiry: string;
  internalCost: string;
  externalCost: string;
}

interface ImportResult {
  success: number;
  failed: number;
  errors: string[];
}

export function CRMDataImport({ onImportComplete }: { onImportComplete?: () => void }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('companies');
  
  // Companies state
  const [parsedCompanies, setParsedCompanies] = useState<ParsedCompany[]>([]);
  const [companiesLoading, setCompaniesLoading] = useState(false);
  const [companiesImporting, setCompaniesImporting] = useState(false);
  const [companiesProgress, setCompaniesProgress] = useState(0);
  const [companiesResult, setCompaniesResult] = useState<ImportResult | null>(null);
  
  // Activities state
  const [parsedActivities, setParsedActivities] = useState<ParsedActivity[]>([]);
  const [activitiesLoading, setActivitiesLoading] = useState(false);
  const [activitiesImporting, setActivitiesImporting] = useState(false);
  const [activitiesProgress, setActivitiesProgress] = useState(0);
  const [activitiesResult, setActivitiesResult] = useState<ImportResult | null>(null);
  
  // Contracts state
  const [parsedContracts, setParsedContracts] = useState<ParsedContract[]>([]);
  const [contractsLoading, setContractsLoading] = useState(false);
  const [contractsImporting, setContractsImporting] = useState(false);
  const [contractsProgress, setContractsProgress] = useState(0);
  const [contractsResult, setContractsResult] = useState<ImportResult | null>(null);

  const companiesInputRef = useRef<HTMLInputElement>(null);
  const activitiesInputRef = useRef<HTMLInputElement>(null);
  const contractsInputRef = useRef<HTMLInputElement>(null);

  // Parse date helper
  const parseDate = (dateStr: string): string | null => {
    if (!dateStr) return null;
    // Try to parse various date formats
    const parts = dateStr.split(/[\/\- ]/);
    if (parts.length >= 3) {
      // DD/MM/YYYY format
      const day = parseInt(parts[0]);
      const month = parseInt(parts[1]) - 1;
      const year = parseInt(parts[2]);
      if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
        const date = new Date(year, month, day);
        if (!isNaN(date.getTime())) {
          return date.toISOString();
        }
      }
    }
    return null;
  };

  const parseNumber = (numStr: string): number | null => {
    if (!numStr) return null;
    const cleaned = numStr.toString().replace(/[^\d.,\-]/g, '').replace(',', '.');
    const num = parseFloat(cleaned);
    return isNaN(num) ? null : num;
  };

  // Handle Companies file upload
  const handleCompaniesFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCompaniesLoading(true);
    setCompaniesResult(null);

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];

      // Find header row (look for 'Azienda' or 'Codice')
      let headerRowIndex = 0;
      for (let i = 0; i < Math.min(10, jsonData.length); i++) {
        const row = jsonData[i];
        if (row && (row.includes('Azienda') || row.includes('Codice'))) {
          headerRowIndex = i;
          break;
        }
      }

      const headerRow = jsonData[headerRowIndex];
      if (!headerRow) throw new Error('Header row not found');

      // Map column indices
      const colMap: Record<string, number> = {};
      headerRow.forEach((header: string, index: number) => {
        const h = (header || '').toString().toLowerCase().trim();
        if (h.includes('codice')) colMap.code = index;
        if (h.includes('azienda')) colMap.name = index;
        if (h.includes('proprietario')) colMap.owner = index;
        if (h.includes('partita') || h.includes('iva')) colMap.vatNumber = index;
        if (h.includes('rating')) colMap.rating = index;
        if (h.includes('responsabile')) colMap.responsible = index;
      });

      // Parse data rows
      const companies: ParsedCompany[] = [];
      for (let i = headerRowIndex + 1; i < jsonData.length; i++) {
        const row = jsonData[i];
        if (!row || !row[colMap.name]) continue;

        companies.push({
          code: (row[colMap.code] || '').toString().trim(),
          name: (row[colMap.name] || '').toString().trim(),
          owner: (row[colMap.owner] || '').toString().trim(),
          vatNumber: (row[colMap.vatNumber] || '').toString().trim(),
          rating: (row[colMap.rating] || '').toString().trim(),
          responsible: (row[colMap.responsible] || '').toString().trim(),
        });
      }

      setParsedCompanies(companies);
      toast({ title: `${companies.length} aziende trovate nel file` });
    } catch (error: any) {
      toast({ title: 'Errore lettura file', description: error.message, variant: 'destructive' });
    } finally {
      setCompaniesLoading(false);
      if (companiesInputRef.current) companiesInputRef.current.value = '';
    }
  };

  // Handle Activities file upload
  const handleActivitiesFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setActivitiesLoading(true);
    setActivitiesResult(null);

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
        if (row && (row.includes('Nome') || row.includes('Tipo'))) {
          headerRowIndex = i;
          break;
        }
      }

      const headerRow = jsonData[headerRowIndex];
      if (!headerRow) throw new Error('Header row not found');

      // Map column indices
      const colMap: Record<string, number> = {};
      headerRow.forEach((header: string, index: number) => {
        const h = (header || '').toString().toLowerCase().trim();
        if (h === 'tipo') colMap.type = index;
        if (h === 'nome') colMap.name = index;
        if (h.includes('tipologia lavoro')) colMap.workType = index;
        if (h === 'azienda') colMap.company = index;
        if (h.includes('commessa') || h.includes('progetto')) colMap.project = index;
        if (h.includes('proprietario')) colMap.owner = index;
        if (h.includes('assegnatario')) colMap.assignee = index;
        if (h === 'stato') colMap.status = index;
        if (h.includes('priorit')) colMap.priority = index;
        if (h.includes('descrizione')) colMap.description = index;
        if (h === 'inizio') colMap.startDate = index;
        if (h === 'fine') colMap.endDate = index;
        if (h.includes('completamento')) colMap.completionDate = index;
        if (h.includes('tempo effettivo')) colMap.actualTime = index;
        if (h.includes('costo effettivo')) colMap.actualCost = index;
        if (h.includes('fatturata')) colMap.isInvoiced = index;
        if (h.includes('numero') && !h.includes('ore')) colMap.invoiceNumber = index;
        if (h === 'data' && colMap.invoiceDate === undefined) colMap.invoiceDate = index;
        if (h.includes('ore fatturate')) colMap.invoicedHours = index;
      });

      // Parse data rows
      const activities: ParsedActivity[] = [];
      for (let i = headerRowIndex + 1; i < jsonData.length; i++) {
        const row = jsonData[i];
        if (!row || !row[colMap.name]) continue;

        const invoicedVal = (row[colMap.isInvoiced] || '').toString().toLowerCase();
        
        activities.push({
          type: (row[colMap.type] || 'Attività').toString().trim(),
          name: (row[colMap.name] || '').toString().trim(),
          workType: (row[colMap.workType] || '').toString().trim(),
          company: (row[colMap.company] || '').toString().trim(),
          project: (row[colMap.project] || '').toString().trim(),
          owner: (row[colMap.owner] || '').toString().trim(),
          assignee: (row[colMap.assignee] || '').toString().trim(),
          status: (row[colMap.status] || '').toString().trim(),
          priority: (row[colMap.priority] || 'Medio').toString().trim(),
          description: (row[colMap.description] || '').toString().trim(),
          startDate: (row[colMap.startDate] || '').toString().trim(),
          endDate: (row[colMap.endDate] || '').toString().trim(),
          completionDate: (row[colMap.completionDate] || '').toString().trim(),
          actualTime: (row[colMap.actualTime] || '').toString().trim(),
          actualCost: (row[colMap.actualCost] || '').toString().trim(),
          isInvoiced: invoicedVal === 'si' || invoicedVal === 'sì' || invoicedVal === 'yes' || invoicedVal === 'true',
          invoiceNumber: (row[colMap.invoiceNumber] || '').toString().trim(),
          invoiceDate: (row[colMap.invoiceDate] || '').toString().trim(),
          invoicedHours: (row[colMap.invoicedHours] || '').toString().trim(),
        });
      }

      setParsedActivities(activities);
      toast({ title: `${activities.length} attività trovate nel file` });
    } catch (error: any) {
      toast({ title: 'Errore lettura file', description: error.message, variant: 'destructive' });
    } finally {
      setActivitiesLoading(false);
      if (activitiesInputRef.current) activitiesInputRef.current.value = '';
    }
  };

  // Handle Contracts file upload
  const handleContractsFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setContractsLoading(true);
    setContractsResult(null);

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
        if (row && (row.includes('Commessa') || row.includes('Descrizione'))) {
          headerRowIndex = i;
          break;
        }
      }

      const headerRow = jsonData[headerRowIndex];
      if (!headerRow) throw new Error('Header row not found');

      // Map column indices
      const colMap: Record<string, number> = {};
      headerRow.forEach((header: string, index: number) => {
        const h = (header || '').toString().toLowerCase().trim();
        if (h === 'commessa') colMap.name = index;
        if (h === 'descrizione') colMap.description = index;
        if (h === 'stato') colMap.status = index;
        if (h === 'azienda') colMap.company = index;
        if (h.includes('responsabile')) colMap.responsible = index;
        if (h.includes('gruppo')) colMap.group = index;
        if (h.includes('importo preventivo')) colMap.quoteAmount = index;
        if (h.includes('data inizio')) colMap.startDate = index;
        if (h.includes('data fine')) colMap.endDate = index;
        if (h.includes('stipula')) colMap.contractDate = index;
        if (h.includes('importo contratto')) colMap.contractAmount = index;
        if (h.includes('tipologia contratto')) colMap.contractType = index;
        if (h.includes('consegna')) colMap.docDeliveryDate = index;
        if (h.includes('scadenza')) colMap.contractExpiry = index;
        if (h.includes('costo interno')) colMap.internalCost = index;
        if (h.includes('costo esterno')) colMap.externalCost = index;
      });

      // Parse data rows
      const contracts: ParsedContract[] = [];
      for (let i = headerRowIndex + 1; i < jsonData.length; i++) {
        const row = jsonData[i];
        if (!row || (!row[colMap.name] && !row[colMap.company])) continue;

        contracts.push({
          name: (row[colMap.name] || '').toString().trim(),
          description: (row[colMap.description] || '').toString().trim(),
          status: (row[colMap.status] || 'In corso').toString().trim(),
          company: (row[colMap.company] || '').toString().trim(),
          responsible: (row[colMap.responsible] || '').toString().trim(),
          group: (row[colMap.group] || '').toString().trim(),
          quoteAmount: (row[colMap.quoteAmount] || '').toString().trim(),
          startDate: (row[colMap.startDate] || '').toString().trim(),
          endDate: (row[colMap.endDate] || '').toString().trim(),
          contractDate: (row[colMap.contractDate] || '').toString().trim(),
          contractAmount: (row[colMap.contractAmount] || '').toString().trim(),
          contractType: (row[colMap.contractType] || '').toString().trim(),
          docDeliveryDate: (row[colMap.docDeliveryDate] || '').toString().trim(),
          contractExpiry: (row[colMap.contractExpiry] || '').toString().trim(),
          internalCost: (row[colMap.internalCost] || '').toString().trim(),
          externalCost: (row[colMap.externalCost] || '').toString().trim(),
        });
      }

      setParsedContracts(contracts);
      toast({ title: `${contracts.length} commesse trovate nel file` });
    } catch (error: any) {
      toast({ title: 'Errore lettura file', description: error.message, variant: 'destructive' });
    } finally {
      setContractsLoading(false);
      if (contractsInputRef.current) contractsInputRef.current.value = '';
    }
  };

  // Import companies to CRM
  const importCompanies = async () => {
    if (!user || parsedCompanies.length === 0) return;

    setCompaniesImporting(true);
    setCompaniesProgress(0);

    const result: ImportResult = { success: 0, failed: 0, errors: [] };
    const batchSize = 50;

    for (let i = 0; i < parsedCompanies.length; i += batchSize) {
      const batch = parsedCompanies.slice(i, i + batchSize);
      
      const contacts = batch.map(company => ({
        user_id: user.id,
        name: company.name,
        company: company.name,
        code: company.code,
        vat_number: company.vatNumber || null,
        rating: company.rating || null,
        owner_name: company.owner || null,
        notes: company.responsible ? `Responsabile: ${company.responsible}` : null,
        status: 'client',
        source: 'Importazione gestionale',
      }));

      const { error } = await supabase
        .from('crm_contacts')
        .insert(contacts);

      if (error) {
        result.failed += batch.length;
        result.errors.push(`Batch ${Math.floor(i/batchSize) + 1}: ${error.message}`);
      } else {
        result.success += batch.length;
      }

      setCompaniesProgress(Math.min(100, Math.round(((i + batch.length) / parsedCompanies.length) * 100)));
    }

    setCompaniesResult(result);
    setCompaniesImporting(false);

    if (result.success > 0) {
      toast({ title: `${result.success} aziende importate con successo` });
      onImportComplete?.();
    }
  };

  // Import activities
  const importActivities = async () => {
    if (!user || parsedActivities.length === 0) return;

    setActivitiesImporting(true);
    setActivitiesProgress(0);

    // First, get all contacts to map company names to IDs
    const { data: contacts } = await supabase
      .from('crm_contacts')
      .select('id, name, company')
      .eq('user_id', user.id);

    const contactMap = new Map<string, string>();
    contacts?.forEach(c => {
      if (c.name) contactMap.set(c.name.toLowerCase(), c.id);
      if (c.company) contactMap.set(c.company.toLowerCase(), c.id);
    });

    const result: ImportResult = { success: 0, failed: 0, errors: [] };
    const batchSize = 50;

    for (let i = 0; i < parsedActivities.length; i += batchSize) {
      const batch = parsedActivities.slice(i, i + batchSize);
      
      const activities = batch.map(activity => {
        const contactId = contactMap.get(activity.company.toLowerCase()) || null;
        
        // Map status
        let status = 'not_started';
        const statusLower = activity.status.toLowerCase();
        if (statusLower.includes('corso') || statusLower.includes('progress')) status = 'in_progress';
        if (statusLower.includes('complet') || statusLower.includes('done')) status = 'completed';
        if (statusLower.includes('attesa') || statusLower.includes('wait')) status = 'waiting';
        if (statusLower.includes('rimand') || statusLower.includes('postponed')) status = 'postponed';

        return {
          user_id: user.id,
          contact_id: contactId,
          type: activity.type.toLowerCase().includes('evento') ? 'event' : 'task',
          name: activity.name,
          work_type: activity.workType || null,
          project_name: activity.project || null,
          owner_name: activity.owner || null,
          assignee: activity.assignee || null,
          status,
          priority: activity.priority.toLowerCase().includes('alt') ? 'high' : 
                   activity.priority.toLowerCase().includes('bass') ? 'low' : 'medium',
          description: activity.description || null,
          start_date: parseDate(activity.startDate),
          end_date: parseDate(activity.endDate),
          completion_date: parseDate(activity.completionDate),
          actual_time: parseNumber(activity.actualTime),
          actual_cost: parseNumber(activity.actualCost),
          is_invoiced: activity.isInvoiced,
          invoice_number: activity.invoiceNumber || null,
          invoice_date: activity.invoiceDate ? parseDate(activity.invoiceDate)?.split('T')[0] : null,
          invoiced_hours: parseNumber(activity.invoicedHours),
        };
      });

      const { error } = await supabase
        .from('crm_activities')
        .insert(activities);

      if (error) {
        result.failed += batch.length;
        result.errors.push(`Batch ${Math.floor(i/batchSize) + 1}: ${error.message}`);
      } else {
        result.success += batch.length;
      }

      setActivitiesProgress(Math.min(100, Math.round(((i + batch.length) / parsedActivities.length) * 100)));
    }

    setActivitiesResult(result);
    setActivitiesImporting(false);

    if (result.success > 0) {
      toast({ title: `${result.success} attività importate con successo` });
    }
  };

  // Import contracts
  const importContracts = async () => {
    if (!user || parsedContracts.length === 0) return;

    setContractsImporting(true);
    setContractsProgress(0);

    // First, get all contacts to map company names to IDs
    const { data: contacts } = await supabase
      .from('crm_contacts')
      .select('id, name, company')
      .eq('user_id', user.id);

    const contactMap = new Map<string, string>();
    contacts?.forEach(c => {
      if (c.name) contactMap.set(c.name.toLowerCase(), c.id);
      if (c.company) contactMap.set(c.company.toLowerCase(), c.id);
    });

    const result: ImportResult = { success: 0, failed: 0, errors: [] };
    const batchSize = 50;

    for (let i = 0; i < parsedContracts.length; i += batchSize) {
      const batch = parsedContracts.slice(i, i + batchSize);
      
      const contracts = batch.map(contract => {
        const contactId = contactMap.get(contract.company.toLowerCase()) || null;
        
        // Map status
        let status = 'active';
        const statusLower = contract.status.toLowerCase();
        if (statusLower.includes('complet') || statusLower.includes('chius')) status = 'completed';
        if (statusLower.includes('cancel') || statusLower.includes('annull')) status = 'cancelled';

        return {
          user_id: user.id,
          contact_id: contactId,
          name: contract.name || contract.description?.substring(0, 100) || 'Commessa senza nome',
          description: contract.description || null,
          status,
          responsible: contract.responsible || null,
          group_name: contract.group || null,
          quote_amount: parseNumber(contract.quoteAmount),
          contract_amount: parseNumber(contract.contractAmount),
          start_date: contract.startDate ? parseDate(contract.startDate)?.split('T')[0] : null,
          end_date: contract.endDate ? parseDate(contract.endDate)?.split('T')[0] : null,
          contract_date: contract.contractDate ? parseDate(contract.contractDate)?.split('T')[0] : null,
          contract_type: contract.contractType || null,
          documentation_delivery_date: contract.docDeliveryDate ? parseDate(contract.docDeliveryDate)?.split('T')[0] : null,
          contract_expiry_date: contract.contractExpiry ? parseDate(contract.contractExpiry)?.split('T')[0] : null,
          internal_cost: parseNumber(contract.internalCost),
          external_cost: parseNumber(contract.externalCost),
        };
      });

      const { error } = await supabase
        .from('crm_contracts')
        .insert(contracts);

      if (error) {
        result.failed += batch.length;
        result.errors.push(`Batch ${Math.floor(i/batchSize) + 1}: ${error.message}`);
      } else {
        result.success += batch.length;
      }

      setContractsProgress(Math.min(100, Math.round(((i + batch.length) / parsedContracts.length) * 100)));
    }

    setContractsResult(result);
    setContractsImporting(false);

    if (result.success > 0) {
      toast({ title: `${result.success} commesse importate con successo` });
    }
  };

  const resetAll = () => {
    setParsedCompanies([]);
    setParsedActivities([]);
    setParsedContracts([]);
    setCompaniesResult(null);
    setActivitiesResult(null);
    setContractsResult(null);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetAll(); }}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Upload className="h-4 w-4 mr-2" />
          Importa Dati
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Importazione Dati dal Gestionale
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="companies" className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Aziende
              {parsedCompanies.length > 0 && (
                <Badge variant="secondary" className="ml-1">{parsedCompanies.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="activities" className="flex items-center gap-2">
              <ListTodo className="h-4 w-4" />
              Attività
              {parsedActivities.length > 0 && (
                <Badge variant="secondary" className="ml-1">{parsedActivities.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="contracts" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Commesse
              {parsedContracts.length > 0 && (
                <Badge variant="secondary" className="ml-1">{parsedContracts.length}</Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* Companies Tab */}
          <TabsContent value="companies" className="space-y-4">
            <div className="flex items-center gap-4">
              <input
                ref={companiesInputRef}
                type="file"
                accept=".xlsx,.xls"
                onChange={handleCompaniesFile}
                className="hidden"
              />
              <Button
                variant="outline"
                onClick={() => companiesInputRef.current?.click()}
                disabled={companiesLoading || companiesImporting}
              >
                {companiesLoading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4 mr-2" />
                )}
                Carica elencoAziende.xlsx
              </Button>
              {parsedCompanies.length > 0 && (
                <Button onClick={importCompanies} disabled={companiesImporting}>
                  {companiesImporting ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Check className="h-4 w-4 mr-2" />
                  )}
                  Importa {parsedCompanies.length} aziende
                </Button>
              )}
            </div>

            {companiesImporting && (
              <div className="space-y-2">
                <Progress value={companiesProgress} />
                <p className="text-sm text-muted-foreground">Importazione in corso... {companiesProgress}%</p>
              </div>
            )}

            {companiesResult && (
              <div className={`p-4 rounded-lg ${companiesResult.failed > 0 ? 'bg-destructive/10' : 'bg-green-500/10'}`}>
                <div className="flex items-center gap-2">
                  {companiesResult.failed > 0 ? (
                    <AlertCircle className="h-5 w-5 text-destructive" />
                  ) : (
                    <Check className="h-5 w-5 text-green-500" />
                  )}
                  <span>
                    Importate: {companiesResult.success} | Fallite: {companiesResult.failed}
                  </span>
                </div>
                {companiesResult.errors.length > 0 && (
                  <ul className="mt-2 text-sm text-destructive">
                    {companiesResult.errors.map((err, i) => <li key={i}>{err}</li>)}
                  </ul>
                )}
              </div>
            )}

            {parsedCompanies.length > 0 && (
              <ScrollArea className="h-[300px] border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Codice</TableHead>
                      <TableHead>Azienda</TableHead>
                      <TableHead>Partita IVA</TableHead>
                      <TableHead>Proprietario</TableHead>
                      <TableHead>Responsabile</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parsedCompanies.slice(0, 100).map((c, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-mono text-sm">{c.code}</TableCell>
                        <TableCell className="font-medium">{c.name}</TableCell>
                        <TableCell>{c.vatNumber}</TableCell>
                        <TableCell>{c.owner}</TableCell>
                        <TableCell>{c.responsible}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {parsedCompanies.length > 100 && (
                  <p className="p-2 text-center text-sm text-muted-foreground">
                    Mostrate 100 di {parsedCompanies.length} aziende
                  </p>
                )}
              </ScrollArea>
            )}
          </TabsContent>

          {/* Activities Tab */}
          <TabsContent value="activities" className="space-y-4">
            <div className="flex items-center gap-4">
              <input
                ref={activitiesInputRef}
                type="file"
                accept=".xlsx,.xls"
                onChange={handleActivitiesFile}
                className="hidden"
              />
              <Button
                variant="outline"
                onClick={() => activitiesInputRef.current?.click()}
                disabled={activitiesLoading || activitiesImporting}
              >
                {activitiesLoading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4 mr-2" />
                )}
                Carica elencoAttivita.xlsx
              </Button>
              {parsedActivities.length > 0 && (
                <Button onClick={importActivities} disabled={activitiesImporting}>
                  {activitiesImporting ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Check className="h-4 w-4 mr-2" />
                  )}
                  Importa {parsedActivities.length} attività
                </Button>
              )}
            </div>

            {activitiesImporting && (
              <div className="space-y-2">
                <Progress value={activitiesProgress} />
                <p className="text-sm text-muted-foreground">Importazione in corso... {activitiesProgress}%</p>
              </div>
            )}

            {activitiesResult && (
              <div className={`p-4 rounded-lg ${activitiesResult.failed > 0 ? 'bg-destructive/10' : 'bg-green-500/10'}`}>
                <div className="flex items-center gap-2">
                  {activitiesResult.failed > 0 ? (
                    <AlertCircle className="h-5 w-5 text-destructive" />
                  ) : (
                    <Check className="h-5 w-5 text-green-500" />
                  )}
                  <span>
                    Importate: {activitiesResult.success} | Fallite: {activitiesResult.failed}
                  </span>
                </div>
              </div>
            )}

            {parsedActivities.length > 0 && (
              <ScrollArea className="h-[300px] border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Nome</TableHead>
                      <TableHead>Azienda</TableHead>
                      <TableHead>Stato</TableHead>
                      <TableHead>Assegnatario</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parsedActivities.slice(0, 100).map((a, i) => (
                      <TableRow key={i}>
                        <TableCell>{a.type}</TableCell>
                        <TableCell className="font-medium max-w-[200px] truncate">{a.name}</TableCell>
                        <TableCell className="max-w-[150px] truncate">{a.company}</TableCell>
                        <TableCell>{a.status}</TableCell>
                        <TableCell>{a.assignee}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {parsedActivities.length > 100 && (
                  <p className="p-2 text-center text-sm text-muted-foreground">
                    Mostrate 100 di {parsedActivities.length} attività
                  </p>
                )}
              </ScrollArea>
            )}
          </TabsContent>

          {/* Contracts Tab */}
          <TabsContent value="contracts" className="space-y-4">
            <div className="flex items-center gap-4">
              <input
                ref={contractsInputRef}
                type="file"
                accept=".xlsx,.xls"
                onChange={handleContractsFile}
                className="hidden"
              />
              <Button
                variant="outline"
                onClick={() => contractsInputRef.current?.click()}
                disabled={contractsLoading || contractsImporting}
              >
                {contractsLoading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4 mr-2" />
                )}
                Carica elencoCommesse.xlsx
              </Button>
              {parsedContracts.length > 0 && (
                <Button onClick={importContracts} disabled={contractsImporting}>
                  {contractsImporting ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Check className="h-4 w-4 mr-2" />
                  )}
                  Importa {parsedContracts.length} commesse
                </Button>
              )}
            </div>

            {contractsImporting && (
              <div className="space-y-2">
                <Progress value={contractsProgress} />
                <p className="text-sm text-muted-foreground">Importazione in corso... {contractsProgress}%</p>
              </div>
            )}

            {contractsResult && (
              <div className={`p-4 rounded-lg ${contractsResult.failed > 0 ? 'bg-destructive/10' : 'bg-green-500/10'}`}>
                <div className="flex items-center gap-2">
                  {contractsResult.failed > 0 ? (
                    <AlertCircle className="h-5 w-5 text-destructive" />
                  ) : (
                    <Check className="h-5 w-5 text-green-500" />
                  )}
                  <span>
                    Importate: {contractsResult.success} | Fallite: {contractsResult.failed}
                  </span>
                </div>
              </div>
            )}

            {parsedContracts.length > 0 && (
              <ScrollArea className="h-[300px] border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Commessa</TableHead>
                      <TableHead>Azienda</TableHead>
                      <TableHead>Stato</TableHead>
                      <TableHead>Importo</TableHead>
                      <TableHead>Responsabile</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parsedContracts.slice(0, 100).map((c, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-medium max-w-[150px] truncate">{c.name}</TableCell>
                        <TableCell className="max-w-[150px] truncate">{c.company}</TableCell>
                        <TableCell>{c.status}</TableCell>
                        <TableCell>{c.contractAmount ? `€${c.contractAmount}` : '-'}</TableCell>
                        <TableCell>{c.responsible}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {parsedContracts.length > 100 && (
                  <p className="p-2 text-center text-sm text-muted-foreground">
                    Mostrate 100 di {parsedContracts.length} commesse
                  </p>
                )}
              </ScrollArea>
            )}
          </TabsContent>
        </Tabs>

        <div className="pt-4 border-t text-sm text-muted-foreground">
          <p><strong>Istruzioni:</strong></p>
          <ol className="list-decimal ml-4 space-y-1">
            <li>Importa prima le <strong>Aziende</strong> per creare le anagrafiche</li>
            <li>Poi importa <strong>Attività</strong> e <strong>Commesse</strong> che verranno collegate automaticamente</li>
            <li>I file devono essere in formato Excel (.xlsx)</li>
          </ol>
        </div>
      </DialogContent>
    </Dialog>
  );
}
