import { useState, useRef } from 'react';
import { Upload, FileText, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface ParsedEvent {
  uid: string;
  title: string;
  description: string;
  start: Date;
  end: Date;
  allDay: boolean;
  location: string;
  selected: boolean;
}

interface ICSImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  onImported: () => void;
}

function parseICSDate(value: string): { date: Date; allDay: boolean } {
  // DTSTART;VALUE=DATE:20240115 → all day
  // DTSTART:20240115T100000Z → specific time
  // DTSTART;TZID=Europe/Rome:20240115T100000
  const clean = value.replace(/^(DTSTART|DTEND)[^:]*:/i, '');
  const allDay = clean.length === 8;

  if (allDay) {
    const y = parseInt(clean.slice(0, 4));
    const m = parseInt(clean.slice(4, 6)) - 1;
    const d = parseInt(clean.slice(6, 8));
    return { date: new Date(y, m, d), allDay: true };
  }

  // 20240115T100000Z or 20240115T100000
  const y = parseInt(clean.slice(0, 4));
  const m = parseInt(clean.slice(4, 6)) - 1;
  const d = parseInt(clean.slice(6, 8));
  const h = parseInt(clean.slice(9, 11));
  const min = parseInt(clean.slice(11, 13));
  const s = parseInt(clean.slice(13, 15)) || 0;

  if (clean.endsWith('Z')) {
    return { date: new Date(Date.UTC(y, m, d, h, min, s)), allDay: false };
  }
  return { date: new Date(y, m, d, h, min, s), allDay: false };
}

function unescapeICS(text: string): string {
  return text
    .replace(/\\n/g, '\n')
    .replace(/\\,/g, ',')
    .replace(/\\;/g, ';')
    .replace(/\\\\/g, '\\');
}

function parseICS(content: string): ParsedEvent[] {
  // Unfold lines (RFC 5545: lines starting with space/tab are continuations)
  const unfolded = content.replace(/\r\n[ \t]/g, '').replace(/\r/g, '');
  const lines = unfolded.split('\n');

  const events: ParsedEvent[] = [];
  let inEvent = false;
  let current: Partial<ParsedEvent> = {};
  let dtStartRaw = '';
  let dtEndRaw = '';

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed === 'BEGIN:VEVENT') {
      inEvent = true;
      current = {};
      dtStartRaw = '';
      dtEndRaw = '';
      continue;
    }

    if (trimmed === 'END:VEVENT') {
      inEvent = false;
      if (dtStartRaw && current.title) {
        const startParsed = parseICSDate(dtStartRaw);
        const endParsed = dtEndRaw ? parseICSDate(dtEndRaw) : { date: new Date(startParsed.date.getTime() + 3600000), allDay: startParsed.allDay };

        events.push({
          uid: current.uid || crypto.randomUUID(),
          title: current.title || 'Senza titolo',
          description: current.description || '',
          start: startParsed.date,
          end: endParsed.date,
          allDay: startParsed.allDay,
          location: current.location || '',
          selected: true,
        });
      }
      continue;
    }

    if (!inEvent) continue;

    if (trimmed.startsWith('SUMMARY:') || trimmed.startsWith('SUMMARY;')) {
      current.title = unescapeICS(trimmed.replace(/^SUMMARY[^:]*:/, ''));
    } else if (trimmed.startsWith('DESCRIPTION:') || trimmed.startsWith('DESCRIPTION;')) {
      current.description = unescapeICS(trimmed.replace(/^DESCRIPTION[^:]*:/, ''));
    } else if (trimmed.startsWith('LOCATION:') || trimmed.startsWith('LOCATION;')) {
      current.location = unescapeICS(trimmed.replace(/^LOCATION[^:]*:/, ''));
    } else if (trimmed.startsWith('UID:')) {
      current.uid = trimmed.replace('UID:', '');
    } else if (trimmed.startsWith('DTSTART')) {
      dtStartRaw = trimmed;
    } else if (trimmed.startsWith('DTEND')) {
      dtEndRaw = trimmed;
    }
  }

  return events.sort((a, b) => a.start.getTime() - b.start.getTime());
}

export function ICSImportDialog({ open, onOpenChange, userId, onImported }: ICSImportDialogProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [parsedEvents, setParsedEvents] = useState<ParsedEvent[]>([]);
  const [importing, setImporting] = useState(false);
  const [fileName, setFileName] = useState('');
  const [importResult, setImportResult] = useState<{ success: number; failed: number } | null>(null);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setImportResult(null);

    try {
      const text = await file.text();
      const events = parseICS(text);
      setParsedEvents(events);
      if (events.length === 0) {
        toast.info('Nessun evento trovato nel file ICS');
      }
    } catch {
      toast.error('Errore nella lettura del file ICS');
    }

    // Reset input
    if (fileRef.current) fileRef.current.value = '';
  };

  const toggleAll = (checked: boolean) => {
    setParsedEvents(prev => prev.map(e => ({ ...e, selected: checked })));
  };

  const toggleEvent = (uid: string) => {
    setParsedEvents(prev => prev.map(e => e.uid === uid ? { ...e, selected: !e.selected } : e));
  };

  const selectedCount = parsedEvents.filter(e => e.selected).length;

  const handleImport = async () => {
    const toImport = parsedEvents.filter(e => e.selected);
    if (toImport.length === 0) {
      toast.error('Seleziona almeno un evento');
      return;
    }

    setImporting(true);
    let success = 0;
    let failed = 0;

    // Get user name
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', userId)
      .single();

    // Batch insert in chunks of 50
    const chunks: ParsedEvent[][] = [];
    for (let i = 0; i < toImport.length; i += 50) {
      chunks.push(toImport.slice(i, i + 50));
    }

    for (const chunk of chunks) {
      const rows = chunk.map(e => ({
        user_id: userId,
        title: e.title,
        description: e.description || null,
        start_datetime: e.start.toISOString(),
        end_datetime: e.end.toISOString(),
        all_day: e.allDay,
        location: e.location || null,
        color: '#3B82F6',
        category: 'importato',
        created_by_name: profile?.full_name || null,
      }));

      const { error } = await supabase.from('calendar_events').insert(rows);
      if (error) {
        console.error('Import chunk error:', error);
        failed += chunk.length;
      } else {
        success += chunk.length;
      }
    }

    setImportResult({ success, failed });
    setImporting(false);

    if (success > 0) {
      toast.success(`${success} eventi importati con successo`);
      onImported();
    }
    if (failed > 0) {
      toast.error(`${failed} eventi non importati`);
    }
  };

  const handleClose = () => {
    setParsedEvents([]);
    setFileName('');
    setImportResult(null);
    onOpenChange(false);
  };

  const formatDate = (d: Date, allDay: boolean) => {
    if (allDay) return d.toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric' });
    return d.toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Importa da file ICS
          </DialogTitle>
          <DialogDescription>
            Carica un file .ics esportato da Google Calendar o altri calendari per importare gli eventi.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 flex-1 min-h-0">
          {/* File picker */}
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={() => fileRef.current?.click()}
              disabled={importing}
            >
              <FileText className="h-4 w-4 mr-2" />
              {fileName || 'Seleziona file .ics'}
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept=".ics,.ical"
              className="hidden"
              onChange={handleFile}
            />
            {fileName && (
              <span className="text-sm text-muted-foreground">
                {parsedEvents.length} eventi trovati
              </span>
            )}
          </div>

          {/* Event list */}
          {parsedEvents.length > 0 && !importResult && (
            <>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={selectedCount === parsedEvents.length}
                    onCheckedChange={(c) => toggleAll(!!c)}
                  />
                  <span className="text-sm font-medium">
                    Seleziona tutti ({selectedCount}/{parsedEvents.length})
                  </span>
                </div>
              </div>

              <ScrollArea className="h-[350px] border rounded-md">
                <div className="divide-y">
                  {parsedEvents.map((ev) => (
                    <div
                      key={ev.uid}
                      className="flex items-start gap-3 p-3 hover:bg-accent/50 transition-colors"
                    >
                      <Checkbox
                        checked={ev.selected}
                        onCheckedChange={() => toggleEvent(ev.uid)}
                        className="mt-0.5"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{ev.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(ev.start, ev.allDay)}
                          {!ev.allDay && ` → ${formatDate(ev.end, ev.allDay)}`}
                        </p>
                        {ev.location && (
                          <p className="text-xs text-muted-foreground truncate">📍 {ev.location}</p>
                        )}
                      </div>
                      {ev.allDay && <Badge variant="secondary" className="text-[10px]">Tutto il giorno</Badge>}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </>
          )}

          {/* Import result */}
          {importResult && (
            <div className="text-center py-8 space-y-3">
              <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto" />
              <p className="text-lg font-medium">Importazione completata</p>
              <div className="flex items-center justify-center gap-4">
                {importResult.success > 0 && (
                  <Badge variant="default" className="text-sm">
                    ✓ {importResult.success} importati
                  </Badge>
                )}
                {importResult.failed > 0 && (
                  <Badge variant="destructive" className="text-sm">
                    <AlertCircle className="h-3 w-3 mr-1" /> {importResult.failed} falliti
                  </Badge>
                )}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          {!importResult ? (
            <>
              <Button variant="outline" onClick={handleClose}>Annulla</Button>
              <Button
                onClick={handleImport}
                disabled={importing || selectedCount === 0}
              >
                {importing ? (
                  <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Importazione...</>
                ) : (
                  <><Upload className="h-4 w-4 mr-2" /> Importa {selectedCount} eventi</>
                )}
              </Button>
            </>
          ) : (
            <Button onClick={handleClose}>Chiudi</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
