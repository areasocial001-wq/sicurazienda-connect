-- Create a table to track generated QR codes
CREATE TABLE public.qr_codes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  document_name TEXT NOT NULL,
  public_url TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID NOT NULL,
  sent_to_email TEXT,
  sent_at TIMESTAMP WITH TIME ZONE
);

-- Enable Row Level Security
ALTER TABLE public.qr_codes ENABLE ROW LEVEL SECURITY;

-- Admins can view all QR codes
CREATE POLICY "Admins can view all QR codes"
ON public.qr_codes
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Users can view QR codes they created
CREATE POLICY "Users can view own QR codes"
ON public.qr_codes
FOR SELECT
USING (auth.uid() = created_by);

-- Admins and users can insert QR codes
CREATE POLICY "Users can insert QR codes"
ON public.qr_codes
FOR INSERT
WITH CHECK (auth.uid() = created_by);

-- Admins can update any QR code
CREATE POLICY "Admins can update QR codes"
ON public.qr_codes
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Users can update their own QR codes
CREATE POLICY "Users can update own QR codes"
ON public.qr_codes
FOR UPDATE
USING (auth.uid() = created_by);

-- Admins can delete any QR code
CREATE POLICY "Admins can delete QR codes"
ON public.qr_codes
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Users can delete their own QR codes
CREATE POLICY "Users can delete own QR codes"
ON public.qr_codes
FOR DELETE
USING (auth.uid() = created_by);

-- Add index for better performance
CREATE INDEX idx_qr_codes_document_id ON public.qr_codes(document_id);
CREATE INDEX idx_qr_codes_created_by ON public.qr_codes(created_by);