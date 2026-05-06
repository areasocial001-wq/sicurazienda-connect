import { CalendarEvent } from '@/hooks/useCalendarEvents';

function pad(n: number) { return n < 10 ? `0${n}` : `${n}`; }

function toICSDate(iso: string, allDay: boolean) {
  const d = new Date(iso);
  if (allDay) {
    return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}`;
  }
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;
}

function escape(text: string | null | undefined) {
  if (!text) return '';
  return text.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');
}

export function eventsToICS(events: CalendarEvent[]): string {
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Sicurazienda//Calendar//IT',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
  ];

  for (const e of events) {
    lines.push('BEGIN:VEVENT');
    lines.push(`UID:${e.id}@sicurazienda`);
    lines.push(`DTSTAMP:${toICSDate(e.updated_at || e.created_at, false)}`);
    if (e.all_day) {
      lines.push(`DTSTART;VALUE=DATE:${toICSDate(e.start_datetime, true)}`);
      lines.push(`DTEND;VALUE=DATE:${toICSDate(e.end_datetime, true)}`);
    } else {
      lines.push(`DTSTART:${toICSDate(e.start_datetime, false)}`);
      lines.push(`DTEND:${toICSDate(e.end_datetime, false)}`);
    }
    lines.push(`SUMMARY:${escape(e.title)}`);
    if (e.description) lines.push(`DESCRIPTION:${escape(e.description)}`);
    if (e.location) lines.push(`LOCATION:${escape(e.location)}`);
    lines.push(`CATEGORIES:${escape(e.category)}`);
    lines.push('END:VEVENT');
  }

  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}

export function downloadICS(events: CalendarEvent[], filename = 'calendario-sicurazienda.ics') {
  const ics = eventsToICS(events);
  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}