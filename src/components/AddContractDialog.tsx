import { useState } from 'react';
import { Plus, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

interface AddContractDialogProps {
  contactId: string;
  onContractAdded: () => void;
}

export function AddContractDialog({ contactId, onContractAdded }: AddContractDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !formData.name.trim()) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('crm_contracts')
        .insert({
          contact_id: contactId,
          user_id: user.id,
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
        });

      if (error) throw error;

      toast({ title: 'Commessa creata', description: 'La nuova commessa è stata aggiunta.' });
      setOpen(false);
      setFormData({
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
      onContractAdded();
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
          Nuova Commessa
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nuova Commessa</DialogTitle>
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
