-- Tabella Sedi Aziendali
CREATE TABLE public.crm_locations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contact_id UUID REFERENCES public.crm_contacts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  code TEXT,
  name TEXT NOT NULL,
  location_type TEXT DEFAULT 'sede',
  address TEXT,
  city TEXT,
  province TEXT,
  postal_code TEXT,
  country TEXT DEFAULT 'Italia',
  phone TEXT,
  email TEXT,
  pec TEXT,
  is_main_location BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabella Dipendenti
CREATE TABLE public.crm_employees (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  location_id UUID REFERENCES public.crm_locations(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES public.crm_contacts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  fiscal_code TEXT,
  email TEXT,
  phone TEXT,
  role TEXT,
  hire_date DATE,
  status TEXT DEFAULT 'active',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabella Attività Dipendenti (formazioni, visite, scadenze)
CREATE TABLE public.crm_employee_activities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID REFERENCES public.crm_employees(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  activity_type TEXT NOT NULL, -- 'formazione', 'visita', 'cartella_sanitaria'
  activity_name TEXT NOT NULL,
  status TEXT DEFAULT 'scheduled', -- 'scheduled', 'completed', 'expired', 'cancelled'
  execution_date DATE,
  expiry_date DATE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Indici per performance
CREATE INDEX idx_crm_locations_contact ON public.crm_locations(contact_id);
CREATE INDEX idx_crm_locations_user ON public.crm_locations(user_id);
CREATE INDEX idx_crm_employees_location ON public.crm_employees(location_id);
CREATE INDEX idx_crm_employees_contact ON public.crm_employees(contact_id);
CREATE INDEX idx_crm_employees_user ON public.crm_employees(user_id);
CREATE INDEX idx_crm_employee_activities_employee ON public.crm_employee_activities(employee_id);
CREATE INDEX idx_crm_employee_activities_expiry ON public.crm_employee_activities(expiry_date);
CREATE INDEX idx_crm_employee_activities_user ON public.crm_employee_activities(user_id);

-- Enable RLS
ALTER TABLE public.crm_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_employee_activities ENABLE ROW LEVEL SECURITY;

-- RLS Policies for crm_locations
CREATE POLICY "Users can view own locations" ON public.crm_locations
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own locations" ON public.crm_locations
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own locations" ON public.crm_locations
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own locations" ON public.crm_locations
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for crm_employees
CREATE POLICY "Users can view own employees" ON public.crm_employees
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own employees" ON public.crm_employees
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own employees" ON public.crm_employees
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own employees" ON public.crm_employees
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for crm_employee_activities
CREATE POLICY "Users can view own employee activities" ON public.crm_employee_activities
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own employee activities" ON public.crm_employee_activities
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own employee activities" ON public.crm_employee_activities
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own employee activities" ON public.crm_employee_activities
  FOR DELETE USING (auth.uid() = user_id);

-- Triggers for updated_at
CREATE TRIGGER update_crm_locations_updated_at
  BEFORE UPDATE ON public.crm_locations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_crm_employees_updated_at
  BEFORE UPDATE ON public.crm_employees
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_crm_employee_activities_updated_at
  BEFORE UPDATE ON public.crm_employee_activities
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();