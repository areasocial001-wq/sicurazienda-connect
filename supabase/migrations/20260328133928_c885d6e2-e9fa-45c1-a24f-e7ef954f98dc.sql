DROP POLICY IF EXISTS "Clients can download own CRM documents" ON storage.objects;
DROP POLICY IF EXISTS "Clients can upload own CRM documents" ON storage.objects;

CREATE POLICY "Clients can download own CRM documents"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'crm-documents'
    AND EXISTS (
      SELECT 1
      FROM crm_contacts c
      WHERE c.id::text = (storage.foldername(storage.objects.name))[1]
        AND c.client_user_id = auth.uid()
    )
  );

CREATE POLICY "Clients can upload own CRM documents"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'crm-documents'
    AND EXISTS (
      SELECT 1
      FROM crm_contacts c
      WHERE c.id::text = (storage.foldername(storage.objects.name))[1]
        AND c.client_user_id = auth.uid()
    )
    AND (storage.foldername(storage.objects.name))[2] = 'cliente'
  );