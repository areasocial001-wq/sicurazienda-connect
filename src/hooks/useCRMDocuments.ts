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
  area: 'contabilita' | 'area_tecnica' | 'gestione_corsi' | 'admin' | 'cliente';
  description?: string;
  expiry_date?: string | null;
  created_at: string;
  updated_at: string;
  category?: DocumentCategory;
  version?: number;
  parent_document_id?: string | null;
  is_current_version?: boolean;
}

export type DocumentCategory =
  | 'dvr'
  | 'neo_assunzione'
  | 'consegna'
  | 'formazione'
  | 'sorveglianza_sanitaria'
  | 'contratti'
  | 'altro';

export const CATEGORY_LABELS: Record<DocumentCategory, string> = {
  dvr: 'DVR',
  neo_assunzione: 'Neo assunzione',
  consegna: 'Consegna',
  formazione: 'Formazione',
  sorveglianza_sanitaria: 'Sorveglianza sanitaria',
  contratti: 'Contratti',
  altro: 'Altro',
};

export interface CRMDocumentHistoryEntry {
  id: string;
  document_id: string;
  contact_id: string;
  action: 'uploaded' | 'new_version' | 'metadata_updated' | 'downloaded' | 'deleted' | 'restored';
  performed_by: string;
  performer_name?: string | null;
  details: any;
  created_at: string;
}

const areaLabels: Record<string, string> = {
  contabilita: 'Contabilità',
  area_tecnica: 'Area Tecnica',
  gestione_corsi: 'Gestione Corsi',
  medicina: 'Medicina',
  admin: 'Amministrazione',
  cliente: 'Caricati dal cliente',
};

export function useCRMDocuments(contactId: string | undefined) {
  const { toast } = useToast();
  const { role, isAdmin, isContabilita, isAreaTecnica, isGestioneCorsi, isMedicina } = useUserRole();
  const [documents, setDocuments] = useState<CRMDocument[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Determine which area the current user can upload to
  const getUserArea = useCallback((): 'contabilita' | 'area_tecnica' | 'gestione_corsi' | 'medicina' | 'admin' | null => {
    if (isAdmin) return 'admin';
    if (isContabilita) return 'contabilita';
    if (isAreaTecnica) return 'area_tecnica';
    if (isGestioneCorsi) return 'gestione_corsi';
    if (isMedicina) return 'medicina';
    return null;
  }, [isAdmin, isContabilita, isAreaTecnica, isGestioneCorsi, isMedicina]);

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
    description?: string,
    expiryDate?: string,
    category: DocumentCategory = 'altro',
    parentDocumentId?: string,
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
      const timestamp = Date.now();
      const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const filePath = `${contactId}/${area}/${timestamp}_${sanitizedName}`;

      const { error: uploadError } = await supabase.storage
        .from('crm-documents')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // If new version: mark previous as not current and compute new version number
      let version = 1;
      let rootParentId: string | undefined = parentDocumentId;
      if (parentDocumentId) {
        const { data: parent } = await supabase
          .from('crm_client_documents')
          .select('id, version, parent_document_id, category')
          .eq('id', parentDocumentId)
          .maybeSingle();
        if (parent) {
          rootParentId = parent.parent_document_id || parent.id;
          // get max version among siblings
          const { data: siblings } = await supabase
            .from('crm_client_documents')
            .select('version')
            .or(`id.eq.${rootParentId},parent_document_id.eq.${rootParentId}`);
          version = (siblings || []).reduce((m, r: any) => Math.max(m, r.version || 1), 0) + 1;
          if (!category || category === 'altro') category = (parent as any).category || 'altro';
          // Mark all previous versions as not current
          await supabase
            .from('crm_client_documents')
            .update({ is_current_version: false })
            .or(`id.eq.${rootParentId},parent_document_id.eq.${rootParentId}`);
        }
      }

      // Create database record with optional expiry date
      const insertData: any = {
        contact_id: contactId,
        uploaded_by: user.id,
        name: file.name,
        file_path: filePath,
        file_type: file.type,
        file_size: file.size,
        area,
        description,
        category,
        version,
        parent_document_id: rootParentId || null,
        is_current_version: true,
      };
      
      if (expiryDate) {
        insertData.expiry_date = expiryDate;
      }

      const { data, error } = await supabase
        .from('crm_client_documents')
        .insert(insertData)
        .select()
        .single();

      if (error) throw error;

      // Get uploader name for notification
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('user_id', user.id)
        .maybeSingle();

      // Log history (fire and forget)
      supabase.from('crm_document_history').insert({
        document_id: (data as any).id,
        contact_id: contactId,
        action: parentDocumentId ? 'new_version' : 'uploaded',
        performed_by: user.id,
        performer_name: profile?.full_name || user.email,
        details: { name: file.name, version, category },
      }).then(({ error }) => { if (error) console.log('History log error:', error); });

      // Send email notification (fire and forget)
      supabase.functions.invoke('notify-document-upload', {
        body: {
          contactId,
          documentName: file.name,
          area,
          uploaderName: profile?.full_name || user.email
        }
      }).catch(err => console.log('Notification error (non-blocking):', err));

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

  const updateDocumentExpiry = useCallback(async (documentId: string, expiryDate: string | null) => {
    try {
      const { error } = await supabase
        .from('crm_client_documents')
        .update({ expiry_date: expiryDate })
        .eq('id', documentId);

      if (error) throw error;

      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const doc = documents.find(d => d.id === documentId);
        await supabase.from('crm_document_history').insert({
          document_id: documentId,
          contact_id: doc?.contact_id || contactId!,
          action: 'metadata_updated',
          performed_by: user.id,
          details: { field: 'expiry_date', value: expiryDate },
        });
      }

      toast({ title: expiryDate ? "Scadenza impostata" : "Scadenza rimossa" });
      await fetchDocuments();
      return true;
    } catch (error: any) {
      toast({ title: "Errore", description: error.message, variant: "destructive" });
      return false;
    }
  }, [fetchDocuments, toast, documents, contactId]);

  const deleteDocument = useCallback(async (document: CRMDocument) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
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

      if (user) {
        await supabase.from('crm_document_history').insert({
          document_id: document.id,
          contact_id: document.contact_id,
          action: 'deleted',
          performed_by: user.id,
          details: { name: document.name, version: document.version },
        });
      }

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

      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        supabase.from('crm_document_history').insert({
          document_id: document.id,
          contact_id: document.contact_id,
          action: 'downloaded',
          performed_by: user.id,
          details: { name: document.name },
        }).then(({ error }) => { if (error) console.log('History log error:', error); });
      }

      return true;
    } catch (error: any) {
      toast({ title: "Errore download", description: error.message, variant: "destructive" });
      return false;
    }
  }, [toast]);

  const fetchHistory = useCallback(async (documentId: string): Promise<CRMDocumentHistoryEntry[]> => {
    const { data, error } = await supabase
      .from('crm_document_history')
      .select('*')
      .eq('document_id', documentId)
      .order('created_at', { ascending: false });
    if (error) {
      console.error('History fetch error:', error);
      return [];
    }
    return (data || []) as CRMDocumentHistoryEntry[];
  }, []);

  const fetchVersions = useCallback(async (document: CRMDocument): Promise<CRMDocument[]> => {
    const rootId = document.parent_document_id || document.id;
    const { data, error } = await supabase
      .from('crm_client_documents')
      .select('*')
      .or(`id.eq.${rootId},parent_document_id.eq.${rootId}`)
      .order('version', { ascending: false });
    if (error) return [];
    return (data || []) as CRMDocument[];
  }, []);

  const getDocumentsByArea = useCallback(() => {
    const byArea: Record<string, CRMDocument[]> = {};
    // Only show current versions in main listing
    const currentDocs = documents.filter(d => d.is_current_version !== false);
    const filteredDocs = searchQuery 
      ? currentDocs.filter(doc => 
          doc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          doc.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          areaLabels[doc.area]?.toLowerCase().includes(searchQuery.toLowerCase())
        )
      : currentDocs;
    
    filteredDocs.forEach(doc => {
      if (!byArea[doc.area]) byArea[doc.area] = [];
      byArea[doc.area].push(doc);
    });
    return byArea;
  }, [documents, searchQuery]);

  const getExpiringDocuments = useCallback((daysAhead: number = 30) => {
    const today = new Date();
    const futureDate = new Date(today);
    futureDate.setDate(futureDate.getDate() + daysAhead);
    
    return documents.filter(doc => {
      if (!doc.expiry_date) return false;
      const expiryDate = new Date(doc.expiry_date);
      return expiryDate >= today && expiryDate <= futureDate;
    }).sort((a, b) => new Date(a.expiry_date!).getTime() - new Date(b.expiry_date!).getTime());
  }, [documents]);

  return {
    documents,
    loading,
    uploading,
    canUpload,
    userArea: getUserArea(),
    areaLabels,
    searchQuery,
    setSearchQuery,
    fetchDocuments,
    uploadDocument,
    updateDocumentExpiry,
    deleteDocument,
    downloadDocument,
    getDocumentsByArea,
    getExpiringDocuments,
    fetchHistory,
    fetchVersions,
  };
}
