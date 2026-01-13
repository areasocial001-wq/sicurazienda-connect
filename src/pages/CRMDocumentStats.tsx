import { useState, useEffect, useMemo } from 'react';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { it } from 'date-fns/locale';
import { 
  BarChart3, FileText, AlertTriangle, TrendingUp, 
  FolderOpen, Calendar, Loader2, ArrowLeft, Clock,
  PieChart
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Header from '@/components/Header';
import BottomNav from '@/components/BottomNav';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
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
  Legend
} from 'recharts';

interface DocumentStats {
  total: number;
  byArea: Record<string, number>;
  expiringSoon: number;
  expired: number;
  uploadedThisWeek: number;
  uploadedThisMonth: number;
  uploadTrend: Array<{ date: string; count: number }>;
  topContacts: Array<{ name: string; count: number }>;
}

const areaLabels: Record<string, string> = {
  contabilita: 'Contabilità',
  area_tecnica: 'Area Tecnica',
  gestione_corsi: 'Gestione Corsi',
  admin: 'Amministrazione',
  cliente: 'Clienti',
};

const areaColors: Record<string, string> = {
  contabilita: '#10b981',
  area_tecnica: '#3b82f6',
  gestione_corsi: '#8b5cf6',
  admin: '#f97316',
  cliente: '#eab308',
};

export default function CRMDocumentStats() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, isAreaAziendale, loading: roleLoading } = useUserRole();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DocumentStats | null>(null);

  useEffect(() => {
    if (user && !roleLoading) {
      fetchStats();
    }
  }, [user, roleLoading]);

  const fetchStats = async () => {
    setLoading(true);
    try {
      // Fetch all documents with contact info
      const { data: documents, error } = await supabase
        .from('crm_client_documents')
        .select(`
          id,
          area,
          expiry_date,
          created_at,
          contact_id,
          crm_contacts(name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const now = new Date();
      const thirtyDaysLater = new Date(now);
      thirtyDaysLater.setDate(thirtyDaysLater.getDate() + 30);
      const weekAgo = subDays(now, 7);
      const monthAgo = subDays(now, 30);

      // Calculate stats
      const byArea: Record<string, number> = {};
      let expiringSoon = 0;
      let expired = 0;
      let uploadedThisWeek = 0;
      let uploadedThisMonth = 0;
      const contactCounts: Record<string, { name: string; count: number }> = {};
      const dailyCounts: Record<string, number> = {};

      // Initialize last 14 days
      for (let i = 13; i >= 0; i--) {
        const date = format(subDays(now, i), 'yyyy-MM-dd');
        dailyCounts[date] = 0;
      }

      documents?.forEach((doc: any) => {
        // By area
        byArea[doc.area] = (byArea[doc.area] || 0) + 1;

        // Expiry
        if (doc.expiry_date) {
          const expiryDate = new Date(doc.expiry_date);
          if (expiryDate < now) {
            expired++;
          } else if (expiryDate <= thirtyDaysLater) {
            expiringSoon++;
          }
        }

        // Upload timing
        const createdAt = new Date(doc.created_at);
        if (createdAt >= weekAgo) uploadedThisWeek++;
        if (createdAt >= monthAgo) uploadedThisMonth++;

        // Daily trend (last 14 days)
        const dateKey = format(createdAt, 'yyyy-MM-dd');
        if (dailyCounts[dateKey] !== undefined) {
          dailyCounts[dateKey]++;
        }

        // Contact counts
        const contactName = doc.crm_contacts?.name || 'Sconosciuto';
        if (!contactCounts[doc.contact_id]) {
          contactCounts[doc.contact_id] = { name: contactName, count: 0 };
        }
        contactCounts[doc.contact_id].count++;
      });

      const uploadTrend = Object.entries(dailyCounts).map(([date, count]) => ({
        date: format(new Date(date), 'dd/MM', { locale: it }),
        count
      }));

      const topContacts = Object.values(contactCounts)
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      setStats({
        total: documents?.length || 0,
        byArea,
        expiringSoon,
        expired,
        uploadedThisWeek,
        uploadedThisMonth,
        uploadTrend,
        topContacts
      });
    } catch (error: any) {
      console.error('Error fetching stats:', error);
      toast({ title: "Errore", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const pieData = useMemo(() => {
    if (!stats) return [];
    return Object.entries(stats.byArea).map(([area, count]) => ({
      name: areaLabels[area] || area,
      value: count,
      color: areaColors[area] || '#64748b'
    }));
  }, [stats]);

  if (authLoading || roleLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!user || (!isAdmin && !isAreaAziendale)) {
    navigate('/');
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto p-4 pb-24">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate('/crm')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Statistiche Documenti</h1>
            <p className="text-muted-foreground">Panoramica del cassetto documenti CRM</p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : stats ? (
          <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Documenti Totali</CardTitle>
                  <FileText className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.total}</div>
                  <p className="text-xs text-muted-foreground">
                    +{stats.uploadedThisMonth} questo mese
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Caricati questa settimana</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.uploadedThisWeek}</div>
                  <p className="text-xs text-muted-foreground">
                    Ultimi 7 giorni
                  </p>
                </CardContent>
              </Card>

              <Card className={stats.expiringSoon > 0 ? 'border-yellow-500/30' : ''}>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">In Scadenza</CardTitle>
                  <Clock className="h-4 w-4 text-yellow-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-yellow-600">{stats.expiringSoon}</div>
                  <p className="text-xs text-muted-foreground">
                    Prossimi 30 giorni
                  </p>
                </CardContent>
              </Card>

              <Card className={stats.expired > 0 ? 'border-red-500/30' : ''}>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Scaduti</CardTitle>
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-600">{stats.expired}</div>
                  <p className="text-xs text-muted-foreground">
                    Richiedono attenzione
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Charts Row */}
            <div className="grid gap-6 md:grid-cols-2">
              {/* Upload Trend */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-primary" />
                    Trend Upload (14 giorni)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[250px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={stats.uploadTrend}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis 
                          dataKey="date" 
                          tick={{ fontSize: 12 }}
                          className="text-muted-foreground"
                        />
                        <YAxis 
                          tick={{ fontSize: 12 }}
                          className="text-muted-foreground"
                        />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'hsl(var(--card))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px'
                          }}
                        />
                        <Bar 
                          dataKey="count" 
                          fill="hsl(var(--primary))" 
                          radius={[4, 4, 0, 0]}
                          name="Documenti"
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Distribution by Area */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <PieChart className="h-5 w-5 text-primary" />
                    Distribuzione per Area
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[250px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsPie>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          dataKey="value"
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                          labelLine={false}
                        >
                          {pieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </RechartsPie>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Bottom Row */}
            <div className="grid gap-6 md:grid-cols-2">
              {/* By Area Breakdown */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FolderOpen className="h-5 w-5 text-primary" />
                    Documenti per Area
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {Object.entries(stats.byArea).map(([area, count]) => {
                    const percentage = stats.total > 0 ? (count / stats.total) * 100 : 0;
                    return (
                      <div key={area} className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="flex items-center gap-2">
                            <span 
                              className="w-3 h-3 rounded-full" 
                              style={{ backgroundColor: areaColors[area] || '#64748b' }}
                            />
                            {areaLabels[area] || area}
                          </span>
                          <span className="font-medium">{count}</span>
                        </div>
                        <Progress value={percentage} className="h-2" />
                      </div>
                    );
                  })}
                </CardContent>
              </Card>

              {/* Top Contacts */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-primary" />
                    Clienti con più Documenti
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {stats.topContacts.map((contact, index) => (
                      <div 
                        key={index}
                        className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                      >
                        <div className="flex items-center gap-3">
                          <Badge variant="outline" className="w-6 h-6 flex items-center justify-center p-0">
                            {index + 1}
                          </Badge>
                          <span className="font-medium">{contact.name}</span>
                        </div>
                        <Badge variant="secondary">{contact.count} doc</Badge>
                      </div>
                    ))}
                    {stats.topContacts.length === 0 && (
                      <p className="text-muted-foreground text-center py-4">
                        Nessun documento ancora caricato
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        ) : null}
      </main>
      
      <BottomNav />
    </div>
  );
}
