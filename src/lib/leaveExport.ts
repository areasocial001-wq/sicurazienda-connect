import { format } from "date-fns";
import { it } from "date-fns/locale";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { LeaveRequest } from "@/hooks/useWorkerLeave";

export interface ExportFilters {
  from?: string;
  to?: string;
  role?: string; // 'all' or specific app_role
  type?: string; // 'all' or specific leave type
  status?: string; // 'all' | 'in_attesa' | 'approvata' | 'rifiutata'
}

export type ExportColumn =
  | "dipendente"
  | "ruolo"
  | "tipo"
  | "dal"
  | "al"
  | "giorni"
  | "ore"
  | "stato"
  | "motivo"
  | "nota"
  | "approvato_il"
  | "creato_il";

export const ALL_COLUMNS: { key: ExportColumn; label: string }[] = [
  { key: "dipendente", label: "Dipendente" },
  { key: "ruolo", label: "Ruolo" },
  { key: "tipo", label: "Tipo" },
  { key: "dal", label: "Dal" },
  { key: "al", label: "Al" },
  { key: "giorni", label: "Giorni" },
  { key: "ore", label: "Ore" },
  { key: "stato", label: "Stato" },
  { key: "motivo", label: "Motivo" },
  { key: "nota", label: "Nota approvatore" },
  { key: "approvato_il", label: "Approvato il" },
  { key: "creato_il", label: "Creato il" },
];

export const DEFAULT_COLUMNS: ExportColumn[] = [
  "dipendente",
  "ruolo",
  "tipo",
  "dal",
  "al",
  "giorni",
  "ore",
  "stato",
  "motivo",
];

export type GroupBy = "none" | "role" | "type" | "status";

export interface ExportOptions {
  columns?: ExportColumn[];
  groupBy?: GroupBy;
  includeSummary?: boolean;
}

const TYPE_LABEL: Record<string, string> = {
  ferie: "Ferie",
  permesso_rol: "Permesso ROL",
  permesso_retribuito: "Permesso retribuito",
  malattia: "Malattia",
  altro: "Altro",
};

const STATUS_LABEL: Record<string, string> = {
  in_attesa: "In attesa",
  approvata: "Approvata",
  rifiutata: "Rifiutata",
};

const ROLE_LABEL: Record<string, string> = {
  admin: "Amministrazione",
  contabilita: "Contabilità",
  area_tecnica: "Area Tecnica",
  gestione_corsi: "Gestione Corsi",
  consulenti_tecnici: "Consulenti Tecnici",
  medicina: "Medicina",
  user: "Lavoratore",
};

export interface EnrichedRequest extends LeaveRequest {
  role?: string | null;
}

export function applyFilters(
  requests: EnrichedRequest[],
  filters: ExportFilters,
): EnrichedRequest[] {
  return requests.filter((r) => {
    if (filters.from && r.end_date < filters.from) return false;
    if (filters.to && r.start_date > filters.to) return false;
    if (filters.type && filters.type !== "all" && r.type !== filters.type) return false;
    if (filters.status && filters.status !== "all" && r.status !== filters.status) return false;
    if (filters.role && filters.role !== "all" && r.role !== filters.role) return false;
    return true;
  });
}

function daysOf(r: EnrichedRequest) {
  return Math.round((new Date(r.end_date).getTime() - new Date(r.start_date).getTime()) / 86400000) + 1;
}

function cellFor(r: EnrichedRequest, col: ExportColumn): string {
  switch (col) {
    case "dipendente": return r.requester_name || "";
    case "ruolo": return ROLE_LABEL[r.role ?? ""] ?? (r.role ?? "");
    case "tipo": return TYPE_LABEL[r.type] || r.type;
    case "dal": return format(new Date(r.start_date), "dd/MM/yyyy");
    case "al": return format(new Date(r.end_date), "dd/MM/yyyy");
    case "giorni": return String(daysOf(r));
    case "ore": return r.hours != null ? String(r.hours) : "";
    case "stato": return STATUS_LABEL[r.status] || r.status;
    case "motivo": return r.reason || "";
    case "nota": return r.review_note || "";
    case "approvato_il": return r.reviewed_at ? format(new Date(r.reviewed_at), "dd/MM/yyyy HH:mm") : "";
    case "creato_il": return format(new Date(r.created_at), "dd/MM/yyyy HH:mm");
  }
}

function groupKey(r: EnrichedRequest, by: GroupBy): string {
  if (by === "role") return ROLE_LABEL[r.role ?? ""] ?? (r.role || "Senza ruolo");
  if (by === "type") return TYPE_LABEL[r.type] || r.type;
  if (by === "status") return STATUS_LABEL[r.status] || r.status;
  return "";
}

export interface PeriodSummary {
  totalRequests: number;
  approved: number;
  pending: number;
  rejected: number;
  vacationDays: number;        // approved ferie
  permitHours: number;         // approved permesso_*
  sickDays: number;
}

export function summarisePeriod(rows: EnrichedRequest[]): PeriodSummary {
  const s: PeriodSummary = {
    totalRequests: rows.length,
    approved: 0,
    pending: 0,
    rejected: 0,
    vacationDays: 0,
    permitHours: 0,
    sickDays: 0,
  };
  for (const r of rows) {
    if (r.status === "approvata") s.approved++;
    else if (r.status === "in_attesa") s.pending++;
    else if (r.status === "rifiutata") s.rejected++;
    if (r.status !== "approvata") continue;
    const d = daysOf(r);
    if (r.type === "ferie") s.vacationDays += d;
    else if (r.type === "malattia") s.sickDays += d;
    else if (r.type === "permesso_rol" || r.type === "permesso_retribuito") s.permitHours += r.hours ?? 0;
  }
  return s;
}

function csvEscape(v: unknown) {
  if (v === null || v === undefined) return "";
  const s = String(v).replace(/"/g, '""');
  return `"${s}"`;
}

export function exportLeaveCSV(
  rows: EnrichedRequest[],
  options: ExportOptions = {},
  filename = "ferie-permessi.csv",
) {
  const columns = options.columns?.length ? options.columns : DEFAULT_COLUMNS;
  const groupBy = options.groupBy ?? "none";
  const header = columns.map((c) => ALL_COLUMNS.find((x) => x.key === c)?.label ?? c);
  const lines: string[] = [];
  lines.push("\uFEFF" + header.map(csvEscape).join(";"));

  const groups = new Map<string, EnrichedRequest[]>();
  if (groupBy === "none") {
    groups.set("", rows);
  } else {
    for (const r of rows) {
      const k = groupKey(r, groupBy);
      if (!groups.has(k)) groups.set(k, []);
      groups.get(k)!.push(r);
    }
  }

  for (const [key, list] of Array.from(groups.entries()).sort((a, b) => a[0].localeCompare(b[0]))) {
    if (key) {
      lines.push(""); // blank separator
      lines.push(csvEscape(`Gruppo: ${key} (${list.length})`));
    }
    for (const r of list) {
      lines.push(columns.map((c) => csvEscape(cellFor(r, c))).join(";"));
    }
  }

  if (options.includeSummary !== false) {
    const s = summarisePeriod(rows);
    lines.push("");
    lines.push(csvEscape("Riepilogo periodo"));
    lines.push([csvEscape("Richieste totali"), csvEscape(s.totalRequests)].join(";"));
    lines.push([csvEscape("Approvate"), csvEscape(s.approved)].join(";"));
    lines.push([csvEscape("In attesa"), csvEscape(s.pending)].join(";"));
    lines.push([csvEscape("Rifiutate"), csvEscape(s.rejected)].join(";"));
    lines.push([csvEscape("Giorni di ferie approvati"), csvEscape(s.vacationDays)].join(";"));
    lines.push([csvEscape("Ore di permesso approvate"), csvEscape(s.permitHours)].join(";"));
    lines.push([csvEscape("Giorni di malattia"), csvEscape(s.sickDays)].join(";"));
  }

  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportLeavePDF(
  rows: EnrichedRequest[],
  filters: ExportFilters,
  options: ExportOptions = {},
  filename = "ferie-permessi.pdf",
) {
  const columns = options.columns?.length ? options.columns : DEFAULT_COLUMNS;
  const groupBy = options.groupBy ?? "none";
  const header = columns.map((c) => ALL_COLUMNS.find((x) => x.key === c)?.label ?? c);

  const doc = new jsPDF({ orientation: "landscape" });
  doc.setFontSize(14);
  doc.text("Report ferie e permessi", 14, 14);
  doc.setFontSize(9);
  const meta: string[] = [];
  if (filters.from) meta.push(`Dal ${format(new Date(filters.from), "d MMM yyyy", { locale: it })}`);
  if (filters.to) meta.push(`Al ${format(new Date(filters.to), "d MMM yyyy", { locale: it })}`);
  if (filters.role && filters.role !== "all") meta.push(`Ruolo: ${ROLE_LABEL[filters.role] ?? filters.role}`);
  if (filters.type && filters.type !== "all") meta.push(`Tipo: ${TYPE_LABEL[filters.type] || filters.type}`);
  if (filters.status && filters.status !== "all") meta.push(`Stato: ${STATUS_LABEL[filters.status]}`);
  if (groupBy !== "none") meta.push(`Raggruppato per ${groupBy === "role" ? "ruolo" : groupBy === "type" ? "tipo" : "stato"}`);
  meta.push(`Generato il ${format(new Date(), "dd/MM/yyyy HH:mm")}`);
  doc.text(meta.join("  ·  "), 14, 20);

  const groups: { key: string; list: EnrichedRequest[] }[] = [];
  if (groupBy === "none") {
    groups.push({ key: "", list: rows });
  } else {
    const m = new Map<string, EnrichedRequest[]>();
    for (const r of rows) {
      const k = groupKey(r, groupBy);
      if (!m.has(k)) m.set(k, []);
      m.get(k)!.push(r);
    }
    for (const [k, list] of Array.from(m.entries()).sort((a, b) => a[0].localeCompare(b[0]))) {
      groups.push({ key: k, list });
    }
  }

  let cursorY = 26;
  for (const g of groups) {
    if (g.key) {
      doc.setFontSize(10);
      doc.setTextColor(30, 41, 59);
      doc.text(`${g.key} — ${g.list.length} richieste`, 14, cursorY + 4);
      cursorY += 8;
      doc.setTextColor(0, 0, 0);
    }
    autoTable(doc, {
      startY: cursorY,
      head: [header],
      body: g.list.map((r) => columns.map((c) => cellFor(r, c))),
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [30, 41, 59] },
    });
    // @ts-expect-error jspdf-autotable adds lastAutoTable
    cursorY = (doc.lastAutoTable?.finalY ?? cursorY) + 6;
  }

  if (options.includeSummary !== false) {
    const s = summarisePeriod(rows);
    autoTable(doc, {
      startY: cursorY + 2,
      head: [["Riepilogo periodo", "Valore"]],
      body: [
        ["Richieste totali", String(s.totalRequests)],
        ["Approvate", String(s.approved)],
        ["In attesa", String(s.pending)],
        ["Rifiutate", String(s.rejected)],
        ["Giorni di ferie approvati", String(s.vacationDays)],
        ["Ore di permesso approvate", String(s.permitHours)],
        ["Giorni di malattia", String(s.sickDays)],
      ],
      styles: { fontSize: 9, cellPadding: 3 },
      headStyles: { fillColor: [16, 185, 129] },
      theme: "grid",
    });
  }

  doc.save(filename);
}
