
-- ============================================================
-- ENUMS
-- ============================================================
DO $$ BEGIN
  CREATE TYPE public.leave_request_type AS ENUM ('ferie','permesso_rol','malattia','permesso_retribuito','altro');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.leave_request_status AS ENUM ('in_attesa','approvata','rifiutata');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.worker_channel_type AS ENUM ('general','role','direct');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================
-- worker_leave_requests
-- ============================================================
CREATE TABLE public.worker_leave_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  type public.leave_request_type NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  hours NUMERIC(5,2),
  reason TEXT,
  attachment_path TEXT,
  status public.leave_request_status NOT NULL DEFAULT 'in_attesa',
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  review_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (end_date >= start_date)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.worker_leave_requests TO authenticated;
GRANT ALL ON public.worker_leave_requests TO service_role;

ALTER TABLE public.worker_leave_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workers can view own leave requests"
  ON public.worker_leave_requests FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR public.has_role(auth.uid(),'admin')
    OR public.has_role(auth.uid(),'contabilita')
  );

CREATE POLICY "Workers can create own leave requests"
  ON public.worker_leave_requests FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Workers can update own pending requests"
  ON public.worker_leave_requests FOR UPDATE TO authenticated
  USING (user_id = auth.uid() AND status = 'in_attesa')
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Approvers can update any request"
  ON public.worker_leave_requests FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'contabilita'));

CREATE POLICY "Workers can delete own pending requests"
  ON public.worker_leave_requests FOR DELETE TO authenticated
  USING (user_id = auth.uid() AND status = 'in_attesa');

CREATE TRIGGER update_worker_leave_requests_updated_at
  BEFORE UPDATE ON public.worker_leave_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_worker_leave_requests_user ON public.worker_leave_requests(user_id);
CREATE INDEX idx_worker_leave_requests_status ON public.worker_leave_requests(status);
CREATE INDEX idx_worker_leave_requests_dates ON public.worker_leave_requests(start_date, end_date);

-- ============================================================
-- worker_leave_balances
-- ============================================================
CREATE TABLE public.worker_leave_balances (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  year INTEGER NOT NULL,
  vacation_days_total NUMERIC(6,2) NOT NULL DEFAULT 26,
  vacation_days_used NUMERIC(6,2) NOT NULL DEFAULT 0,
  permit_hours_total NUMERIC(6,2) NOT NULL DEFAULT 104,
  permit_hours_used NUMERIC(6,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, year)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.worker_leave_balances TO authenticated;
GRANT ALL ON public.worker_leave_balances TO service_role;

ALTER TABLE public.worker_leave_balances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workers view own balance, approvers view all"
  ON public.worker_leave_balances FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR public.has_role(auth.uid(),'admin')
    OR public.has_role(auth.uid(),'contabilita')
  );

CREATE POLICY "Approvers manage balances"
  ON public.worker_leave_balances FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'contabilita'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'contabilita'));

CREATE TRIGGER update_worker_leave_balances_updated_at
  BEFORE UPDATE ON public.worker_leave_balances
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- worker_chat_channels
-- ============================================================
CREATE TABLE public.worker_chat_channels (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  type public.worker_channel_type NOT NULL,
  role public.app_role,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX uniq_worker_channel_role ON public.worker_chat_channels(role) WHERE role IS NOT NULL;
CREATE UNIQUE INDEX uniq_worker_channel_general ON public.worker_chat_channels((1)) WHERE type = 'general';

GRANT SELECT, INSERT, UPDATE, DELETE ON public.worker_chat_channels TO authenticated;
GRANT ALL ON public.worker_chat_channels TO service_role;

ALTER TABLE public.worker_chat_channels ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- worker_chat_members
-- ============================================================
CREATE TABLE public.worker_chat_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  channel_id UUID NOT NULL REFERENCES public.worker_chat_channels(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  last_read_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (channel_id, user_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.worker_chat_members TO authenticated;
GRANT ALL ON public.worker_chat_members TO service_role;

ALTER TABLE public.worker_chat_members ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_worker_chat_members_user ON public.worker_chat_members(user_id);
CREATE INDEX idx_worker_chat_members_channel ON public.worker_chat_members(channel_id);

-- Helper: is_channel_member (SECURITY DEFINER to avoid RLS recursion)
CREATE OR REPLACE FUNCTION public.is_channel_member(_user_id UUID, _channel_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.worker_chat_members
    WHERE channel_id = _channel_id AND user_id = _user_id
  );
$$;

-- Channels policies (after helper)
CREATE POLICY "Members view their channels"
  ON public.worker_chat_channels FOR SELECT TO authenticated
  USING (public.is_channel_member(auth.uid(), id));

CREATE POLICY "Staff create channels"
  ON public.worker_chat_channels FOR INSERT TO authenticated
  WITH CHECK (public.is_staff(auth.uid()));

CREATE POLICY "Admin update channels"
  ON public.worker_chat_channels FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin'));

-- Members policies
CREATE POLICY "Members of channel can view members"
  ON public.worker_chat_members FOR SELECT TO authenticated
  USING (public.is_channel_member(auth.uid(), channel_id));

CREATE POLICY "Users can join direct channels themselves"
  ON public.worker_chat_members FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    OR public.has_role(auth.uid(),'admin')
  );

CREATE POLICY "Users update own membership"
  ON public.worker_chat_members FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users leave channel or admin removes"
  ON public.worker_chat_members FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

CREATE TRIGGER update_worker_chat_channels_updated_at
  BEFORE UPDATE ON public.worker_chat_channels
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- worker_chat_messages
-- ============================================================
CREATE TABLE public.worker_chat_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  channel_id UUID NOT NULL REFERENCES public.worker_chat_channels(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  content TEXT,
  attachment_path TEXT,
  attachment_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.worker_chat_messages TO authenticated;
GRANT ALL ON public.worker_chat_messages TO service_role;

ALTER TABLE public.worker_chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members read messages"
  ON public.worker_chat_messages FOR SELECT TO authenticated
  USING (public.is_channel_member(auth.uid(), channel_id));

CREATE POLICY "Members post messages"
  ON public.worker_chat_messages FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND public.is_channel_member(auth.uid(), channel_id));

CREATE POLICY "Authors delete own messages"
  ON public.worker_chat_messages FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

CREATE POLICY "Authors edit own messages"
  ON public.worker_chat_messages FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE INDEX idx_worker_chat_messages_channel ON public.worker_chat_messages(channel_id, created_at DESC);

-- ============================================================
-- Auto-membership: when a business role is assigned, add user to
-- the "Tutti" channel and to their role channel.
-- ============================================================
CREATE OR REPLACE FUNCTION public.sync_worker_chat_membership()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_general UUID;
  v_role_channel UUID;
BEGIN
  IF NEW.role = 'user' THEN
    RETURN NEW;
  END IF;

  SELECT id INTO v_general FROM worker_chat_channels WHERE type = 'general' LIMIT 1;
  IF v_general IS NOT NULL THEN
    INSERT INTO worker_chat_members (channel_id, user_id)
    VALUES (v_general, NEW.user_id)
    ON CONFLICT DO NOTHING;
  END IF;

  SELECT id INTO v_role_channel FROM worker_chat_channels WHERE role = NEW.role LIMIT 1;
  IF v_role_channel IS NOT NULL THEN
    INSERT INTO worker_chat_members (channel_id, user_id)
    VALUES (v_role_channel, NEW.user_id)
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_sync_worker_chat_membership
  AFTER INSERT ON public.user_roles
  FOR EACH ROW EXECUTE FUNCTION public.sync_worker_chat_membership();

-- ============================================================
-- Auto-decrement saldo when richiesta approvata
-- ============================================================
CREATE OR REPLACE FUNCTION public.apply_leave_balance_change()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_year INT;
  v_days NUMERIC;
  v_hours NUMERIC;
BEGIN
  IF NEW.status = 'approvata' AND (OLD.status IS DISTINCT FROM 'approvata') THEN
    v_year := EXTRACT(YEAR FROM NEW.start_date);
    v_days := (NEW.end_date - NEW.start_date) + 1;
    v_hours := COALESCE(NEW.hours, 0);

    INSERT INTO worker_leave_balances (user_id, year)
    VALUES (NEW.user_id, v_year)
    ON CONFLICT (user_id, year) DO NOTHING;

    IF NEW.type = 'ferie' THEN
      UPDATE worker_leave_balances
      SET vacation_days_used = vacation_days_used + v_days
      WHERE user_id = NEW.user_id AND year = v_year;
    ELSIF NEW.type IN ('permesso_rol','permesso_retribuito') AND v_hours > 0 THEN
      UPDATE worker_leave_balances
      SET permit_hours_used = permit_hours_used + v_hours
      WHERE user_id = NEW.user_id AND year = v_year;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_apply_leave_balance
  AFTER UPDATE ON public.worker_leave_requests
  FOR EACH ROW EXECUTE FUNCTION public.apply_leave_balance_change();

-- ============================================================
-- Seed: general + role channels + initial members
-- ============================================================
INSERT INTO public.worker_chat_channels (name, type)
SELECT 'Tutti', 'general'
WHERE NOT EXISTS (SELECT 1 FROM public.worker_chat_channels WHERE type = 'general');

INSERT INTO public.worker_chat_channels (name, type, role)
SELECT v.name, 'role'::worker_channel_type, v.role::app_role
FROM (VALUES
  ('Amministrazione','admin'),
  ('Contabilità','contabilita'),
  ('Area Tecnica','area_tecnica'),
  ('Gestione Corsi','gestione_corsi'),
  ('Consulenti Tecnici','consulenti_tecnici'),
  ('Medicina','medicina')
) AS v(name, role)
WHERE NOT EXISTS (
  SELECT 1 FROM public.worker_chat_channels c WHERE c.role = v.role::app_role
);

-- Seed members for existing business-role users
INSERT INTO public.worker_chat_members (channel_id, user_id)
SELECT c.id, ur.user_id
FROM public.user_roles ur
JOIN public.worker_chat_channels c ON c.type = 'general'
WHERE ur.role <> 'user'
ON CONFLICT DO NOTHING;

INSERT INTO public.worker_chat_members (channel_id, user_id)
SELECT c.id, ur.user_id
FROM public.user_roles ur
JOIN public.worker_chat_channels c ON c.role = ur.role
WHERE ur.role <> 'user'
ON CONFLICT DO NOTHING;

-- ============================================================
-- Realtime
-- ============================================================
ALTER TABLE public.worker_chat_messages REPLICA IDENTITY FULL;
ALTER TABLE public.worker_chat_members REPLICA IDENTITY FULL;
ALTER TABLE public.worker_leave_requests REPLICA IDENTITY FULL;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.worker_chat_messages;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.worker_chat_members;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.worker_leave_requests;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
