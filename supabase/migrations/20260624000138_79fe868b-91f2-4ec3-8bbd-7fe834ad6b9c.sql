
CREATE POLICY "Workers manage own files"
  ON storage.objects FOR ALL TO authenticated
  USING (
    bucket_id = 'worker-files'
    AND (storage.foldername(storage.objects.name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'worker-files'
    AND (storage.foldername(storage.objects.name))[1] = auth.uid()::text
  );

CREATE POLICY "Approvers read worker files"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'worker-files'
    AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'contabilita'))
  );
