import { useState } from 'react';
import { format } from 'date-fns';
import { Download, Loader2 } from 'lucide-react';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { supabase } from '@/integrations/supabase/client';

interface Employee {
  id: string;
  first_name: string;
  last_name: string;
}

interface EmployeeActivity {
  id: string;
  employee_id: string;
  activity_type: string;
  activity_name: string;
  status: string;
  execution_date?: string;
  expiry_date?: string;
}

interface ExportLocationActivitiesProps {
  locationId: string;
  locationName: string;
  employees: Employee[];
  activities: EmployeeActivity[];
}

const activityTypeLabels: Record<string, string> = {
  formazione: 'Formazione',
  visita: 'Visita Medica',
  visita_medica: 'Visita Medica',
  cartella_sanitaria: 'Cartella Sanitaria',
};

export function ExportLocationActivities({ 
  locationId, 
  locationName, 
  employees, 
  activities 
}: ExportLocationActivitiesProps) {
  const [exporting, setExporting] = useState(false);

  const prepareExportData = () => {
    const data: any[] = [];
    
    // Filter employees for this location
    const locationEmployees = employees.filter(e => 
      activities.some(a => a.employee_id === e.id)
    );

    locationEmployees.forEach(employee => {
      const empActivities = activities.filter(a => a.employee_id === employee.id);
      
      empActivities.forEach(activity => {
        data.push({
          'Cognome': employee.last_name,
          'Nome': employee.first_name,
          'Tipo Attività': activityTypeLabels[activity.activity_type] || activity.activity_type,
          'Nome Attività': activity.activity_name,
          'Stato': activity.status === 'completed' ? 'Completata' : 'Programmata',
          'Data Esecuzione': activity.execution_date 
            ? format(new Date(activity.execution_date), 'dd/MM/yyyy')
            : '',
          'Data Scadenza': activity.expiry_date
            ? format(new Date(activity.expiry_date), 'dd/MM/yyyy')
            : '',
        });
      });
    });

    return data;
  };

  const exportToExcel = async () => {
    setExporting(true);
    try {
      const data = prepareExportData();
      
      if (data.length === 0) {
        toast.error('Nessuna attività da esportare');
        return;
      }

      const worksheet = XLSX.utils.json_to_sheet(data);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Attività');

      // Auto-size columns
      const colWidths = Object.keys(data[0]).map(key => ({
        wch: Math.max(
          key.length,
          ...data.map(row => (row[key]?.toString() || '').length)
        ) + 2
      }));
      worksheet['!cols'] = colWidths;

      // Generate filename
      const sanitizedName = locationName
        .replace(/[^a-zA-Z0-9àèéìòù\s]/g, '')
        .replace(/\s+/g, '_')
        .substring(0, 50);
      const filename = `Attività_${sanitizedName}_${format(new Date(), 'yyyy-MM-dd')}.xlsx`;

      XLSX.writeFile(workbook, filename);
      toast.success(`Esportati ${data.length} record in Excel`);
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Errore durante l\'esportazione');
    } finally {
      setExporting(false);
    }
  };

  const exportToCSV = async () => {
    setExporting(true);
    try {
      const data = prepareExportData();
      
      if (data.length === 0) {
        toast.error('Nessuna attività da esportare');
        return;
      }

      const worksheet = XLSX.utils.json_to_sheet(data);
      const csvContent = XLSX.utils.sheet_to_csv(worksheet, { FS: ';' });

      // Create download
      const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      
      const sanitizedName = locationName
        .replace(/[^a-zA-Z0-9àèéìòù\s]/g, '')
        .replace(/\s+/g, '_')
        .substring(0, 50);
      link.href = url;
      link.download = `Attività_${sanitizedName}_${format(new Date(), 'yyyy-MM-dd')}.csv`;
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success(`Esportati ${data.length} record in CSV`);
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Errore durante l\'esportazione');
    } finally {
      setExporting(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="outline" 
          size="sm" 
          className="gap-1 text-xs h-8"
          disabled={exporting}
        >
          {exporting ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <Download className="h-3 w-3" />
          )}
          Esporta
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={exportToExcel}>
          <Download className="h-4 w-4 mr-2" />
          Esporta Excel (.xlsx)
        </DropdownMenuItem>
        <DropdownMenuItem onClick={exportToCSV}>
          <Download className="h-4 w-4 mr-2" />
          Esporta CSV (.csv)
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
