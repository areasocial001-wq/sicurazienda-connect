DROP POLICY IF EXISTS "Workers can view own judgment PDFs" ON storage.objects;
CREATE POLICY "Workers can view own judgment PDFs"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'medical-records'
  AND EXISTS (
    SELECT 1 FROM public.medical_judgments j
    WHERE j.signed_pdf_path = storage.objects.name
      AND public.is_own_employee_record(j.employee_id)
  )
);