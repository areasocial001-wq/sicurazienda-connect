-- Add additional business fields to crm_contacts
ALTER TABLE public.crm_contacts 
ADD COLUMN IF NOT EXISTS address TEXT,
ADD COLUMN IF NOT EXISTS website TEXT,
ADD COLUMN IF NOT EXISTS vat_number TEXT,
ADD COLUMN IF NOT EXISTS fiscal_code TEXT,
ADD COLUMN IF NOT EXISTS pec TEXT,
ADD COLUMN IF NOT EXISTS sdi_code TEXT;