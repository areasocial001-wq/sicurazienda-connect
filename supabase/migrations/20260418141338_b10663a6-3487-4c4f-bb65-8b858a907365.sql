-- ============================================
-- MODULO MEDICINA DEL LAVORO
-- Accesso strettamente limitato a ruolo 'medicina' e 'admin'
-- ============================================

-- 1. ANAGRAFICA MEDICI COMPETENTI
CREATE TABLE public.medical_doctors (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  fiscal_code TEXT,
  medical_order TEXT,
  order_number TEXT,
  email TEXT,
  phone TEXT,
  pec TEXT,
  facility_name TEXT,
  facility_address TEXT,
  hourly_rate NUMERIC,
  visit_rate NUMERIC,
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.medical_doctors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Medicina and admins can view doctors"
  ON public.medical_doctors FOR SELECT
  USING (has_role(auth.uid(), 'medicina'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Medicina and admins can insert doctors"
  ON public.medical_doctors FOR INSERT
  WITH CHECK (auth.uid() = user_id AND (has_role(auth.uid(), 'medicina'::app_role) OR has_role(auth.uid(), 'admin'::app_role)));

CREATE POLICY "Medicina and admins can update doctors"
  ON public.medical_doctors FOR UPDATE
  USING (has_role(auth.uid(), 'medicina'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Medicina and admins can delete doctors"
  ON public.medical_doctors FOR DELETE
  USING (has_role(auth.uid(), 'medicina'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_medical_doctors_updated_at
  BEFORE UPDATE ON public.medical_doctors
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. PROTOCOLLI SANITARI per mansione/rischio
CREATE TABLE public.medical_protocols (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  contact_id UUID,
  name TEXT NOT NULL,
  job_role TEXT,
  risks TEXT[],
  exams JSONB DEFAULT '[]'::jsonb,
  periodicity_months INTEGER,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.medical_protocols ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Medicina and admins can view protocols"
  ON public.medical_protocols FOR SELECT
  USING (has_role(auth.uid(), 'medicina'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Medicina and admins can insert protocols"
  ON public.medical_protocols FOR INSERT
  WITH CHECK (auth.uid() = user_id AND (has_role(auth.uid(), 'medicina'::app_role) OR has_role(auth.uid(), 'admin'::app_role)));

CREATE POLICY "Medicina and admins can update protocols"
  ON public.medical_protocols FOR UPDATE
  USING (has_role(auth.uid(), 'medicina'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Medicina and admins can delete protocols"
  ON public.medical_protocols FOR DELETE
  USING (has_role(auth.uid(), 'medicina'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_medical_protocols_updated_at
  BEFORE UPDATE ON public.medical_protocols
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. VISITE / SORVEGLIANZA SANITARIA
CREATE TABLE public.medical_visits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  contact_id UUID,
  employee_id UUID,
  protocol_id UUID,
  doctor_id UUID,
  visit_type TEXT NOT NULL DEFAULT 'periodica',
  scheduled_date DATE,
  execution_date DATE,
  next_due_date DATE,
  location TEXT,
  status TEXT NOT NULL DEFAULT 'scheduled',
  exams_performed JSONB DEFAULT '[]'::jsonb,
  cost NUMERIC,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.medical_visits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Medicina and admins can view visits"
  ON public.medical_visits FOR SELECT
  USING (has_role(auth.uid(), 'medicina'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Medicina and admins can insert visits"
  ON public.medical_visits FOR INSERT
  WITH CHECK (auth.uid() = user_id AND (has_role(auth.uid(), 'medicina'::app_role) OR has_role(auth.uid(), 'admin'::app_role)));

CREATE POLICY "Medicina and admins can update visits"
  ON public.medical_visits FOR UPDATE
  USING (has_role(auth.uid(), 'medicina'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Medicina and admins can delete visits"
  ON public.medical_visits FOR DELETE
  USING (has_role(auth.uid(), 'medicina'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_medical_visits_updated_at
  BEFORE UPDATE ON public.medical_visits
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_medical_visits_employee ON public.medical_visits(employee_id);
CREATE INDEX idx_medical_visits_contact ON public.medical_visits(contact_id);
CREATE INDEX idx_medical_visits_next_due ON public.medical_visits(next_due_date);

-- 4. GIUDIZI DI IDONEITÀ
CREATE TABLE public.medical_judgments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  visit_id UUID,
  employee_id UUID,
  judgment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  judgment TEXT NOT NULL DEFAULT 'idoneo',
  limitations TEXT,
  prescriptions TEXT,
  valid_until DATE,
  doctor_id UUID,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.medical_judgments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Medicina and admins can view judgments"
  ON public.medical_judgments FOR SELECT
  USING (has_role(auth.uid(), 'medicina'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Medicina and admins can insert judgments"
  ON public.medical_judgments FOR INSERT
  WITH CHECK (auth.uid() = user_id AND (has_role(auth.uid(), 'medicina'::app_role) OR has_role(auth.uid(), 'admin'::app_role)));

CREATE POLICY "Medicina and admins can update judgments"
  ON public.medical_judgments FOR UPDATE
  USING (has_role(auth.uid(), 'medicina'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Medicina and admins can delete judgments"
  ON public.medical_judgments FOR DELETE
  USING (has_role(auth.uid(), 'medicina'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_medical_judgments_updated_at
  BEFORE UPDATE ON public.medical_judgments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5. SOPRALLUOGHI MEDICO COMPETENTE
CREATE TABLE public.medical_inspections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  contact_id UUID,
  location_id UUID,
  doctor_id UUID,
  inspection_date DATE NOT NULL,
  participants TEXT,
  topics TEXT,
  findings TEXT,
  recommendations TEXT,
  report_file_path TEXT,
  status TEXT NOT NULL DEFAULT 'pianificato',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.medical_inspections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Medicina and admins can view inspections"
  ON public.medical_inspections FOR SELECT
  USING (has_role(auth.uid(), 'medicina'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Medicina and admins can insert inspections"
  ON public.medical_inspections FOR INSERT
  WITH CHECK (auth.uid() = user_id AND (has_role(auth.uid(), 'medicina'::app_role) OR has_role(auth.uid(), 'admin'::app_role)));

CREATE POLICY "Medicina and admins can update inspections"
  ON public.medical_inspections FOR UPDATE
  USING (has_role(auth.uid(), 'medicina'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Medicina and admins can delete inspections"
  ON public.medical_inspections FOR DELETE
  USING (has_role(auth.uid(), 'medicina'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_medical_inspections_updated_at
  BEFORE UPDATE ON public.medical_inspections
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 6. RELAZIONI ANNUALI ART. 25 / ALLEGATO 3B
CREATE TABLE public.medical_annual_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  contact_id UUID,
  doctor_id UUID,
  reference_year INTEGER NOT NULL,
  report_date DATE,
  total_workers INTEGER,
  visits_performed INTEGER,
  fit_count INTEGER,
  fit_with_limitations_count INTEGER,
  unfit_count INTEGER,
  content TEXT,
  report_file_path TEXT,
  allegato_3b_data JSONB DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'bozza',
  sent_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.medical_annual_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Medicina and admins can view annual reports"
  ON public.medical_annual_reports FOR SELECT
  USING (has_role(auth.uid(), 'medicina'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Medicina and admins can insert annual reports"
  ON public.medical_annual_reports FOR INSERT
  WITH CHECK (auth.uid() = user_id AND (has_role(auth.uid(), 'medicina'::app_role) OR has_role(auth.uid(), 'admin'::app_role)));

CREATE POLICY "Medicina and admins can update annual reports"
  ON public.medical_annual_reports FOR UPDATE
  USING (has_role(auth.uid(), 'medicina'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Medicina and admins can delete annual reports"
  ON public.medical_annual_reports FOR DELETE
  USING (has_role(auth.uid(), 'medicina'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_medical_annual_reports_updated_at
  BEFORE UPDATE ON public.medical_annual_reports
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 7. CARTELLA SANITARIA - documenti/referti
CREATE TABLE public.medical_health_files (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  employee_id UUID NOT NULL,
  contact_id UUID,
  visit_id UUID,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size BIGINT,
  file_type TEXT,
  document_type TEXT NOT NULL DEFAULT 'referto',
  document_date DATE,
  description TEXT,
  uploaded_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.medical_health_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Medicina and admins can view health files"
  ON public.medical_health_files FOR SELECT
  USING (has_role(auth.uid(), 'medicina'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Medicina and admins can insert health files"
  ON public.medical_health_files FOR INSERT
  WITH CHECK (auth.uid() = user_id AND (has_role(auth.uid(), 'medicina'::app_role) OR has_role(auth.uid(), 'admin'::app_role)));

CREATE POLICY "Medicina and admins can update health files"
  ON public.medical_health_files FOR UPDATE
  USING (has_role(auth.uid(), 'medicina'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Medicina and admins can delete health files"
  ON public.medical_health_files FOR DELETE
  USING (has_role(auth.uid(), 'medicina'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_medical_health_files_updated_at
  BEFORE UPDATE ON public.medical_health_files
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_medical_health_files_employee ON public.medical_health_files(employee_id);

-- ============================================
-- STORAGE BUCKET per cartelle sanitarie (privato)
-- ============================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('medical-records', 'medical-records', false)
ON CONFLICT (id) DO NOTHING;

-- Policies storage: solo medicina e admin
CREATE POLICY "Medicina and admins can view medical records"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'medical-records'
    AND (has_role(auth.uid(), 'medicina'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
  );

CREATE POLICY "Medicina and admins can upload medical records"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'medical-records'
    AND (has_role(auth.uid(), 'medicina'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
  );

CREATE POLICY "Medicina and admins can update medical records"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'medical-records'
    AND (has_role(auth.uid(), 'medicina'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
  );

CREATE POLICY "Medicina and admins can delete medical records"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'medical-records'
    AND (has_role(auth.uid(), 'medicina'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
  );