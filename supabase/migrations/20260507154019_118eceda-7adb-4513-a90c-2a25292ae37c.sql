
-- Enum for document categories
DO $$ BEGIN
  CREATE TYPE public.document_category AS ENUM (
    'dvr', 'neo_assunzione', 'consegna', 'formazione',
    'sorveglianza_sanitaria', 'contratti', 'altro'
  );
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Add category, version fields to crm_client_documents
ALTER TABLE public.crm_client_documents
  ADD COLUMN IF NOT EXISTS category public.document_category NOT NULL DEFAULT 'altro',
  ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS parent_document_id uuid REFERENCES public.crm_client_documents(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS is_current_version boolean NOT NULL DEFAULT true;

CREATE INDEX IF NOT EXISTS idx_ccd_category ON public.crm_client_documents(category);
CREATE INDEX IF NOT EXISTS idx_ccd_parent ON public.crm_client_documents(parent_document_id);
CREATE INDEX IF NOT EXISTS idx_ccd_current ON public.crm_client_documents(is_current_version);

-- History table
CREATE TABLE IF NOT EXISTS public.crm_document_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL,
  contact_id uuid NOT NULL,
  action text NOT NULL CHECK (action IN ('uploaded','new_version','metadata_updated','downloaded','deleted','restored')),
  performed_by uuid NOT NULL,
  performer_name text,
  details jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cdh_doc ON public.crm_document_history(document_id);
CREATE INDEX IF NOT EXISTS idx_cdh_contact ON public.crm_document_history(contact_id);
CREATE INDEX IF NOT EXISTS idx_cdh_created ON public.crm_document_history(created_at DESC);

ALTER TABLE public.crm_document_history ENABLE ROW LEVEL SECURITY;

-- Staff (admin + business roles) can view all history
CREATE POLICY "Staff can view document history"
ON public.crm_document_history FOR SELECT
TO authenticated
USING (public.is_staff(auth.uid()));

-- Staff can insert history entries
CREATE POLICY "Staff can insert document history"
ON public.crm_document_history FOR INSERT
TO authenticated
WITH CHECK (public.is_staff(auth.uid()) AND performed_by = auth.uid());

-- Clients can view history of documents linked to their contact
CREATE POLICY "Clients can view own document history"
ON public.crm_document_history FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.crm_contacts c
    WHERE c.id = crm_document_history.contact_id
      AND c.client_user_id = auth.uid()
  )
);

-- Clients can log their own actions (download) on their docs
CREATE POLICY "Clients can insert own document history"
ON public.crm_document_history FOR INSERT
TO authenticated
WITH CHECK (
  performed_by = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.crm_contacts c
    WHERE c.id = crm_document_history.contact_id
      AND c.client_user_id = auth.uid()
  )
);
