import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from './use-toast';
import { useUserRole } from './useUserRole';

export interface CRMDocument {
  id: string;
  contact_id: string;
  uploaded_by: string;
  name: string;
  file_path: string;
  file_type?: string;
  file_size?: number;
  area: 'contabilita' | 'area_tecnica' | 'gestione_corsi' | 'admin';
  description?: string;
  created_at: string;
  updated_at: string;
}

const areaLabels: Record<string, string> = {
  contabilita: 'Contabilità',
  area_tecnica: 'Area Tecnica',
  gestione_corsi: 'Gestione Corsi',
  admin: 'Amministrazione',
};

export function useCRMDocuments(contactId: string | undefined) {
  const { toast } = useToast();
  const { role, isAdmin, isContabilita, isAreaTecnica, isGestioneCorsi } = useUserRole();
  const [documents, setDocuments] = useState<CRMDocument[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Determine which area the current user can upload to
  const getUserArea = useCallback((): 'contabilita' | 'area_tecnica' | 'gestione_corsi' | 'admin' | null => {
    if (isAdmin) return 'admin';
    if (isContabilita) return 'contabilita';
    if (isAreaTecnica) return 'area_tecnica';
    if (isGestioneCorsi) return 'gestione_corsi';
    return null;
  }, [isAdmin, isContabilita, isAreaTecnica, isGestioneCorsi]);

  const canUpload = getUserArea() !== null;

  const fetchDocuments = useCallback(async () => {
    if (!contactId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('crm_client_documents')
        .select('*')
        .eq('contact_id', contactId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDocuments(data as CRMDocument[] || []);
    } catch (error: any) {
      console.error('Error fetching documents:', error);
      toast({ title: "Errore", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [contactId, toast]);

  const uploadDocument = useCallback(async (
    file: File,
    description?: string
  ) => {
    if (!contactId) return null;
    
    const area = getUserArea();
    if (!area) {
      toast({ 
        title: "Errore", 
        description: "Non hai i permessi per caricare documenti", 
        variant: "destructive" 
      });
      return null;
    }

    setUploading(true);
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Utente non autenticato');

      // Upload file to storage
      // Path format: {contact_id}/{area}/{timestamp}_{filename}
      const timestamp = Date.now();
      const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const filePath = `${contactId}/${area}/${timestamp}_${sanitizedName}`;

      const { error: uploadError } = await supabase.storage
        .from('crm-documents')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Create database record
      const { data, error } = await supabase
        .from('crm_client_documents')
        .insert({
          contact_id: contactId,
          uploaded_by: user.id,
          name: file.name,
          file_path: filePath,
          file_type: file.type,
          file_size: file.size,
          area,
          description
        })
        .select()
        .single();

      if (error) throw error;

      toast({ 
        title: "Documento caricato", 
        description: `${file.name} è stato caricato con successo` 
      });
      await fetchDocuments();
      return data as CRMDocument;
    } catch (error: any) {
      console.error('Error uploading document:', error);
      toast({ title: "Errore upload", description: error.message, variant: "destructive" });
      return null;
    } finally {
      setUploading(false);
    }
  }, [contactId, getUserArea, fetchDocuments, toast]);

  const deleteDocument = useCallback(async (document: CRMDocument) => {
    try {
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('crm-documents')
        .remove([document.file_path]);

      if (storageError) console.error('Storage delete error:', storageError);

      // Delete from database
      const { error } = await supabase
        .from('crm_client_documents')
        .delete()
        .eq('id', document.id);

      if (error) throw error;

      toast({ title: "Documento eliminato" });
      await fetchDocuments();
      return true;
    } catch (error: any) {
      toast({ title: "Errore", description: error.message, variant: "destructive" });
      return false;
    }
  }, [fetchDocuments, toast]);

  const downloadDocument = useCallback(async (document: CRMDocument) => {
    try {
      const { data, error } = await supabase.storage
        .from('crm-documents')
        .download(document.file_path);

      if (error) throw error;

      // Create download link
      const url = URL.createObjectURL(data);
      const a = window.document.createElement('a');
      a.href = url;
      a.download = document.name;
      window.document.body.appendChild(a);
      a.click();
      window.document.body.removeChild(a);
      URL.revokeObjectURL(url);

      return true;
    } catch (error: any) {
      toast({ title: "Errore download", description: error.message, variant: "destructive" });
      return false;
    }
  }, [toast]);

  const getDocumentsByArea = useCallback(() => {
    const byArea: Record<string, CRMDocument[]> = {};
    documents.forEach(doc => {
      if (!byArea[doc.area]) byArea[doc.area] = [];
      byArea[doc.area].push(doc);
    });
    return byArea;
  }, [documents]);

  return {
    documents,
    loading,
    uploading,
    canUpload,
    userArea: getUserArea(),
    areaLabels,
    fetchDocuments,
    uploadDocument,
    deleteDocument,
    downloadDocument,
    getDocumentsByArea,
  };
}
