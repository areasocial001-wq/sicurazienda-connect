import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Pie, PieChart, Cell, ResponsiveContainer, LineChart, Line } from 'recharts';
import type { MedicalVisit, MedicalJudgment } from '@/hooks/useMedicina';
import { TrendingUp, Users, Activity, AlertTriangle } from 'lucide-react';
import { JUDGMENT_OPTIONS } from './JudgmentDialog';

interface Props {
  visits: MedicalVisit[];
  judgments: MedicalJudgment[];
}

const YEARS = [new Date().getFullYear(), new Date().getFullYear() - 1, new Date().getFullYear() - 2];
const MONTH_NAMES = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'];
const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--accent))', 'hsl(var(--destructive))', 'hsl(var(--muted-foreground))', '#10b981'];

export const MedicalAnalytics = ({ visits, judgments }: Props) => {
  const [year, setYear] = useState<number>(new Date().getFullYear());

  const yearVisits = useMemo(() => visits.filter((v) => {
    const d = v.execution_date || v.scheduled_date;
    return d && new Date(d).getFullYear() === year;
  }), [visits, year]);

  const yearJudgments = useMemo(() => judgments.filter((j) => new Date(j.judgment_date).getFullYear() === year), [judgments, year]);

  // Visits per month
  const monthlyData = useMemo(() => {
    const arr = MONTH_NAMES.map((name, i) => ({ name, visite: 0, eseguite: 0 }));
    yearVisits.forEach((v) => {
      const d = v.execution_date || v.scheduled_date;
      if (!d) return;
      const m = new Date(d).getMonth();
      arr[m].visite += 1;
      if (v.status === 'completed') arr[m].eseguite += 1;
    });
    return arr;
  }, [yearVisits]);

  // Visits by type
  const byType = useMemo(() => {
    const map = new Map<string, number>();
    yearVisits.forEach((v) => map.set(v.visit_type, (map.get(v.visit_type) || 0) + 1));
    const labels: Record<string, string> = {
      preventiva: 'Preventiva', periodica: 'Periodica', cambio_mansione: 'Cambio mansione',
      rientro: 'Rientro', su_richiesta: 'Su richiesta', cessazione: 'Cessazione',
    };
    return Array.from(map.entries()).map(([k, v]) => ({ name: labels[k] || k, value: v }));
  }, [yearVisits]);

  // Judgments breakdown
  const judgmentBreakdown = useMemo(() => {
    const map = new Map<string, number>();
    yearJudgments.forEach((j) => map.set(j.judgment, (map.get(j.judgment) || 0) + 1));
    return Array.from(map.entries()).map(([k, v]) => {
      const opt = JUDGMENT_OPTIONS.find((o) => o.value === k);
      return { name: opt?.label || k, value: v };
    });
  }, [yearJudgments]);

  // Compliance (eseguite vs programmate)
  const completed = yearVisits.filter((v) => v.status === 'completed').length;
  const missed = yearVisits.filter((v) => v.status === 'missed').length;
  const compliance = yearVisits.length > 0 ? Math.round((completed / yearVisits.length) * 100) : 0;
  const uniqueEmployees = new Set(yearVisits.map((v) => v.employee_id).filter(Boolean)).size;

  const chartConfig = {
    visite: { label: 'Programmate', color: 'hsl(var(--primary))' },
    eseguite: { label: 'Eseguite', color: 'hsl(var(--accent))' },
  };

  return (
    <div className="space-y-4">
      <div className="flex items-end gap-3">
        <div>
          <div className="text-xs text-muted-foreground mb-1">Anno di riferimento</div>
          <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>{YEARS.map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1"><Activity className="h-3 w-3" />Visite totali</CardDescription>
            <CardTitle className="text-3xl">{yearVisits.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1"><Users className="h-3 w-3" />Lavoratori coinvolti</CardDescription>
            <CardTitle className="text-3xl">{uniqueEmployees}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1"><TrendingUp className="h-3 w-3" />Compliance</CardDescription>
            <CardTitle className="text-3xl text-primary">{compliance}%</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1"><AlertTriangle className="h-3 w-3" />Non presentati</CardDescription>
            <CardTitle className="text-3xl text-destructive">{missed}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Andamento mensile {year}</CardTitle>
            <CardDescription>Visite programmate vs eseguite</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[280px] w-full">
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="visite" fill="var(--color-visite)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="eseguite" fill="var(--color-eseguite)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Visite per tipologia</CardTitle>
            <CardDescription>Distribuzione delle prestazioni</CardDescription>
          </CardHeader>
          <CardContent>
            {byType.length === 0 ? (
              <div className="h-[280px] flex items-center justify-center text-sm text-muted-foreground">Nessun dato</div>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie data={byType} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={(e) => `${e.name}: ${e.value}`}>
                    {byType.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Esiti idoneità</CardTitle>
            <CardDescription>Giudizi medici espressi nell'anno {year}</CardDescription>
          </CardHeader>
          <CardContent>
            {judgmentBreakdown.length === 0 ? (
              <div className="h-[200px] flex items-center justify-center text-sm text-muted-foreground">Nessun giudizio registrato</div>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={judgmentBreakdown} layout="vertical" margin={{ left: 80 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis type="number" allowDecimals={false} />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={150} />
                  <Bar dataKey="value" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
