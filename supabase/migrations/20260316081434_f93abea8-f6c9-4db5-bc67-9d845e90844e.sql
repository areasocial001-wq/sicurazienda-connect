
-- Table for storing company branding settings for PDF templates
CREATE TABLE public.course_branding_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  company_name text,
  company_address text,
  company_phone text,
  company_email text,
  company_pec text,
  company_vat text,
  company_fiscal_code text,
  company_website text,
  logo_path text,
  footer_text text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE public.course_branding_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Business areas and admins can view branding" ON public.course_branding_settings
  FOR SELECT TO public
  USING (
    has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'contabilita'::app_role) OR has_role(auth.uid(), 'area_tecnica'::app_role) OR has_role(auth.uid(), 'gestione_corsi'::app_role) OR has_role(auth.uid(), 'consulenti_tecnici'::app_role) OR has_role(auth.uid(), 'medicina'::app_role)
  );

CREATE POLICY "Business areas and admins can insert branding" ON public.course_branding_settings
  FOR INSERT TO public
  WITH CHECK (
    auth.uid() = user_id AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'contabilita'::app_role) OR has_role(auth.uid(), 'area_tecnica'::app_role) OR has_role(auth.uid(), 'gestione_corsi'::app_role) OR has_role(auth.uid(), 'consulenti_tecnici'::app_role) OR has_role(auth.uid(), 'medicina'::app_role))
  );

CREATE POLICY "Business areas and admins can update branding" ON public.course_branding_settings
  FOR UPDATE TO public
  USING (
    has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'contabilita'::app_role) OR has_role(auth.uid(), 'area_tecnica'::app_role) OR has_role(auth.uid(), 'gestione_corsi'::app_role) OR has_role(auth.uid(), 'consulenti_tecnici'::app_role) OR has_role(auth.uid(), 'medicina'::app_role)
  );

-- Storage bucket for course branding logos
INSERT INTO storage.buckets (id, name, public) VALUES ('course-branding', 'course-branding', true);

CREATE POLICY "Authenticated users can upload branding logos" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'course-branding');

CREATE POLICY "Anyone can view branding logos" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'course-branding');

CREATE POLICY "Users can update own branding logos" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'course-branding');

CREATE POLICY "Users can delete own branding logos" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'course-branding');
