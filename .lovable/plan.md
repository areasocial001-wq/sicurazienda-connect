
# Modulo Area Lavoratori

Nuovo modulo interno per i dipendenti di SicurAzienda. Gli utenti accedono con il loro account esistente; il ruolo determina cosa vedono. Niente clienti esterni, niente timbrature, niente turni in questa prima release.

## Cosa costruiamo

### 1. Richieste Ferie e Permessi
- Il lavoratore crea una richiesta (tipo: Ferie / Permesso ROL / Malattia / Permesso retribuito / Altro), con data inizio, data fine, ore (per permessi orari), motivo opzionale, eventuale allegato (es. certificato).
- Stato: `in_attesa` → `approvata` / `rifiutata` (con nota dell'approvatore).
- Approvazione: solo `admin` e `contabilita`. Notifica via campanella e via email (Resend, già configurato) all'approvatore quando arriva una richiesta, e al richiedente quando viene evasa.
- Saldo ferie/permessi: contatore annuo configurabile per dipendente (giorni ferie, ore permessi residui), aggiornato automaticamente all'approvazione.
- Vista calendario condivisa "Chi è in ferie" per admin/contabilità e per ciascun lavoratore (per evitare sovrapposizioni nel suo team).

### 2. Chat interna
- Canali predefiniti per ruolo/settore (Amministrazione, Area Tecnica, Gestione Corsi, Consulenti Tecnici, Medicina) + canale generale "Tutti".
- Conversazioni 1:1 tra due dipendenti.
- Messaggi testuali, allegati (file/immagini), indicatori "letto", realtime via Supabase Realtime.
- Notifiche campanella per messaggi non letti.

### 3. Punto d'accesso
- Nuova voce nella BottomNav e nella Home: "Area Lavoratori" (icona Briefcase), visibile solo a utenti con ruolo business (admin + 5 ruoli area aziendale, non clienti).
- Pagina `/area-lavoratori` con tab: **Le mie richieste**, **Chat**, **Calendario assenze**, **Approvazioni** (solo admin/contabilità), **Saldo personale**.

## Modifiche database

Nuove tabelle in `public` (tutte con GRANT espliciti, RLS e trigger `updated_at`):

- `worker_leave_requests` — id, user_id (richiedente), type, start_date, end_date, hours, reason, attachment_path, status, reviewed_by, reviewed_at, review_note.
- `worker_leave_balances` — user_id + year + vacation_days_total/used + permit_hours_total/used (un record per dipendente per anno).
- `worker_chat_channels` — id, name, type (`role`/`general`/`direct`), role (nullable: per i canali di ruolo).
- `worker_chat_members` — channel_id, user_id, last_read_at.
- `worker_chat_messages` — id, channel_id, user_id, content, attachment_path, created_at.

Storage: nuovo bucket privato `worker-files` per allegati richieste e chat.

RLS:
- Richieste: il dipendente vede solo le proprie; admin/contabilità vedono tutte e possono aggiornare `status`/`reviewed_*`.
- Saldi: il dipendente vede il proprio, admin/contabilità leggono/scrivono tutti.
- Chat: l'utente vede messaggi solo dei canali in cui è membro; i canali ruolo iscrivono automaticamente i membri tramite trigger su `user_roles`.

Tabelle aggiunte alla pubblicazione `supabase_realtime` per la chat.

## Edge Functions

- `worker-leave-review` — verifica ruolo approvatore via JWT, aggiorna stato, decrementa saldo, manda email Resend al richiedente.
- `notify-leave-request` — su INSERT (via trigger → pg_net o chiamata client) invia email agli approvatori.

## Frontend (React)

Nuovi file:
- `src/pages/AreaLavoratori.tsx` — layout a tab.
- `src/components/lavoratori/LeaveRequestForm.tsx`, `LeaveRequestsList.tsx`, `LeaveApprovalQueue.tsx`, `LeaveCalendar.tsx`, `LeaveBalanceCard.tsx`.
- `src/components/lavoratori/chat/ChannelList.tsx`, `ChatWindow.tsx`, `MessageInput.tsx` (subscribe Realtime dentro `useEffect`).
- `src/hooks/useWorkerLeave.ts`, `useWorkerChat.ts`.
- Route protetta in `App.tsx` (`/area-lavoratori`), voce in `BottomNav` e card in Home, visibili a `isAdmin || isAreaAziendale`.
- Campanella `NotificationBell` estesa per mostrare "Nuova richiesta ferie" / "Messaggio non letto".

## Fuori scope (eventuali fasi successive)
Timbrature presenze, turni/pianificazione, gestione clienti esterni, app mobile dedicata, integrazione buste paga.
