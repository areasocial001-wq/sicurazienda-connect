-- Default is_shared a true per nuovi eventi
ALTER TABLE public.calendar_events ALTER COLUMN is_shared SET DEFAULT true;

-- Imposta tutti gli eventi esistenti come condivisi
UPDATE public.calendar_events SET is_shared = true WHERE is_shared = false;

-- Sostituisci la policy SELECT per consentire a tutto lo staff di vedere tutti gli eventi creati da staff
DROP POLICY IF EXISTS "Staff can view own and shared events" ON public.calendar_events;

CREATE POLICY "Staff can view all staff events"
ON public.calendar_events
FOR SELECT
USING (
  (
    has_role(auth.uid(), 'admin'::app_role) OR
    has_role(auth.uid(), 'contabilita'::app_role) OR
    has_role(auth.uid(), 'area_tecnica'::app_role) OR
    has_role(auth.uid(), 'gestione_corsi'::app_role) OR
    has_role(auth.uid(), 'consulenti_tecnici'::app_role) OR
    has_role(auth.uid(), 'medicina'::app_role)
  )
  AND (
    user_id = auth.uid()
    OR is_shared = true
    OR has_role(user_id, 'admin'::app_role)
    OR has_role(user_id, 'contabilita'::app_role)
    OR has_role(user_id, 'area_tecnica'::app_role)
    OR has_role(user_id, 'gestione_corsi'::app_role)
    OR has_role(user_id, 'consulenti_tecnici'::app_role)
    OR has_role(user_id, 'medicina'::app_role)
  )
);