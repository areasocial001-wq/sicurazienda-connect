import { useState } from 'react';
import { Plus, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

interface AddActivityDialogProps {
  contactId: string;
  onActivityAdded: () => void;
}

export function AddActivityDialog({ contactId, onActivityAdded }: AddActivityDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
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

  const resetForm = () => {
    setFormData({
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
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !formData.name.trim()) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('crm_activities')
        .insert({
          contact_id: contactId,
          user_id: user.id,
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
        });

      if (error) throw error;

      toast({ title: 'Attività creata', description: 'La nuova attività è stata aggiunta.' });
      setOpen(false);
      resetForm();
      onActivityAdded();
    } catch (error: any) {
      toast({ title: 'Errore', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1">
          <Plus className="h-4 w-4" />
          Nuova Attività
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nuova Attività</DialogTitle>
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

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Annulla
            </Button>
            <Button type="submit" disabled={loading || !formData.name.trim()}>
              {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Salva
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
