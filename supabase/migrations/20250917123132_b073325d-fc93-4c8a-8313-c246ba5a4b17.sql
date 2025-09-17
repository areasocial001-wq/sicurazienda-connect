-- Estendere l'enum app_role per includere i ruoli aziendali
ALTER TYPE app_role ADD VALUE 'contabilita';
ALTER TYPE app_role ADD VALUE 'area_tecnica';
ALTER TYPE app_role ADD VALUE 'gestione_corsi';
ALTER TYPE app_role ADD VALUE 'consulenti_tecnici';

-- Aggiornare la tabella documents per includere le nuove categorie
-- Aggiungiamo una colonna per l'area di competenza
ALTER TABLE documents ADD COLUMN IF NOT EXISTS area_competenza text;

-- Creare un indice per migliorare le performance delle query filtrate
CREATE INDEX IF NOT EXISTS idx_documents_area_competenza ON documents(area_competenza);

-- Aggiornare i documenti esistenti per assegnarli a un'area di default
UPDATE documents SET area_competenza = 'generale' WHERE area_competenza IS NULL;

-- Creare una funzione per ottenere i documenti per area di competenza
CREATE OR REPLACE FUNCTION public.get_documents_for_role(user_role app_role)
RETURNS TABLE (
  id uuid,
  name text,
  file_path text,
  file_type text,
  category text,
  area_competenza text,
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  user_id uuid,
  full_name text,
  company_name text
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    d.id,
    d.name,
    d.file_path,
    d.file_type,
    d.category,
    d.area_competenza,
    d.created_at,
    d.updated_at,
    d.user_id,
    p.full_name,
    p.company_name
  FROM documents d
  LEFT JOIN profiles p ON p.user_id = d.user_id
  WHERE 
    CASE 
      WHEN user_role = 'admin' THEN true
      WHEN user_role = 'contabilita' THEN d.area_competenza IN ('contabilita', 'generale')
      WHEN user_role = 'area_tecnica' THEN d.area_competenza IN ('area_tecnica', 'generale') 
      WHEN user_role = 'gestione_corsi' THEN d.area_competenza IN ('gestione_corsi', 'generale')
      WHEN user_role = 'consulenti_tecnici' THEN d.area_competenza IN ('consulenti_tecnici', 'generale')
      ELSE false
    END
  ORDER BY d.created_at DESC;
$$;