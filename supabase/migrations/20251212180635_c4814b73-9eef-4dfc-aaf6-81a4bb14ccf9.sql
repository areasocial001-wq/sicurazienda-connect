-- Add expires_at column to qr_codes table
ALTER TABLE public.qr_codes 
ADD COLUMN expires_at TIMESTAMP WITH TIME ZONE DEFAULT (now() + INTERVAL '7 days');

-- Update existing records with default expiration
UPDATE public.qr_codes 
SET expires_at = created_at + INTERVAL '7 days' 
WHERE expires_at IS NULL;