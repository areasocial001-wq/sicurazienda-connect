
-- =====================================================================
-- 1) Comments on calendar events
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.calendar_event_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.calendar_events(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  author_name text,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_calendar_event_comments_event ON public.calendar_event_comments(event_id);

ALTER TABLE public.calendar_event_comments ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_staff(_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    has_role(_user_id, 'admin'::app_role) OR
    has_role(_user_id, 'contabilita'::app_role) OR
    has_role(_user_id, 'area_tecnica'::app_role) OR
    has_role(_user_id, 'gestione_corsi'::app_role) OR
    has_role(_user_id, 'consulenti_tecnici'::app_role) OR
    has_role(_user_id, 'medicina'::app_role);
$$;

CREATE POLICY "Staff can view comments"
ON public.calendar_event_comments FOR SELECT
USING (public.is_staff(auth.uid()));

CREATE POLICY "Staff can insert own comments"
ON public.calendar_event_comments FOR INSERT
WITH CHECK (public.is_staff(auth.uid()) AND user_id = auth.uid());

CREATE POLICY "Authors can update own comments"
ON public.calendar_event_comments FOR UPDATE
USING (user_id = auth.uid());

CREATE POLICY "Authors or admins can delete comments"
ON public.calendar_event_comments FOR DELETE
USING (user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER calendar_event_comments_updated_at
BEFORE UPDATE ON public.calendar_event_comments
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================================
-- 2) Audit log for calendar events
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.calendar_event_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid,
  action text NOT NULL,
  actor_id uuid,
  actor_name text,
  before_data jsonb,
  after_data jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_calendar_event_audit_event ON public.calendar_event_audit(event_id);
CREATE INDEX IF NOT EXISTS idx_calendar_event_audit_created ON public.calendar_event_audit(created_at DESC);

ALTER TABLE public.calendar_event_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view calendar audit"
ON public.calendar_event_audit FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Trigger function
CREATE OR REPLACE FUNCTION public.log_calendar_event_change()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_name text;
BEGIN
  SELECT full_name INTO v_name FROM public.profiles WHERE id = v_actor;

  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.calendar_event_audit(event_id, action, actor_id, actor_name, after_data)
    VALUES (NEW.id, 'created', v_actor, v_name, to_jsonb(NEW));
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.calendar_event_audit(event_id, action, actor_id, actor_name, before_data, after_data)
    VALUES (NEW.id, 'updated', v_actor, v_name, to_jsonb(OLD), to_jsonb(NEW));
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.calendar_event_audit(event_id, action, actor_id, actor_name, before_data)
    VALUES (OLD.id, 'deleted', v_actor, v_name, to_jsonb(OLD));
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_calendar_events_audit ON public.calendar_events;
CREATE TRIGGER trg_calendar_events_audit
AFTER INSERT OR UPDATE OR DELETE ON public.calendar_events
FOR EACH ROW EXECUTE FUNCTION public.log_calendar_event_change();

-- =====================================================================
-- 3) Realtime
-- =====================================================================
ALTER TABLE public.calendar_events REPLICA IDENTITY FULL;
ALTER TABLE public.calendar_event_comments REPLICA IDENTITY FULL;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.calendar_events;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.calendar_event_comments;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
