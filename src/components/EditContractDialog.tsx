import { useState, useEffect } from 'react';
import { Pencil, Loader2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Contract {
  id: string;
  name: string;
  status: string;
  contract_type?: string;
  contract_amount?: number;
  quote_amount?: number;
  start_date?: string;
  end_date?: string;
  responsible?: string;
  description?: string;
  group_name?: string;
  contract_date?: string;
  contract_expiry_date?: string;
}

interface EditContractDialogProps {
  contract: Contract;
  onContractUpdated: () => void;
  onContractDeleted: () => void;
}

export function EditContractDialog({ contract, onContractUpdated, onContractDeleted }: EditContractDialogProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    status: 'active',
    contract_type: '',
    contract_amount: '',
    quote_amount: '',
    start_date: '',
    end_date: '',
    responsible: '',
    description: '',
    group_name: '',
    contract_date: '',
    contract_expiry_date: '',
  });

  useEffect(() => {
    if (open) {
      setFormData({
        name: contract.name || '',
        status: contract.status || 'active',
        contract_type: contract.contract_type || '',
        contract_amount: contract.contract_amount?.toString() || '',
        quote_amount: contract.quote_amount?.toString() || '',
        start_date: contract.start_date || '',
        end_date: contract.end_date || '',
        responsible: contract.responsible || '',
        description: contract.description || '',
        group_name: contract.group_name || '',
        contract_date: contract.contract_date || '',
        contract_expiry_date: contract.contract_expiry_date || '',
      });
    }
  }, [open, contract]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('crm_contracts')
        .update({
          name: formData.name.trim(),
          status: formData.status,
          contract_type: formData.contract_type.trim() || null,
          contract_amount: formData.contract_amount ? parseFloat(formData.contract_amount) : null,
          quote_amount: formData.quote_amount ? parseFloat(formData.quote_amount) : null,
          start_date: formData.start_date || null,
          end_date: formData.end_date || null,
          responsible: formData.responsible.trim() || null,
          description: formData.description.trim() || null,
          group_name: formData.group_name.trim() || null,
          contract_date: formData.contract_date || null,
          contract_expiry_date: formData.contract_expiry_date || null,
        })
        .eq('id', contract.id);

      if (error) throw error;

      toast({ title: 'Commessa aggiornata' });
      setOpen(false);
      onContractUpdated();
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
        .from('crm_contracts')
        .delete()
        .eq('id', contract.id);

      if (error) throw error;

      toast({ title: 'Commessa eliminata' });
      setOpen(false);
      onContractDeleted();
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
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Modifica Commessa</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Nome commessa"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="status">Stato</Label>
              <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Attiva</SelectItem>
                  <SelectItem value="pending">In attesa</SelectItem>
                  <SelectItem value="completed">Completata</SelectItem>
                  <SelectItem value="cancelled">Annullata</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="contract_type">Tipo Contratto</Label>
              <Input
                id="contract_type"
                value={formData.contract_type}
                onChange={(e) => setFormData({ ...formData, contract_type: e.target.value })}
                placeholder="es. Consulenza"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="quote_amount">Importo Preventivo (€)</Label>
              <Input
                id="quote_amount"
                type="number"
                step="0.01"
                value={formData.quote_amount}
                onChange={(e) => setFormData({ ...formData, quote_amount: e.target.value })}
                placeholder="0.00"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="contract_amount">Importo Contratto (€)</Label>
              <Input
                id="contract_amount"
                type="number"
                step="0.01"
                value={formData.contract_amount}
                onChange={(e) => setFormData({ ...formData, contract_amount: e.target.value })}
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start_date">Data Inizio</Label>
              <Input
                id="start_date"
                type="date"
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="end_date">Data Fine</Label>
              <Input
                id="end_date"
                type="date"
                value={formData.end_date}
                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="contract_date">Data Contratto</Label>
              <Input
                id="contract_date"
                type="date"
                value={formData.contract_date}
                onChange={(e) => setFormData({ ...formData, contract_date: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="contract_expiry_date">Scadenza Contratto</Label>
              <Input
                id="contract_expiry_date"
                type="date"
                value={formData.contract_expiry_date}
                onChange={(e) => setFormData({ ...formData, contract_expiry_date: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="group_name">Gruppo</Label>
            <Input
              id="group_name"
              value={formData.group_name}
              onChange={(e) => setFormData({ ...formData, group_name: e.target.value })}
              placeholder="Nome gruppo/categoria"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="responsible">Responsabile</Label>
            <Input
              id="responsible"
              value={formData.responsible}
              onChange={(e) => setFormData({ ...formData, responsible: e.target.value })}
              placeholder="Nome responsabile"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrizione</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Descrizione della commessa"
              rows={3}
            />
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
                    Sei sicuro di voler eliminare questa commessa? L'azione non può essere annullata.
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
