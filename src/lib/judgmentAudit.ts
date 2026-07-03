import { supabase } from '@/integrations/supabase/client';

export type JudgmentAuditAction = 'print' | 'sign' | 'download' | 'reprint' | 'view';

export interface JudgmentAuditInput {
  judgment_id: string;
  action: JudgmentAuditAction;
  protocol_id?: string | null;
  doctor_id?: string | null;
  employee_id?: string | null;
  visit_id?: string | null;
  version?: number | null;
  file_path?: string | null;
  meta?: Record<string, any>;
}

/** Best-effort logger: never throws, never blocks UI flows. */
export async function logJudgmentAudit(input: JudgmentAuditInput) {
  try {
    const { data: sess } = await supabase.auth.getUser();
    const uid = sess.user?.id;
    if (!uid) return;
    await (supabase as any).from('medical_judgment_audit').insert({
      user_id: uid,
      judgment_id: input.judgment_id,
      action: input.action,
      protocol_id: input.protocol_id ?? null,
      doctor_id: input.doctor_id ?? null,
      employee_id: input.employee_id ?? null,
      visit_id: input.visit_id ?? null,
      version: input.version ?? null,
      file_path: input.file_path ?? null,
      meta: input.meta ?? {},
    });
  } catch (e) {
    console.warn('[judgmentAudit] log failed', e);
  }
}