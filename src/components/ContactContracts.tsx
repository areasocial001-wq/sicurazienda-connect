import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { Briefcase, Calendar, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { AddContractDialog } from './AddContractDialog';

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

interface ContactContractsProps {
  contactId: string;
}

const contractStatusColors: Record<string, string> = {
  active: 'bg-green-500/20 text-green-700 border-green-500/30',
  pending: 'bg-yellow-500/20 text-yellow-700 border-yellow-500/30',
  completed: 'bg-blue-500/20 text-blue-700 border-blue-500/30',
  cancelled: 'bg-red-500/20 text-red-700 border-red-500/30',
};

const contractStatusLabels: Record<string, string> = {
  active: 'Attiva',
  pending: 'In attesa',
  completed: 'Completata',
  cancelled: 'Annullata',
};

export function ContactContracts({ contactId }: ContactContractsProps) {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchContracts();
  }, [contactId]);

  const fetchContracts = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('crm_contracts')
        .select('id, name, status, contract_type, contract_amount, quote_amount, start_date, end_date, responsible, description, group_name, contract_date, contract_expiry_date')
        .eq('contact_id', contactId)
        .order('start_date', { ascending: false });

      if (error) throw error;
      setContracts(data || []);
    } catch (error) {
      console.error('Error fetching contracts:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    return format(new Date(dateStr), 'dd/MM/yyyy', { locale: it });
  };

  const formatCurrency = (amount?: number) => {
    if (!amount) return '-';
    return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(amount);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <Briefcase className="h-5 w-5 text-primary" />
          Commesse ({contracts.length})
        </CardTitle>
        <AddContractDialog contactId={contactId} onContractAdded={fetchContracts} />
      </CardHeader>
      <CardContent>
        {contracts.length === 0 ? (
          <p className="text-muted-foreground text-center py-4">
            Nessuna commessa collegata
          </p>
        ) : (
          <div className="space-y-3">
            {contracts.map((contract) => (
              <div 
                key={contract.id} 
                className="p-3 border rounded-lg hover:bg-muted/30 transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium truncate">{contract.name}</h4>
                    {contract.group_name && (
                      <p className="text-xs text-primary/80 mt-0.5">
                        Gruppo: {contract.group_name}
                      </p>
                    )}
                    {contract.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                        {contract.description}
                      </p>
                    )}
                  </div>
                  <Badge className={cn(contractStatusColors[contract.status] || contractStatusColors.pending)}>
                    {contractStatusLabels[contract.status] || contract.status}
                  </Badge>
                </div>
                <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground flex-wrap">
                  {contract.contract_type && (
                    <span className="text-primary/70">{contract.contract_type}</span>
                  )}
                  {contract.contract_amount && (
                    <span className="font-medium text-foreground">
                      {formatCurrency(contract.contract_amount)}
                    </span>
                  )}
                  {contract.quote_amount && !contract.contract_amount && (
                    <span className="font-medium text-muted-foreground">
                      Preventivo: {formatCurrency(contract.quote_amount)}
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {formatDate(contract.start_date)} - {formatDate(contract.end_date)}
                  </span>
                  {contract.responsible && (
                    <span>Resp: {contract.responsible}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
