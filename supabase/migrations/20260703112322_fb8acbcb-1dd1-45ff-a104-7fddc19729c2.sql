
-- Catalogo standard rischi → esami consigliati (condiviso)
CREATE TABLE public.medical_risk_catalog (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  risk_code TEXT NOT NULL UNIQUE,
  risk_name TEXT NOT NULL,
  category TEXT,
  suggested_exams JSONB NOT NULL DEFAULT '[]'::jsonb,
  default_periodicity_months INTEGER,
  legal_reference TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.medical_risk_catalog TO authenticated;
GRANT ALL ON public.medical_risk_catalog TO service_role;

ALTER TABLE public.medical_risk_catalog ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Catalogo rischi leggibile da autenticati"
  ON public.medical_risk_catalog FOR SELECT TO authenticated USING (true);

CREATE POLICY "Solo admin gestisce catalogo rischi"
  ON public.medical_risk_catalog FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_medical_risk_catalog_updated_at
  BEFORE UPDATE ON public.medical_risk_catalog
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed catalogo rischi (D.Lgs 81/08 - principali)
INSERT INTO public.medical_risk_catalog (risk_code, risk_name, category, suggested_exams, default_periodicity_months, legal_reference) VALUES
('VDT', 'Videoterminale (>20h settimanali)', 'Ergonomico', '[{"name":"Visita medica generale","mandatory":true},{"name":"Esame oculistico","mandatory":true},{"name":"Test visus","mandatory":true}]'::jsonb, 60, 'Art. 176 D.Lgs 81/08'),
('MMC', 'Movimentazione manuale carichi', 'Ergonomico', '[{"name":"Visita medica generale","mandatory":true},{"name":"Esame rachide/apparato osteo-articolare","mandatory":true}]'::jsonb, 12, 'Titolo VI D.Lgs 81/08'),
('RUMORE_85', 'Rumore ≥ 85 dB(A)', 'Fisico', '[{"name":"Visita medica generale","mandatory":true},{"name":"Audiometria tonale","mandatory":true}]'::jsonb, 12, 'Art. 196 D.Lgs 81/08'),
('RUMORE_80', 'Rumore ≥ 80 dB(A)', 'Fisico', '[{"name":"Visita medica generale","mandatory":true},{"name":"Audiometria tonale","mandatory":true}]'::jsonb, 24, 'Art. 196 D.Lgs 81/08'),
('VIBRAZIONI', 'Vibrazioni meccaniche', 'Fisico', '[{"name":"Visita medica generale","mandatory":true},{"name":"Esame vascolare arti superiori","mandatory":false}]'::jsonb, 12, 'Titolo VIII Capo III D.Lgs 81/08'),
('CHIMICO', 'Agenti chimici pericolosi', 'Chimico', '[{"name":"Visita medica generale","mandatory":true},{"name":"Emocromo completo","mandatory":true},{"name":"Funzionalità epatica","mandatory":true},{"name":"Spirometria","mandatory":false}]'::jsonb, 12, 'Titolo IX Capo I D.Lgs 81/08'),
('CANCEROGENI', 'Agenti cancerogeni/mutageni', 'Chimico', '[{"name":"Visita medica generale","mandatory":true},{"name":"Emocromo completo","mandatory":true},{"name":"Esami mirati al cancerogeno specifico","mandatory":true}]'::jsonb, 12, 'Titolo IX Capo II D.Lgs 81/08'),
('BIOLOGICO', 'Agenti biologici', 'Biologico', '[{"name":"Visita medica generale","mandatory":true},{"name":"Marcatori sierologici HBV/HCV/HIV","mandatory":false},{"name":"Titolo anticorpale vaccinazioni","mandatory":false}]'::jsonb, 12, 'Titolo X D.Lgs 81/08'),
('AMIANTO', 'Esposizione amianto', 'Chimico', '[{"name":"Visita medica generale","mandatory":true},{"name":"Spirometria","mandatory":true},{"name":"Rx torace","mandatory":true}]'::jsonb, 36, 'Titolo IX Capo III D.Lgs 81/08'),
('LAVORO_NOTTURNO', 'Lavoro notturno', 'Organizzativo', '[{"name":"Visita medica generale","mandatory":true},{"name":"ECG","mandatory":false},{"name":"Emocromo","mandatory":false}]'::jsonb, 24, 'Art. 14 D.Lgs 66/2003'),
('LAVORI_QUOTA', 'Lavori in quota (>2m)', 'Meccanico', '[{"name":"Visita medica generale","mandatory":true},{"name":"ECG","mandatory":true},{"name":"Test equilibrio","mandatory":false}]'::jsonb, 24, 'Art. 111 D.Lgs 81/08'),
('SPAZI_CONFINATI', 'Spazi confinati', 'Meccanico', '[{"name":"Visita medica generale","mandatory":true},{"name":"Spirometria","mandatory":true},{"name":"ECG","mandatory":true}]'::jsonb, 12, 'DPR 177/2011'),
('RADIAZIONI_ION', 'Radiazioni ionizzanti (cat. A)', 'Fisico', '[{"name":"Visita medica generale","mandatory":true},{"name":"Emocromo completo","mandatory":true},{"name":"Esame dermatologico","mandatory":false}]'::jsonb, 6, 'D.Lgs 101/2020'),
('ALCOL_DIPENDENZE', 'Mansioni a rischio (alcol/droghe)', 'Comportamentale', '[{"name":"Visita medica generale","mandatory":true},{"name":"Test alcol/droghe","mandatory":true}]'::jsonb, 12, 'Intesa Stato-Regioni 30/10/2007');

-- Convocazioni per visita
CREATE TABLE public.medical_convocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  visit_id UUID REFERENCES public.medical_visits(id) ON DELETE CASCADE,
  employee_id UUID REFERENCES public.crm_employees(id) ON DELETE SET NULL,
  contact_id UUID REFERENCES public.crm_contacts(id) ON DELETE SET NULL,
  protocol_id UUID REFERENCES public.medical_protocols(id) ON DELETE SET NULL,
  doctor_id UUID REFERENCES public.medical_doctors(id) ON DELETE SET NULL,
  scheduled_date DATE,
  scheduled_time TIME,
  location TEXT,
  visit_type TEXT,
  recipient_email TEXT,
  recipient_pec TEXT,
  subject TEXT,
  body_html TEXT,
  pdf_path TEXT,
  status TEXT NOT NULL DEFAULT 'draft', -- draft | sent | failed | received | confirmed
  sent_at TIMESTAMPTZ,
  sent_channel TEXT, -- email | pec | manual
  error_message TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.medical_convocations TO authenticated;
GRANT ALL ON public.medical_convocations TO service_role;

ALTER TABLE public.medical_convocations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff medicina vede convocazioni"
  ON public.medical_convocations FOR SELECT TO authenticated
  USING (
    auth.uid() = user_id
    OR public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'medicina'::app_role)
    OR public.has_role(auth.uid(), 'contabilita'::app_role)
  );

CREATE POLICY "Staff medicina crea convocazioni"
  ON public.medical_convocations FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND (
      public.has_role(auth.uid(), 'admin'::app_role)
      OR public.has_role(auth.uid(), 'medicina'::app_role)
    )
  );

CREATE POLICY "Staff medicina aggiorna convocazioni"
  ON public.medical_convocations FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'medicina'::app_role)
  );

CREATE POLICY "Admin elimina convocazioni"
  ON public.medical_convocations FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_medical_convocations_updated_at
  BEFORE UPDATE ON public.medical_convocations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_medical_convocations_visit ON public.medical_convocations(visit_id);
CREATE INDEX idx_medical_convocations_employee ON public.medical_convocations(employee_id);
CREATE INDEX idx_medical_convocations_status ON public.medical_convocations(status);

-- Collegamento visita → ultima convocazione
ALTER TABLE public.medical_visits
  ADD COLUMN IF NOT EXISTS convocation_id UUID REFERENCES public.medical_convocations(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS convocation_sent_at TIMESTAMPTZ;
