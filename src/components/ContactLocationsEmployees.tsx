import { useState, useEffect } from 'react';
import { format, isBefore, startOfDay } from 'date-fns';
import { it } from 'date-fns/locale';
import { 
  MapPin, Users, ChevronDown, ChevronUp, Loader2, 
  Building, Phone, Mail, Calendar, AlertTriangle,
  CheckCircle, Clock
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Collapsible, 
  CollapsibleContent, 
  CollapsibleTrigger 
} from '@/components/ui/collapsible';
import { ScrollArea } from '@/components/ui/scroll-area';
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

const activityTypeLabels: Record<string, string> = {
  formazione: 'Formazione',
  visita: 'Visita Medica',
  cartella_sanitaria: 'Cartella Sanitaria',
};

export function ContactLocationsEmployees({ contactId }: ContactLocationsEmployeesProps) {
  const [locations, setLocations] = useState<Location[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [activities, setActivities] = useState<EmployeeActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedLocations, setExpandedLocations] = useState<Set<string>>(new Set());
  const [expandedEmployees, setExpandedEmployees] = useState<Set<string>>(new Set());

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

  const getEmployeesForLocation = (locationId: string) => {
    return employees.filter(e => e.location_id === locationId);
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
          const isExpanded = expandedLocations.has(location.id);

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
                      <ScrollArea className="max-h-[400px]">
                        <div className="space-y-2">
                          {locationEmployees.map((employee) => {
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
                                            <div className="text-right flex-shrink-0">
                                              {activity.expiry_date && (
                                                <div className={cn(
                                                  "flex items-center gap-1",
                                                  expiryStatus === 'expired' && "text-red-600",
                                                  expiryStatus === 'expiring' && "text-yellow-600",
                                                  expiryStatus === 'valid' && "text-green-600"
                                                )}>
                                                  {expiryStatus === 'expired' ? (
                                                    <AlertTriangle className="h-3 w-3" />
                                                  ) : expiryStatus === 'expiring' ? (
                                                    <Clock className="h-3 w-3" />
                                                  ) : (
                                                    <CheckCircle className="h-3 w-3" />
                                                  )}
                                                  <span>
                                                    {format(new Date(activity.expiry_date), 'dd/MM/yyyy')}
                                                  </span>
                                                </div>
                                              )}
                                            </div>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </CollapsibleContent>
                              </Collapsible>
                            );
                          })}
                        </div>
                      </ScrollArea>
                    )}
                  </CardContent>
                </CollapsibleContent>
              </Collapsible>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
