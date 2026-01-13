-- Create table for CRM client documents (document drawer)
CREATE TABLE public.crm_client_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contact_id UUID NOT NULL REFERENCES public.crm_contacts(id) ON DELETE CASCADE,
  uploaded_by UUID NOT NULL,
  name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_type TEXT,
  file_size BIGINT,
  area TEXT NOT NULL CHECK (area IN ('contabilita', 'area_tecnica', 'gestione_corsi', 'admin')),
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add client_user_id to crm_contacts for linking client accounts
ALTER TABLE public.crm_contacts ADD COLUMN client_user_id UUID;

-- Enable RLS
ALTER TABLE public.crm_client_documents ENABLE ROW LEVEL SECURITY;

-- Admins can do everything
CREATE POLICY "Admins can manage all client documents"
ON public.crm_client_documents
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Contabilità can insert/update/delete their own uploads
CREATE POLICY "Contabilita can manage their documents"
ON public.crm_client_documents
FOR ALL
USING (
  has_role(auth.uid(), 'contabilita'::app_role) 
  AND area = 'contabilita'
)
WITH CHECK (
  has_role(auth.uid(), 'contabilita'::app_role) 
  AND area = 'contabilita'
);

-- Area Tecnica can insert/update/delete their own uploads
CREATE POLICY "Area Tecnica can manage their documents"
ON public.crm_client_documents
FOR ALL
USING (
  has_role(auth.uid(), 'area_tecnica'::app_role) 
  AND area = 'area_tecnica'
)
WITH CHECK (
  has_role(auth.uid(), 'area_tecnica'::app_role) 
  AND area = 'area_tecnica'
);

-- Gestione Corsi can insert/update/delete their own uploads  
CREATE POLICY "Gestione Corsi can manage their documents"
ON public.crm_client_documents
FOR ALL
USING (
  has_role(auth.uid(), 'gestione_corsi'::app_role) 
  AND area = 'gestione_corsi'
)
WITH CHECK (
  has_role(auth.uid(), 'gestione_corsi'::app_role) 
  AND area = 'gestione_corsi'
);

-- All business areas can VIEW all client documents (for collaboration)
CREATE POLICY "Business areas can view all client documents"
ON public.crm_client_documents
FOR SELECT
USING (
  has_role(auth.uid(), 'contabilita'::app_role) OR
  has_role(auth.uid(), 'area_tecnica'::app_role) OR
  has_role(auth.uid(), 'gestione_corsi'::app_role) OR
  has_role(auth.uid(), 'consulenti_tecnici'::app_role)
);

-- Clients can view their own documents via linked user account
CREATE POLICY "Clients can view own documents"
ON public.crm_client_documents
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.crm_contacts c
    WHERE c.id = crm_client_documents.contact_id
    AND c.client_user_id = auth.uid()
  )
);

-- Create storage bucket for CRM documents
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'crm-documents', 
  'crm-documents', 
  false, 
  52428800, -- 50MB limit
  ARRAY['application/pdf', 'image/png', 'image/jpeg', 'image/gif', 'application/msword', 
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'text/plain', 'application/zip']
);

-- Storage policies for crm-documents bucket
-- Admins can do everything
CREATE POLICY "Admins can manage all CRM storage"
ON storage.objects
FOR ALL
USING (bucket_id = 'crm-documents' AND has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (bucket_id = 'crm-documents' AND has_role(auth.uid(), 'admin'::app_role));

-- Business areas can upload to their folders
CREATE POLICY "Business areas can upload CRM documents"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'crm-documents' AND (
    (has_role(auth.uid(), 'contabilita'::app_role) AND (storage.foldername(name))[2] = 'contabilita') OR
    (has_role(auth.uid(), 'area_tecnica'::app_role) AND (storage.foldername(name))[2] = 'area_tecnica') OR
    (has_role(auth.uid(), 'gestione_corsi'::app_role) AND (storage.foldername(name))[2] = 'gestione_corsi')
  )
);

-- Business areas can read all documents
CREATE POLICY "Business areas can read CRM documents"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'crm-documents' AND (
    has_role(auth.uid(), 'admin'::app_role) OR
    has_role(auth.uid(), 'contabilita'::app_role) OR
    has_role(auth.uid(), 'area_tecnica'::app_role) OR
    has_role(auth.uid(), 'gestione_corsi'::app_role) OR
    has_role(auth.uid(), 'consulenti_tecnici'::app_role)
  )
);

-- Business areas can delete their own uploads
CREATE POLICY "Business areas can delete own CRM uploads"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'crm-documents' AND (
    (has_role(auth.uid(), 'contabilita'::app_role) AND (storage.foldername(name))[2] = 'contabilita') OR
    (has_role(auth.uid(), 'area_tecnica'::app_role) AND (storage.foldername(name))[2] = 'area_tecnica') OR
    (has_role(auth.uid(), 'gestione_corsi'::app_role) AND (storage.foldername(name))[2] = 'gestione_corsi')
  )
);

-- Clients can download their own documents
CREATE POLICY "Clients can download own CRM documents"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'crm-documents' AND
  EXISTS (
    SELECT 1 FROM public.crm_contacts c
    WHERE c.id::text = (storage.foldername(name))[1]
    AND c.client_user_id = auth.uid()
  )
);

-- Create updated_at trigger
CREATE TRIGGER update_crm_client_documents_updated_at
BEFORE UPDATE ON public.crm_client_documents
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add indexes for performance
CREATE INDEX idx_crm_client_documents_contact_id ON public.crm_client_documents(contact_id);
CREATE INDEX idx_crm_client_documents_area ON public.crm_client_documents(area);
CREATE INDEX idx_crm_client_documents_uploaded_by ON public.crm_client_documents(uploaded_by);
CREATE INDEX idx_crm_contacts_client_user_id ON public.crm_contacts(client_user_id);