-- Create leads/contacts table for CRM
CREATE TABLE public.crm_contacts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  company TEXT,
  role TEXT,
  status TEXT NOT NULL DEFAULT 'lead' CHECK (status IN ('lead', 'prospect', 'client', 'inactive')),
  source TEXT,
  notes TEXT,
  tags TEXT[],
  last_contact_at TIMESTAMP WITH TIME ZONE,
  next_followup_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create interactions/activities table
CREATE TABLE public.crm_interactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contact_id UUID NOT NULL REFERENCES public.crm_contacts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('call', 'email', 'meeting', 'note', 'task')),
  subject TEXT NOT NULL,
  description TEXT,
  scheduled_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create reminders table
CREATE TABLE public.reminders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL CHECK (type IN ('followup', 'deadline', 'course_expiry', 'document_expiry', 'custom')),
  reference_id UUID,
  reference_type TEXT,
  due_date TIMESTAMP WITH TIME ZONE NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  is_completed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create document_extracted_data table for storing AI extraction results
CREATE TABLE public.document_extracted_data (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  extracted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  dates JSONB,
  amounts JSONB,
  people JSONB,
  companies JSONB,
  codes JSONB,
  addresses JSONB,
  contacts JSONB,
  summary TEXT,
  raw_data JSONB
);

-- Enable RLS
ALTER TABLE public.crm_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_extracted_data ENABLE ROW LEVEL SECURITY;

-- RLS policies for crm_contacts
CREATE POLICY "Users can view own contacts" ON public.crm_contacts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own contacts" ON public.crm_contacts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own contacts" ON public.crm_contacts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own contacts" ON public.crm_contacts FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all contacts" ON public.crm_contacts FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS policies for crm_interactions
CREATE POLICY "Users can view own interactions" ON public.crm_interactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own interactions" ON public.crm_interactions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own interactions" ON public.crm_interactions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own interactions" ON public.crm_interactions FOR DELETE USING (auth.uid() = user_id);

-- RLS policies for reminders
CREATE POLICY "Users can view own reminders" ON public.reminders FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own reminders" ON public.reminders FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own reminders" ON public.reminders FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own reminders" ON public.reminders FOR DELETE USING (auth.uid() = user_id);

-- RLS policies for document_extracted_data
CREATE POLICY "Users can view own extracted data" ON public.document_extracted_data FOR SELECT 
  USING (EXISTS (SELECT 1 FROM documents WHERE documents.id = document_extracted_data.document_id AND documents.user_id = auth.uid()));
CREATE POLICY "Users can insert own extracted data" ON public.document_extracted_data FOR INSERT 
  WITH CHECK (EXISTS (SELECT 1 FROM documents WHERE documents.id = document_extracted_data.document_id AND documents.user_id = auth.uid()));
CREATE POLICY "Admins can view all extracted data" ON public.document_extracted_data FOR SELECT 
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Add expiry_date column to documents for tracking deadlines
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS expiry_date DATE;

-- Triggers for updated_at
CREATE TRIGGER update_crm_contacts_updated_at BEFORE UPDATE ON public.crm_contacts
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for reminders
ALTER PUBLICATION supabase_realtime ADD TABLE public.reminders;