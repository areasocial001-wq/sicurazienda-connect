import { useState, useEffect, useMemo, useCallback } from 'react';
import { format, isBefore, startOfDay } from 'date-fns';
import { it } from 'date-fns/locale';
import { 
  MapPin, Users, ChevronDown, ChevronUp, Loader2, 
  Building, Phone, Mail, Calendar, AlertTriangle,
  CheckCircle, Clock, Search, ChevronsUpDown, Pencil, X, Download, Trash2, Filter,
  IdCard, Cake, Briefcase, CalendarCheck, CalendarX, ArrowUpDown, ArrowUp, ArrowDown
} from 'lucide-react';
import { AddEmployeeActivityDialog } from './AddEmployeeActivityDialog';
import { EditEmployeeActivityDialog } from './EditEmployeeActivityDialog';
import { ExportLocationActivities } from './ExportLocationActivities';
import { CRMEmployeeActivitiesImport } from './CRMEmployeeActivitiesImport';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Collapsible, 
  CollapsibleContent, 
  CollapsibleTrigger 
} from '@/components/ui/collapsible';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface Location {
  id: string;
  name: string;
  code?: string;
  address?: string;
  city?: string;
  province?: string;
  phone?: string;
  email?: string;
  pec?: string;
}

interface Employee {
  id: string;
  first_name: string;
  last_name: string;
  location_id: string;
  fiscal_code?: string | null;
  birth_date?: string | null;
  birth_place?: string | null;
  hire_date?: string | null;
  termination_date?: string | null;
  role?: string | null;
  status?: string | null;
  email?: string | null;
  phone?: string | null;
}

interface EmployeeActivity {
  id: string;
  employee_id: string;
  activity_type: string;
  activity_name: string;
  status: string;
  execution_date?: string;
  expiry_date?: string;
}

interface ContactLocationsEmployeesProps {
  contactId: string;
}

interface PendingDateChange {
  activityId: string;
  activityName: string;
  dateType: 'execution_date' | 'expiry_date';
  oldDate: string | undefined;
  newDate: Date;
}

interface ActivityFilters {
  types: string[];
  statuses: string[];
}

interface EmployeeFilters {
  roles: string[];
  statuses: ('active' | 'inactive')[];
}

type EmployeeSortField = 'name' | 'fiscal_code' | 'hire_date' | 'termination_date';
type SortDirection = 'asc' | 'desc';
interface EmployeeSort {
  field: EmployeeSortField;
  direction: SortDirection;
}

interface PendingDelete {
  activityId: string;
  activityName: string;
  employeeName: string;
}

const activityTypeLabels: Record<string, string> = {
  formazione: 'Formazione',
  visita: 'Visita Medica',
  visita_medica: 'Visita Medica',
  cartella_sanitaria: 'Cartella Sanitaria',
};

export function ContactLocationsEmployees({ contactId }: ContactLocationsEmployeesProps) {
  const [locations, setLocations] = useState<Location[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [activities, setActivities] = useState<EmployeeActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedLocations, setExpandedLocations] = useState<Set<string>>(new Set());
  const [expandedEmployees, setExpandedEmployees] = useState<Set<string>>(new Set());
  const [searchQueries, setSearchQueries] = useState<Record<string, string>>({});
  const [pendingDateChange, setPendingDateChange] = useState<PendingDateChange | null>(null);
  const [pendingDelete, setPendingDelete] = useState<PendingDelete | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [activityFilters, setActivityFilters] = useState<Record<string, ActivityFilters>>({});
  const [employeeFilters, setEmployeeFilters] = useState<Record<string, EmployeeFilters>>({});
  const [employeeSorts, setEmployeeSorts] = useState<Record<string, EmployeeSort>>({});

  useEffect(() => {
    fetchData();
  }, [contactId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [locationsRes, employeesRes] = await Promise.all([
        supabase
          .from('crm_locations')
          .select('id, name, code, address, city, province, phone, email, pec')
          .eq('contact_id', contactId)
          .order('name'),
        supabase
          .from('crm_employees')
          .select('id, first_name, last_name, location_id, fiscal_code, birth_date, birth_place, hire_date, termination_date, role, status, email, phone')
          .eq('contact_id', contactId)
          .order('last_name'),
      ]);

      if (locationsRes.error) throw locationsRes.error;
      if (employeesRes.error) throw employeesRes.error;

      setLocations(locationsRes.data || []);
      setEmployees(employeesRes.data || []);

      // Fetch activities for all employees
      if (employeesRes.data && employeesRes.data.length > 0) {
        const employeeIds = employeesRes.data.map(e => e.id);
        const { data: activitiesData } = await supabase
          .from('crm_employee_activities')
          .select('id, employee_id, activity_type, activity_name, status, execution_date, expiry_date')
          .in('employee_id', employeeIds)
          .order('expiry_date', { ascending: true });
        
        setActivities(activitiesData || []);
      }
    } catch (error) {
      console.error('Error fetching locations/employees:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleLocation = (locationId: string) => {
    const newExpanded = new Set(expandedLocations);
    if (newExpanded.has(locationId)) {
      newExpanded.delete(locationId);
    } else {
      newExpanded.add(locationId);
    }
    setExpandedLocations(newExpanded);
  };

  const toggleEmployee = (employeeId: string) => {
    const newExpanded = new Set(expandedEmployees);
    if (newExpanded.has(employeeId)) {
      newExpanded.delete(employeeId);
    } else {
      newExpanded.add(employeeId);
    }
    setExpandedEmployees(newExpanded);
  };

  const expandAllEmployeesForLocation = (locationId: string) => {
    const locationEmployees = getEmployeesForLocation(locationId);
    const newExpanded = new Set(expandedEmployees);
    const allExpanded = locationEmployees.every(e => newExpanded.has(e.id));
    
    if (allExpanded) {
      // Collapse all
      locationEmployees.forEach(e => newExpanded.delete(e.id));
    } else {
      // Expand all
      locationEmployees.forEach(e => newExpanded.add(e.id));
    }
    setExpandedEmployees(newExpanded);
  };

  const getEmployeesForLocation = (locationId: string) => {
    return employees.filter(e => e.location_id === locationId);
  };

  const getFilteredEmployeesForLocation = (locationId: string) => {
    const locationEmployees = getEmployeesForLocation(locationId);
    const query = (searchQueries[locationId] || '').toLowerCase().trim();
    const filters = getEmployeeFilters(locationId);

    const filtered = locationEmployees.filter(e => {
      // Text search: name + CF
      const matchesQuery = !query ||
        `${e.first_name} ${e.last_name}`.toLowerCase().includes(query) ||
        `${e.last_name} ${e.first_name}`.toLowerCase().includes(query) ||
        (e.fiscal_code || '').toLowerCase().includes(query);

      const matchesRole = filters.roles.length === 0 ||
        (e.role && filters.roles.includes(e.role));

      const empStatus: 'active' | 'inactive' = e.termination_date || e.status === 'inactive' ? 'inactive' : 'active';
      const matchesStatus = filters.statuses.length === 0 || filters.statuses.includes(empStatus);

      return matchesQuery && matchesRole && matchesStatus;
    });

    const sort = getEmployeeSort(locationId);
    const dir = sort.direction === 'asc' ? 1 : -1;
    const compareStrings = (a?: string | null, b?: string | null) => {
      const aEmpty = !a;
      const bEmpty = !b;
      if (aEmpty && bEmpty) return 0;
      if (aEmpty) return 1; // empties always last
      if (bEmpty) return -1;
      return a!.localeCompare(b!) * dir;
    };

    return [...filtered].sort((a, b) => {
      switch (sort.field) {
        case 'fiscal_code':
          return compareStrings(a.fiscal_code, b.fiscal_code);
        case 'hire_date':
          return compareStrings(a.hire_date, b.hire_date);
        case 'termination_date':
          return compareStrings(a.termination_date, b.termination_date);
        case 'name':
        default:
          return compareStrings(
            `${a.last_name} ${a.first_name}`,
            `${b.last_name} ${b.first_name}`
          );
      }
    });
  };

  const getEmployeeSort = (locationId: string): EmployeeSort => {
    return employeeSorts[locationId] || { field: 'name', direction: 'asc' };
  };

  const setEmployeeSort = (locationId: string, field: EmployeeSortField) => {
    const current = getEmployeeSort(locationId);
    const next: EmployeeSort = current.field === field
      ? { field, direction: current.direction === 'asc' ? 'desc' : 'asc' }
      : { field, direction: 'asc' };
    setEmployeeSorts(prev => ({ ...prev, [locationId]: next }));
  };

  const getEmployeeFilters = (locationId: string): EmployeeFilters => {
    return employeeFilters[locationId] || { roles: [], statuses: [] };
  };

  const toggleEmployeeRoleFilter = (locationId: string, role: string) => {
    const current = getEmployeeFilters(locationId);
    const next = current.roles.includes(role)
      ? current.roles.filter(r => r !== role)
      : [...current.roles, role];
    setEmployeeFilters(prev => ({ ...prev, [locationId]: { ...current, roles: next } }));
  };

  const toggleEmployeeStatusFilter = (locationId: string, status: 'active' | 'inactive') => {
    const current = getEmployeeFilters(locationId);
    const next = current.statuses.includes(status)
      ? current.statuses.filter(s => s !== status)
      : [...current.statuses, status];
    setEmployeeFilters(prev => ({ ...prev, [locationId]: { ...current, statuses: next } }));
  };

  const getRolesForLocation = (locationId: string): string[] => {
    const set = new Set<string>();
    getEmployeesForLocation(locationId).forEach(e => {
      if (e.role) set.add(e.role);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  };

  const getActiveEmployeeFiltersCount = (locationId: string) => {
    const f = getEmployeeFilters(locationId);
    return f.roles.length + f.statuses.length;
  };

  const getActivitiesForEmployee = (employeeId: string) => {
    return activities.filter(a => a.employee_id === employeeId);
  };

  const getExpiryStatus = (expiryDate?: string) => {
    if (!expiryDate) return null;
    const today = startOfDay(new Date());
    const expiry = new Date(expiryDate);
    
    if (isBefore(expiry, today)) {
      return 'expired';
    }
    
    const thirtyDaysFromNow = new Date(today);
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    
    if (isBefore(expiry, thirtyDaysFromNow)) {
      return 'expiring';
    }
    
    return 'valid';
  };

  const countExpiringActivities = (employeeId: string) => {
    const empActivities = getActivitiesForEmployee(employeeId);
    return empActivities.filter(a => {
      const status = getExpiryStatus(a.expiry_date);
      return status === 'expired' || status === 'expiring';
    }).length;
  };

  const handleDateSelect = (
    activityId: string, 
    activityName: string, 
    dateType: 'execution_date' | 'expiry_date',
    oldDate: string | undefined,
    newDate: Date | undefined
  ) => {
    if (!newDate) return;
    
    setPendingDateChange({
      activityId,
      activityName,
      dateType,
      oldDate,
      newDate
    });
  };

  const confirmDateChange = useCallback(async () => {
    if (!pendingDateChange) return;
    
    const { activityId, dateType, newDate } = pendingDateChange;
    setUpdatingId(activityId);
    
    try {
      const formattedDate = format(newDate, 'yyyy-MM-dd');
      
      const { error } = await supabase
        .from('crm_employee_activities')
        .update({ [dateType]: formattedDate })
        .eq('id', activityId);

      if (error) throw error;

      // Update local state
      setActivities(prev => prev.map(activity => 
        activity.id === activityId 
          ? { ...activity, [dateType]: formattedDate }
          : activity
      ));

      toast.success(dateType === 'expiry_date' ? 'Data di scadenza aggiornata' : 'Data di esecuzione aggiornata');
    } catch (error) {
      console.error('Error updating date:', error);
      toast.error('Errore durante l\'aggiornamento');
    } finally {
      setUpdatingId(null);
      setPendingDateChange(null);
    }
  }, [pendingDateChange]);

  const updateSearchQuery = (locationId: string, query: string) => {
    setSearchQueries(prev => ({ ...prev, [locationId]: query }));
  };

  const getLocationFilters = (locationId: string): ActivityFilters => {
    return activityFilters[locationId] || { types: [], statuses: [] };
  };

  const updateActivityFilters = (locationId: string, filters: Partial<ActivityFilters>) => {
    setActivityFilters(prev => ({
      ...prev,
      [locationId]: { ...getLocationFilters(locationId), ...filters }
    }));
  };

  const toggleTypeFilter = (locationId: string, type: string) => {
    const current = getLocationFilters(locationId);
    const newTypes = current.types.includes(type)
      ? current.types.filter(t => t !== type)
      : [...current.types, type];
    updateActivityFilters(locationId, { types: newTypes });
  };

  const toggleStatusFilter = (locationId: string, status: string) => {
    const current = getLocationFilters(locationId);
    const newStatuses = current.statuses.includes(status)
      ? current.statuses.filter(s => s !== status)
      : [...current.statuses, status];
    updateActivityFilters(locationId, { statuses: newStatuses });
  };

  const getFilteredActivitiesForEmployee = (employeeId: string, locationId: string) => {
    const empActivities = getActivitiesForEmployee(employeeId);
    const filters = getLocationFilters(locationId);
    
    if (filters.types.length === 0 && filters.statuses.length === 0) {
      return empActivities;
    }
    
    return empActivities.filter(activity => {
      const matchesType = filters.types.length === 0 || 
        filters.types.includes(activity.activity_type);
      
      const status = getExpiryStatus(activity.expiry_date);
      const matchesStatus = filters.statuses.length === 0 ||
        (filters.statuses.includes('expired') && status === 'expired') ||
        (filters.statuses.includes('expiring') && status === 'expiring') ||
        (filters.statuses.includes('valid') && status === 'valid');
      
      return matchesType && matchesStatus;
    });
  };

  const handleDeleteActivity = async () => {
    if (!pendingDelete) return;
    
    setUpdatingId(pendingDelete.activityId);
    
    try {
      const { error } = await supabase
        .from('crm_employee_activities')
        .delete()
        .eq('id', pendingDelete.activityId);

      if (error) throw error;

      setActivities(prev => prev.filter(a => a.id !== pendingDelete.activityId));
      toast.success('Attività eliminata');
    } catch (error) {
      console.error('Error deleting activity:', error);
      toast.error('Errore durante l\'eliminazione');
    } finally {
      setUpdatingId(null);
      setPendingDelete(null);
    }
  };

  const getActiveFiltersCount = (locationId: string) => {
    const filters = getLocationFilters(locationId);
    return filters.types.length + filters.statuses.length;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (locations.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <MapPin className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-30" />
          <p className="text-muted-foreground">Nessuna sede registrata</p>
          <p className="text-xs text-muted-foreground mt-1">
            Importa le sedi dal CRM principale
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="font-semibold flex items-center gap-2">
          <MapPin className="h-5 w-5 text-primary" />
          Sedi e Dipendenti
        </h3>
        <div className="flex items-center gap-2">
          <CRMEmployeeActivitiesImport contactId={contactId} onImportComplete={fetchData} />
          <Badge variant="secondary">
            {locations.length} sedi, {employees.length} dipendenti
          </Badge>
        </div>
      </div>

      <div className="space-y-3">
        {locations.map((location) => {
          const locationEmployees = getEmployeesForLocation(location.id);
          const filteredEmployees = getFilteredEmployeesForLocation(location.id);
          const isExpanded = expandedLocations.has(location.id);
          const allEmployeesExpanded = locationEmployees.length > 0 && 
            locationEmployees.every(e => expandedEmployees.has(e.id));
          const searchQuery = searchQueries[location.id] || '';

          return (
            <Card key={location.id}>
              <Collapsible open={isExpanded} onOpenChange={() => toggleLocation(location.id)}>
                <CollapsibleTrigger asChild>
                  <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors py-3">
                    <CardTitle className="text-base flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Building className="h-4 w-4 text-primary" />
                        <span>{location.name}</span>
                        {location.code && (
                          <Badge variant="outline" className="text-xs">
                            {location.code}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs">
                          <Users className="h-3 w-3 mr-1" />
                          {locationEmployees.length}
                        </Badge>
                        {isExpanded ? (
                          <ChevronUp className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                    </CardTitle>
                    {(location.address || location.city) && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {[location.address, location.city, location.province].filter(Boolean).join(', ')}
                      </p>
                    )}
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="pt-0 pb-3">
                    {/* Location contact info */}
                    {(location.phone || location.email || location.pec) && (
                      <div className="flex flex-wrap gap-4 text-xs text-muted-foreground mb-3 pb-3 border-b">
                        {location.phone && (
                          <span className="flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {location.phone}
                          </span>
                        )}
                        {location.email && (
                          <span className="flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            {location.email}
                          </span>
                        )}
                        {location.pec && (
                          <span className="flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            PEC: {location.pec}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Employees */}
                    {locationEmployees.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        Nessun dipendente registrato
                      </p>
                    ) : (
                      <>
                        {/* Search and Expand All */}
                        <div className="flex items-center gap-2 mb-3">
                          <div className="relative flex-1">
                            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                              placeholder="Cerca per nome o CF..."
                              value={searchQuery}
                              onChange={(e) => updateSearchQuery(location.id, e.target.value)}
                              className="pl-8 h-8 text-sm"
                            />
                            {searchQuery && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6"
                                onClick={() => updateSearchQuery(location.id, '')}
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                          {/* Employee filters: role + status */}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                className="gap-1 text-xs h-8"
                              >
                                <Users className="h-3 w-3" />
                                Dipendenti
                                {getActiveEmployeeFiltersCount(location.id) > 0 && (
                                  <Badge variant="secondary" className="ml-1 h-4 px-1 text-[10px]">
                                    {getActiveEmployeeFiltersCount(location.id)}
                                  </Badge>
                                )}
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-56 max-h-80 overflow-y-auto">
                              <DropdownMenuLabel>Stato</DropdownMenuLabel>
                              <DropdownMenuCheckboxItem
                                checked={getEmployeeFilters(location.id).statuses.includes('active')}
                                onCheckedChange={() => toggleEmployeeStatusFilter(location.id, 'active')}
                              >
                                <span className="flex items-center gap-2">
                                  <CheckCircle className="h-3 w-3 text-green-600" />
                                  Attivo
                                </span>
                              </DropdownMenuCheckboxItem>
                              <DropdownMenuCheckboxItem
                                checked={getEmployeeFilters(location.id).statuses.includes('inactive')}
                                onCheckedChange={() => toggleEmployeeStatusFilter(location.id, 'inactive')}
                              >
                                <span className="flex items-center gap-2">
                                  <CalendarX className="h-3 w-3 text-red-600" />
                                  Inattivo / Cessato
                                </span>
                              </DropdownMenuCheckboxItem>
                              {getRolesForLocation(location.id).length > 0 && (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuLabel>Mansione</DropdownMenuLabel>
                                  {getRolesForLocation(location.id).map(role => (
                                    <DropdownMenuCheckboxItem
                                      key={role}
                                      checked={getEmployeeFilters(location.id).roles.includes(role)}
                                      onCheckedChange={() => toggleEmployeeRoleFilter(location.id, role)}
                                    >
                                      <span className="truncate">{role}</span>
                                    </DropdownMenuCheckboxItem>
                                  ))}
                                </>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                className="gap-1 text-xs h-8"
                              >
                                <Filter className="h-3 w-3" />
                                Attività
                                {getActiveFiltersCount(location.id) > 0 && (
                                  <Badge variant="secondary" className="ml-1 h-4 px-1 text-[10px]">
                                    {getActiveFiltersCount(location.id)}
                                  </Badge>
                                )}
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                              <DropdownMenuLabel>Tipo Attività</DropdownMenuLabel>
                              <DropdownMenuCheckboxItem
                                checked={getLocationFilters(location.id).types.includes('formazione')}
                                onCheckedChange={() => toggleTypeFilter(location.id, 'formazione')}
                              >
                                Formazione
                              </DropdownMenuCheckboxItem>
                              <DropdownMenuCheckboxItem
                                checked={getLocationFilters(location.id).types.includes('visita_medica')}
                                onCheckedChange={() => toggleTypeFilter(location.id, 'visita_medica')}
                              >
                                Visita Medica
                              </DropdownMenuCheckboxItem>
                              <DropdownMenuCheckboxItem
                                checked={getLocationFilters(location.id).types.includes('cartella_sanitaria')}
                                onCheckedChange={() => toggleTypeFilter(location.id, 'cartella_sanitaria')}
                              >
                                Cartella Sanitaria
                              </DropdownMenuCheckboxItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuLabel>Stato Scadenza</DropdownMenuLabel>
                              <DropdownMenuCheckboxItem
                                checked={getLocationFilters(location.id).statuses.includes('expired')}
                                onCheckedChange={() => toggleStatusFilter(location.id, 'expired')}
                              >
                                <span className="flex items-center gap-2">
                                  <AlertTriangle className="h-3 w-3 text-red-500" />
                                  Scaduto
                                </span>
                              </DropdownMenuCheckboxItem>
                              <DropdownMenuCheckboxItem
                                checked={getLocationFilters(location.id).statuses.includes('expiring')}
                                onCheckedChange={() => toggleStatusFilter(location.id, 'expiring')}
                              >
                                <span className="flex items-center gap-2">
                                  <Clock className="h-3 w-3 text-yellow-500" />
                                  In scadenza (&lt;30gg)
                                </span>
                              </DropdownMenuCheckboxItem>
                              <DropdownMenuCheckboxItem
                                checked={getLocationFilters(location.id).statuses.includes('valid')}
                                onCheckedChange={() => toggleStatusFilter(location.id, 'valid')}
                              >
                                <span className="flex items-center gap-2">
                                  <CheckCircle className="h-3 w-3 text-green-500" />
                                  Valido
                                </span>
                              </DropdownMenuCheckboxItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                          {/* Employee sort */}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                className="gap-1 text-xs h-8"
                              >
                                {getEmployeeSort(location.id).direction === 'asc' ? (
                                  <ArrowUp className="h-3 w-3" />
                                ) : (
                                  <ArrowDown className="h-3 w-3" />
                                )}
                                Ordina
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-56">
                              <DropdownMenuLabel>Ordina dipendenti per</DropdownMenuLabel>
                              {([
                                { field: 'name' as const, label: 'Nome' },
                                { field: 'fiscal_code' as const, label: 'Codice Fiscale' },
                                { field: 'hire_date' as const, label: 'Data assunzione' },
                                { field: 'termination_date' as const, label: 'Data cessazione' },
                              ]).map(opt => {
                                const sort = getEmployeeSort(location.id);
                                const active = sort.field === opt.field;
                                return (
                                  <DropdownMenuCheckboxItem
                                    key={opt.field}
                                    checked={active}
                                    onCheckedChange={() => setEmployeeSort(location.id, opt.field)}
                                    onSelect={(e) => e.preventDefault()}
                                  >
                                    <span className="flex items-center justify-between gap-2 w-full">
                                      <span>{opt.label}</span>
                                      {active ? (
                                        sort.direction === 'asc' ? (
                                          <ArrowUp className="h-3 w-3 text-muted-foreground" />
                                        ) : (
                                          <ArrowDown className="h-3 w-3 text-muted-foreground" />
                                        )
                                      ) : (
                                        <ArrowUpDown className="h-3 w-3 text-muted-foreground/40" />
                                      )}
                                    </span>
                                  </DropdownMenuCheckboxItem>
                                );
                              })}
                            </DropdownMenuContent>
                          </DropdownMenu>
                          <Button
                            variant="outline"
                            size="sm"
                            className="gap-1 text-xs h-8"
                            onClick={() => expandAllEmployeesForLocation(location.id)}
                          >
                            <ChevronsUpDown className="h-3 w-3" />
                            {allEmployeesExpanded ? 'Chiudi tutti' : 'Espandi tutti'}
                          </Button>
                          <ExportLocationActivities
                            locationId={location.id}
                            locationName={location.name}
                            employees={locationEmployees}
                            activities={activities.filter(a => 
                              locationEmployees.some(e => e.id === a.employee_id)
                            )}
                          />
                        </div>

                        {filteredEmployees.length === 0 ? (
                          <p className="text-sm text-muted-foreground text-center py-4">
                            Nessun dipendente trovato per "{searchQuery}"
                          </p>
                        ) : (
                          <div className="max-h-[60vh] overflow-y-auto pr-2">
                            <div className="space-y-2">
                              {filteredEmployees.map((employee) => {
                                const empActivities = getFilteredActivitiesForEmployee(employee.id, location.id);
                                const expiringCount = countExpiringActivities(employee.id);
                                const isEmpExpanded = expandedEmployees.has(employee.id);

                                return (
                                  <Collapsible 
                                    key={employee.id}
                                    open={isEmpExpanded}
                                    onOpenChange={() => toggleEmployee(employee.id)}
                                  >
                                    <CollapsibleTrigger asChild>
                                      <div className="p-2 border rounded hover:bg-muted/30 cursor-pointer transition-colors">
                                        <div className="flex items-center justify-between gap-2">
                                          <div className="flex flex-col min-w-0 flex-1">
                                            <div className="flex items-center gap-2 flex-wrap">
                                              <span className="font-medium text-sm">
                                                {employee.last_name} {employee.first_name}
                                              </span>
                                              {(employee.termination_date || employee.status === 'inactive') ? (
                                                <Badge variant="outline" className="text-[10px] h-4 px-1 border-red-300 text-red-700 dark:text-red-400">
                                                  Inattivo
                                                </Badge>
                                              ) : (
                                                <Badge variant="outline" className="text-[10px] h-4 px-1 border-green-300 text-green-700 dark:text-green-400">
                                                  Attivo
                                                </Badge>
                                              )}
                                              {employee.role && (
                                                <span className="text-xs text-muted-foreground flex items-center gap-1">
                                                  <Briefcase className="h-3 w-3" />
                                                  {employee.role}
                                                </span>
                                              )}
                                            </div>
                                            <div className="flex items-center gap-3 text-[11px] text-muted-foreground mt-0.5 flex-wrap">
                                              {employee.fiscal_code && (
                                                <span className="font-mono flex items-center gap-1">
                                                  <IdCard className="h-3 w-3" />
                                                  {employee.fiscal_code}
                                                </span>
                                              )}
                                              {employee.hire_date && (
                                                <span className="flex items-center gap-1">
                                                  <CalendarCheck className="h-3 w-3 text-green-600" />
                                                  Ass. {format(new Date(employee.hire_date), 'dd/MM/yy')}
                                                </span>
                                              )}
                                              {employee.termination_date && (
                                                <span className="flex items-center gap-1">
                                                  <CalendarX className="h-3 w-3 text-red-600" />
                                                  Cess. {format(new Date(employee.termination_date), 'dd/MM/yy')}
                                                </span>
                                              )}
                                            </div>
                                          </div>
                                          <div className="flex items-center gap-2 flex-shrink-0">
                                            {expiringCount > 0 && (
                                              <Badge variant="destructive" className="text-xs">
                                                <AlertTriangle className="h-3 w-3 mr-1" />
                                                {expiringCount}
                                              </Badge>
                                            )}
                                            <Badge variant="outline" className="text-xs">
                                              {empActivities.length} attività
                                            </Badge>
                                            {isEmpExpanded ? (
                                              <ChevronUp className="h-3 w-3 text-muted-foreground" />
                                            ) : (
                                              <ChevronDown className="h-3 w-3 text-muted-foreground" />
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                    </CollapsibleTrigger>
                                    <CollapsibleContent>
                                      <div className="ml-4 mt-2 space-y-1">
                                        {/* Employee details panel */}
                                        {(employee.fiscal_code || employee.birth_date || employee.birth_place || employee.hire_date || employee.termination_date || employee.role) && (
                                          <div className="mb-2 p-2 rounded bg-muted/40 border text-xs grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-1">
                                            {employee.fiscal_code && (
                                              <div className="flex items-center gap-1.5 text-muted-foreground">
                                                <IdCard className="h-3 w-3 flex-shrink-0" />
                                                <span className="font-medium text-foreground">CF:</span>
                                                <span className="font-mono truncate">{employee.fiscal_code}</span>
                                              </div>
                                            )}
                                            {employee.role && (
                                              <div className="flex items-center gap-1.5 text-muted-foreground">
                                                <Briefcase className="h-3 w-3 flex-shrink-0" />
                                                <span className="font-medium text-foreground">Mansione:</span>
                                                <span className="truncate">{employee.role}</span>
                                              </div>
                                            )}
                                            {employee.birth_date && (
                                              <div className="flex items-center gap-1.5 text-muted-foreground">
                                                <Cake className="h-3 w-3 flex-shrink-0" />
                                                <span className="font-medium text-foreground">Nato il:</span>
                                                <span>{format(new Date(employee.birth_date), 'dd/MM/yyyy')}</span>
                                                {employee.birth_place && <span>· {employee.birth_place}</span>}
                                              </div>
                                            )}
                                            {!employee.birth_date && employee.birth_place && (
                                              <div className="flex items-center gap-1.5 text-muted-foreground">
                                                <MapPin className="h-3 w-3 flex-shrink-0" />
                                                <span className="font-medium text-foreground">Luogo nascita:</span>
                                                <span>{employee.birth_place}</span>
                                              </div>
                                            )}
                                            {employee.hire_date && (
                                              <div className="flex items-center gap-1.5 text-muted-foreground">
                                                <CalendarCheck className="h-3 w-3 flex-shrink-0 text-green-600" />
                                                <span className="font-medium text-foreground">Assunzione:</span>
                                                <span>{format(new Date(employee.hire_date), 'dd/MM/yyyy')}</span>
                                              </div>
                                            )}
                                            {employee.termination_date && (
                                              <div className="flex items-center gap-1.5 text-muted-foreground">
                                                <CalendarX className="h-3 w-3 flex-shrink-0 text-red-600" />
                                                <span className="font-medium text-foreground">Cessazione:</span>
                                                <span>{format(new Date(employee.termination_date), 'dd/MM/yyyy')}</span>
                                              </div>
                                            )}
                                            {(employee.email || employee.phone) && (
                                              <div className="flex items-center gap-3 text-muted-foreground sm:col-span-2 pt-1 mt-1 border-t border-border/50">
                                                {employee.email && (
                                                  <span className="flex items-center gap-1 truncate">
                                                    <Mail className="h-3 w-3 flex-shrink-0" />{employee.email}
                                                  </span>
                                                )}
                                                {employee.phone && (
                                                  <span className="flex items-center gap-1">
                                                    <Phone className="h-3 w-3 flex-shrink-0" />{employee.phone}
                                                  </span>
                                                )}
                                              </div>
                                            )}
                                          </div>
                                        )}
                                        {empActivities.map((activity) => {
                                          const expiryStatus = getExpiryStatus(activity.expiry_date);
                                          return (
                                            <div 
                                              key={activity.id}
                                              className={cn(
                                                "p-2 text-xs border-l-2 pl-3 rounded-r",
                                                expiryStatus === 'expired' && "border-l-red-500 bg-red-50 dark:bg-red-950/20",
                                                expiryStatus === 'expiring' && "border-l-yellow-500 bg-yellow-50 dark:bg-yellow-950/20",
                                                expiryStatus === 'valid' && "border-l-green-500 bg-green-50 dark:bg-green-950/20",
                                                !expiryStatus && "border-l-gray-300"
                                              )}
                                            >
                                              <div className="flex items-start justify-between gap-2">
                                                <div className="flex-1 min-w-0">
                                                  <p className="font-medium truncate">
                                                    {activity.activity_name}
                                                  </p>
                                                  <p className="text-muted-foreground">
                                                    {activityTypeLabels[activity.activity_type] || activity.activity_type}
                                                  </p>
                                                </div>
                                                <div className="flex items-start gap-2">
                                                  <div className="text-right flex-shrink-0 space-y-1">
                                                  {/* Execution Date */}
                                                  <div className="flex items-center gap-1 text-muted-foreground">
                                                    <span className="text-[10px]">Esec:</span>
                                                    <Popover>
                                                      <PopoverTrigger asChild>
                                                        <Button
                                                          variant="ghost"
                                                          size="sm"
                                                          className="h-5 px-1 text-xs gap-1"
                                                          disabled={updatingId === activity.id}
                                                        >
                                                          {updatingId === activity.id ? (
                                                            <Loader2 className="h-3 w-3 animate-spin" />
                                                          ) : (
                                                            <>
                                                              {activity.execution_date 
                                                                ? format(new Date(activity.execution_date), 'dd/MM/yy')
                                                                : '-'
                                                              }
                                                              <Pencil className="h-2.5 w-2.5" />
                                                            </>
                                                          )}
                                                        </Button>
                                                      </PopoverTrigger>
                                                      <PopoverContent className="w-auto p-0" align="end">
                                                        <CalendarComponent
                                                          mode="single"
                                                          selected={activity.execution_date ? new Date(activity.execution_date) : undefined}
                                                          onSelect={(date) => handleDateSelect(
                                                            activity.id, 
                                                            activity.activity_name, 
                                                            'execution_date',
                                                            activity.execution_date,
                                                            date
                                                          )}
                                                          initialFocus
                                                          locale={it}
                                                          className="pointer-events-auto"
                                                        />
                                                      </PopoverContent>
                                                    </Popover>
                                                  </div>
                                                  {/* Expiry Date */}
                                                  {activity.expiry_date && (
                                                    <div className={cn(
                                                      "flex items-center gap-1",
                                                      expiryStatus === 'expired' && "text-red-600",
                                                      expiryStatus === 'expiring' && "text-yellow-600",
                                                      expiryStatus === 'valid' && "text-green-600"
                                                    )}>
                                                      <span className="text-[10px]">Scad:</span>
                                                      {expiryStatus === 'expired' ? (
                                                        <AlertTriangle className="h-3 w-3" />
                                                      ) : expiryStatus === 'expiring' ? (
                                                        <Clock className="h-3 w-3" />
                                                      ) : (
                                                        <CheckCircle className="h-3 w-3" />
                                                      )}
                                                      <Popover>
                                                        <PopoverTrigger asChild>
                                                          <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className={cn(
                                                              "h-5 px-1 text-xs gap-1",
                                                              expiryStatus === 'expired' && "text-red-600 hover:text-red-700",
                                                              expiryStatus === 'expiring' && "text-yellow-600 hover:text-yellow-700",
                                                              expiryStatus === 'valid' && "text-green-600 hover:text-green-700"
                                                            )}
                                                            disabled={updatingId === activity.id}
                                                          >
                                                            {updatingId === activity.id ? (
                                                              <Loader2 className="h-3 w-3 animate-spin" />
                                                            ) : (
                                                              <>
                                                                {format(new Date(activity.expiry_date), 'dd/MM/yy')}
                                                                <Pencil className="h-2.5 w-2.5" />
                                                              </>
                                                            )}
                                                          </Button>
                                                        </PopoverTrigger>
                                                        <PopoverContent className="w-auto p-0" align="end">
                                                          <CalendarComponent
                                                            mode="single"
                                                            selected={new Date(activity.expiry_date)}
                                                            onSelect={(date) => handleDateSelect(
                                                              activity.id, 
                                                              activity.activity_name, 
                                                              'expiry_date',
                                                              activity.expiry_date,
                                                              date
                                                            )}
                                                            initialFocus
                                                            locale={it}
                                                            className="pointer-events-auto"
                                                          />
                                                        </PopoverContent>
                                                      </Popover>
                                                    </div>
                                                  )}
                                                </div>
                                                <div className="flex items-center gap-1 flex-shrink-0">
                                                  <EditEmployeeActivityDialog
                                                    activityId={activity.id}
                                                    activityName={activity.activity_name}
                                                    activityType={activity.activity_type}
                                                    onActivityUpdated={fetchData}
                                                  />
                                                  <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-6 w-6 text-muted-foreground hover:text-destructive flex-shrink-0"
                                                    onClick={(e) => {
                                                      e.stopPropagation();
                                                      setPendingDelete({
                                                        activityId: activity.id,
                                                        activityName: activity.activity_name,
                                                        employeeName: `${employee.first_name} ${employee.last_name}`
                                                      });
                                                    }}
                                                    disabled={updatingId === activity.id}
                                                  >
                                                    <Trash2 className="h-3 w-3" />
                                                  </Button>
                                                </div>
                                                </div>
                                              </div>
                                            </div>
                                          );
                                        })}
                                        <div className="pt-2 border-t mt-2">
                                          <AddEmployeeActivityDialog
                                            employeeId={employee.id}
                                            employeeName={`${employee.first_name} ${employee.last_name}`}
                                            onActivityAdded={fetchData}
                                          />
                                        </div>
                                      </div>
                                    </CollapsibleContent>
                                  </Collapsible>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </CardContent>
                </CollapsibleContent>
              </Collapsible>
            </Card>
          );
        })}
      </div>

      {/* Confirmation Dialog */}
      <AlertDialog open={!!pendingDateChange} onOpenChange={() => setPendingDateChange(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Conferma modifica data</AlertDialogTitle>
            <AlertDialogDescription>
              Stai per modificare la{' '}
              <strong>{pendingDateChange?.dateType === 'expiry_date' ? 'data di scadenza' : 'data di esecuzione'}</strong>
              {' '}dell'attività "<strong>{pendingDateChange?.activityName}</strong>".
              <br /><br />
              <span className="text-muted-foreground">
                {pendingDateChange?.oldDate 
                  ? `Da: ${format(new Date(pendingDateChange.oldDate), 'dd/MM/yyyy')}`
                  : 'Da: Non impostata'
                }
              </span>
              <br />
              <span className="text-primary font-medium">
                A: {pendingDateChange?.newDate && format(pendingDateChange.newDate, 'dd/MM/yyyy')}
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDateChange}>
              Conferma
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!pendingDelete} onOpenChange={() => setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Conferma eliminazione</AlertDialogTitle>
            <AlertDialogDescription>
              Stai per eliminare l'attività "<strong>{pendingDelete?.activityName}</strong>" 
              del dipendente <strong>{pendingDelete?.employeeName}</strong>.
              <br /><br />
              Questa azione non può essere annullata.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteActivity}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Elimina
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
