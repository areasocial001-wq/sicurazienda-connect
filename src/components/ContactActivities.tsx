import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { ListTodo, Calendar, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { AddActivityDialog } from './AddActivityDialog';
import { EditActivityDialog } from './EditActivityDialog';

interface Activity {
  id: string;
  name: string;
  type: string;
  status: string;
  priority?: string;
  start_date?: string;
  end_date?: string;
  assignee?: string;
  description?: string;
  work_type?: string;
  project_name?: string;
}

interface ContactActivitiesProps {
  contactId: string;
}

const activityStatusColors: Record<string, string> = {
  not_started: 'bg-gray-500/20 text-gray-700 border-gray-500/30',
  in_progress: 'bg-blue-500/20 text-blue-700 border-blue-500/30',
  completed: 'bg-green-500/20 text-green-700 border-green-500/30',
  cancelled: 'bg-red-500/20 text-red-700 border-red-500/30',
};

const activityStatusLabels: Record<string, string> = {
  not_started: 'Da iniziare',
  in_progress: 'In corso',
  completed: 'Completata',
  cancelled: 'Annullata',
};

const priorityColors: Record<string, string> = {
  low: 'bg-gray-500/20 text-gray-600',
  medium: 'bg-yellow-500/20 text-yellow-700',
  high: 'bg-orange-500/20 text-orange-700',
  urgent: 'bg-red-500/20 text-red-700',
};

export function ContactActivities({ contactId }: ContactActivitiesProps) {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchActivities();
  }, [contactId]);

  const fetchActivities = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('crm_activities')
        .select('id, name, type, status, priority, start_date, end_date, assignee, description, work_type, project_name')
        .eq('contact_id', contactId)
        .order('start_date', { ascending: false });

      if (error) throw error;
      setActivities(data || []);
    } catch (error) {
      console.error('Error fetching activities:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    return format(new Date(dateStr), 'dd/MM/yyyy', { locale: it });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <ListTodo className="h-5 w-5 text-primary" />
          Attività ({activities.length})
        </CardTitle>
        <AddActivityDialog contactId={contactId} onActivityAdded={fetchActivities} />
      </CardHeader>
      <CardContent>
        {activities.length === 0 ? (
          <p className="text-muted-foreground text-center py-4">
            Nessuna attività collegata
          </p>
        ) : (
          <div className="space-y-3">
            {activities.map((activity) => (
              <div 
                key={activity.id} 
                className="p-3 border rounded-lg hover:bg-muted/30 transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium truncate">{activity.name}</h4>
                    {activity.project_name && (
                      <p className="text-xs text-primary/80 mt-0.5">
                        Commessa: {activity.project_name}
                      </p>
                    )}
                    {activity.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                        {activity.description}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <EditActivityDialog 
                      activity={activity} 
                      onActivityUpdated={fetchActivities} 
                      onActivityDeleted={fetchActivities} 
                    />
                    {activity.priority && (
                      <Badge className={cn(priorityColors[activity.priority], 'text-xs')}>
                        {activity.priority}
                      </Badge>
                    )}
                    <Badge className={cn(activityStatusColors[activity.status] || activityStatusColors.not_started)}>
                      {activityStatusLabels[activity.status] || activity.status}
                    </Badge>
                  </div>
                </div>
                <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground flex-wrap">
                  {activity.work_type && (
                    <span className="text-primary/70">{activity.work_type}</span>
                  )}
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {formatDate(activity.start_date)} - {formatDate(activity.end_date)}
                  </span>
                  {activity.assignee && (
                    <span>Assegnato a: {activity.assignee}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
