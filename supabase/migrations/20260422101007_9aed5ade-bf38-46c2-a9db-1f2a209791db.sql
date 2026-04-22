-- Aggiungi campi anagrafici dipendenti
ALTER TABLE public.crm_employees
  ADD COLUMN IF NOT EXISTS birth_date date,
  ADD COLUMN IF NOT EXISTS birth_place text,
  ADD COLUMN IF NOT EXISTS termination_date date,
  ADD COLUMN IF NOT EXISTS external_id text;

CREATE INDEX IF NOT EXISTS idx_crm_employees_fiscal_code ON public.crm_employees (fiscal_code) WHERE fiscal_code IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_crm_employees_external_id ON public.crm_employees (external_id) WHERE external_id IS NOT NULL;

-- Aggiungi campi anagrafici aziende
ALTER TABLE public.crm_contacts
  ADD COLUMN IF NOT EXISTS legal_name text,
  ADD COLUMN IF NOT EXISTS postal_code text,
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS province text,
  ADD COLUMN IF NOT EXISTS region text,
  ADD COLUMN IF NOT EXISTS ateco_code text,
  ADD COLUMN IF NOT EXISTS ateco_letter text,
  ADD COLUMN IF NOT EXISTS pec_fe text,
  ADD COLUMN IF NOT EXISTS legal_form text,
  ADD COLUMN IF NOT EXISTS activity_start_date date,
  ADD COLUMN IF NOT EXISTS activity_end_date date,
  ADD COLUMN IF NOT EXISTS external_id text;

CREATE INDEX IF NOT EXISTS idx_crm_contacts_vat_number ON public.crm_contacts (vat_number) WHERE vat_number IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_crm_contacts_external_id ON public.crm_contacts (external_id) WHERE external_id IS NOT NULL;