
DROP POLICY IF EXISTS "Users can update own branding logos" ON storage.objects;

CREATE POLICY "Users can update own branding logos"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'course-branding'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
