
-- 1) Storage: workers can read their own medical records via health-files link
CREATE POLICY "Workers can view own medical records"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'medical-records'
  AND EXISTS (
    SELECT 1 FROM public.medical_health_files hf
    WHERE hf.file_path = storage.objects.name
      AND public.is_own_employee_record(hf.employee_id)
  )
);

-- 2) Audit log table for judgment print / sign / download
CREATE TABLE IF NOT EXISTS public.medical_judgment_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  judgment_id UUID NOT NULL REFERENCES public.medical_judgments(id) ON DELETE CASCADE,
  protocol_id UUID,
  doctor_id UUID,
  employee_id UUID,
  visit_id UUID,
  action TEXT NOT NULL CHECK (action IN ('print','sign','download','reprint','view')),
  version INT,
  file_path TEXT,
  meta JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.medical_judgment_audit TO authenticated;
GRANT ALL ON public.medical_judgment_audit TO service_role;

ALTER TABLE public.medical_judgment_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Medicina and admins can view judgment audit"
ON public.medical_judgment_audit FOR SELECT TO authenticated
USING (has_role(auth.uid(),'medicina'::app_role) OR has_role(auth.uid(),'admin'::app_role));

CREATE POLICY "Authenticated staff can insert judgment audit"
ON public.medical_judgment_audit FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND (has_role(auth.uid(),'medicina'::app_role) OR has_role(auth.uid(),'admin'::app_role))
);

CREATE INDEX IF NOT EXISTS idx_mja_judgment ON public.medical_judgment_audit(judgment_id);
CREATE INDEX IF NOT EXISTS idx_mja_created ON public.medical_judgment_audit(created_at DESC);
