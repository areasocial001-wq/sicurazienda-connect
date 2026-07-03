import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export interface MedicalHealthRecord {
  id: string;
  user_id: string;
  employee_id: string;
  contact_id?: string | null;
  birth_place?: string | null;
  birth_date?: string | null;
  gender?: string | null;
  blood_group?: string | null;
  height_cm?: number | null;
  weight_kg?: number | null;
  dominant_hand?: string | null;
  anamnesi_familiare?: string | null;
  anamnesi_fisiologica?: string | null;
  anamnesi_patologica_remota?: string | null;
  anamnesi_patologica_prossima?: string | null;
  anamnesi_lavorativa?: string | null;
  abitudini_fumo?: string | null;
  abitudini_alcol?: string | null;
  abitudini_sport?: string | null;
  allergie?: string | null;
  terapie_in_corso?: string | null;
  vaccinazioni?: string | null;
  interventi_chirurgici?: string | null;
  current_job_role?: string | null;
  current_risks?: string[] | null;
  protocol_id?: string | null;
  notes?: string | null;
  last_review_date?: string | null;
  created_at?: string;
  updated_at?: string;
}

export function useHealthRecord(employeeId?: string) {
  const { user } = useAuth();
  const [record, setRecord] = useState<MedicalHealthRecord | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const fetchRecord = useCallback(async () => {
    if (!employeeId) { setRecord(null); return; }
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from('medical_health_records')
      .select('*')
      .eq('employee_id', employeeId)
      .maybeSingle();
    setLoading(false);
    if (error) { console.error(error); toast.error('Errore lettura cartella'); return; }
    setRecord(data);
  }, [employeeId]);

  useEffect(() => { fetchRecord(); }, [fetchRecord]);

  const save = async (patch: Partial<MedicalHealthRecord>, contactId?: string | null) => {
    if (!user || !employeeId) return null;
    setSaving(true);
    try {
      if (record?.id) {
        const { data, error } = await (supabase as any)
          .from('medical_health_records')
          .update(patch)
          .eq('id', record.id)
          .select().single();
        if (error) throw error;
        setRecord(data);
        toast.success('Cartella aggiornata');
        return data;
      } else {
        const { data, error } = await (supabase as any)
          .from('medical_health_records')
          .insert({ ...patch, employee_id: employeeId, contact_id: contactId ?? null, user_id: user.id })
          .select().single();
        if (error) throw error;
        setRecord(data);
        toast.success('Cartella creata');
        return data;
      }
    } catch (e: any) {
      console.error(e); toast.error(e.message || 'Errore salvataggio');
      return null;
    } finally { setSaving(false); }
  };

  return { record, loading, saving, save, refresh: fetchRecord };
}
