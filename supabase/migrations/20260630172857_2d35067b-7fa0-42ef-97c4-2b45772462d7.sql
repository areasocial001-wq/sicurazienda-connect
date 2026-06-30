
CREATE OR REPLACE FUNCTION public.guard_worker_notification_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- service_role bypasses this guard
  IF current_setting('request.jwt.claims', true)::jsonb->>'role' = 'service_role' THEN
    RETURN NEW;
  END IF;
  -- Only read_at may change; everything else must remain identical.
  IF NEW.user_id IS DISTINCT FROM OLD.user_id
     OR NEW.type IS DISTINCT FROM OLD.type
     OR NEW.title IS DISTINCT FROM OLD.title
     OR NEW.body IS DISTINCT FROM OLD.body
     OR NEW.request_id IS DISTINCT FROM OLD.request_id
     OR NEW.meta IS DISTINCT FROM OLD.meta
     OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'Solo lo stato di lettura puo essere modificato';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_worker_notification_update ON public.worker_notifications;
CREATE TRIGGER trg_guard_worker_notification_update
BEFORE UPDATE ON public.worker_notifications
FOR EACH ROW EXECUTE FUNCTION public.guard_worker_notification_update();

CREATE OR REPLACE FUNCTION public.guard_worker_notification_prefs()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF current_setting('request.jwt.claims', true)::jsonb->>'role' = 'service_role' THEN
    RETURN NEW;
  END IF;
  IF NEW.user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Non puoi modificare le preferenze di un altro utente';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_worker_notification_prefs ON public.worker_notification_prefs;
CREATE TRIGGER trg_guard_worker_notification_prefs
BEFORE INSERT OR UPDATE ON public.worker_notification_prefs
FOR EACH ROW EXECUTE FUNCTION public.guard_worker_notification_prefs();
