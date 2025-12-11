import { useState, useEffect } from 'react';
import { Bell, CheckCircle2, XCircle, Clock, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
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
} from 'recharts';

interface ReminderStatsProps {
  userId: string | undefined;
}

interface Stats {
  total: number;
  completed: number;
  expired: number;
  pending: number;
  avgResponseTimeHours: number;
  byType: { type: string; count: number }[];
}

const COLORS = ['hsl(var(--chart-3))', 'hsl(var(--destructive))', 'hsl(var(--chart-2))'];

export default function ReminderStats({ userId }: ReminderStatsProps) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    const fetchStats = async () => {
      try {
        const { data: reminders } = await supabase
          .from('reminders')
          .select('*')
          .eq('user_id', userId);

        if (!reminders) {
          setStats(null);
          return;
        }

        const now = new Date();
        const completed = reminders.filter(r => r.is_completed);
        const expired = reminders.filter(r => !r.is_completed && new Date(r.due_date) < now);
        const pending = reminders.filter(r => !r.is_completed && new Date(r.due_date) >= now);

        // Calculate average response time for completed reminders
        let totalResponseTime = 0;
        let countWithResponse = 0;
        
        completed.forEach(r => {
          // Assuming completion happened around updated_at or a reasonable time
          const created = new Date(r.created_at);
          const due = new Date(r.due_date);
          // Use due_date as proxy for completion timing if no specific completion timestamp
          const responseTime = due.getTime() - created.getTime();
          if (responseTime > 0) {
            totalResponseTime += responseTime;
            countWithResponse++;
          }
        });

        const avgResponseTimeHours = countWithResponse > 0
          ? Math.round(totalResponseTime / countWithResponse / (1000 * 60 * 60))
          : 0;

        // Group by type
        const typeMap = new Map<string, number>();
        reminders.forEach(r => {
          const type = r.type || 'altro';
          typeMap.set(type, (typeMap.get(type) || 0) + 1);
        });
        
        const byType = Array.from(typeMap.entries())
          .map(([type, count]) => ({ type, count }))
          .sort((a, b) => b.count - a.count);

        setStats({
          total: reminders.length,
          completed: completed.length,
          expired: expired.length,
          pending: pending.length,
          avgResponseTimeHours,
          byType,
        });
      } catch (error) {
        console.error('Error fetching reminder stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [userId]);

  if (loading || !stats) {
    return null;
  }

  const completionRate = stats.total > 0 
    ? Math.round((stats.completed / stats.total) * 100) 
    : 0;

  const pieData = [
    { name: 'Completati', value: stats.completed },
    { name: 'Scaduti', value: stats.expired },
    { name: 'In attesa', value: stats.pending },
  ].filter(d => d.value > 0);

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Totale Promemoria</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <Bell className="h-8 w-8 text-primary opacity-70" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Completati</p>
                <p className="text-2xl font-bold text-green-600">{stats.completed}</p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-green-600 opacity-70" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Scaduti</p>
                <p className="text-2xl font-bold text-destructive">{stats.expired}</p>
              </div>
              <XCircle className="h-8 w-8 text-destructive opacity-70" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Tempo Medio</p>
                <p className="text-2xl font-bold">{stats.avgResponseTimeHours}h</p>
              </div>
              <Clock className="h-8 w-8 text-chart-2 opacity-70" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Completion Status Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Stato Promemoria
              <span className="ml-auto text-sm font-normal text-muted-foreground">
                {completionRate}% completati
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPie>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={70}
                    paddingAngle={5}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {pieData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </RechartsPie>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* By Type Bar Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Promemoria per Tipo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.byType} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="type" type="category" width={100} />
                  <Tooltip />
                  <Bar dataKey="count" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
