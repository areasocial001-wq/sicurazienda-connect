import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, isAfter, isBefore, addDays, startOfDay } from 'date-fns';
import { it } from 'date-fns/locale';
import {
  ArrowLeft, BarChart3, ListTodo, Briefcase, Calendar,
  AlertTriangle, Clock, CheckCircle, TrendingUp, Loader2,
  Users, Euro, Target
} from 'lucide-react';
import Header from '@/components/Header';
import BottomNav from '@/components/BottomNav';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend
} from 'recharts';

interface Activity {
  id: string;
  name: string;
  type: string;
  status: string;
  priority?: string;
  start_date?: string;
  end_date?: string;
  contact_id?: string;
}

interface Contract {
  id: string;
  name: string;
  status: string;
  contract_amount?: number;
  start_date?: string;
  end_date?: string;
  contact_id?: string;
}

interface Contact {
  id: string;
  name: string;
  company?: string;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

const statusLabels: Record<string, string> = {
  not_started: 'Da iniziare',
  in_progress: 'In corso',
  completed: 'Completata',
  cancelled: 'Annullata',
  active: 'Attiva',
  pending: 'In attesa',
};

const priorityLabels: Record<string, string> = {
  low: 'Bassa',
  medium: 'Media',
  high: 'Alta',
  urgent: 'Urgente',
};

export default function CRMDashboard() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [activitiesRes, contractsRes, contactsRes] = await Promise.all([
        supabase.from('crm_activities').select('*').eq('user_id', user!.id),
        supabase.from('crm_contracts').select('*').eq('user_id', user!.id),
        supabase.from('crm_contacts').select('id, name, company').eq('user_id', user!.id),
      ]);

      if (activitiesRes.error) throw activitiesRes.error;
      if (contractsRes.error) throw contractsRes.error;
      if (contactsRes.error) throw contactsRes.error;

      setActivities(activitiesRes.data || []);
      setContracts(contractsRes.data || []);
      setContacts(contactsRes.data || []);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getContactName = (contactId?: string) => {
    if (!contactId) return 'Non assegnato';
    const contact = contacts.find(c => c.id === contactId);
    return contact?.name || contact?.company || 'Sconosciuto';
  };

  // Statistics calculations
  const today = startOfDay(new Date());
  const next7Days = addDays(today, 7);
  const next30Days = addDays(today, 30);

  // Activities stats
  const activitiesInProgress = activities.filter(a => a.status === 'in_progress').length;
  const activitiesCompleted = activities.filter(a => a.status === 'completed').length;
  const activitiesNotStarted = activities.filter(a => a.status === 'not_started').length;
  
  const upcomingDeadlines = activities.filter(a => {
    if (!a.end_date || a.status === 'completed' || a.status === 'cancelled') return false;
    const endDate = new Date(a.end_date);
    return isAfter(endDate, today) && isBefore(endDate, next7Days);
  });

  const overdueActivities = activities.filter(a => {
    if (!a.end_date || a.status === 'completed' || a.status === 'cancelled') return false;
    const endDate = new Date(a.end_date);
    return isBefore(endDate, today);
  });

  // Contracts stats
  const activeContracts = contracts.filter(c => c.status === 'active').length;
  const completedContracts = contracts.filter(c => c.status === 'completed').length;
  const totalContractValue = contracts
    .filter(c => c.status === 'active' || c.status === 'pending')
    .reduce((sum, c) => sum + (c.contract_amount || 0), 0);

  const expiringContracts = contracts.filter(c => {
    if (!c.end_date || c.status === 'completed' || c.status === 'cancelled') return false;
    const endDate = new Date(c.end_date);
    return isAfter(endDate, today) && isBefore(endDate, next30Days);
  });

  // Chart data
  const activityStatusData = [
    { name: 'Da iniziare', value: activitiesNotStarted, color: '#6b7280' },
    { name: 'In corso', value: activitiesInProgress, color: '#3b82f6' },
    { name: 'Completate', value: activitiesCompleted, color: '#22c55e' },
    { name: 'Annullate', value: activities.filter(a => a.status === 'cancelled').length, color: '#ef4444' },
  ].filter(d => d.value > 0);

  const contractStatusData = [
    { name: 'Attive', value: activeContracts, color: '#22c55e' },
    { name: 'In attesa', value: contracts.filter(c => c.status === 'pending').length, color: '#eab308' },
    { name: 'Completate', value: completedContracts, color: '#3b82f6' },
    { name: 'Annullate', value: contracts.filter(c => c.status === 'cancelled').length, color: '#ef4444' },
  ].filter(d => d.value > 0);

  const priorityData = [
    { name: 'Urgente', count: activities.filter(a => a.priority === 'urgent' && a.status !== 'completed').length },
    { name: 'Alta', count: activities.filter(a => a.priority === 'high' && a.status !== 'completed').length },
    { name: 'Media', count: activities.filter(a => a.priority === 'medium' && a.status !== 'completed').length },
    { name: 'Bassa', count: activities.filter(a => a.priority === 'low' && a.status !== 'completed').length },
  ];

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!user) {
    navigate('/');
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto p-4 pb-24">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate('/crm')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <BarChart3 className="h-6 w-6 text-primary" />
              Dashboard CRM
            </h1>
            <p className="text-muted-foreground text-sm">
              Panoramica attività e commesse
            </p>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Attività in corso</CardTitle>
              <ListTodo className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{activitiesInProgress}</div>
              <p className="text-xs text-muted-foreground">
                {activitiesNotStarted} da iniziare
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Commesse attive</CardTitle>
              <Briefcase className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{activeContracts}</div>
              <p className="text-xs text-muted-foreground">
                {contracts.filter(c => c.status === 'pending').length} in attesa
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Valore commesse</CardTitle>
              <Euro className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {new Intl.NumberFormat('it-IT', { 
                  style: 'currency', 
                  currency: 'EUR',
                  maximumFractionDigits: 0
                }).format(totalContractValue)}
              </div>
              <p className="text-xs text-muted-foreground">
                Commesse attive e in attesa
              </p>
            </CardContent>
          </Card>

          <Card className={cn(overdueActivities.length > 0 && "border-destructive/50")}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Scadenze</CardTitle>
              <AlertTriangle className={cn(
                "h-4 w-4",
                overdueActivities.length > 0 ? "text-destructive" : "text-muted-foreground"
              )} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {overdueActivities.length > 0 ? (
                  <span className="text-destructive">{overdueActivities.length} scadute</span>
                ) : (
                  <span className="text-green-600">{upcomingDeadlines.length} imminenti</span>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {upcomingDeadlines.length} nei prossimi 7 giorni
              </p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">Panoramica</TabsTrigger>
            <TabsTrigger value="activities">Attività</TabsTrigger>
            <TabsTrigger value="contracts">Commesse</TabsTrigger>
            <TabsTrigger value="deadlines">Scadenze</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              {/* Activity Status Chart */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Stato Attività</CardTitle>
                </CardHeader>
                <CardContent>
                  {activityStatusData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={200}>
                      <PieChart>
                        <Pie
                          data={activityStatusData}
                          cx="50%"
                          cy="50%"
                          innerRadius={40}
                          outerRadius={80}
                          paddingAngle={2}
                          dataKey="value"
                          label={({ name, value }) => `${name}: ${value}`}
                        >
                          {activityStatusData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-center text-muted-foreground py-12">
                      Nessuna attività
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Contract Status Chart */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Stato Commesse</CardTitle>
                </CardHeader>
                <CardContent>
                  {contractStatusData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={200}>
                      <PieChart>
                        <Pie
                          data={contractStatusData}
                          cx="50%"
                          cy="50%"
                          innerRadius={40}
                          outerRadius={80}
                          paddingAngle={2}
                          dataKey="value"
                          label={({ name, value }) => `${name}: ${value}`}
                        >
                          {contractStatusData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-center text-muted-foreground py-12">
                      Nessuna commessa
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Priority Distribution */}
              <Card className="md:col-span-2">
                <CardHeader>
                  <CardTitle className="text-lg">Attività per Priorità</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={priorityData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis allowDecimals={false} />
                      <Tooltip />
                      <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Activities Tab */}
          <TabsContent value="activities" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              {['not_started', 'in_progress', 'completed'].map((status) => (
                <Card key={status}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">
                      {statusLabels[status]}
                    </CardTitle>
                    <CardDescription>
                      {activities.filter(a => a.status === status).length} attività
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-[300px]">
                      <div className="space-y-2">
                        {activities
                          .filter(a => a.status === status)
                          .slice(0, 10)
                          .map((activity) => (
                            <div
                              key={activity.id}
                              className="p-2 border rounded text-sm hover:bg-muted/50"
                            >
                              <p className="font-medium truncate">{activity.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {getContactName(activity.contact_id)}
                              </p>
                              {activity.end_date && (
                                <p className="text-xs text-muted-foreground">
                                  Scadenza: {format(new Date(activity.end_date), 'dd/MM/yyyy')}
                                </p>
                              )}
                            </div>
                          ))}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Contracts Tab */}
          <TabsContent value="contracts" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              {['active', 'pending'].map((status) => (
                <Card key={status}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">
                      {statusLabels[status]}
                    </CardTitle>
                    <CardDescription>
                      {contracts.filter(c => c.status === status).length} commesse
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-[300px]">
                      <div className="space-y-2">
                        {contracts
                          .filter(c => c.status === status)
                          .map((contract) => (
                            <div
                              key={contract.id}
                              className="p-2 border rounded text-sm hover:bg-muted/50"
                            >
                              <div className="flex justify-between items-start">
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium truncate">{contract.name}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {getContactName(contract.contact_id)}
                                  </p>
                                </div>
                                {contract.contract_amount && (
                                  <span className="font-medium text-xs">
                                    {new Intl.NumberFormat('it-IT', { 
                                      style: 'currency', 
                                      currency: 'EUR',
                                      maximumFractionDigits: 0
                                    }).format(contract.contract_amount)}
                                  </span>
                                )}
                              </div>
                              {contract.end_date && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  Scadenza: {format(new Date(contract.end_date), 'dd/MM/yyyy')}
                                </p>
                              )}
                            </div>
                          ))}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Deadlines Tab */}
          <TabsContent value="deadlines" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              {/* Overdue */}
              <Card className={cn(overdueActivities.length > 0 && "border-destructive/50")}>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2 text-destructive">
                    <AlertTriangle className="h-5 w-5" />
                    Attività Scadute ({overdueActivities.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[250px]">
                    {overdueActivities.length === 0 ? (
                      <p className="text-center text-muted-foreground py-8">
                        <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-500" />
                        Nessuna attività scaduta
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {overdueActivities.map((activity) => (
                          <div
                            key={activity.id}
                            className="p-3 border border-destructive/30 rounded bg-destructive/5"
                          >
                            <p className="font-medium">{activity.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {getContactName(activity.contact_id)}
                            </p>
                            <p className="text-xs text-destructive font-medium">
                              Scaduta il {format(new Date(activity.end_date!), 'dd/MM/yyyy')}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </CardContent>
              </Card>

              {/* Upcoming */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Clock className="h-5 w-5 text-primary" />
                    Scadenze Imminenti ({upcomingDeadlines.length})
                  </CardTitle>
                  <CardDescription>Prossimi 7 giorni</CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[250px]">
                    {upcomingDeadlines.length === 0 ? (
                      <p className="text-center text-muted-foreground py-8">
                        Nessuna scadenza imminente
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {upcomingDeadlines.map((activity) => (
                          <div
                            key={activity.id}
                            className="p-3 border rounded hover:bg-muted/50"
                          >
                            <p className="font-medium">{activity.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {getContactName(activity.contact_id)}
                            </p>
                            <p className="text-xs text-primary font-medium">
                              Scade il {format(new Date(activity.end_date!), 'dd/MM/yyyy')}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </CardContent>
              </Card>

              {/* Expiring Contracts */}
              <Card className="md:col-span-2">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Briefcase className="h-5 w-5 text-primary" />
                    Commesse in Scadenza ({expiringContracts.length})
                  </CardTitle>
                  <CardDescription>Prossimi 30 giorni</CardDescription>
                </CardHeader>
                <CardContent>
                  {expiringContracts.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">
                      Nessuna commessa in scadenza
                    </p>
                  ) : (
                    <div className="grid gap-2 md:grid-cols-2">
                      {expiringContracts.map((contract) => (
                        <div
                          key={contract.id}
                          className="p-3 border rounded hover:bg-muted/50"
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-medium">{contract.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {getContactName(contract.contact_id)}
                              </p>
                            </div>
                            {contract.contract_amount && (
                              <span className="font-medium text-sm">
                                {new Intl.NumberFormat('it-IT', { 
                                  style: 'currency', 
                                  currency: 'EUR',
                                  maximumFractionDigits: 0
                                }).format(contract.contract_amount)}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-orange-600 font-medium mt-1">
                            Scade il {format(new Date(contract.end_date!), 'dd/MM/yyyy')}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </main>

      <BottomNav />
    </div>
  );
}
