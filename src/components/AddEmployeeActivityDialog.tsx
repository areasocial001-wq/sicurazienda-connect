import { useState } from 'react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { Plus, Loader2, CalendarIcon } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';

interface AddEmployeeActivityDialogProps {
  employeeId: string;
  employeeName: string;
  onActivityAdded: () => void;
}

const activityTypes = [
  { value: 'formazione', label: 'Formazione' },
  { value: 'visita', label: 'Visita Medica' },
  { value: 'cartella_sanitaria', label: 'Cartella Sanitaria' },
];

export function AddEmployeeActivityDialog({ 
  employeeId, 
  employeeName, 
  onActivityAdded 
}: AddEmployeeActivityDialogProps) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    activityType: 'formazione',
    activityName: '',
    status: 'scheduled',
    executionDate: undefined as Date | undefined,
    expiryDate: undefined as Date | undefined,
  });

  const handleSave = async () => {
    if (!user || !formData.activityName.trim()) {
      toast.error('Inserisci il nome dell\'attività');
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('crm_employee_activities')
        .insert({
          user_id: user.id,
          employee_id: employeeId,
          activity_type: formData.activityType,
          activity_name: formData.activityName.trim(),
          status: formData.status,
          execution_date: formData.executionDate 
            ? format(formData.executionDate, 'yyyy-MM-dd') 
            : null,
          expiry_date: formData.expiryDate 
            ? format(formData.expiryDate, 'yyyy-MM-dd') 
            : null,
        });

      if (error) throw error;

      toast.success('Attività aggiunta con successo');
      setOpen(false);
      setFormData({
        activityType: 'formazione',
        activityName: '',
        status: 'scheduled',
        executionDate: undefined,
        expiryDate: undefined,
      });
      onActivityAdded();
    } catch (error) {
      console.error('Error adding activity:', error);
      toast.error('Errore durante il salvataggio');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="h-6 px-2 text-xs gap-1">
          <Plus className="h-3 w-3" />
          Aggiungi
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nuova Attività per {employeeName}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="activityType">Tipo Attività</Label>
            <Select 
              value={formData.activityType} 
              onValueChange={(value) => setFormData(prev => ({ ...prev, activityType: value }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {activityTypes.map(type => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="activityName">Nome Attività *</Label>
            <Input
              id="activityName"
              value={formData.activityName}
              onChange={(e) => setFormData(prev => ({ ...prev, activityName: e.target.value }))}
              placeholder="Es: Corso sicurezza sul lavoro"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">Stato</Label>
            <Select 
              value={formData.status} 
              onValueChange={(value) => setFormData(prev => ({ ...prev, status: value }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="scheduled">Programmata</SelectItem>
                <SelectItem value="completed">Completata</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Data Esecuzione</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !formData.executionDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.executionDate 
                      ? format(formData.executionDate, 'dd/MM/yyyy')
                      : 'Seleziona'
                    }
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={formData.executionDate}
                    onSelect={(date) => setFormData(prev => ({ ...prev, executionDate: date }))}
                    initialFocus
                    locale={it}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>Data Scadenza</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !formData.expiryDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.expiryDate 
                      ? format(formData.expiryDate, 'dd/MM/yyyy')
                      : 'Seleziona'
                    }
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={formData.expiryDate}
                    onSelect={(date) => setFormData(prev => ({ ...prev, expiryDate: date }))}
                    initialFocus
                    locale={it}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Annulla
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Salvataggio...
              </>
            ) : (
              'Salva'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
