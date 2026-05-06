
-- Audit log for document access (downloads via signed URLs and QR codes)
CREATE TABLE IF NOT EXISTS public.document_access_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid,
  file_path text NOT NULL,
  qr_code_id uuid,
  user_id uuid,
  access_type text NOT NULL, -- 'authenticated', 'qr_signed_url', 'qr_redirect'
  ip_address text,
  user_agent text,
  details jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_doc_access_logs_document ON public.document_access_logs(document_id);
CREATE INDEX IF NOT EXISTS idx_doc_access_logs_qr ON public.document_access_logs(qr_code_id);
CREATE INDEX IF NOT EXISTS idx_doc_access_logs_user ON public.document_access_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_doc_access_logs_created ON public.document_access_logs(created_at DESC);

ALTER TABLE public.document_access_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all access logs"
ON public.document_access_logs FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Document owners can view access to own documents"
ON public.document_access_logs FOR SELECT
TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.documents d
  WHERE d.id = document_access_logs.document_id AND d.user_id = auth.uid()
));

CREATE POLICY "Service role can insert access logs"
ON public.document_access_logs FOR INSERT
TO service_role
WITH CHECK (true);
