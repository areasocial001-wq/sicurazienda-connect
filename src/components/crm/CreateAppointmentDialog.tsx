import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Calendar, Download, Mail, MessageCircle, Loader2, Save, Copy, ExternalLink } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface CreateAppointmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contactId: string;
  contactName: string;
  contactCompany?: string;
  contactEmail?: string;
  contactPhone?: string;
  defaultLocation?: string;
}

function pad(n: number) { return String(n).padStart(2, '0'); }
function toICSDate(d: Date) {
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}00Z`;
}
function defaultDateTime(offsetHours = 24) {
  const d = new Date();
  d.setHours(d.getHours() + offsetHours, 0, 0, 0);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function CreateAppointmentDialog({
  open, onOpenChange, contactId, contactName, contactCompany, contactEmail, contactPhone, defaultLocation,
}: CreateAppointmentDialogProps) {
  const { user } = useAuth();
  const [title, setTitle] = useState(`Appuntamento con ${contactCompany || contactName}`);
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState(defaultLocation || '');
  const [start, setStart] = useState(defaultDateTime(24));
  const [end, setEnd] = useState(defaultDateTime(25));
  const [category, setCategory] = useState('meeting');
  const [saving, setSaving] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(null);

  const startDate = new Date(start);
  const endDate = new Date(end);
  const validDates = !isNaN(startDate.getTime()) && !isNaN(endDate.getTime()) && endDate > startDate;

  const handleSave = async () => {
    if (!validDates) { toast.error('Date non valide: la fine deve essere dopo l\'inizio'); return; }
    if (!title.trim()) { toast.error('Inserisci un titolo'); return; }
    if (!user) return;
    setSaving(true);
    try {
      const { data, error } = await supabase.from('calendar_events').insert({
        user_id: user.id,
        contact_id: contactId,
        title: title.trim(),
        description: description.trim() || null,
        location: location.trim() || null,
        category,
        start_datetime: startDate.toISOString(),
        end_datetime: endDate.toISOString(),
        all_day: false,
      }).select('id').single();
      if (error) throw error;
      setSavedId(data.id);
      toast.success('Appuntamento salvato nel calendario');
    } catch (e: any) {
      console.error(e);
      toast.error('Errore: ' + (e.message || 'salvataggio fallito'));
    } finally {
      setSaving(false);
    }
  };

  const icsContent = () => {
    const uid = `${savedId || crypto.randomUUID()}@sicurazienda`;
    const escape = (s: string) => s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
    return [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//SicurAzienda//CRM//IT',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'BEGIN:VEVENT',
      `UID:${uid}`,
      `DTSTAMP:${toICSDate(new Date())}`,
      `DTSTART:${toICSDate(startDate)}`,
      `DTEND:${toICSDate(endDate)}`,
      `SUMMARY:${escape(title)}`,
      description ? `DESCRIPTION:${escape(description)}` : '',
      location ? `LOCATION:${escape(location)}` : '',
      contactEmail ? `ATTENDEE;CN=${escape(contactName)}:mailto:${contactEmail}` : '',
      'END:VEVENT',
      'END:VCALENDAR',
    ].filter(Boolean).join('\r\n');
  };

  const downloadICS = () => {
    if (!validDates || !title.trim()) { toast.error('Completa titolo e date'); return; }
    const blob = new Blob([icsContent()], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title.replace(/[^a-z0-9]+/gi, '_')}.ics`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('File .ics scaricato');
  };

  const googleCalendarUrl = () => {
    const params = new URLSearchParams({
      action: 'TEMPLATE', text: title,
      dates: `${toICSDate(startDate)}/${toICSDate(endDate)}`,
      details: description, location,
    });
    if (contactEmail) params.append('add', contactEmail);
    return `https://calendar.google.com/calendar/render?${params.toString()}`;
  };

  const outlookUrl = () => {
    const params = new URLSearchParams({
      path: '/calendar/action/compose', rru: 'addevent',
      subject: title, body: description, location,
      startdt: startDate.toISOString(), enddt: endDate.toISOString(),
    });
    if (contactEmail) params.append('to', contactEmail);
    return `https://outlook.live.com/calendar/0/deeplink/compose?${params.toString()}`;
  };

  const shareText = () => {
    const dateStr = startDate.toLocaleString('it-IT', { dateStyle: 'full', timeStyle: 'short' });
    return `📅 ${title}\n🕒 ${dateStr}${location ? `\n📍 ${location}` : ''}${description ? `\n\n${description}` : ''}`;
  };

  const shareWhatsApp = () => {
    const phone = contactPhone?.replace(/\D/g, '');
    const url = phone
      ? `https://wa.me/${phone}?text=${encodeURIComponent(shareText())}`
      : `https://wa.me/?text=${encodeURIComponent(shareText())}`;
    window.open(url, '_blank');
  };

  const shareEmail = () => {
    const subject = encodeURIComponent(title);
    const body = encodeURIComponent(shareText());
    const to = contactEmail || '';
    window.location.href = `mailto:${to}?subject=${subject}&body=${body}`;
  };

  const copyDetails = async () => {
    try { await navigator.clipboard.writeText(shareText()); toast.success('Dettagli copiati'); }
    catch { toast.error('Copia non riuscita'); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            Crea Appuntamento
          </DialogTitle>
          <DialogDescription>
            Con {contactName}{contactCompany ? ` — ${contactCompany}` : ''}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <Label>Titolo *</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Inizio *</Label>
              <Input type="datetime-local" value={start} onChange={(e) => setStart(e.target.value)} />
            </div>
            <div>
              <Label>Fine *</Label>
              <Input type="datetime-local" value={end} onChange={(e) => setEnd(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Tipologia</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="meeting">Incontro</SelectItem>
                  <SelectItem value="call">Chiamata</SelectItem>
                  <SelectItem value="visit">Sopralluogo</SelectItem>
                  <SelectItem value="training">Corso / Formazione</SelectItem>
                  <SelectItem value="audit">Audit / Ispezione</SelectItem>
                  <SelectItem value="other">Altro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Luogo</Label>
              <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Indirizzo o link meeting" />
            </div>
          </div>

          <div>
            <Label>Descrizione / Note</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
          </div>

          <Button onClick={handleSave} className="w-full" disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            {savedId ? 'Salvato nel calendario ✓' : 'Salva nel calendario interno'}
          </Button>

          <Separator />

          <div>
            <Label className="text-sm font-semibold">Condividi appuntamento</Label>
            <div className="grid grid-cols-2 gap-2 mt-2">
              <Button variant="outline" size="sm" onClick={downloadICS}>
                <Download className="h-4 w-4 mr-2" /> Scarica .ics
              </Button>
              <Button variant="outline" size="sm" onClick={copyDetails}>
                <Copy className="h-4 w-4 mr-2" /> Copia dettagli
              </Button>
              <Button variant="outline" size="sm" asChild>
                <a href={googleCalendarUrl()} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4 mr-2" /> Google Calendar
                </a>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <a href={outlookUrl()} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4 mr-2" /> Outlook
                </a>
              </Button>
              <Button variant="outline" size="sm" onClick={shareEmail}>
                <Mail className="h-4 w-4 mr-2" /> Invia via Email
              </Button>
              <Button variant="outline" size="sm" onClick={shareWhatsApp}>
                <MessageCircle className="h-4 w-4 mr-2" /> WhatsApp
              </Button>
            </div>
            {!contactEmail && !contactPhone && (
              <p className="text-xs text-muted-foreground mt-2">
                Suggerimento: aggiungi email/telefono al contatto per pre-compilare i destinatari.
              </p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
