
-- 1. Anamnesi / Cartella sanitaria (una per dipendente)
CREATE TABLE public.medical_health_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  employee_id UUID NOT NULL UNIQUE,
  contact_id UUID,
  -- Anagrafica sanitaria
  birth_place TEXT,
  birth_date DATE,
  gender TEXT,
  blood_group TEXT,
  height_cm INTEGER,
  weight_kg NUMERIC(5,2),
  dominant_hand TEXT,
  -- Anamnesi
  anamnesi_familiare TEXT,
  anamnesi_fisiologica TEXT,
  anamnesi_patologica_remota TEXT,
  anamnesi_patologica_prossima TEXT,
  anamnesi_lavorativa TEXT,
  abitudini_fumo TEXT,
  abitudini_alcol TEXT,
  abitudini_sport TEXT,
  allergie TEXT,
  terapie_in_corso TEXT,
  vaccinazioni TEXT,
  interventi_chirurgici TEXT,
  -- Mansione / rischi
  current_job_role TEXT,
  current_risks TEXT[],
  protocol_id UUID,
  -- Note
  notes TEXT,
  last_review_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.medical_health_records TO authenticated;
GRANT ALL ON public.medical_health_records TO service_role;
ALTER TABLE public.medical_health_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff medicina gestisce cartelle" ON public.medical_health_records FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'medicina'::app_role) OR auth.uid() = user_id)
  WITH CHECK (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'medicina'::app_role) OR auth.uid() = user_id);
CREATE TRIGGER trg_mhr_updated BEFORE UPDATE ON public.medical_health_records FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Storico esami
CREATE TABLE public.medical_exam_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  employee_id UUID NOT NULL,
  visit_id UUID,
  protocol_id UUID,
  doctor_id UUID,
  exam_type TEXT NOT NULL,
  exam_category TEXT,
  exam_date DATE NOT NULL,
  outcome TEXT,
  outcome_value TEXT,
  reference_range TEXT,
  risk_category TEXT,
  job_role TEXT,
  file_id UUID,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_meh_employee ON public.medical_exam_history(employee_id, exam_date DESC);
CREATE INDEX idx_meh_risk ON public.medical_exam_history(risk_category);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.medical_exam_history TO authenticated;
GRANT ALL ON public.medical_exam_history TO service_role;
ALTER TABLE public.medical_exam_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff medicina gestisce esami" ON public.medical_exam_history FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'medicina'::app_role) OR auth.uid() = user_id)
  WITH CHECK (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'medicina'::app_role) OR auth.uid() = user_id);
CREATE TRIGGER trg_meh_updated BEFORE UPDATE ON public.medical_exam_history FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Firma grafica del medico (immagine caricata una volta)
ALTER TABLE public.medical_doctors ADD COLUMN IF NOT EXISTS signature_path TEXT;

-- 4. Estendi giudizi con dati per stampa + PDF firmato
ALTER TABLE public.medical_judgments
  ADD COLUMN IF NOT EXISTS protocol_id UUID,
  ADD COLUMN IF NOT EXISTS contact_id UUID,
  ADD COLUMN IF NOT EXISTS job_role TEXT,
  ADD COLUMN IF NOT EXISTS risks_evaluated TEXT[],
  ADD COLUMN IF NOT EXISTS exams_evaluated JSONB,
  ADD COLUMN IF NOT EXISTS visit_type TEXT,
  ADD COLUMN IF NOT EXISTS visit_date DATE,
  ADD COLUMN IF NOT EXISTS signature_path TEXT,
  ADD COLUMN IF NOT EXISTS signed_pdf_path TEXT,
  ADD COLUMN IF NOT EXISTS signed_pdf_version INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS health_file_id UUID;
