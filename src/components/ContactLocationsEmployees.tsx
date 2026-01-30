import { useState, useEffect, useMemo, useCallback } from 'react';
import { format, isBefore, startOfDay } from 'date-fns';
import { it } from 'date-fns/locale';
import { 
  MapPin, Users, ChevronDown, ChevronUp, Loader2, 
  Building, Phone, Mail, Calendar, AlertTriangle,
  CheckCircle, Clock, Search, ChevronsUpDown, Pencil, X, Download
} from 'lucide-react';
import { AddEmployeeActivityDialog } from './AddEmployeeActivityDialog';
import { ExportLocationActivities } from './ExportLocationActivities';
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
  const [updatingId, setUpdatingId] = useState<string | null>(null);

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
          .select('id, first_name, last_name, location_id')
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
    
    if (!query) return locationEmployees;
    
    return locationEmployees.filter(e => 
      `${e.first_name} ${e.last_name}`.toLowerCase().includes(query) ||
      `${e.last_name} ${e.first_name}`.toLowerCase().includes(query)
    );
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
      <div className="flex items-center justify-between">
        <h3 className="font-semibold flex items-center gap-2">
          <MapPin className="h-5 w-5 text-primary" />
          Sedi e Dipendenti
        </h3>
        <Badge variant="secondary">
          {locations.length} sedi, {employees.length} dipendenti
        </Badge>
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
                              placeholder="Cerca dipendente..."
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
                                const empActivities = getActivitiesForEmployee(employee.id);
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
                                        <div className="flex items-center justify-between">
                                          <span className="font-medium text-sm">
                                            {employee.last_name} {employee.first_name}
                                          </span>
                                          <div className="flex items-center gap-2">
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
    </div>
  );
}
