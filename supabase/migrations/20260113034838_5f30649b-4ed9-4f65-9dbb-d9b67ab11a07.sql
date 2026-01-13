-- Add expiry_date column to crm_client_documents for document expiration tracking
ALTER TABLE public.crm_client_documents 
ADD COLUMN IF NOT EXISTS expiry_date DATE DEFAULT NULL;

-- Add index for efficient querying of expiring documents
CREATE INDEX IF NOT EXISTS idx_crm_client_documents_expiry 
ON public.crm_client_documents(expiry_date) 
WHERE expiry_date IS NOT NULL;