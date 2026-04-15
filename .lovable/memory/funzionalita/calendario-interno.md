---
name: Calendario Interno
description: Calendario interno sostitutivo di Google Calendar con viste mese/settimana/giorno, eventi personalizzati, collegamento CRM e condivisione staff
type: feature
---
Il calendario interno (`/crm/calendar`) sostituisce completamente Google Calendar.

Funzionalità:
- Viste: mensile, settimanale, giornaliera
- CRUD eventi con titolo, descrizione, luogo, colore, categoria
- Collegamento a contatti CRM e dipendenti
- Eventi condivisi (is_shared) visibili a tutto lo staff
- Eventi di sistema non-editabili: follow-up contatti, scadenze documenti, promemoria, corsi
- Doppio click su cella per creare evento, click su evento per modificare

Tabella: `calendar_events` con RLS (staff vede propri + condivisi, admin vede tutto)
Componenti: `CalendarEventDialog`, `useCalendarEvents` hook
Google Calendar: rimosso completamente (componenti, hook, riferimenti nel CRM)
