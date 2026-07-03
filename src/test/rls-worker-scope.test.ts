import { describe, it, expect, beforeEach } from 'vitest';

/**
 * Integration-style test that simulates the RLS boundary for worker roles.
 * The real DB policy is `is_own_employee_record(employee_id)`, which returns
 * only rows whose employee.email matches auth.email(). Here we build a tiny
 * in-memory mock of that behaviour to verify that:
 *   - a worker can ONLY read rows tied to their own employee record
 *   - staff (medicina / admin) sees everything
 * on the health-record tables (exams, files, judgments, health records).
 */

type Row = { id: string; employee_id: string; kind: 'exam' | 'file' | 'judgment' | 'record' };

// employees keyed by id, with the email that owns them
const employees = {
  e_worker: { id: 'e_worker', email: 'worker@example.com' },
  e_other: { id: 'e_other', email: 'other@example.com' },
};

const table: Row[] = [
  { id: 'r1', employee_id: 'e_worker', kind: 'exam' },
  { id: 'r2', employee_id: 'e_worker', kind: 'file' },
  { id: 'r3', employee_id: 'e_worker', kind: 'judgment' },
  { id: 'r4', employee_id: 'e_worker', kind: 'record' },
  { id: 'r5', employee_id: 'e_other', kind: 'exam' },
  { id: 'r6', employee_id: 'e_other', kind: 'file' },
  { id: 'r7', employee_id: 'e_other', kind: 'judgment' },
];

/** Emulates the policy set for medical_* tables in the migration. */
function selectAs(
  role: 'worker' | 'medicina' | 'admin',
  email: string,
  kind?: Row['kind'],
): Row[] {
  const base = kind ? table.filter((r) => r.kind === kind) : table;
  if (role === 'admin' || role === 'medicina') return base;
  // worker: is_own_employee_record → row.employee_id must resolve to email
  return base.filter((r) => {
    const emp = Object.values(employees).find((e) => e.id === r.employee_id);
    return emp?.email.toLowerCase() === email.toLowerCase();
  });
}

describe('RLS worker scope on health-record tables', () => {
  beforeEach(() => {
    // sanity guard
    expect(table.length).toBeGreaterThan(0);
  });

  it('worker sees only rows tied to their own employee record', () => {
    const rows = selectAs('worker', 'worker@example.com');
    expect(rows.every((r) => r.employee_id === 'e_worker')).toBe(true);
    expect(rows).toHaveLength(4);
  });

  it("worker cannot see another employee's exams / files / judgments", () => {
    const rows = selectAs('worker', 'worker@example.com');
    expect(rows.find((r) => r.employee_id === 'e_other')).toBeUndefined();
  });

  it('worker email match is case-insensitive', () => {
    const rows = selectAs('worker', 'Worker@Example.COM');
    expect(rows).toHaveLength(4);
  });

  it('worker with no matching employee sees nothing', () => {
    const rows = selectAs('worker', 'stranger@example.com');
    expect(rows).toHaveLength(0);
  });

  it('medicina/admin bypass the per-worker filter', () => {
    expect(selectAs('medicina', 'anymed@x.com')).toHaveLength(table.length);
    expect(selectAs('admin', 'anyadmin@x.com')).toHaveLength(table.length);
  });

  it('scope holds independently on each kind (exam/file/judgment/record)', () => {
    (['exam', 'file', 'judgment', 'record'] as const).forEach((k) => {
      const rows = selectAs('worker', 'worker@example.com', k);
      expect(rows.every((r) => r.employee_id === 'e_worker')).toBe(true);
    });
  });
});