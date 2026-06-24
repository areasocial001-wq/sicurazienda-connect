
CREATE POLICY "Approvers upload worker files"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'worker-files'
    AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'contabilita'))
  );

CREATE POLICY "Approvers update worker files"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'worker-files'
    AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'contabilita'))
  );
