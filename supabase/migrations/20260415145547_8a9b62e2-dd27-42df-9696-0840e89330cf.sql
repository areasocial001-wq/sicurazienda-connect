-- Create calendar_events table
CREATE TABLE public.calendar_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  start_datetime TIMESTAMP WITH TIME ZONE NOT NULL,
  end_datetime TIMESTAMP WITH TIME ZONE NOT NULL,
  all_day BOOLEAN NOT NULL DEFAULT false,
  location TEXT,
  color TEXT DEFAULT '#3B82F6',
  category TEXT NOT NULL DEFAULT 'appuntamento',
  contact_id UUID REFERENCES public.crm_contacts(id) ON DELETE SET NULL,
  employee_id UUID REFERENCES public.crm_employees(id) ON DELETE SET NULL,
  is_shared BOOLEAN NOT NULL DEFAULT false,
  created_by_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;

-- Indexes
CREATE INDEX idx_calendar_events_user_id ON public.calendar_events(user_id);
CREATE INDEX idx_calendar_events_start ON public.calendar_events(start_datetime);
CREATE INDEX idx_calendar_events_contact ON public.calendar_events(contact_id);
CREATE INDEX idx_calendar_events_employee ON public.calendar_events(employee_id);

-- Staff can view own events + shared events from others
CREATE POLICY "Staff can view own and shared events"
ON public.calendar_events FOR SELECT
USING (
  (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'contabilita'::app_role)
    OR has_role(auth.uid(), 'area_tecnica'::app_role)
    OR has_role(auth.uid(), 'gestione_corsi'::app_role)
    OR has_role(auth.uid(), 'consulenti_tecnici'::app_role)
    OR has_role(auth.uid(), 'medicina'::app_role)
  )
  AND (
    user_id = auth.uid()
    OR is_shared = true
  )
);

-- Admin can view ALL events (even non-shared)
CREATE POLICY "Admins can view all events"
ON public.calendar_events FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Staff can insert own events
CREATE POLICY "Staff can insert own events"
ON public.calendar_events FOR INSERT
WITH CHECK (
  auth.uid() = user_id
  AND (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'contabilita'::app_role)
    OR has_role(auth.uid(), 'area_tecnica'::app_role)
    OR has_role(auth.uid(), 'gestione_corsi'::app_role)
    OR has_role(auth.uid(), 'consulenti_tecnici'::app_role)
    OR has_role(auth.uid(), 'medicina'::app_role)
  )
);

-- Staff can update own events
CREATE POLICY "Staff can update own events"
ON public.calendar_events FOR UPDATE
USING (auth.uid() = user_id);

-- Admins can update all events
CREATE POLICY "Admins can update all events"
ON public.calendar_events FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Staff can delete own events
CREATE POLICY "Staff can delete own events"
ON public.calendar_events FOR DELETE
USING (auth.uid() = user_id);

-- Admins can delete all events
CREATE POLICY "Admins can delete all events"
ON public.calendar_events FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Auto-update timestamp
CREATE TRIGGER update_calendar_events_updated_at
BEFORE UPDATE ON public.calendar_events
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();