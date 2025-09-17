-- Prima parte: Estendere l'enum app_role per includere i ruoli aziendali
ALTER TYPE app_role ADD VALUE 'contabilita';
ALTER TYPE app_role ADD VALUE 'area_tecnica';
ALTER TYPE app_role ADD VALUE 'gestione_corsi';
ALTER TYPE app_role ADD VALUE 'consulenti_tecnici';

-- Aggiornare la tabella documents per includere le nuove categorie
ALTER TABLE documents ADD COLUMN IF NOT EXISTS area_competenza text;

-- Creare un indice per migliorare le performance delle query filtrate
CREATE INDEX IF NOT EXISTS idx_documents_area_competenza ON documents(area_competenza);

-- Aggiornare i documenti esistenti per assegnarli a un'area di default
UPDATE documents SET area_competenza = 'generale' WHERE area_competenza IS NULL;