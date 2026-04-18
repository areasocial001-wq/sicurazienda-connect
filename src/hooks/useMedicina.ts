import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export interface MedicalDoctor {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  fiscal_code?: string | null;
  medical_order?: string | null;
  order_number?: string | null;
  email?: string | null;
  phone?: string | null;
  pec?: string | null;
  facility_name?: string | null;
  facility_address?: string | null;
  hourly_rate?: number | null;
  visit_rate?: number | null;
  notes?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface MedicalProtocol {
  id: string;
  user_id: string;
  contact_id?: string | null;
  name: string;
  job_role?: string | null;
  risks?: string[] | null;
  exams?: any;
  periodicity_months?: number | null;
  description?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface MedicalVisit {
  id: string;
  user_id: string;
  contact_id?: string | null;
  employee_id?: string | null;
  protocol_id?: string | null;
  doctor_id?: string | null;
  visit_type: string;
  scheduled_date?: string | null;
  execution_date?: string | null;
  next_due_date?: string | null;
  location?: string | null;
  status: string;
  exams_performed?: any;
  cost?: number | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
  // joined
  employee_name?: string;
  contact_name?: string;
  doctor_name?: string;
}

export interface MedicalJudgment {
  id: string;
  user_id: string;
  visit_id?: string | null;
  employee_id?: string | null;
  judgment_date: string;
  judgment: string;
  limitations?: string | null;
  prescriptions?: string | null;
  valid_until?: string | null;
  doctor_id?: string | null;
  notes?: string | null;
  created_at: string;
}

export interface MedicalInspection {
  id: string;
  user_id: string;
  contact_id?: string | null;
  location_id?: string | null;
  doctor_id?: string | null;
  inspection_date: string;
  participants?: string | null;
  topics?: string | null;
  findings?: string | null;
  recommendations?: string | null;
  report_file_path?: string | null;
  status: string;
  notes?: string | null;
  created_at: string;
}

export interface MedicalAnnualReport {
  id: string;
  user_id: string;
  contact_id?: string | null;
  doctor_id?: string | null;
  reference_year: number;
  report_date?: string | null;
  total_workers?: number | null;
  visits_performed?: number | null;
  fit_count?: number | null;
  fit_with_limitations_count?: number | null;
  unfit_count?: number | null;
  content?: string | null;
  report_file_path?: string | null;
  status: string;
  sent_at?: string | null;
  notes?: string | null;
}

export function useMedicina() {
  const { user } = useAuth();
  const [doctors, setDoctors] = useState<MedicalDoctor[]>([]);
  const [protocols, setProtocols] = useState<MedicalProtocol[]>([]);
  const [visits, setVisits] = useState<MedicalVisit[]>([]);
  const [judgments, setJudgments] = useState<MedicalJudgment[]>([]);
  const [inspections, setInspections] = useState<MedicalInspection[]>([]);
  const [annualReports, setAnnualReports] = useState<MedicalAnnualReport[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDoctors = useCallback(async () => {
    const { data, error } = await (supabase as any)
      .from('medical_doctors')
      .select('*')
      .order('last_name', { ascending: true });
    if (error) { console.error(error); return; }
    setDoctors(data || []);
  }, []);

  const fetchProtocols = useCallback(async () => {
    const { data, error } = await (supabase as any)
      .from('medical_protocols')
      .select('*')
      .order('name', { ascending: true });
    if (error) { console.error(error); return; }
    setProtocols(data || []);
  }, []);

  const fetchVisits = useCallback(async () => {
    const { data, error } = await (supabase as any)
      .from('medical_visits')
      .select('*')
      .order('scheduled_date', { ascending: false, nullsFirst: false });
    if (error) { console.error(error); return; }

    const rows = (data || []) as any[];
    const employeeIds = [...new Set(rows.map((r) => r.employee_id).filter(Boolean))];
    const contactIds = [...new Set(rows.map((r) => r.contact_id).filter(Boolean))];
    const doctorIds = [...new Set(rows.map((r) => r.doctor_id).filter(Boolean))];

    const [empRes, conRes, docRes] = await Promise.all([
      employeeIds.length
        ? supabase.from('crm_employees').select('id, first_name, last_name').in('id', employeeIds as string[])
        : Promise.resolve({ data: [] as any[] }),
      contactIds.length
        ? supabase.from('crm_contacts').select('id, name, company').in('id', contactIds as string[])
        : Promise.resolve({ data: [] as any[] }),
      doctorIds.length
        ? (supabase as any).from('medical_doctors').select('id, first_name, last_name').in('id', doctorIds as string[])
        : Promise.resolve({ data: [] as any[] }),
    ]);

    const empMap = new Map((empRes.data || []).map((e: any) => [e.id, `${e.first_name} ${e.last_name}`]));
    const conMap = new Map((conRes.data || []).map((c: any) => [c.id, c.company || c.name]));
    const docMap = new Map(((docRes as any).data || []).map((d: any) => [d.id, `Dr. ${d.first_name} ${d.last_name}`]));

    const enriched: MedicalVisit[] = rows.map((r) => ({
      ...r,
      employee_name: r.employee_id ? empMap.get(r.employee_id) : undefined,
      contact_name: r.contact_id ? conMap.get(r.contact_id) : undefined,
      doctor_name: r.doctor_id ? docMap.get(r.doctor_id) : undefined,
    }));
    setVisits(enriched);
  }, []);

  const fetchJudgments = useCallback(async () => {
    const { data, error } = await (supabase as any)
      .from('medical_judgments')
      .select('*')
      .order('judgment_date', { ascending: false });
    if (error) { console.error(error); return; }
    setJudgments(data || []);
  }, []);

  const fetchInspections = useCallback(async () => {
    const { data, error } = await (supabase as any)
      .from('medical_inspections')
      .select('*')
      .order('inspection_date', { ascending: false });
    if (error) { console.error(error); return; }
    setInspections(data || []);
  }, []);

  const fetchAnnualReports = useCallback(async () => {
    const { data, error } = await (supabase as any)
      .from('medical_annual_reports')
      .select('*')
      .order('reference_year', { ascending: false });
    if (error) { console.error(error); return; }
    setAnnualReports(data || []);
  }, []);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    await Promise.all([
      fetchDoctors(),
      fetchProtocols(),
      fetchVisits(),
      fetchJudgments(),
      fetchInspections(),
      fetchAnnualReports(),
    ]);
    setLoading(false);
  }, [fetchDoctors, fetchProtocols, fetchVisits, fetchJudgments, fetchInspections, fetchAnnualReports]);

  useEffect(() => {
    if (user) fetchAll();
  }, [user, fetchAll]);

  // Generic helpers
  const insertRow = async (table: string, payload: any) => {
    if (!user) return null;
    const { data, error } = await (supabase as any).from(table).insert({ ...payload, user_id: user.id }).select().single();
    if (error) { toast.error(error.message); return null; }
    toast.success('Salvato');
    return data;
  };
  const updateRow = async (table: string, id: string, payload: any) => {
    const { data, error } = await (supabase as any).from(table).update(payload).eq('id', id).select().single();
    if (error) { toast.error(error.message); return null; }
    toast.success('Aggiornato');
    return data;
  };
  const deleteRow = async (table: string, id: string) => {
    const { error } = await (supabase as any).from(table).delete().eq('id', id);
    if (error) { toast.error(error.message); return false; }
    toast.success('Eliminato');
    return true;
  };

  // Doctors
  const createDoctor = async (p: Partial<MedicalDoctor>) => { const r = await insertRow('medical_doctors', p); if (r) await fetchDoctors(); return r; };
  const updateDoctor = async (id: string, p: Partial<MedicalDoctor>) => { const r = await updateRow('medical_doctors', id, p); if (r) await fetchDoctors(); return r; };
  const deleteDoctor = async (id: string) => { const ok = await deleteRow('medical_doctors', id); if (ok) await fetchDoctors(); return ok; };

  // Protocols
  const createProtocol = async (p: Partial<MedicalProtocol>) => { const r = await insertRow('medical_protocols', p); if (r) await fetchProtocols(); return r; };
  const updateProtocol = async (id: string, p: Partial<MedicalProtocol>) => { const r = await updateRow('medical_protocols', id, p); if (r) await fetchProtocols(); return r; };
  const deleteProtocol = async (id: string) => { const ok = await deleteRow('medical_protocols', id); if (ok) await fetchProtocols(); return ok; };

  // Visits
  const createVisit = async (p: Partial<MedicalVisit>) => { const r = await insertRow('medical_visits', p); if (r) await fetchVisits(); return r; };
  const updateVisit = async (id: string, p: Partial<MedicalVisit>) => { const r = await updateRow('medical_visits', id, p); if (r) await fetchVisits(); return r; };
  const deleteVisit = async (id: string) => { const ok = await deleteRow('medical_visits', id); if (ok) await fetchVisits(); return ok; };

  // Judgments
  const createJudgment = async (p: Partial<MedicalJudgment>) => { const r = await insertRow('medical_judgments', p); if (r) await fetchJudgments(); return r; };
  const updateJudgment = async (id: string, p: Partial<MedicalJudgment>) => { const r = await updateRow('medical_judgments', id, p); if (r) await fetchJudgments(); return r; };
  const deleteJudgment = async (id: string) => { const ok = await deleteRow('medical_judgments', id); if (ok) await fetchJudgments(); return ok; };

  // Inspections
  const createInspection = async (p: Partial<MedicalInspection>) => { const r = await insertRow('medical_inspections', p); if (r) await fetchInspections(); return r; };
  const updateInspection = async (id: string, p: Partial<MedicalInspection>) => { const r = await updateRow('medical_inspections', id, p); if (r) await fetchInspections(); return r; };
  const deleteInspection = async (id: string) => { const ok = await deleteRow('medical_inspections', id); if (ok) await fetchInspections(); return ok; };

  // Annual reports
  const createAnnualReport = async (p: Partial<MedicalAnnualReport>) => { const r = await insertRow('medical_annual_reports', p); if (r) await fetchAnnualReports(); return r; };
  const updateAnnualReport = async (id: string, p: Partial<MedicalAnnualReport>) => { const r = await updateRow('medical_annual_reports', id, p); if (r) await fetchAnnualReports(); return r; };
  const deleteAnnualReport = async (id: string) => { const ok = await deleteRow('medical_annual_reports', id); if (ok) await fetchAnnualReports(); return ok; };

  return {
    loading,
    doctors, protocols, visits, judgments, inspections, annualReports,
    refresh: fetchAll,
    fetchVisits,
    createDoctor, updateDoctor, deleteDoctor,
    createProtocol, updateProtocol, deleteProtocol,
    createVisit, updateVisit, deleteVisit,
    createJudgment, updateJudgment, deleteJudgment,
    createInspection, updateInspection, deleteInspection,
    createAnnualReport, updateAnnualReport, deleteAnnualReport,
  };
}
