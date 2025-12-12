import { useState } from 'react';
import { Calendar, Link2, Link2Off, Upload, Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useGoogleCalendar } from '@/hooks/useGoogleCalendar';

interface GoogleCalendarSyncProps {
  userId: string | undefined;
}

export default function GoogleCalendarSync({ userId }: GoogleCalendarSyncProps) {
  const {
    isConnected,
    isLoading,
    events,
    connect,
    disconnect,
    fetchEvents,
    exportFollowups,
  } = useGoogleCalendar(userId);
  
  const [exporting, setExporting] = useState(false);
  const [fetching, setFetching] = useState(false);

  const handleExport = async () => {
    setExporting(true);
    await exportFollowups();
    setExporting(false);
  };

  const handleFetchEvents = async () => {
    if (fetching) return; // Prevent double-clicks
    setFetching(true);
    try {
      await fetchEvents();
    } finally {
      setFetching(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Google Calendar
          <Badge variant={isConnected ? 'default' : 'secondary'} className="ml-auto">
            {isConnected ? 'Connesso' : 'Non connesso'}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {!isConnected ? (
          <Button onClick={connect} className="w-full">
            <Link2 className="h-4 w-4 mr-2" />
            Connetti Google Calendar
          </Button>
        ) : (
          <>
            <div className="flex gap-2 flex-wrap">
              <Button variant="outline" size="sm" onClick={handleFetchEvents} disabled={fetching}>
                {fetching ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                Importa Eventi
              </Button>
              <Button variant="outline" size="sm" onClick={handleExport} disabled={exporting}>
                {exporting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Upload className="h-4 w-4 mr-2" />}
                Esporta Follow-up
              </Button>
              <Button variant="ghost" size="sm" onClick={disconnect}>
                <Link2Off className="h-4 w-4 mr-2" />
                Disconnetti
              </Button>
            </div>

            {events.length > 0 && (
              <div className="space-y-2 mt-4">
                <p className="text-sm text-muted-foreground font-medium">
                  Prossimi {events.length} eventi:
                </p>
                <div className="max-h-40 overflow-y-auto space-y-2">
                  {events.slice(0, 5).map((event) => (
                    <div
                      key={event.id}
                      className="text-sm p-2 rounded bg-muted/50 border"
                    >
                      <p className="font-medium truncate">{event.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(event.start).toLocaleDateString('it-IT', {
                          weekday: 'short',
                          day: 'numeric',
                          month: 'short',
                          hour: event.allDay ? undefined : '2-digit',
                          minute: event.allDay ? undefined : '2-digit',
                        })}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
