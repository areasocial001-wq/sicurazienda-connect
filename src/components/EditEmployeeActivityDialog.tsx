import { useState, useEffect } from 'react';
import { Pencil, Loader2 } from 'lucide-react';
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
import { supabase } from '@/integrations/supabase/client';

interface EditEmployeeActivityDialogProps {
  activityId: string;
  activityName: string;
  activityType: string;
  onActivityUpdated: () => void;
}

const activityTypes = [
  { value: 'formazione', label: 'Formazione' },
  { value: 'visita_medica', label: 'Visita Medica' },
  { value: 'cartella_sanitaria', label: 'Cartella Sanitaria' },
];

export function EditEmployeeActivityDialog({ 
  activityId,
  activityName: initialName,
  activityType: initialType,
  onActivityUpdated 
}: EditEmployeeActivityDialogProps) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activityName, setActivityName] = useState(initialName);
  const [activityType, setActivityType] = useState(initialType);

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setActivityName(initialName);
      setActivityType(initialType);
    }
  }, [open, initialName, initialType]);

  const handleSave = async () => {
    if (!activityName.trim()) {
      toast.error('Inserisci il nome dell\'attività');
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('crm_employee_activities')
        .update({
          activity_name: activityName.trim(),
          activity_type: activityType,
        })
        .eq('id', activityId);

      if (error) throw error;

      toast.success('Attività aggiornata');
      setOpen(false);
      onActivityUpdated();
    } catch (error) {
      console.error('Error updating activity:', error);
      toast.error('Errore durante il salvataggio');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-6 w-6 text-muted-foreground hover:text-primary flex-shrink-0"
          onClick={(e) => e.stopPropagation()}
        >
          <Pencil className="h-3 w-3" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md" onClick={(e) => e.stopPropagation()}>
        <DialogHeader>
          <DialogTitle>Modifica Attività</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="activityName">Nome Attività *</Label>
            <Input
              id="activityName"
              value={activityName}
              onChange={(e) => setActivityName(e.target.value)}
              placeholder="Es: Corso sicurezza sul lavoro"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="activityType">Tipo Attività</Label>
            <Select 
              value={activityType} 
              onValueChange={setActivityType}
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
