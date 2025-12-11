import { useState, useEffect } from 'react';
import { Bell, Check, Clock, FileText, Calendar, Users, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useReminders, Reminder } from '@/hooks/useReminders';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { it } from 'date-fns/locale';

const typeIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  followup: Users,
  deadline: Clock,
  course_expiry: Calendar,
  document_expiry: FileText,
  custom: Bell,
};

const typeLabels: Record<string, string> = {
  followup: 'Follow-up',
  deadline: 'Scadenza',
  course_expiry: 'Corso in scadenza',
  document_expiry: 'Documento in scadenza',
  custom: 'Promemoria',
};

export function NotificationBell() {
  const { reminders, unreadCount, markAsRead, markAsCompleted, deleteReminder, requestNotificationPermission } = useReminders();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    // Request notification permission on first interaction
    if (open && 'Notification' in window && Notification.permission === 'default') {
      requestNotificationPermission();
    }
  }, [open, requestNotificationPermission]);

  const handleOpen = (isOpen: boolean) => {
    setOpen(isOpen);
    if (isOpen) {
      // Mark all as read when opening
      reminders.filter(r => !r.is_read).forEach(r => markAsRead(r.id));
    }
  };

  const getUrgencyColor = (dueDate: string) => {
    const now = new Date();
    const due = new Date(dueDate);
    const diffHours = (due.getTime() - now.getTime()) / (1000 * 60 * 60);

    if (diffHours < 0) return 'text-destructive';
    if (diffHours < 24) return 'text-orange-500';
    if (diffHours < 72) return 'text-yellow-500';
    return 'text-muted-foreground';
  };

  return (
    <Popover open={open} onOpenChange={handleOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge 
              className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs"
              variant="destructive"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="p-3 border-b">
          <h4 className="font-semibold flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Promemoria
          </h4>
        </div>
        <ScrollArea className="h-[300px]">
          {reminders.length === 0 ? (
            <div className="p-6 text-center text-muted-foreground">
              <Bell className="h-10 w-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">Nessun promemoria attivo</p>
            </div>
          ) : (
            <div className="divide-y">
              {reminders.map((reminder) => {
                const Icon = typeIcons[reminder.type] || Bell;
                return (
                  <div
                    key={reminder.id}
                    className={cn(
                      "p-3 hover:bg-muted/50 transition-colors",
                      !reminder.is_read && "bg-primary/5"
                    )}
                  >
                    <div className="flex gap-3">
                      <div className="flex-shrink-0">
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <Icon className="h-4 w-4 text-primary" />
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{reminder.title}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {reminder.description}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-xs">
                            {typeLabels[reminder.type]}
                          </Badge>
                          <span className={cn("text-xs", getUrgencyColor(reminder.due_date))}>
                            {formatDistanceToNow(new Date(reminder.due_date), { 
                              addSuffix: true, 
                              locale: it 
                            })}
                          </span>
                        </div>
                      </div>
                      <div className="flex flex-col gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => markAsCompleted(reminder.id)}
                        >
                          <Check className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => deleteReminder(reminder.id)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
