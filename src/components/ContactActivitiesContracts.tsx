import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { 
  ListTodo, Briefcase, Calendar, Clock, CheckCircle, 
  AlertCircle, Loader2, Plus, ChevronDown, ChevronUp
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { 
  Collapsible, 
  CollapsibleContent, 
  CollapsibleTrigger 
} from '@/components/ui/collapsible';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

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
}

interface Contract {
  id: string;
  name: string;
  status: string;
  contract_type?: string;
  contract_amount?: number;
  start_date?: string;
  end_date?: string;
  responsible?: string;
  description?: string;
}

interface ContactActivitiesContractsProps {
  contactId: string;
}

const activityStatusColors: Record<string, string> = {
  not_started: 'bg-gray-500/20 text-gray-700 border-gray-500/30',
  in_progress: 'bg-blue-500/20 text-blue-700 border-blue-500/30',
  completed: 'bg-green-500/20 text-green-700 border-green-500/30',
  cancelled: 'bg-red-500/20 text-red-700 border-red-500/30',
};

const activityStatusLabels: Record<string, string> = {
  not_started: 'Da iniziare',
  in_progress: 'In corso',
  completed: 'Completata',
  cancelled: 'Annullata',
};

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

const priorityColors: Record<string, string> = {
  low: 'bg-gray-500/20 text-gray-600',
  medium: 'bg-yellow-500/20 text-yellow-700',
  high: 'bg-orange-500/20 text-orange-700',
  urgent: 'bg-red-500/20 text-red-700',
};

export function ContactActivitiesContracts({ contactId }: ContactActivitiesContractsProps) {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [activitiesOpen, setActivitiesOpen] = useState(true);
  const [contractsOpen, setContractsOpen] = useState(true);

  useEffect(() => {
    fetchData();
  }, [contactId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [activitiesRes, contractsRes] = await Promise.all([
        supabase
          .from('crm_activities')
          .select('id, name, type, status, priority, start_date, end_date, assignee, description')
          .eq('contact_id', contactId)
          .order('start_date', { ascending: false }),
        supabase
          .from('crm_contracts')
          .select('id, name, status, contract_type, contract_amount, start_date, end_date, responsible, description')
          .eq('contact_id', contactId)
          .order('start_date', { ascending: false }),
      ]);

      if (activitiesRes.error) throw activitiesRes.error;
      if (contractsRes.error) throw contractsRes.error;

      setActivities(activitiesRes.data || []);
      setContracts(contractsRes.data || []);
    } catch (error) {
      console.error('Error fetching activities/contracts:', error);
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
    <div className="space-y-4">
      {/* Activities Section */}
      <Collapsible open={activitiesOpen} onOpenChange={setActivitiesOpen}>
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
              <CardTitle className="text-lg flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ListTodo className="h-5 w-5 text-primary" />
                  Attività ({activities.length})
                </div>
                {activitiesOpen ? (
                  <ChevronUp className="h-5 w-5 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-muted-foreground" />
                )}
              </CardTitle>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="pt-0">
              {activities.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">
                  Nessuna attività collegata
                </p>
              ) : (
                <div className="space-y-3">
                  {activities.map((activity) => (
                    <div 
                      key={activity.id} 
                      className="p-3 border rounded-lg hover:bg-muted/30 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium truncate">{activity.name}</h4>
                          {activity.description && (
                            <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                              {activity.description}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {activity.priority && (
                            <Badge className={cn(priorityColors[activity.priority], 'text-xs')}>
                              {activity.priority}
                            </Badge>
                          )}
                          <Badge className={cn(activityStatusColors[activity.status] || activityStatusColors.not_started)}>
                            {activityStatusLabels[activity.status] || activity.status}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {formatDate(activity.start_date)} - {formatDate(activity.end_date)}
                        </span>
                        {activity.assignee && (
                          <span>Assegnato a: {activity.assignee}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Contracts Section */}
      <Collapsible open={contractsOpen} onOpenChange={setContractsOpen}>
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
              <CardTitle className="text-lg flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Briefcase className="h-5 w-5 text-primary" />
                  Commesse ({contracts.length})
                </div>
                {contractsOpen ? (
                  <ChevronUp className="h-5 w-5 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-muted-foreground" />
                )}
              </CardTitle>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="pt-0">
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
                          <span>Tipo: {contract.contract_type}</span>
                        )}
                        {contract.contract_amount && (
                          <span className="font-medium text-foreground">
                            {formatCurrency(contract.contract_amount)}
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
          </CollapsibleContent>
        </Card>
      </Collapsible>
    </div>
  );
}
