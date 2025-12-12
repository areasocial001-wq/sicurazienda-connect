-- Add policy to allow public read access to QR codes for redirect functionality
-- This is necessary because QR codes are scanned by unauthenticated users (clients)
CREATE POLICY "Anyone can view QR codes for redirect" 
ON public.qr_codes 
FOR SELECT 
USING (true);

-- Also need to allow public read of documents for getting file_path during redirect
CREATE POLICY "Anyone can view documents for QR redirect" 
ON public.documents 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM qr_codes 
    WHERE qr_codes.document_id = documents.id 
    AND qr_codes.is_active = true
  )
);