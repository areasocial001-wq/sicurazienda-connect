import { useState, useEffect } from 'react';
import { Pencil, Loader2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Activity {
  id: string;
  name: string;
  type: string;
  status: string;
  priority?: string;
  start_date?: string;
  end_date?: string;
  assignee?: string;
  description?: string;
  work_type?: string;
  project_name?: string;
  owner_name?: string;
  completion_date?: string;
  actual_time?: number;
  actual_cost?: number;
  is_invoiced?: boolean;
  invoice_number?: string;
  invoice_date?: string;
  invoiced_hours?: number;
  billing_notes?: string;
}

interface EditActivityDialogProps {
  activity: Activity;
  onActivityUpdated: () => void;
  onActivityDeleted: () => void;
}

export function EditActivityDialog({ activity, onActivityUpdated, onActivityDeleted }: EditActivityDialogProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    type: 'task',
    status: 'not_started',
    priority: 'medium',
    description: '',
    assignee: '',
    owner_name: '',
    work_type: '',
    project_name: '',
    start_date: '',
    end_date: '',
    completion_date: '',
    actual_time: '',
    actual_cost: '',
    is_invoiced: false,
    invoice_number: '',
    invoice_date: '',
    invoiced_hours: '',
    billing_notes: '',
  });

  useEffect(() => {
    if (open) {
      setFormData({
        name: activity.name || '',
        type: activity.type || 'task',
        status: activity.status || 'not_started',
        priority: activity.priority || 'medium',
        description: activity.description || '',
        assignee: activity.assignee || '',
        owner_name: activity.owner_name || '',
        work_type: activity.work_type || '',
        project_name: activity.project_name || '',
        start_date: activity.start_date ? activity.start_date.split('T')[0] : '',
        end_date: activity.end_date ? activity.end_date.split('T')[0] : '',
        completion_date: activity.completion_date ? activity.completion_date.split('T')[0] : '',
        actual_time: activity.actual_time?.toString() || '',
        actual_cost: activity.actual_cost?.toString() || '',
        is_invoiced: activity.is_invoiced || false,
        invoice_number: activity.invoice_number || '',
        invoice_date: activity.invoice_date || '',
        invoiced_hours: activity.invoiced_hours?.toString() || '',
        billing_notes: activity.billing_notes || '',
      });
    }
  }, [open, activity]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('crm_activities')
        .update({
          name: formData.name.trim(),
          type: formData.type,
          status: formData.status,
          priority: formData.priority,
          description: formData.description.trim() || null,
          assignee: formData.assignee.trim() || null,
          owner_name: formData.owner_name.trim() || null,
          work_type: formData.work_type.trim() || null,
          project_name: formData.project_name.trim() || null,
          start_date: formData.start_date || null,
          end_date: formData.end_date || null,
          completion_date: formData.completion_date || null,
          actual_time: formData.actual_time ? parseFloat(formData.actual_time) : null,
          actual_cost: formData.actual_cost ? parseFloat(formData.actual_cost) : null,
          is_invoiced: formData.is_invoiced,
          invoice_number: formData.invoice_number.trim() || null,
          invoice_date: formData.invoice_date || null,
          invoiced_hours: formData.invoiced_hours ? parseFloat(formData.invoiced_hours) : null,
          billing_notes: formData.billing_notes.trim() || null,
        })
        .eq('id', activity.id);

      if (error) throw error;

      toast({ title: 'Attività aggiornata' });
      setOpen(false);
      onActivityUpdated();
    } catch (error: any) {
      toast({ title: 'Errore', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const { error } = await supabase
        .from('crm_activities')
        .delete()
        .eq('id', activity.id);

      if (error) throw error;

      toast({ title: 'Attività eliminata' });
      setOpen(false);
      onActivityDeleted();
    } catch (error: any) {
      toast({ title: 'Errore', description: error.message, variant: 'destructive' });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <Pencil className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Modifica Attività</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Nome attività"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="type">Tipo</Label>
              <Select value={formData.type} onValueChange={(v) => setFormData({ ...formData, type: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="task">Attività</SelectItem>
                  <SelectItem value="event">Evento</SelectItem>
                  <SelectItem value="call">Chiamata</SelectItem>
                  <SelectItem value="meeting">Riunione</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="work_type">Tipologia Lavoro</Label>
              <Input
                id="work_type"
                value={formData.work_type}
                onChange={(e) => setFormData({ ...formData, work_type: e.target.value })}
                placeholder="es. Gestione Corsi"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="project_name">Commessa/Progetto</Label>
              <Input
                id="project_name"
                value={formData.project_name}
                onChange={(e) => setFormData({ ...formData, project_name: e.target.value })}
                placeholder="Nome commessa associata"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="owner_name">Proprietario</Label>
              <Input
                id="owner_name"
                value={formData.owner_name}
                onChange={(e) => setFormData({ ...formData, owner_name: e.target.value })}
                placeholder="Nome proprietario"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="assignee">Assegnatario</Label>
              <Input
                id="assignee"
                value={formData.assignee}
                onChange={(e) => setFormData({ ...formData, assignee: e.target.value })}
                placeholder="Nome assegnatario"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Stato</Label>
              <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="not_started">Non Iniziato</SelectItem>
                  <SelectItem value="in_progress">In corso</SelectItem>
                  <SelectItem value="waiting_input">In attesa di Input</SelectItem>
                  <SelectItem value="postponed">Rimandato</SelectItem>
                  <SelectItem value="completed">Completata</SelectItem>
                  <SelectItem value="cancelled">Annullata</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="priority">Priorità</Label>
              <Select value={formData.priority} onValueChange={(v) => setFormData({ ...formData, priority: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Bassa</SelectItem>
                  <SelectItem value="medium">Medio</SelectItem>
                  <SelectItem value="high">Alta</SelectItem>
                  <SelectItem value="urgent">Urgente</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrizione</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Descrizione dell'attività"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start_date">Inizio</Label>
              <Input
                id="start_date"
                type="date"
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="end_date">Fine</Label>
              <Input
                id="end_date"
                type="date"
                value={formData.end_date}
                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="completion_date">Data Completamento</Label>
              <Input
                id="completion_date"
                type="date"
                value={formData.completion_date}
                onChange={(e) => setFormData({ ...formData, completion_date: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="actual_time">Tempo Effettivo (ore)</Label>
              <Input
                id="actual_time"
                type="number"
                step="0.5"
                value={formData.actual_time}
                onChange={(e) => setFormData({ ...formData, actual_time: e.target.value })}
                placeholder="0"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="actual_cost">Costo Effettivo (€)</Label>
              <Input
                id="actual_cost"
                type="number"
                step="0.01"
                value={formData.actual_cost}
                onChange={(e) => setFormData({ ...formData, actual_cost: e.target.value })}
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="border-t pt-4 mt-4">
            <h4 className="font-medium mb-3">Fatturazione</h4>
            
            <div className="flex items-center space-x-2 mb-4">
              <Switch
                id="is_invoiced"
                checked={formData.is_invoiced}
                onCheckedChange={(checked) => setFormData({ ...formData, is_invoiced: checked })}
              />
              <Label htmlFor="is_invoiced">Attività Fatturata</Label>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="invoice_number">Numero Fattura</Label>
                <Input
                  id="invoice_number"
                  value={formData.invoice_number}
                  onChange={(e) => setFormData({ ...formData, invoice_number: e.target.value })}
                  placeholder="es. 600/2024"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="invoice_date">Data Fattura</Label>
                <Input
                  id="invoice_date"
                  type="date"
                  value={formData.invoice_date}
                  onChange={(e) => setFormData({ ...formData, invoice_date: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="invoiced_hours">Ore Fatturate</Label>
                <Input
                  id="invoiced_hours"
                  type="number"
                  step="0.5"
                  value={formData.invoiced_hours}
                  onChange={(e) => setFormData({ ...formData, invoiced_hours: e.target.value })}
                  placeholder="0"
                />
              </div>
            </div>

            <div className="space-y-2 mt-4">
              <Label htmlFor="billing_notes">Note Fatturazione</Label>
              <Textarea
                id="billing_notes"
                value={formData.billing_notes}
                onChange={(e) => setFormData({ ...formData, billing_notes: e.target.value })}
                placeholder="Note relative alla fatturazione"
                rows={2}
              />
            </div>
          </div>

          <div className="flex justify-between pt-4">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button type="button" variant="destructive" size="sm" disabled={deleting}>
                  {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4 mr-1" />}
                  Elimina
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Conferma eliminazione</AlertDialogTitle>
                  <AlertDialogDescription>
                    Sei sicuro di voler eliminare questa attività? L'azione non può essere annullata.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Annulla</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete}>Elimina</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Annulla
              </Button>
              <Button type="submit" disabled={loading || !formData.name.trim()}>
                {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Salva
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
