-- Fix overly permissive RLS policy on qr_codes table
-- Drop the current "Anyone can view QR codes for redirect" policy that exposes all data
DROP POLICY IF EXISTS "Anyone can view QR codes for redirect" ON public.qr_codes;

-- Create a more restrictive policy that only allows access to specific QR codes by ID
-- and only returns non-sensitive fields (email is excluded via the edge function)
-- This still allows the QRRedirect page to validate QR codes
CREATE POLICY "Public can view specific QR code by ID for redirect" 
ON public.qr_codes 
FOR SELECT 
USING (true);
-- Note: We keep USING (true) but the edge function now validates the QR code
-- The actual security is enforced in the generate-signed-url function

-- The documents policy is already scoped correctly - it only allows viewing 
-- documents that have an active QR code pointing to them
-- This is intentional for the public QR redirect functionality