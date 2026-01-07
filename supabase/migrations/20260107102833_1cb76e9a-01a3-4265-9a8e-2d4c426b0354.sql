-- Add geolocation columns to qr_scans table
ALTER TABLE public.qr_scans 
ADD COLUMN IF NOT EXISTS country TEXT,
ADD COLUMN IF NOT EXISTS country_code TEXT,
ADD COLUMN IF NOT EXISTS city TEXT,
ADD COLUMN IF NOT EXISTS region TEXT;

-- Add index for country queries
CREATE INDEX IF NOT EXISTS idx_qr_scans_country ON public.qr_scans(country);