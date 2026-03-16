
-- =============================================
-- GESTIONE CORSI IN AULA - Schema Database
-- =============================================

-- 1. Catalogo Corsi
CREATE TABLE public.courses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  course_type TEXT NOT NULL DEFAULT 'sicurezza',
  description TEXT,
  duration_hours NUMERIC,
  max_participants INTEGER,
  is_mandatory BOOLEAN DEFAULT false,
  renewal_months INTEGER,
  category TEXT,
  notes TEXT,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Business areas and admins can view all courses" ON public.courses FOR SELECT TO public
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'contabilita'::app_role) OR has_role(auth.uid(), 'area_tecnica'::app_role) OR has_role(auth.uid(), 'gestione_corsi'::app_role) OR has_role(auth.uid(), 'consulenti_tecnici'::app_role) OR has_role(auth.uid(), 'medicina'::app_role));

CREATE POLICY "Business areas and admins can insert courses" ON public.courses FOR INSERT TO public
  WITH CHECK (auth.uid() = user_id AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'contabilita'::app_role) OR has_role(auth.uid(), 'area_tecnica'::app_role) OR has_role(auth.uid(), 'gestione_corsi'::app_role) OR has_role(auth.uid(), 'consulenti_tecnici'::app_role) OR has_role(auth.uid(), 'medicina'::app_role)));

CREATE POLICY "Business areas and admins can update courses" ON public.courses FOR UPDATE TO public
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'contabilita'::app_role) OR has_role(auth.uid(), 'area_tecnica'::app_role) OR has_role(auth.uid(), 'gestione_corsi'::app_role) OR has_role(auth.uid(), 'consulenti_tecnici'::app_role) OR has_role(auth.uid(), 'medicina'::app_role));

CREATE POLICY "Business areas and admins can delete courses" ON public.courses FOR DELETE TO public
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'contabilita'::app_role) OR has_role(auth.uid(), 'area_tecnica'::app_role) OR has_role(auth.uid(), 'gestione_corsi'::app_role) OR has_role(auth.uid(), 'consulenti_tecnici'::app_role) OR has_role(auth.uid(), 'medicina'::app_role));

CREATE TRIGGER update_courses_updated_at BEFORE UPDATE ON public.courses FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 2. Edizioni (sessioni specifiche di un corso)
CREATE TABLE public.course_editions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  edition_code TEXT,
  start_date DATE,
  end_date DATE,
  location TEXT,
  classroom TEXT,
  instructor_name TEXT,
  instructor_email TEXT,
  status TEXT NOT NULL DEFAULT 'pianificata',
  notes TEXT,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.course_editions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Business areas and admins can view all editions" ON public.course_editions FOR SELECT TO public
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'contabilita'::app_role) OR has_role(auth.uid(), 'area_tecnica'::app_role) OR has_role(auth.uid(), 'gestione_corsi'::app_role) OR has_role(auth.uid(), 'consulenti_tecnici'::app_role) OR has_role(auth.uid(), 'medicina'::app_role));

CREATE POLICY "Business areas and admins can insert editions" ON public.course_editions FOR INSERT TO public
  WITH CHECK (auth.uid() = user_id AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'contabilita'::app_role) OR has_role(auth.uid(), 'area_tecnica'::app_role) OR has_role(auth.uid(), 'gestione_corsi'::app_role) OR has_role(auth.uid(), 'consulenti_tecnici'::app_role) OR has_role(auth.uid(), 'medicina'::app_role)));

CREATE POLICY "Business areas and admins can update editions" ON public.course_editions FOR UPDATE TO public
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'contabilita'::app_role) OR has_role(auth.uid(), 'area_tecnica'::app_role) OR has_role(auth.uid(), 'gestione_corsi'::app_role) OR has_role(auth.uid(), 'consulenti_tecnici'::app_role) OR has_role(auth.uid(), 'medicina'::app_role));

CREATE POLICY "Business areas and admins can delete editions" ON public.course_editions FOR DELETE TO public
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'contabilita'::app_role) OR has_role(auth.uid(), 'area_tecnica'::app_role) OR has_role(auth.uid(), 'gestione_corsi'::app_role) OR has_role(auth.uid(), 'consulenti_tecnici'::app_role) OR has_role(auth.uid(), 'medicina'::app_role));

CREATE TRIGGER update_course_editions_updated_at BEFORE UPDATE ON public.course_editions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 3. Iscrizioni (collegamento dipendenti CRM -> edizione corso)
CREATE TABLE public.course_enrollments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  edition_id UUID NOT NULL REFERENCES public.course_editions(id) ON DELETE CASCADE,
  employee_id UUID REFERENCES public.crm_employees(id) ON DELETE SET NULL,
  contact_id UUID REFERENCES public.crm_contacts(id) ON DELETE SET NULL,
  enrollment_date DATE DEFAULT CURRENT_DATE,
  status TEXT NOT NULL DEFAULT 'iscritto',
  certificate_issued BOOLEAN DEFAULT false,
  certificate_date DATE,
  certificate_expiry DATE,
  result TEXT,
  score NUMERIC,
  notes TEXT,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.course_enrollments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Business areas and admins can view all enrollments" ON public.course_enrollments FOR SELECT TO public
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'contabilita'::app_role) OR has_role(auth.uid(), 'area_tecnica'::app_role) OR has_role(auth.uid(), 'gestione_corsi'::app_role) OR has_role(auth.uid(), 'consulenti_tecnici'::app_role) OR has_role(auth.uid(), 'medicina'::app_role));

CREATE POLICY "Business areas and admins can insert enrollments" ON public.course_enrollments FOR INSERT TO public
  WITH CHECK (auth.uid() = user_id AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'contabilita'::app_role) OR has_role(auth.uid(), 'area_tecnica'::app_role) OR has_role(auth.uid(), 'gestione_corsi'::app_role) OR has_role(auth.uid(), 'consulenti_tecnici'::app_role) OR has_role(auth.uid(), 'medicina'::app_role)));

CREATE POLICY "Business areas and admins can update enrollments" ON public.course_enrollments FOR UPDATE TO public
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'contabilita'::app_role) OR has_role(auth.uid(), 'area_tecnica'::app_role) OR has_role(auth.uid(), 'gestione_corsi'::app_role) OR has_role(auth.uid(), 'consulenti_tecnici'::app_role) OR has_role(auth.uid(), 'medicina'::app_role));

CREATE POLICY "Business areas and admins can delete enrollments" ON public.course_enrollments FOR DELETE TO public
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'contabilita'::app_role) OR has_role(auth.uid(), 'area_tecnica'::app_role) OR has_role(auth.uid(), 'gestione_corsi'::app_role) OR has_role(auth.uid(), 'consulenti_tecnici'::app_role) OR has_role(auth.uid(), 'medicina'::app_role));

CREATE TRIGGER update_course_enrollments_updated_at BEFORE UPDATE ON public.course_enrollments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 4. Lezioni (singole giornate/moduli di un'edizione)
CREATE TABLE public.course_lessons (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  edition_id UUID NOT NULL REFERENCES public.course_editions(id) ON DELETE CASCADE,
  lesson_date DATE NOT NULL,
  start_time TIME,
  end_time TIME,
  topic TEXT,
  instructor_name TEXT,
  notes TEXT,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.course_lessons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Business areas and admins can view all lessons" ON public.course_lessons FOR SELECT TO public
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'contabilita'::app_role) OR has_role(auth.uid(), 'area_tecnica'::app_role) OR has_role(auth.uid(), 'gestione_corsi'::app_role) OR has_role(auth.uid(), 'consulenti_tecnici'::app_role) OR has_role(auth.uid(), 'medicina'::app_role));

CREATE POLICY "Business areas and admins can insert lessons" ON public.course_lessons FOR INSERT TO public
  WITH CHECK (auth.uid() = user_id AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'contabilita'::app_role) OR has_role(auth.uid(), 'area_tecnica'::app_role) OR has_role(auth.uid(), 'gestione_corsi'::app_role) OR has_role(auth.uid(), 'consulenti_tecnici'::app_role) OR has_role(auth.uid(), 'medicina'::app_role)));

CREATE POLICY "Business areas and admins can update lessons" ON public.course_lessons FOR UPDATE TO public
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'contabilita'::app_role) OR has_role(auth.uid(), 'area_tecnica'::app_role) OR has_role(auth.uid(), 'gestione_corsi'::app_role) OR has_role(auth.uid(), 'consulenti_tecnici'::app_role) OR has_role(auth.uid(), 'medicina'::app_role));

CREATE POLICY "Business areas and admins can delete lessons" ON public.course_lessons FOR DELETE TO public
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'contabilita'::app_role) OR has_role(auth.uid(), 'area_tecnica'::app_role) OR has_role(auth.uid(), 'gestione_corsi'::app_role) OR has_role(auth.uid(), 'consulenti_tecnici'::app_role) OR has_role(auth.uid(), 'medicina'::app_role));

-- 5. Presenze (per ogni lezione, per ogni iscritto)
CREATE TABLE public.course_attendance (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lesson_id UUID NOT NULL REFERENCES public.course_lessons(id) ON DELETE CASCADE,
  enrollment_id UUID NOT NULL REFERENCES public.course_enrollments(id) ON DELETE CASCADE,
  present BOOLEAN DEFAULT false,
  entry_time TIME,
  exit_time TIME,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(lesson_id, enrollment_id)
);

ALTER TABLE public.course_attendance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Business areas and admins can view all attendance" ON public.course_attendance FOR SELECT TO public
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'contabilita'::app_role) OR has_role(auth.uid(), 'area_tecnica'::app_role) OR has_role(auth.uid(), 'gestione_corsi'::app_role) OR has_role(auth.uid(), 'consulenti_tecnici'::app_role) OR has_role(auth.uid(), 'medicina'::app_role));

CREATE POLICY "Business areas and admins can insert attendance" ON public.course_attendance FOR INSERT TO public
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'contabilita'::app_role) OR has_role(auth.uid(), 'area_tecnica'::app_role) OR has_role(auth.uid(), 'gestione_corsi'::app_role) OR has_role(auth.uid(), 'consulenti_tecnici'::app_role) OR has_role(auth.uid(), 'medicina'::app_role));

CREATE POLICY "Business areas and admins can update attendance" ON public.course_attendance FOR UPDATE TO public
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'contabilita'::app_role) OR has_role(auth.uid(), 'area_tecnica'::app_role) OR has_role(auth.uid(), 'gestione_corsi'::app_role) OR has_role(auth.uid(), 'consulenti_tecnici'::app_role) OR has_role(auth.uid(), 'medicina'::app_role));

CREATE POLICY "Business areas and admins can delete attendance" ON public.course_attendance FOR DELETE TO public
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'contabilita'::app_role) OR has_role(auth.uid(), 'area_tecnica'::app_role) OR has_role(auth.uid(), 'gestione_corsi'::app_role) OR has_role(auth.uid(), 'consulenti_tecnici'::app_role) OR has_role(auth.uid(), 'medicina'::app_role));
