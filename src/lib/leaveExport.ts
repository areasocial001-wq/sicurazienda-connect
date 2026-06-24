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

function csvEscape(v: unknown) {
  if (v === null || v === undefined) return "";
  const s = String(v).replace(/"/g, '""');
  return `"${s}"`;
}

export function exportLeaveCSV(rows: EnrichedRequest[], filename = "ferie-permessi.csv") {
  const header = [
    "Dipendente",
    "Ruolo",
    "Tipo",
    "Dal",
    "Al",
    "Giorni",
    "Ore",
    "Stato",
    "Motivo",
    "Nota approvatore",
    "Approvato il",
    "Creato il",
  ];
  const lines: string[] = [];
  // BOM for Excel
  lines.push("\uFEFF" + header.map(csvEscape).join(";"));
  for (const r of rows) {
    const days =
      Math.round(
        (new Date(r.end_date).getTime() - new Date(r.start_date).getTime()) /
          86400000,
      ) + 1;
    lines.push(
      [
        r.requester_name || "",
        r.role || "",
        TYPE_LABEL[r.type] || r.type,
        format(new Date(r.start_date), "dd/MM/yyyy"),
        format(new Date(r.end_date), "dd/MM/yyyy"),
        days,
        r.hours ?? "",
        STATUS_LABEL[r.status] || r.status,
        r.reason || "",
        r.review_note || "",
        r.reviewed_at ? format(new Date(r.reviewed_at), "dd/MM/yyyy HH:mm") : "",
        format(new Date(r.created_at), "dd/MM/yyyy HH:mm"),
      ]
        .map(csvEscape)
        .join(";"),
    );
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
  filename = "ferie-permessi.pdf",
) {
  const doc = new jsPDF({ orientation: "landscape" });
  doc.setFontSize(14);
  doc.text("Report ferie e permessi", 14, 14);
  doc.setFontSize(9);
  const meta: string[] = [];
  if (filters.from) meta.push(`Dal ${format(new Date(filters.from), "d MMM yyyy", { locale: it })}`);
  if (filters.to) meta.push(`Al ${format(new Date(filters.to), "d MMM yyyy", { locale: it })}`);
  if (filters.role && filters.role !== "all") meta.push(`Ruolo: ${filters.role}`);
  if (filters.type && filters.type !== "all") meta.push(`Tipo: ${TYPE_LABEL[filters.type] || filters.type}`);
  if (filters.status && filters.status !== "all") meta.push(`Stato: ${STATUS_LABEL[filters.status]}`);
  meta.push(`Generato il ${format(new Date(), "dd/MM/yyyy HH:mm")}`);
  doc.text(meta.join("  ·  "), 14, 20);

  autoTable(doc, {
    startY: 26,
    head: [["Dipendente", "Ruolo", "Tipo", "Dal", "Al", "Gg", "Ore", "Stato", "Motivo"]],
    body: rows.map((r) => {
      const days =
        Math.round(
          (new Date(r.end_date).getTime() - new Date(r.start_date).getTime()) /
            86400000,
        ) + 1;
      return [
        r.requester_name || "",
        r.role || "",
        TYPE_LABEL[r.type] || r.type,
        format(new Date(r.start_date), "dd/MM/yyyy"),
        format(new Date(r.end_date), "dd/MM/yyyy"),
        String(days),
        r.hours != null ? String(r.hours) : "",
        STATUS_LABEL[r.status] || r.status,
        r.reason || "",
      ];
    }),
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [30, 41, 59] },
    columnStyles: { 8: { cellWidth: 60 } },
  });

  doc.save(filename);
}
