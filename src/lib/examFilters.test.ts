import { describe, it, expect } from 'vitest';
import { applyExamFilters } from './examFilters';
import type { MedicalExam } from '@/hooks/useExamHistory';

const mk = (o: Partial<MedicalExam>): MedicalExam => ({
  id: crypto.randomUUID(),
  user_id: 'u1',
  employee_id: 'e1',
  exam_type: 'Generico',
  exam_date: '2026-01-01',
  ...o,
});

const dataset: MedicalExam[] = [
  mk({ exam_type: 'Audiometria', exam_date: '2026-01-10', outcome: 'normale', risk_category: 'RUMORE', job_role: 'Operaio' }),
  mk({ exam_type: 'Spirometria', exam_date: '2026-03-05', outcome: 'anomalo', risk_category: 'CHIMICO', job_role: 'Operaio saldatore' }),
  mk({ exam_type: 'Visita cardiologica', exam_date: '2025-11-20', outcome: 'da_ripetere', risk_category: 'RUMORE', job_role: 'Impiegato' }),
  mk({ exam_type: 'Audiometria di controllo', exam_date: '2026-02-15', outcome: 'normale', risk_category: 'RUMORE', job_role: 'Operaio' }),
];

describe('applyExamFilters', () => {
  it('sorts by date desc by default (recent first)', () => {
    const r = applyExamFilters(dataset);
    expect(r.map((x) => x.exam_date)).toEqual(['2026-03-05', '2026-02-15', '2026-01-10', '2025-11-20']);
  });

  it('sorts by date asc', () => {
    const r = applyExamFilters(dataset, { sortBy: 'date_asc' });
    expect(r[0].exam_date).toBe('2025-11-20');
    expect(r[r.length - 1].exam_date).toBe('2026-03-05');
  });

  it('sorts by outcome alphabetically', () => {
    const r = applyExamFilters(dataset, { sortBy: 'outcome' });
    expect(r[0].outcome).toBe('anomalo');
  });

  it('filters by risk + job role + type together (combined filter)', () => {
    const r = applyExamFilters(dataset, {
      riskCategory: 'RUMORE',
      jobRole: 'Operaio',
      type: 'Audiometria',
    });
    expect(r).toHaveLength(2);
    expect(r.every((e) => e.risk_category === 'RUMORE')).toBe(true);
    expect(r.every((e) => e.job_role?.toLowerCase().includes('operaio'))).toBe(true);
    expect(r.every((e) => e.exam_type.toLowerCase().includes('audiometria'))).toBe(true);
  });

  it('filters by outcome', () => {
    const r = applyExamFilters(dataset, { outcome: 'anomalo' });
    expect(r).toHaveLength(1);
    expect(r[0].exam_type).toBe('Spirometria');
  });

  it('text search matches exam_type and outcome_value', () => {
    const list = [...dataset, mk({ exam_type: 'Pressione', outcome_value: '140/90 mmHg', exam_date: '2026-04-01' })];
    expect(applyExamFilters(list, { text: 'audio' })).toHaveLength(2);
    expect(applyExamFilters(list, { text: '140/90' })).toHaveLength(1);
  });

  it('combined filter returns empty set when no match', () => {
    const r = applyExamFilters(dataset, {
      riskCategory: 'RUMORE',
      jobRole: 'Impiegato',
      type: 'Spirometria',
    });
    expect(r).toHaveLength(0);
  });

  it('does not mutate the input list', () => {
    const snap = dataset.map((e) => e.id);
    applyExamFilters(dataset, { sortBy: 'date_asc' });
    expect(dataset.map((e) => e.id)).toEqual(snap);
  });
});