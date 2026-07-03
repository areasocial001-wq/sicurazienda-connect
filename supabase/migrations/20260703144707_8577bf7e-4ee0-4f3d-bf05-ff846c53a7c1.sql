
-- Helper: is the given employee_id linked (by email) to the current auth user?
CREATE OR REPLACE FUNCTION public.is_own_employee_record(_employee_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.crm_employees e
    WHERE e.id = _employee_id
      AND e.email IS NOT NULL
      AND lower(e.email) = lower(coalesce(auth.email(), ''))
  );
$$;

-- medical_health_files: allow worker to view own docs
DROP POLICY IF EXISTS "Worker can view own health files" ON public.medical_health_files;
CREATE POLICY "Worker can view own health files"
  ON public.medical_health_files FOR SELECT
  TO authenticated
  USING (public.is_own_employee_record(employee_id));

-- medical_exam_history: worker read-only own exams
DROP POLICY IF EXISTS "Worker can view own exams" ON public.medical_exam_history;
CREATE POLICY "Worker can view own exams"
  ON public.medical_exam_history FOR SELECT
  TO authenticated
  USING (public.is_own_employee_record(employee_id));

-- medical_health_records: worker read-only own record
DROP POLICY IF EXISTS "Worker can view own health record" ON public.medical_health_records;
CREATE POLICY "Worker can view own health record"
  ON public.medical_health_records FOR SELECT
  TO authenticated
  USING (public.is_own_employee_record(employee_id));

-- medical_judgments: worker read-only own judgments
DROP POLICY IF EXISTS "Worker can view own judgments" ON public.medical_judgments;
CREATE POLICY "Worker can view own judgments"
  ON public.medical_judgments FOR SELECT
  TO authenticated
  USING (employee_id IS NOT NULL AND public.is_own_employee_record(employee_id));

-- medical_visits: worker read-only own visits (needed to view judgment context)
DROP POLICY IF EXISTS "Worker can view own visits" ON public.medical_visits;
CREATE POLICY "Worker can view own visits"
  ON public.medical_visits FOR SELECT
  TO authenticated
  USING (employee_id IS NOT NULL AND public.is_own_employee_record(employee_id));
