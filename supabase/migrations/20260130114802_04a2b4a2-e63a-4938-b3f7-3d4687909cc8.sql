-- Aggiungi nuovi campi alla tabella crm_contacts per gestire dati dal gestionale
ALTER TABLE public.crm_contacts 
ADD COLUMN IF NOT EXISTS code TEXT,
ADD COLUMN IF NOT EXISTS rating TEXT,
ADD COLUMN IF NOT EXISTS owner_name TEXT;

-- Crea tabella per le attività/eventi CRM
CREATE TABLE IF NOT EXISTS public.crm_activities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contact_id UUID REFERENCES public.crm_contacts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  type TEXT NOT NULL DEFAULT 'task',
  name TEXT NOT NULL,
  work_type TEXT,
  project_name TEXT,
  owner_name TEXT,
  assignee TEXT,
  status TEXT NOT NULL DEFAULT 'not_started',
  priority TEXT DEFAULT 'medium',
  description TEXT,
  start_date TIMESTAMP WITH TIME ZONE,
  end_date TIMESTAMP WITH TIME ZONE,
  completion_date TIMESTAMP WITH TIME ZONE,
  actual_time NUMERIC,
  actual_cost NUMERIC,
  is_invoiced BOOLEAN DEFAULT FALSE,
  invoice_number TEXT,
  invoice_date DATE,
  invoiced_hours NUMERIC,
  billing_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Crea tabella per le commesse/contratti CRM
CREATE TABLE IF NOT EXISTS public.crm_contracts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contact_id UUID REFERENCES public.crm_contacts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  responsible TEXT,
  group_name TEXT,
  quote_amount NUMERIC,
  contract_amount NUMERIC,
  start_date DATE,
  end_date DATE,
  contract_date DATE,
  contract_type TEXT,
  documentation_delivery_date DATE,
  contract_expiry_date DATE,
  internal_cost NUMERIC,
  external_cost NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.crm_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_contracts ENABLE ROW LEVEL SECURITY;

-- RLS policies per crm_activities
CREATE POLICY "Users can view own activities" ON public.crm_activities
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own activities" ON public.crm_activities
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own activities" ON public.crm_activities
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own activities" ON public.crm_activities
  FOR DELETE USING (auth.uid() = user_id);

-- RLS policies per crm_contracts
CREATE POLICY "Users can view own contracts" ON public.crm_contracts
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own contracts" ON public.crm_contracts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own contracts" ON public.crm_contracts
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own contracts" ON public.crm_contracts
  FOR DELETE USING (auth.uid() = user_id);

-- Trigger per aggiornare updated_at
CREATE TRIGGER update_crm_activities_updated_at
  BEFORE UPDATE ON public.crm_activities
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_crm_contracts_updated_at
  BEFORE UPDATE ON public.crm_contracts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();