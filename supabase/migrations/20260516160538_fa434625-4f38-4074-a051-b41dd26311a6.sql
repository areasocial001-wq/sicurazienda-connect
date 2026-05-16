ALTER TABLE public.crm_contacts
  ADD COLUMN IF NOT EXISTS mobile text,
  ADD COLUMN IF NOT EXISTS technical_consultant text;