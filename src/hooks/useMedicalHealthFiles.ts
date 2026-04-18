import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export interface MedicalHealthFile {
  id: string;
  user_id: string;
  employee_id: string;
  contact_id?: string | null;
  visit_id?: string | null;
  document_type: string;
  file_name: string;
  file_path: string;
  file_size?: number | null;
  file_type?: string | null;
  document_date?: string | null;
  description?: string | null;
  uploaded_by: string;
  created_at: string;
  updated_at: string;
}

export const DOCUMENT_TYPES: { value: string; label: string }[] = [
  { value: 'referto', label: 'Referto medico' },
  { value: 'certificato_idoneita', label: 'Certificato di idoneità' },
  { value: 'esame_strumentale', label: 'Esame strumentale' },
  { value: 'esame_laboratorio', label: 'Esame di laboratorio' },
  { value: 'consulto_specialistico', label: 'Consulto specialistico' },
  { value: 'cartella_sanitaria', label: 'Cartella sanitaria e di rischio' },
  { value: 'consenso_informato', label: 'Consenso informato' },
  { value: 'altro', label: 'Altro' },
];

export function useMedicalHealthFiles(employeeId?: string) {
  const { user } = useAuth();
  const [files, setFiles] = useState<MedicalHealthFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  const fetchFiles = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    let q = (supabase as any).from('medical_health_files').select('*').order('document_date', { ascending: false, nullsFirst: false });
    if (employeeId) q = q.eq('employee_id', employeeId);
    const { data, error } = await q;
    setLoading(false);
    if (error) {
      console.error(error);
      toast.error('Errore caricamento cartella sanitaria');
      return;
    }
    setFiles(data || []);
  }, [user, employeeId]);

  useEffect(() => {
    if (user) fetchFiles();
  }, [user, fetchFiles]);

  const uploadFile = async (params: {
    file: File;
    employee_id: string;
    contact_id?: string | null;
    visit_id?: string | null;
    document_type: string;
    document_date?: string | null;
    description?: string | null;
  }) => {
    if (!user) return null;
    setUploading(true);
    try {
      const ext = params.file.name.split('.').pop();
      const path = `${user.id}/${params.employee_id}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error: upErr } = await supabase.storage.from('medical-records').upload(path, params.file, {
        contentType: params.file.type || undefined,
        upsert: false,
      });
      if (upErr) throw upErr;

      const { data, error } = await (supabase as any).from('medical_health_files').insert({
        user_id: user.id,
        uploaded_by: user.id,
        employee_id: params.employee_id,
        contact_id: params.contact_id || null,
        visit_id: params.visit_id || null,
        document_type: params.document_type,
        document_date: params.document_date || null,
        description: params.description || null,
        file_name: params.file.name,
        file_path: path,
        file_size: params.file.size,
        file_type: params.file.type,
      }).select().single();
      if (error) throw error;
      toast.success('Documento caricato');
      await fetchFiles();
      return data;
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || 'Upload fallito');
      return null;
    } finally {
      setUploading(false);
    }
  };

  const downloadFile = async (file: MedicalHealthFile) => {
    const { data, error } = await supabase.storage.from('medical-records').createSignedUrl(file.file_path, 60);
    if (error || !data) {
      toast.error('Impossibile generare il link');
      return;
    }
    window.open(data.signedUrl, '_blank');
  };

  const deleteFile = async (file: MedicalHealthFile) => {
    const { error: sErr } = await supabase.storage.from('medical-records').remove([file.file_path]);
    if (sErr) console.warn('storage remove warning', sErr);
    const { error } = await (supabase as any).from('medical_health_files').delete().eq('id', file.id);
    if (error) {
      toast.error(error.message);
      return false;
    }
    toast.success('Documento eliminato');
    await fetchFiles();
    return true;
  };

  return { files, loading, uploading, fetchFiles, uploadFile, downloadFile, deleteFile };
}
