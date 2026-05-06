
-- 1. Remove public QR-based read access on documents
DROP POLICY IF EXISTS "Anyone can view documents for QR redirect" ON public.documents;

-- 2. Restrict QR code creation to owners of the referenced document
DROP POLICY IF EXISTS "Users can insert QR codes" ON public.qr_codes;
CREATE POLICY "Users can insert QR codes for own documents"
ON public.qr_codes
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = created_by
  AND EXISTS (
    SELECT 1 FROM public.documents d
    WHERE d.id = qr_codes.document_id
      AND d.user_id = auth.uid()
  )
);

-- 3. Replace public SELECT on qr_codes with a restricted view exposing only redirect fields
DROP POLICY IF EXISTS "Public can view active QR codes for redirect" ON public.qr_codes;

CREATE OR REPLACE VIEW public.qr_codes_public AS
SELECT id, document_id, public_url, is_active, expires_at
FROM public.qr_codes
WHERE is_active = true
  AND (expires_at IS NULL OR expires_at > now());

GRANT SELECT ON public.qr_codes_public TO anon, authenticated;

-- 4. Lock down notification inserts to service_role / SECURITY DEFINER triggers
DROP POLICY IF EXISTS "System can insert notifications" ON public.note_share_notifications;
CREATE POLICY "Service role can insert share notifications"
ON public.note_share_notifications
FOR INSERT
TO service_role
WITH CHECK (true);

DROP POLICY IF EXISTS "System can insert comment notifications" ON public.note_comment_notifications;
CREATE POLICY "Service role can insert comment notifications"
ON public.note_comment_notifications
FOR INSERT
TO service_role
WITH CHECK (true);

-- 5. Course-branding storage: enforce ownership on INSERT and DELETE
DROP POLICY IF EXISTS "Authenticated users can upload branding logos" ON storage.objects;
CREATE POLICY "Users can upload own branding logos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'course-branding'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "Users can delete own branding logos" ON storage.objects;
CREATE POLICY "Users can delete own branding logos"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'course-branding'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
