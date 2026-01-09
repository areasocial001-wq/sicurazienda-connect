-- Rimuovere la policy troppo permissiva "Service role can manage tokens"
DROP POLICY IF EXISTS "Service role can manage tokens" ON public.google_calendar_tokens;

-- La gestione dei token tramite service role avviene già bypassando RLS
-- quindi non serve una policy esplicita. Le policy esistenti per gli utenti sono sufficienti.