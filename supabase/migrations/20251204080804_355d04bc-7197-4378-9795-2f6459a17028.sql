-- Add is_active column to qr_codes table
ALTER TABLE public.qr_codes 
ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT true;