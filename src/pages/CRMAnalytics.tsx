import { useState, useEffect } from 'react';
import { 
  BarChart3, TrendingUp, Users, Target, Calendar, 
  ArrowLeft, Loader2, PieChart, Activity, Download,
  Play, RefreshCw
} from 'lucide-react';
import Header from '@/components/Header';
import BottomNav from '@/components/BottomNav';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

import ReminderStats from '@/components/ReminderStats';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart as RechartsPie,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend,
} from 'recharts';

interface AnalyticsData {
  totalContacts: number;
  leadCount: number;
  prospectCount: number;
  clientCount: number;
  inactiveCount: number;
  totalInteractions: number;
  conversionRate: number;
  monthlyActivity: { month: string; contacts: number; interactions: number }[];
  sourceDistribution: { name: string; value: number }[];
  recentActivity: { date: string; type: string; count: number }[];
}

interface CRMContact {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  role: string | null;
  status: string;
  source: string | null;
  notes: string | null;
  created_at: string;
}

const COLORS = ['hsl(var(--primary))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))'];

export default function CRMAnalytics() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [contacts, setContacts] = useState<CRMContact[]>([]);
  const [triggeringCron, setTriggeringCron] = useState(false);
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);

  useEffect(() => {
    if (!user) return;

    const fetchAnalytics = async () => {
      setLoading(true);
      try {
        // Fetch contacts
        const { data: contactsData } = await supabase
          .from('crm_contacts')
          .select('*')
          .eq('user_id', user.id);

        // Fetch interactions
        const { data: interactions } = await supabase
          .from('crm_interactions')
          .select('*')
          .eq('user_id', user.id);

        const contactList = contactsData || [];
        const interactionList = interactions || [];
        
        setContacts(contactList as CRMContact[]);

        // Calculate status counts
        const leadCount = contactList.filter(c => c.status === 'lead').length;
        const prospectCount = contactList.filter(c => c.status === 'prospect').length;
        const clientCount = contactList.filter(c => c.status === 'client').length;
        const inactiveCount = contactList.filter(c => c.status === 'inactive').length;

        // Calculate conversion rate (leads -> clients)
        const conversionRate = contactList.length > 0 
          ? Math.round((clientCount / contactList.length) * 100) 
          : 0;

        // Calculate source distribution
        const sourceMap = new Map<string, number>();
        contactList.forEach(c => {
          const source = c.source || 'Sconosciuto';
          sourceMap.set(source, (sourceMap.get(source) || 0) + 1);
        });
        const sourceDistribution = Array.from(sourceMap.entries())
          .map(([name, value]) => ({ name, value }))
          .sort((a, b) => b.value - a.value)
          .slice(0, 5);

        // Calculate monthly activity (last 6 months)
        const monthlyActivity: { month: string; contacts: number; interactions: number }[] = [];
        const now = new Date();
        for (let i = 5; i >= 0; i--) {
          const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
          const monthStr = date.toLocaleDateString('it-IT', { month: 'short' });
          const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
          const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);

          const contactsInMonth = contactList.filter(c => {
            const created = new Date(c.created_at);
            return created >= monthStart && created <= monthEnd;
          }).length;

          const interactionsInMonth = interactionList.filter(i => {
            const created = new Date(i.created_at);
            return created >= monthStart && created <= monthEnd;
          }).length;

          monthlyActivity.push({
            month: monthStr,
            contacts: contactsInMonth,
            interactions: interactionsInMonth,
          });
        }

        // Recent activity by type (last 30 days)
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        const recentInteractions = interactionList.filter(i => new Date(i.created_at) >= thirtyDaysAgo);
        const typeMap = new Map<string, number>();
        recentInteractions.forEach(i => {
          typeMap.set(i.type, (typeMap.get(i.type) || 0) + 1);
        });
        const recentActivity = Array.from(typeMap.entries())
          .map(([type, count]) => ({ date: '', type, count }));

        setAnalytics({
          totalContacts: contactList.length,
          leadCount,
          prospectCount,
          clientCount,
          inactiveCount,
          totalInteractions: interactionList.length,
          conversionRate,
          monthlyActivity,
          sourceDistribution,
          recentActivity,
        });
      } catch (error) {
        console.error('Error fetching analytics:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, [user]);

  const triggerCronJob = async () => {
    setTriggeringCron(true);
    try {
      const { data, error } = await supabase.functions.invoke('check-expiries');
      if (error) throw error;
      toast.success(`Controllo completato: ${data.remindersCreated || 0} promemoria creati`);
    } catch (error) {
      console.error('Error triggering cron:', error);
      toast.error('Errore durante il controllo scadenze');
    } finally {
      setTriggeringCron(false);
    }
  };

  const exportContactsCSV = () => {
    if (contacts.length === 0) {
      toast.error('Nessun contatto da esportare');
      return;
    }

    const headers = ['Nome', 'Email', 'Telefono', 'Azienda', 'Ruolo', 'Status', 'Fonte', 'Note', 'Creato il'];
    const rows = contacts.map(c => [
      c.name,
      c.email || '',
      c.phone || '',
      c.company || '',
      c.role || '',
      c.status,
      c.source || '',
      (c.notes || '').replace(/"/g, '""'),
      new Date(c.created_at).toLocaleDateString('it-IT')
    ]);

    const csvContent = [
      headers.join(';'),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(';'))
    ].join('\n');

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `contatti_crm_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    toast.success('Export contatti completato');
  };

  const exportAnalyticsCSV = () => {
    if (!analytics) {
      toast.error('Nessun dato analytics da esportare');
      return;
    }

    const lines = [
      'Report Analytics CRM',
      `Data: ${new Date().toLocaleDateString('it-IT')}`,
      '',
      'KPI Principali',
      `Contatti Totali;${analytics.totalContacts}`,
      `Lead;${analytics.leadCount}`,
      `Prospect;${analytics.prospectCount}`,
      `Clienti;${analytics.clientCount}`,
      `Inattivi;${analytics.inactiveCount}`,
      `Tasso Conversione;${analytics.conversionRate}%`,
      `Interazioni Totali;${analytics.totalInteractions}`,
      '',
      'Attività Mensile',
      'Mese;Nuovi Contatti;Interazioni',
      ...analytics.monthlyActivity.map(m => `${m.month};${m.contacts};${m.interactions}`),
      '',
      'Fonti Acquisizione',
      'Fonte;Contatti',
      ...analytics.sourceDistribution.map(s => `${s.name};${s.value}`)
    ];

    const csvContent = lines.join('\n');
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `analytics_crm_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    toast.success('Export analytics completato');
  };

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

  const statusData = analytics ? [
    { name: 'Lead', value: analytics.leadCount, fill: 'hsl(var(--chart-1))' },
    { name: 'Prospect', value: analytics.prospectCount, fill: 'hsl(var(--chart-2))' },
    { name: 'Cliente', value: analytics.clientCount, fill: 'hsl(var(--chart-3))' },
    { name: 'Inattivo', value: analytics.inactiveCount, fill: 'hsl(var(--chart-4))' },
  ] : [];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto p-4 pb-24">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 mb-6 flex-wrap">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate('/crm')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <BarChart3 className="h-6 w-6 text-primary" />
                Dashboard Analytics CRM
              </h1>
              <p className="text-muted-foreground text-sm">
                Panoramica delle performance commerciali
              </p>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" size="sm" onClick={triggerCronJob} disabled={triggeringCron}>
              {triggeringCron ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Play className="h-4 w-4 mr-2" />}
              Test Scadenze
            </Button>
            <Button variant="outline" size="sm" onClick={exportContactsCSV}>
              <Download className="h-4 w-4 mr-2" />
              Export Contatti
            </Button>
            <Button variant="outline" size="sm" onClick={exportAnalyticsCSV}>
              <Download className="h-4 w-4 mr-2" />
              Export Analytics
            </Button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Contatti Totali</p>
                  <p className="text-2xl font-bold">{analytics?.totalContacts || 0}</p>
                </div>
                <Users className="h-8 w-8 text-primary opacity-70" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Clienti Attivi</p>
                  <p className="text-2xl font-bold text-green-600">{analytics?.clientCount || 0}</p>
                </div>
                <Target className="h-8 w-8 text-green-600 opacity-70" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Tasso Conversione</p>
                  <p className="text-2xl font-bold text-primary">{analytics?.conversionRate || 0}%</p>
                </div>
                <TrendingUp className="h-8 w-8 text-primary opacity-70" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Interazioni</p>
                  <p className="text-2xl font-bold">{analytics?.totalInteractions || 0}</p>
                </div>
                <Activity className="h-8 w-8 text-chart-2 opacity-70" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row 1 */}
        <div className="grid md:grid-cols-2 gap-6 mb-6">
          {/* Status Distribution */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <PieChart className="h-5 w-5" />
                Distribuzione Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsPie>
                    <Pie
                      data={statusData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {statusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </RechartsPie>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Source Distribution */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Fonti Acquisizione
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analytics?.sourceDistribution || []} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="name" type="category" width={100} />
                    <Tooltip />
                    <Bar dataKey="value" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Monthly Activity Chart */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Attività Mensile (Ultimi 6 mesi)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={analytics?.monthlyActivity || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="contacts" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={2}
                    name="Nuovi Contatti"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="interactions" 
                    stroke="hsl(var(--chart-2))" 
                    strokeWidth={2}
                    name="Interazioni"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Activity by Type */}
        {analytics && analytics.recentActivity.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Attività per Tipo (Ultimi 30 giorni)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analytics.recentActivity}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="type" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="hsl(var(--chart-3))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Reminder Statistics Section */}
        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Statistiche Promemoria
          </h2>
          <ReminderStats userId={user?.id} />
        </div>

        
      </main>

      <BottomNav />
    </div>
  );
}
