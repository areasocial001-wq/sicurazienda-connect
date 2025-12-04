-- Create table to track QR code scans
CREATE TABLE public.qr_scans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  qr_code_id UUID NOT NULL REFERENCES public.qr_codes(id) ON DELETE CASCADE,
  scanned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ip_address TEXT,
  user_agent TEXT
);

-- Enable RLS
ALTER TABLE public.qr_scans ENABLE ROW LEVEL SECURITY;

-- Anyone can insert scans (public tracking)
CREATE POLICY "Anyone can insert scans"
ON public.qr_scans
FOR INSERT
WITH CHECK (true);

-- Users can view scans for their own QR codes
CREATE POLICY "Users can view own QR scans"
ON public.qr_scans
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.qr_codes
    WHERE qr_codes.id = qr_scans.qr_code_id
    AND qr_codes.created_by = auth.uid()
  )
);

-- Admins can view all scans
CREATE POLICY "Admins can view all scans"
ON public.qr_scans
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Enable realtime for notifications
ALTER TABLE public.qr_scans REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.qr_scans;