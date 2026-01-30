import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, differenceInDays, isAfter, isBefore, addDays } from 'date-fns';
import { it } from 'date-fns/locale';
import { 
  ArrowLeft, Search, Filter, X, GraduationCap, Stethoscope, 
  Building, User, AlertTriangle, CheckCircle2, Clock, Loader2,
  ArrowUpDown, ArrowUp, ArrowDown, Calendar as CalendarIcon
} from 'lucide-react';
import Header from '@/components/Header';
import BottomNav from '@/components/BottomNav';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';

interface EmployeeActivity {
  id: string;
  activity_name: string;
  activity_type: string;
  expiry_date: string | null;
  execution_date: string | null;
  status: string | null;
  notes: string | null;
  employee: {
    id: string;
    first_name: string;
    last_name: string;
    contact: {
      id: string;
      name: string;
      company: string | null;
    } | null;
  } | null;
}

type StatusFilter = 'all' | 'expired' | 'expiring_soon' | 'valid';
type SortOrder = 'asc' | 'desc' | null;

export default function CRMEmployeeDeadlines() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [activities, setActivities] = useState<EmployeeActivity[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [companyFilter, setCompanyFilter] = useState<string>('all');
  const [activityTypeFilter, setActivityTypeFilter] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);
  
  // Sorting
  const [sortByCompany, setSortByCompany] = useState<SortOrder>(null);
  const [sortByExpiry, setSortByExpiry] = useState<SortOrder>('asc');

  useEffect(() => {
    if (user) {
      fetchActivities();
    }
  }, [user]);

  const fetchActivities = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('crm_employee_activities')
        .select(`
          id,
          activity_name,
          activity_type,
          expiry_date,
          execution_date,
          status,
          notes,
          crm_employees!inner(
            id,
            first_name,
            last_name,
            crm_contacts(
              id,
              name,
              company
            )
          )
        `)
        .eq('user_id', user.id)
        .not('expiry_date', 'is', null);

      if (error) throw error;

      const formattedData: EmployeeActivity[] = (data || []).map((activity: any) => ({
        id: activity.id,
        activity_name: activity.activity_name,
        activity_type: activity.activity_type,
        expiry_date: activity.expiry_date,
        execution_date: activity.execution_date,
        status: activity.status,
        notes: activity.notes,
        employee: activity.crm_employees ? {
          id: activity.crm_employees.id,
          first_name: activity.crm_employees.first_name,
          last_name: activity.crm_employees.last_name,
          contact: activity.crm_employees.crm_contacts
        } : null
      }));

      setActivities(formattedData);
    } catch (error) {
      console.error('Error fetching activities:', error);
    } finally {
      setLoading(false);
    }
  };

  // Extract unique companies for filter dropdown
  const uniqueCompanies = useMemo(() => {
    const companies = new Set<string>();
    activities.forEach(activity => {
      const company = activity.employee?.contact?.company || activity.employee?.contact?.name;
      if (company) companies.add(company);
    });
    return Array.from(companies).sort();
  }, [activities]);

  // Get activity status based on expiry date
  const getActivityStatus = (expiryDate: string | null): StatusFilter => {
    if (!expiryDate) return 'valid';
    const expiry = new Date(expiryDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (isBefore(expiry, today)) return 'expired';
    if (isBefore(expiry, addDays(today, 30))) return 'expiring_soon';
    return 'valid';
  };

  // Filter and sort activities
  const filteredActivities = useMemo(() => {
    let result = activities.filter(activity => {
      // Search filter
      const employeeName = `${activity.employee?.first_name || ''} ${activity.employee?.last_name || ''}`.toLowerCase();
      const companyName = (activity.employee?.contact?.company || activity.employee?.contact?.name || '').toLowerCase();
      const activityName = activity.activity_name.toLowerCase();
      const searchLower = searchQuery.toLowerCase();
      
      const matchesSearch = !searchQuery || 
        employeeName.includes(searchLower) ||
        companyName.includes(searchLower) ||
        activityName.includes(searchLower);

      // Status filter
      const status = getActivityStatus(activity.expiry_date);
      const matchesStatus = statusFilter === 'all' || status === statusFilter;

      // Company filter
      const activityCompany = activity.employee?.contact?.company || activity.employee?.contact?.name || '';
      const matchesCompany = companyFilter === 'all' || activityCompany === companyFilter;

      // Activity type filter
      const matchesType = activityTypeFilter === 'all' || activity.activity_type === activityTypeFilter;

      return matchesSearch && matchesStatus && matchesCompany && matchesType;
    });

    // Sorting
    result.sort((a, b) => {
      // Primary sort by company if selected
      if (sortByCompany) {
        const companyA = (a.employee?.contact?.company || a.employee?.contact?.name || '').toLowerCase();
        const companyB = (b.employee?.contact?.company || b.employee?.contact?.name || '').toLowerCase();
        const companyCompare = companyA.localeCompare(companyB, 'it');
        if (companyCompare !== 0) {
          return sortByCompany === 'asc' ? companyCompare : -companyCompare;
        }
      }

      // Sort by expiry date
      if (sortByExpiry) {
        const dateA = a.expiry_date ? new Date(a.expiry_date).getTime() : Infinity;
        const dateB = b.expiry_date ? new Date(b.expiry_date).getTime() : Infinity;
        return sortByExpiry === 'asc' ? dateA - dateB : dateB - dateA;
      }

      return 0;
    });

    return result;
  }, [activities, searchQuery, statusFilter, companyFilter, activityTypeFilter, sortByCompany, sortByExpiry]);

  // Statistics
  const stats = useMemo(() => {
    const expired = activities.filter(a => getActivityStatus(a.expiry_date) === 'expired').length;
    const expiringSoon = activities.filter(a => getActivityStatus(a.expiry_date) === 'expiring_soon').length;
    const valid = activities.filter(a => getActivityStatus(a.expiry_date) === 'valid').length;
    return { expired, expiringSoon, valid, total: activities.length };
  }, [activities]);

  const hasActiveFilters = statusFilter !== 'all' || companyFilter !== 'all' || activityTypeFilter !== 'all';

  const clearFilters = () => {
    setStatusFilter('all');
    setCompanyFilter('all');
    setActivityTypeFilter('all');
    setSearchQuery('');
  };

  const toggleCompanySort = () => {
    if (sortByCompany === null) setSortByCompany('asc');
    else if (sortByCompany === 'asc') setSortByCompany('desc');
    else setSortByCompany(null);
  };

  const toggleExpirySort = () => {
    if (sortByExpiry === 'asc') setSortByExpiry('desc');
    else setSortByExpiry('asc');
  };

  const getStatusBadge = (expiryDate: string | null) => {
    const status = getActivityStatus(expiryDate);
    switch (status) {
      case 'expired':
        return <Badge variant="destructive" className="gap-1"><AlertTriangle className="h-3 w-3" />Scaduto</Badge>;
      case 'expiring_soon':
        return <Badge variant="outline" className="gap-1 border-yellow-500 text-yellow-700 bg-yellow-50"><Clock className="h-3 w-3" />In scadenza</Badge>;
      case 'valid':
        return <Badge variant="outline" className="gap-1 border-green-500 text-green-700 bg-green-50"><CheckCircle2 className="h-3 w-3" />Valido</Badge>;
    }
  };

  const getDaysUntilExpiry = (expiryDate: string | null) => {
    if (!expiryDate) return null;
    const days = differenceInDays(new Date(expiryDate), new Date());
    if (days < 0) return `${Math.abs(days)} giorni fa`;
    if (days === 0) return 'Oggi';
    if (days === 1) return 'Domani';
    return `Tra ${days} giorni`;
  };

  if (authLoading) {
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
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate('/crm')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <CalendarIcon className="h-6 w-6 text-primary" />
              Scadenze Attività Dipendenti
            </h1>
            <p className="text-muted-foreground text-sm">
              Gestisci formazione e visite mediche
            </p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card 
            className={cn("cursor-pointer transition-all", statusFilter === 'all' && "ring-2 ring-primary")}
            onClick={() => setStatusFilter('all')}
          >
            <CardContent className="pt-4">
              <div className="text-2xl font-bold">{stats.total}</div>
              <p className="text-sm text-muted-foreground">Totale</p>
            </CardContent>
          </Card>
          <Card 
            className={cn("cursor-pointer transition-all border-red-200", statusFilter === 'expired' && "ring-2 ring-destructive")}
            onClick={() => setStatusFilter('expired')}
          >
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-destructive">{stats.expired}</div>
              <p className="text-sm text-muted-foreground">Scadute</p>
            </CardContent>
          </Card>
          <Card 
            className={cn("cursor-pointer transition-all border-yellow-200", statusFilter === 'expiring_soon' && "ring-2 ring-yellow-500")}
            onClick={() => setStatusFilter('expiring_soon')}
          >
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-yellow-600">{stats.expiringSoon}</div>
              <p className="text-sm text-muted-foreground">In scadenza (30gg)</p>
            </CardContent>
          </Card>
          <Card 
            className={cn("cursor-pointer transition-all border-green-200", statusFilter === 'valid' && "ring-2 ring-green-500")}
            onClick={() => setStatusFilter('valid')}
          >
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-green-600">{stats.valid}</div>
              <p className="text-sm text-muted-foreground">Valide</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="mb-4">
          <CardContent className="pt-4">
            <div className="flex gap-4 flex-wrap items-center">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Cerca per dipendente, azienda, attività..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button 
                variant={showFilters ? "secondary" : "outline"} 
                onClick={() => setShowFilters(!showFilters)}
              >
                <Filter className="h-4 w-4 mr-2" />
                Filtri
                {hasActiveFilters && (
                  <Badge variant="secondary" className="ml-2 h-5 w-5 p-0 justify-center">!</Badge>
                )}
              </Button>
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  <X className="h-4 w-4 mr-1" />
                  Pulisci
                </Button>
              )}
            </div>

            {showFilters && (
              <div className="mt-4 pt-4 border-t flex gap-4 flex-wrap">
                <div className="space-y-2">
                  <Label className="text-sm">Azienda</Label>
                  <Select value={companyFilter} onValueChange={setCompanyFilter}>
                    <SelectTrigger className="w-[200px]">
                      <Building className="h-4 w-4 mr-2" />
                      <SelectValue placeholder="Tutte" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tutte le aziende</SelectItem>
                      {uniqueCompanies.map(company => (
                        <SelectItem key={company} value={company}>{company}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm">Tipo Attività</Label>
                  <Select value={activityTypeFilter} onValueChange={setActivityTypeFilter}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Tutti" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tutti i tipi</SelectItem>
                      <SelectItem value="formazione">📚 Formazione</SelectItem>
                      <SelectItem value="visita_medica">🏥 Visita Medica</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Activities Table */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : filteredActivities.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <CalendarIcon className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground">Nessuna attività trovata</p>
              {hasActiveFilters && (
                <Button className="mt-4" variant="outline" onClick={clearFilters}>
                  Pulisci filtri
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Attività</TableHead>
                    <TableHead>Dipendente</TableHead>
                    <TableHead>
                      <Button 
                        variant="ghost" 
                        className="h-auto p-0 font-medium hover:bg-transparent"
                        onClick={toggleCompanySort}
                      >
                        Azienda
                        {sortByCompany === 'asc' ? (
                          <ArrowUp className="ml-1 h-4 w-4" />
                        ) : sortByCompany === 'desc' ? (
                          <ArrowDown className="ml-1 h-4 w-4" />
                        ) : (
                          <ArrowUpDown className="ml-1 h-4 w-4 opacity-50" />
                        )}
                      </Button>
                    </TableHead>
                    <TableHead>
                      <Button 
                        variant="ghost" 
                        className="h-auto p-0 font-medium hover:bg-transparent"
                        onClick={toggleExpirySort}
                      >
                        Scadenza
                        {sortByExpiry === 'asc' ? (
                          <ArrowUp className="ml-1 h-4 w-4" />
                        ) : (
                          <ArrowDown className="ml-1 h-4 w-4" />
                        )}
                      </Button>
                    </TableHead>
                    <TableHead>Stato</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredActivities.map((activity) => (
                    <TableRow 
                      key={activity.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => {
                        if (activity.employee?.contact?.id) {
                          navigate(`/crm/contact/${activity.employee.contact.id}`);
                        }
                      }}
                    >
                      <TableCell>
                        {activity.activity_type === 'formazione' ? (
                          <GraduationCap className="h-5 w-5 text-blue-600" />
                        ) : (
                          <Stethoscope className="h-5 w-5 text-purple-600" />
                        )}
                      </TableCell>
                      <TableCell className="font-medium">{activity.activity_name}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          {activity.employee?.first_name} {activity.employee?.last_name}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Building className="h-4 w-4 text-muted-foreground" />
                          {activity.employee?.contact?.company || activity.employee?.contact?.name || '-'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">
                            {activity.expiry_date ? format(new Date(activity.expiry_date), 'dd/MM/yyyy', { locale: it }) : '-'}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {getDaysUntilExpiry(activity.expiry_date)}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(activity.expiry_date)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </main>

      <BottomNav />
    </div>
  );
}
