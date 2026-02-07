import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, isBefore, addDays, startOfDay } from 'date-fns';
import { it } from 'date-fns/locale';
import {
  ArrowLeft, Building2, Loader2, FileText, AlertTriangle,
  Users, Clock, CheckCircle, Upload, Calendar as CalendarIcon,
  Briefcase, GraduationCap, Stethoscope, Shield, Calculator,
  Wrench
} from 'lucide-react';
import Header from '@/components/Header';
import BottomNav from '@/components/BottomNav';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { cn } from '@/lib/utils';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';

interface DeptStats {
  name: string;
  key: string;
  icon: React.ElementType;
  color: string;
  documentsUploaded: number;
  expiringDocuments: number;
  expiredDocuments: number;
  contactsManaged: number;
  activeActivities: number;
  activeContracts: number;
}

const DEPT_CONFIG: { key: string; name: string; icon: React.ElementType; color: string }[] = [
  { key: 'area_tecnica', name: 'Area Tecnica', icon: Wrench, color: '#3b82f6' },
  { key: 'gestione_corsi', name: 'Gestione Corsi', icon: GraduationCap, color: '#8b5cf6' },
  { key: 'contabilita', name: 'Contabilità', icon: Calculator, color: '#10b981' },
  { key: 'consulenti_tecnici', name: 'Consulenti Tecnici', icon: Shield, color: '#f59e0b' },
  { key: 'medicina', name: 'Medicina', icon: Stethoscope, color: '#ef4444' },
];

const CHART_COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444'];

export default function DepartmentDashboard() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { role, isAdmin, isAreaAziendale, loading: roleLoading } = useUserRole();
  const [loading, setLoading] = useState(true);
  const [deptStats, setDeptStats] = useState<DeptStats[]>([]);
  const [totalContacts, setTotalContacts] = useState(0);

  useEffect(() => {
    if (user && !roleLoading) fetchStats();
  }, [user, roleLoading]);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const today = startOfDay(new Date());
      const next30Days = addDays(today, 30);

      // Fetch all data in parallel
      const [docsRes, contactsRes, activitiesRes, contractsRes] = await Promise.all([
        supabase.from('crm_client_documents').select('id, area, expiry_date'),
        supabase.from('crm_contacts').select('id, user_id, status'),
        supabase.from('crm_activities').select('id, user_id, status'),
        supabase.from('crm_contracts').select('id, user_id, status'),
      ]);

      const docs = docsRes.data || [];
      const contacts = contactsRes.data || [];
      const activities = activitiesRes.data || [];
      const contracts = contractsRes.data || [];

      setTotalContacts(contacts.length);

      // Compute per-department stats from documents
      const stats: DeptStats[] = DEPT_CONFIG.map(dept => {
        const deptDocs = docs.filter(d => d.area === dept.key);
        const expiringDocs = deptDocs.filter(d => {
          if (!d.expiry_date) return false;
          const exp = new Date(d.expiry_date);
          return exp >= today && exp <= next30Days;
        });
        const expiredDocs = deptDocs.filter(d => {
          if (!d.expiry_date) return false;
          return isBefore(new Date(d.expiry_date), today);
        });

        return {
          name: dept.name,
          key: dept.key,
          icon: dept.icon,
          color: dept.color,
          documentsUploaded: deptDocs.length,
          expiringDocuments: expiringDocs.length,
          expiredDocuments: expiredDocs.length,
          // Contacts, activities, contracts are shared across all depts
          contactsManaged: contacts.length,
          activeActivities: activities.filter(a => a.status === 'in_progress').length,
          activeContracts: contracts.filter(c => c.status === 'active').length,
        };
      });

      setDeptStats(stats);
    } catch (error) {
      console.error('Error fetching department stats:', error);
    } finally {
      setLoading(false);
    }
  };

  // Chart data
  const documentsChart = useMemo(() =>
    deptStats.map(d => ({
      name: d.name.replace(' ', '\n'),
      shortName: d.name.split(' ')[0],
      documenti: d.documentsUploaded,
      scadenze: d.expiringDocuments,
      scaduti: d.expiredDocuments,
    })),
  [deptStats]);

  const documentsPieData = useMemo(() =>
    deptStats.filter(d => d.documentsUploaded > 0).map(d => ({
      name: d.name,
      value: d.documentsUploaded,
    })),
  [deptStats]);

  const totalDocs = useMemo(() => deptStats.reduce((s, d) => s + d.documentsUploaded, 0), [deptStats]);
  const totalExpiring = useMemo(() => deptStats.reduce((s, d) => s + d.expiringDocuments, 0), [deptStats]);
  const totalExpired = useMemo(() => deptStats.reduce((s, d) => s + d.expiredDocuments, 0), [deptStats]);
  const activeActivities = deptStats[0]?.activeActivities ?? 0;
  const activeContracts = deptStats[0]?.activeContracts ?? 0;

  // Determine which dept to highlight for the current user
  const userDeptKey = useMemo(() => {
    if (isAdmin) return null;
    if (role && DEPT_CONFIG.some(d => d.key === role)) return role;
    return null;
  }, [role, isAdmin]);

  if (authLoading || roleLoading || loading) {
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
              <Building2 className="h-6 w-6 text-primary" />
              Dashboard Dipartimenti
            </h1>
            <p className="text-muted-foreground text-sm">
              KPI riepilogativa per area aziendale
            </p>
          </div>
        </div>

        {/* Global KPI Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Documenti Totali</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalDocs}</div>
              <p className="text-xs text-muted-foreground">Tutti i dipartimenti</p>
            </CardContent>
          </Card>

          <Card className={cn(totalExpired > 0 && "border-destructive/50")}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Scaduti</CardTitle>
              <AlertTriangle className={cn("h-4 w-4", totalExpired > 0 ? "text-destructive" : "text-muted-foreground")} />
            </CardHeader>
            <CardContent>
              <div className={cn("text-2xl font-bold", totalExpired > 0 && "text-destructive")}>{totalExpired}</div>
              <p className="text-xs text-muted-foreground">{totalExpiring} in scadenza (30gg)</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Contatti CRM</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalContacts}</div>
              <p className="text-xs text-muted-foreground">Condivisi tra aree</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Attività in corso</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{activeActivities}</div>
              <p className="text-xs text-muted-foreground">Status: in_progress</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Commesse attive</CardTitle>
              <Briefcase className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{activeContracts}</div>
              <p className="text-xs text-muted-foreground">Status: active</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">Panoramica</TabsTrigger>
            <TabsTrigger value="details">Dettaglio Aree</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              {/* Documents per department bar chart */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Documenti per Area</CardTitle>
                  <CardDescription>Caricati, in scadenza e scaduti</CardDescription>
                </CardHeader>
                <CardContent>
                  {documentsChart.length > 0 ? (
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart data={documentsChart}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="shortName" fontSize={12} />
                        <YAxis allowDecimals={false} />
                        <Tooltip />
                        <Bar dataKey="documenti" name="Documenti" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="scadenze" name="In scadenza" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="scaduti" name="Scaduti" fill="#ef4444" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-center text-muted-foreground py-12">Nessun documento</p>
                  )}
                </CardContent>
              </Card>

              {/* Pie chart distribution */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Distribuzione Documenti</CardTitle>
                  <CardDescription>Per dipartimento</CardDescription>
                </CardHeader>
                <CardContent>
                  {documentsPieData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={250}>
                      <PieChart>
                        <Pie
                          data={documentsPieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={90}
                          paddingAngle={3}
                          dataKey="value"
                          label={({ name, value }) => `${name}: ${value}`}
                        >
                          {documentsPieData.map((_, index) => (
                            <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-center text-muted-foreground py-12">Nessun documento</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Detail Tab - Per-department cards */}
          <TabsContent value="details" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {deptStats.map((dept) => {
                const Icon = dept.icon;
                const isCurrentDept = userDeptKey === dept.key;
                const hasIssues = dept.expiredDocuments > 0;

                return (
                  <Card
                    key={dept.key}
                    className={cn(
                      "transition-all",
                      isCurrentDept && "ring-2 ring-primary",
                      hasIssues && "border-destructive/30"
                    )}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg flex items-center gap-2">
                          <div
                            className="h-8 w-8 rounded-lg flex items-center justify-center"
                            style={{ backgroundColor: dept.color + '20' }}
                          >
                            <Icon className="h-4 w-4" style={{ color: dept.color }} />
                          </div>
                          {dept.name}
                        </CardTitle>
                        {isCurrentDept && (
                          <Badge variant="default" className="text-xs">Il tuo dipartimento</Badge>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Documents */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="flex items-center gap-1.5 text-muted-foreground">
                            <Upload className="h-3.5 w-3.5" />
                            Documenti caricati
                          </span>
                          <span className="font-semibold">{dept.documentsUploaded}</span>
                        </div>

                        <div className="flex items-center justify-between text-sm">
                          <span className="flex items-center gap-1.5 text-muted-foreground">
                            <CalendarIcon className="h-3.5 w-3.5" />
                            In scadenza (30gg)
                          </span>
                          <Badge variant={dept.expiringDocuments > 0 ? "secondary" : "outline"} className="text-xs">
                            {dept.expiringDocuments}
                          </Badge>
                        </div>

                        <div className="flex items-center justify-between text-sm">
                          <span className="flex items-center gap-1.5 text-muted-foreground">
                            <AlertTriangle className="h-3.5 w-3.5" />
                            Scaduti
                          </span>
                          <Badge
                            variant={dept.expiredDocuments > 0 ? "destructive" : "outline"}
                            className="text-xs"
                          >
                            {dept.expiredDocuments}
                          </Badge>
                        </div>
                      </div>

                      {/* Progress bar showing health */}
                      {dept.documentsUploaded > 0 && (
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span>Salute documenti</span>
                            <span>
                              {Math.round(
                                ((dept.documentsUploaded - dept.expiredDocuments) / dept.documentsUploaded) * 100
                              )}%
                            </span>
                          </div>
                          <Progress
                            value={
                              ((dept.documentsUploaded - dept.expiredDocuments) / dept.documentsUploaded) * 100
                            }
                            className="h-2"
                          />
                        </div>
                      )}

                      {/* Shared KPIs */}
                      <div className="pt-2 border-t space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="flex items-center gap-1.5 text-muted-foreground">
                            <Users className="h-3.5 w-3.5" />
                            Contatti gestiti
                          </span>
                          <span className="font-semibold">{dept.contactsManaged}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="flex items-center gap-1.5 text-muted-foreground">
                            <Clock className="h-3.5 w-3.5" />
                            Attività attive
                          </span>
                          <span className="font-semibold">{dept.activeActivities}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="flex items-center gap-1.5 text-muted-foreground">
                            <Briefcase className="h-3.5 w-3.5" />
                            Commesse attive
                          </span>
                          <span className="font-semibold">{dept.activeContracts}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>
        </Tabs>
      </main>
      <BottomNav />
    </div>
  );
}
