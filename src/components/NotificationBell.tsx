import { useState, useEffect } from 'react';
import { Bell, Check, Clock, FileText, Calendar, Users, X, AlarmClock, QrCode, GraduationCap, Stethoscope } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useReminders, Reminder, SnoozeOption } from '@/hooks/useReminders';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { it } from 'date-fns/locale';

const typeIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  followup: Users,
  deadline: Clock,
  course_expiry: Calendar,
  document_expiry: FileText,
  custom: Bell,
  qr_download: QrCode,
  qr_expiry: QrCode,
  employee_activity_expiry: GraduationCap,
  medical_visit_due: Stethoscope,
  medical_judgment_expiry: Stethoscope,
  medical_protocol_review: Stethoscope,
};

const typeLabels: Record<string, string> = {
  followup: 'Follow-up',
  deadline: 'Scadenza',
  course_expiry: 'Corso in scadenza',
  document_expiry: 'Documento in scadenza',
  custom: 'Promemoria',
  qr_download: 'Download QR',
  qr_expiry: 'QR in scadenza',
  employee_activity_expiry: 'Attività dipendente',
  medical_visit_due: 'Visita medica',
  medical_judgment_expiry: 'Idoneità in scadenza',
  medical_protocol_review: 'Protocollo da revisionare',
};

const snoozeOptions: { value: SnoozeOption; label: string }[] = [
  { value: '15m', label: '15 minuti' },
  { value: '1h', label: '1 ora' },
  { value: '3h', label: '3 ore' },
  { value: '1d', label: '1 giorno' },
  { value: '1w', label: '1 settimana' },
];

export function NotificationBell() {
  const { 
    reminders, 
    unreadCount, 
    markAsRead, 
    markAsCompleted, 
    snoozeReminder,
    deleteReminder, 
    requestNotificationPermission 
  } = useReminders();
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

  const isOverdue = (dueDate: string) => {
    return new Date(dueDate) < new Date();
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
      <PopoverContent className="w-96 p-0" align="end">
        <div className="p-3 border-b flex items-center justify-between">
          <h4 className="font-semibold flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Promemoria
          </h4>
          {reminders.length > 0 && (
            <Badge variant="secondary" className="text-xs">
              {reminders.length} attivi
            </Badge>
          )}
        </div>
        <ScrollArea className="h-[350px]">
          {reminders.length === 0 ? (
            <div className="p-6 text-center text-muted-foreground">
              <Bell className="h-10 w-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">Nessun promemoria attivo</p>
            </div>
          ) : (
            <div className="divide-y">
              {reminders.map((reminder) => {
                const Icon = typeIcons[reminder.type] || Bell;
                const overdue = isOverdue(reminder.due_date);
                return (
                  <div
                    key={reminder.id}
                    className={cn(
                      "p-3 hover:bg-muted/50 transition-colors",
                      !reminder.is_read && "bg-primary/5",
                      overdue && "bg-destructive/5"
                    )}
                  >
                    <div className="flex gap-3">
                      <div className="flex-shrink-0">
                        <div className={cn(
                          "h-8 w-8 rounded-full flex items-center justify-center",
                          overdue ? "bg-destructive/10" : "bg-primary/10"
                        )}>
                          <Icon className={cn(
                            "h-4 w-4",
                            overdue ? "text-destructive" : "text-primary"
                          )} />
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{reminder.title}</p>
                        {reminder.description && (
                          <p className="text-xs text-muted-foreground truncate">
                            {reminder.description}
                          </p>
                        )}
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <Badge variant="outline" className="text-xs">
                            {typeLabels[reminder.type]}
                          </Badge>
                          <span className={cn("text-xs", getUrgencyColor(reminder.due_date))}>
                            {overdue ? 'Scaduto ' : ''}
                            {formatDistanceToNow(new Date(reminder.due_date), { 
                              addSuffix: true, 
                              locale: it 
                            })}
                          </span>
                        </div>
                        
                        {/* Action buttons */}
                        <div className="flex items-center gap-1 mt-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() => markAsCompleted(reminder.id)}
                          >
                            <Check className="h-3 w-3 mr-1" />
                            Fatto
                          </Button>
                          
                          {/* Snooze dropdown */}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-7 text-xs"
                              >
                                <AlarmClock className="h-3 w-3 mr-1" />
                                Posticipa
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start">
                              {snoozeOptions.map((option) => (
                                <DropdownMenuItem
                                  key={option.value}
                                  onClick={() => snoozeReminder(reminder.id, option.value)}
                                >
                                  <Clock className="h-4 w-4 mr-2" />
                                  {option.label}
                                </DropdownMenuItem>
                              ))}
                            </DropdownMenuContent>
                          </DropdownMenu>
                          
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs text-muted-foreground hover:text-destructive"
                            onClick={() => deleteReminder(reminder.id)}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
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
