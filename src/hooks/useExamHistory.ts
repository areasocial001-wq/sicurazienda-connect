import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export interface MedicalExam {
  id: string;
  user_id: string;
  employee_id: string;
  visit_id?: string | null;
  protocol_id?: string | null;
  doctor_id?: string | null;
  exam_type: string;
  exam_category?: string | null;
  exam_date: string;
  outcome?: string | null;
  outcome_value?: string | null;
  reference_range?: string | null;
  risk_category?: string | null;
  job_role?: string | null;
  file_id?: string | null;
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
}

export const EXAM_OUTCOMES = [
  { value: 'normale', label: 'Normale / nella norma' },
  { value: 'anomalo', label: 'Anomalo' },
  { value: 'da_ripetere', label: 'Da ripetere' },
  { value: 'non_eseguito', label: 'Non eseguito' },
];

export function useExamHistory(filter?: { employeeId?: string; riskCategory?: string; jobRole?: string }) {
  const { user } = useAuth();
  const [exams, setExams] = useState<MedicalExam[]>([]);
  const [loading, setLoading] = useState(false);

  const fetch = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    let q = (supabase as any).from('medical_exam_history').select('*').order('exam_date', { ascending: false });
    if (filter?.employeeId) q = q.eq('employee_id', filter.employeeId);
    if (filter?.riskCategory) q = q.eq('risk_category', filter.riskCategory);
    if (filter?.jobRole) q = q.ilike('job_role', `%${filter.jobRole}%`);
    const { data, error } = await q;
    setLoading(false);
    if (error) { console.error(error); toast.error('Errore lettura esami'); return; }
    setExams(data || []);
  }, [user, filter?.employeeId, filter?.riskCategory, filter?.jobRole]);

  useEffect(() => { fetch(); }, [fetch]);

  const create = async (data: Partial<MedicalExam>) => {
    if (!user) return null;
    const { data: row, error } = await (supabase as any).from('medical_exam_history').insert({ ...data, user_id: user.id }).select().single();
    if (error) { toast.error(error.message); return null; }
    toast.success('Esame registrato'); await fetch(); return row;
  };
  const update = async (id: string, data: Partial<MedicalExam>) => {
    const { data: row, error } = await (supabase as any).from('medical_exam_history').update(data).eq('id', id).select().single();
    if (error) { toast.error(error.message); return null; }
    toast.success('Esame aggiornato'); await fetch(); return row;
  };
  const remove = async (id: string) => {
    const { error } = await (supabase as any).from('medical_exam_history').delete().eq('id', id);
    if (error) { toast.error(error.message); return false; }
    toast.success('Esame eliminato'); await fetch(); return true;
  };

  return { exams, loading, create, update, remove, refresh: fetch };
}
