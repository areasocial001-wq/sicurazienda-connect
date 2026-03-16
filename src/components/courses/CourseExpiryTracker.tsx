import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search, AlertTriangle, AlertCircle, CheckCircle2 } from "lucide-react";

interface ExpiryItem {
  employee_name: string;
  company_name: string;
  course_name: string;
  certificate_expiry: string;
  days_remaining: number;
}

const CourseExpiryTracker = () => {
  const { user } = useAuth();
  const [items, setItems] = useState<ExpiryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!user) return;
    const fetchExpiries = async () => {
      setLoading(true);
      // Fetch enrollments with certificate expiry dates
      const { data, error } = await supabase
        .from('course_enrollments')
        .select(`
          certificate_expiry,
          employee:crm_employees(first_name, last_name),
          contact:crm_contacts(name, company),
          edition:course_editions(course:courses(name))
        `)
        .not('certificate_expiry', 'is', null)
        .eq('certificate_issued', true)
        .order('certificate_expiry');

      if (error) {
        console.error('Error fetching expiries:', error);
        setLoading(false);
        return;
      }

      const now = new Date();
      const mapped = (data || []).map((d: any) => {
        const expiry = new Date(d.certificate_expiry);
        const diffMs = expiry.getTime() - now.getTime();
        const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
        return {
          employee_name: d.employee ? `${d.employee.first_name} ${d.employee.last_name}` : 'N/D',
          company_name: d.contact?.name || d.contact?.company || 'N/D',
          course_name: d.edition?.course?.name || 'N/D',
          certificate_expiry: d.certificate_expiry,
          days_remaining: days,
        };
      }).sort((a: ExpiryItem, b: ExpiryItem) => a.days_remaining - b.days_remaining);

      setItems(mapped);
      setLoading(false);
    };
    fetchExpiries();
  }, [user]);

  const filtered = items.filter(i =>
    i.employee_name.toLowerCase().includes(search.toLowerCase()) ||
    i.company_name.toLowerCase().includes(search.toLowerCase()) ||
    i.course_name.toLowerCase().includes(search.toLowerCase())
  );

  const expired = filtered.filter(i => i.days_remaining < 0);
  const urgent = filtered.filter(i => i.days_remaining >= 0 && i.days_remaining <= 30);
  const upcoming = filtered.filter(i => i.days_remaining > 30 && i.days_remaining <= 90);
  const valid = filtered.filter(i => i.days_remaining > 90);

  const formatDate = (d: string) => new Date(d).toLocaleDateString('it-IT');

  const renderItem = (item: ExpiryItem) => {
    let icon, color;
    if (item.days_remaining < 0) { icon = <AlertCircle className="h-4 w-4 text-red-500" />; color = "border-l-red-500"; }
    else if (item.days_remaining <= 30) { icon = <AlertTriangle className="h-4 w-4 text-orange-500" />; color = "border-l-orange-500"; }
    else if (item.days_remaining <= 90) { icon = <AlertTriangle className="h-4 w-4 text-yellow-500" />; color = "border-l-yellow-500"; }
    else { icon = <CheckCircle2 className="h-4 w-4 text-green-500" />; color = "border-l-green-500"; }

    return (
      <div key={`${item.employee_name}-${item.course_name}-${item.certificate_expiry}`} className={`flex items-center gap-3 p-3 bg-card rounded-lg border-l-4 ${color}`}>
        {icon}
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm truncate">{item.employee_name}</p>
          <p className="text-xs text-muted-foreground truncate">{item.course_name} • {item.company_name}</p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-xs font-medium">{formatDate(item.certificate_expiry)}</p>
          <p className="text-xs text-muted-foreground">
            {item.days_remaining < 0 ? `Scaduto da ${Math.abs(item.days_remaining)}gg` : `${item.days_remaining}gg`}
          </p>
        </div>
      </div>
    );
  };

  if (loading) return <p className="text-center py-8 text-muted-foreground">Caricamento scadenze...</p>;

  return (
    <div className="space-y-4">
      {/* Stats bar */}
      <div className="flex gap-3 overflow-x-auto scrollbar-none">
        <Badge variant="destructive">{expired.length} Scaduti</Badge>
        <Badge className="bg-orange-100 text-orange-800">{urgent.length} Urgenti (&lt;30gg)</Badge>
        <Badge className="bg-yellow-100 text-yellow-800">{upcoming.length} In scadenza (&lt;90gg)</Badge>
        <Badge className="bg-green-100 text-green-800">{valid.length} Validi</Badge>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Cerca dipendente, corso, azienda..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
      </div>

      {filtered.length === 0 ? (
        <p className="text-center py-8 text-muted-foreground">Nessuna scadenza attestato trovata. Gli attestati appariranno qui quando vengono emessi con data di scadenza.</p>
      ) : (
        <div className="space-y-2 max-h-[60vh] overflow-y-auto">
          {expired.length > 0 && <h4 className="font-semibold text-sm text-red-600 mt-2">🔴 Scaduti</h4>}
          {expired.map(renderItem)}
          {urgent.length > 0 && <h4 className="font-semibold text-sm text-orange-600 mt-2">🟠 Urgenti</h4>}
          {urgent.map(renderItem)}
          {upcoming.length > 0 && <h4 className="font-semibold text-sm text-yellow-600 mt-2">🟡 In scadenza</h4>}
          {upcoming.map(renderItem)}
          {valid.length > 0 && <h4 className="font-semibold text-sm text-green-600 mt-2">🟢 Validi</h4>}
          {valid.map(renderItem)}
        </div>
      )}
    </div>
  );
};

export default CourseExpiryTracker;
