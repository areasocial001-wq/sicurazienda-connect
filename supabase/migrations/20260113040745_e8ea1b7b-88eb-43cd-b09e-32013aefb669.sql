-- Update crm-documents bucket to allow all file types
UPDATE storage.buckets 
SET allowed_mime_types = NULL
WHERE id = 'crm-documents';