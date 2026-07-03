import type { MedicalExam } from '@/hooks/useExamHistory';

export type ExamSortBy = 'date_desc' | 'date_asc' | 'outcome';

export interface ExamFilterOptions {
  text?: string;
  type?: string;
  outcome?: string;
  riskCategory?: string;
  jobRole?: string;
  sortBy?: ExamSortBy;
}

/**
 * Pure filter+sort applied to an already-fetched list.
 * Note: `riskCategory` and `jobRole` are also applied server-side by the hook,
 * but re-applied here so callers can combine filters on any pre-loaded list.
 */
export function applyExamFilters(list: MedicalExam[], opts: ExamFilterOptions = {}): MedicalExam[] {
  const { text, type, outcome, riskCategory, jobRole, sortBy = 'date_desc' } = opts;
  let out = list;

  if (text) {
    const s = text.toLowerCase();
    out = out.filter(
      (e) =>
        (e.exam_type || '').toLowerCase().includes(s) ||
        (e.outcome_value || '').toLowerCase().includes(s),
    );
  }
  if (type) {
    const s = type.toLowerCase();
    out = out.filter((e) => (e.exam_type || '').toLowerCase().includes(s));
  }
  if (outcome) out = out.filter((e) => e.outcome === outcome);
  if (riskCategory) out = out.filter((e) => e.risk_category === riskCategory);
  if (jobRole) {
    const s = jobRole.toLowerCase();
    out = out.filter((e) => (e.job_role || '').toLowerCase().includes(s));
  }

  const sorted = [...out];
  if (sortBy === 'date_asc') sorted.sort((a, b) => a.exam_date.localeCompare(b.exam_date));
  else if (sortBy === 'date_desc') sorted.sort((a, b) => b.exam_date.localeCompare(a.exam_date));
  else if (sortBy === 'outcome') sorted.sort((a, b) => (a.outcome || '').localeCompare(b.outcome || ''));
  return sorted;
}