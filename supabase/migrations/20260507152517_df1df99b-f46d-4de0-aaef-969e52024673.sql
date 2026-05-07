
DO $$ BEGIN
  CREATE TYPE public.contact_request_status AS ENUM ('nuovo','in_lavorazione','risolto');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.contact_requests
  ADD COLUMN IF NOT EXISTS status public.contact_request_status NOT NULL DEFAULT 'nuovo',
  ADD COLUMN IF NOT EXISTS internal_notes text,
  ADD COLUMN IF NOT EXISTS assigned_to uuid,
  ADD COLUMN IF NOT EXISTS resolved_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_contact_requests_status ON public.contact_requests(status);
CREATE INDEX IF NOT EXISTS idx_contact_requests_created_at ON public.contact_requests(created_at DESC);

DROP POLICY IF EXISTS "Admins can view all contact requests" ON public.contact_requests;
DROP POLICY IF EXISTS "Admins can update contact requests" ON public.contact_requests;

CREATE POLICY "Staff admin/contabilita can view contact requests"
ON public.contact_requests FOR SELECT TO authenticated
USING (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'contabilita'::app_role));

CREATE POLICY "Staff admin/contabilita can update contact requests"
ON public.contact_requests FOR UPDATE TO authenticated
USING (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'contabilita'::app_role));
