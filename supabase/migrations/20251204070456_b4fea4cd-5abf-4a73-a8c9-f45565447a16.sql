-- Tabella per le bozze dei form
CREATE TABLE public.form_drafts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  service_type TEXT NOT NULL,
  client_type TEXT NOT NULL,
  form_data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Indice univoco per evitare duplicati per utente/servizio
CREATE UNIQUE INDEX form_drafts_user_service_idx ON public.form_drafts (user_id, service_type, client_type);

-- Abilita RLS
ALTER TABLE public.form_drafts ENABLE ROW LEVEL SECURITY;

-- Policy: utenti possono vedere solo le proprie bozze
CREATE POLICY "Users can view own drafts" 
ON public.form_drafts 
FOR SELECT 
USING (auth.uid() = user_id);

-- Policy: utenti possono inserire le proprie bozze
CREATE POLICY "Users can insert own drafts" 
ON public.form_drafts 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Policy: utenti possono aggiornare le proprie bozze
CREATE POLICY "Users can update own drafts" 
ON public.form_drafts 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Policy: utenti possono eliminare le proprie bozze
CREATE POLICY "Users can delete own drafts" 
ON public.form_drafts 
FOR DELETE 
USING (auth.uid() = user_id);

-- Trigger per aggiornare updated_at
CREATE TRIGGER update_form_drafts_updated_at
BEFORE UPDATE ON public.form_drafts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();