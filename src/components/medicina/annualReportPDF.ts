import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format, parseISO } from 'date-fns';
import { it } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import type { MedicalAnnualReport, MedicalDoctor, MedicalVisit, MedicalJudgment } from '@/hooks/useMedicina';
import { JUDGMENT_OPTIONS } from '@/components/medicina/JudgmentDialog';

interface ReportContext {
  report: MedicalAnnualReport;
  doctor?: MedicalDoctor | null;
  contact?: { id: string; name: string; company?: string | null; address?: string | null; vat_number?: string | null; fiscal_code?: string | null } | null;
  branding?: {
    company_name?: string | null;
    company_address?: string | null;
    company_phone?: string | null;
    company_email?: string | null;
    company_pec?: string | null;
    company_vat?: string | null;
    company_fiscal_code?: string | null;
    footer_text?: string | null;
  } | null;
  visits: MedicalVisit[];
  judgments: MedicalJudgment[];
}

const visitTypeLabel = (t: string) => ({
  preventiva: 'Preventiva (assunzione)',
  periodica: 'Periodica',
  cambio_mansione: 'Cambio mansione',
  rientro: 'Rientro',
  su_richiesta: 'Su richiesta del lavoratore',
  cessazione: 'Cessazione rapporto',
}[t] || t);

const judgmentLabel = (j: string) => JUDGMENT_OPTIONS.find((o) => o.value === j)?.label || j;

/**
 * Compute Allegato 3B aggregated data from visits and judgments for the given year + contact.
 */
export function computeAnnualStats(visits: MedicalVisit[], judgments: MedicalJudgment[], year: number, contactId?: string | null) {
  const inYearVisits = visits.filter((v) => {
    const d = v.execution_date ? new Date(v.execution_date) : null;
    if (!d) return false;
    if (d.getFullYear() !== year) return false;
    if (contactId && v.contact_id !== contactId) return false;
    return true;
  });

  const inYearJudgments = judgments.filter((j) => {
    const d = j.judgment_date ? new Date(j.judgment_date) : null;
    if (!d || d.getFullYear() !== year) return false;
    if (contactId) {
      const v = visits.find((x) => x.id === j.visit_id);
      if (!v || v.contact_id !== contactId) return false;
    }
    return true;
  });

  const employees = new Set<string>();
  inYearVisits.forEach((v) => v.employee_id && employees.add(v.employee_id));

  const visitsByType: Record<string, number> = {};
  inYearVisits.forEach((v) => {
    visitsByType[v.visit_type] = (visitsByType[v.visit_type] || 0) + 1;
  });

  let fit = 0, fitLim = 0, unfitTemp = 0, unfitPerm = 0, suspended = 0;
  inYearJudgments.forEach((j) => {
    if (j.judgment === 'idoneo') fit++;
    else if (j.judgment === 'idoneo_con_limitazioni' || j.judgment === 'idoneo_con_prescrizioni') fitLim++;
    else if (j.judgment === 'non_idoneo_temporaneo') unfitTemp++;
    else if (j.judgment === 'non_idoneo_permanente') unfitPerm++;
    else if (j.judgment === 'sospeso') suspended++;
  });

  return {
    total_workers: employees.size,
    visits_performed: inYearVisits.length,
    visitsByType,
    fit_count: fit,
    fit_with_limitations_count: fitLim,
    unfit_temp_count: unfitTemp,
    unfit_count: unfitPerm,
    suspended_count: suspended,
    visits: inYearVisits,
    judgments: inYearJudgments,
  };
}

export async function generateAnnualReportPDF(ctx: ReportContext): Promise<jsPDF> {
  const { report, doctor, contact, branding, visits, judgments } = ctx;
  const stats = computeAnnualStats(visits, judgments, report.reference_year, report.contact_id);

  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const W = doc.internal.pageSize.getWidth();
  const M = 15;
  let y = M;

  // ========== HEADER ==========
  if (branding?.company_name) {
    doc.setFontSize(11).setFont('helvetica', 'bold');
    doc.text(branding.company_name, M, y);
    y += 5;
    doc.setFontSize(8).setFont('helvetica', 'normal');
    if (branding.company_address) { doc.text(branding.company_address, M, y); y += 4; }
    const line2 = [branding.company_phone, branding.company_email, branding.company_pec].filter(Boolean).join(' · ');
    if (line2) { doc.text(line2, M, y); y += 4; }
    const line3 = [branding.company_vat ? `P.IVA ${branding.company_vat}` : null, branding.company_fiscal_code ? `C.F. ${branding.company_fiscal_code}` : null].filter(Boolean).join(' · ');
    if (line3) { doc.text(line3, M, y); y += 4; }
    y += 2;
    doc.setDrawColor(180); doc.line(M, y, W - M, y);
    y += 6;
  }

  // ========== TITLE ==========
  doc.setFontSize(14).setFont('helvetica', 'bold');
  doc.text('RELAZIONE SANITARIA ANNUALE', W / 2, y, { align: 'center' });
  y += 5;
  doc.setFontSize(9).setFont('helvetica', 'normal');
  doc.text('ai sensi dell\'art. 25, comma 1, lett. i) e art. 40 del D.Lgs. 81/2008', W / 2, y, { align: 'center' });
  y += 4;
  doc.text(`Allegato 3B — anno di riferimento ${report.reference_year}`, W / 2, y, { align: 'center' });
  y += 8;

  // ========== AZIENDA ==========
  doc.setFontSize(11).setFont('helvetica', 'bold');
  doc.text('Azienda / Unità produttiva', M, y);
  y += 5;
  doc.setFontSize(9).setFont('helvetica', 'normal');
  const azienda = contact?.company || contact?.name || '—';
  doc.text(`Ragione sociale: ${azienda}`, M, y); y += 4;
  if (contact?.address) { doc.text(`Sede: ${contact.address}`, M, y); y += 4; }
  if (contact?.vat_number) { doc.text(`P.IVA: ${contact.vat_number}`, M, y); y += 4; }
  if (contact?.fiscal_code) { doc.text(`C.F.: ${contact.fiscal_code}`, M, y); y += 4; }
  y += 3;

  // ========== MEDICO ==========
  doc.setFontSize(11).setFont('helvetica', 'bold');
  doc.text('Medico Competente', M, y);
  y += 5;
  doc.setFontSize(9).setFont('helvetica', 'normal');
  if (doctor) {
    doc.text(`Dr. ${doctor.first_name} ${doctor.last_name}`, M, y); y += 4;
    if (doctor.medical_order) { doc.text(`Ordine: ${doctor.medical_order}${doctor.order_number ? ` n. ${doctor.order_number}` : ''}`, M, y); y += 4; }
    if (doctor.fiscal_code) { doc.text(`C.F.: ${doctor.fiscal_code}`, M, y); y += 4; }
    const docContact = [doctor.email, doctor.phone, doctor.pec].filter(Boolean).join(' · ');
    if (docContact) { doc.text(docContact, M, y); y += 4; }
  } else {
    doc.text('—', M, y); y += 4;
  }
  y += 3;

  // ========== STATS ==========
  doc.setFontSize(11).setFont('helvetica', 'bold');
  doc.text('Dati di sintesi', M, y);
  y += 2;

  autoTable(doc, {
    startY: y + 2,
    margin: { left: M, right: M },
    head: [['Voce', 'Valore']],
    body: [
      ['Lavoratori sottoposti a sorveglianza sanitaria', String(report.total_workers ?? stats.total_workers)],
      ['Visite mediche eseguite nell\'anno', String(report.visits_performed ?? stats.visits_performed)],
      ['Idonei alla mansione specifica', String(report.fit_count ?? stats.fit_count)],
      ['Idonei con limitazioni / prescrizioni', String(report.fit_with_limitations_count ?? stats.fit_with_limitations_count)],
      ['Non idonei temporanei', String(stats.unfit_temp_count)],
      ['Non idonei permanenti', String(report.unfit_count ?? stats.unfit_count)],
      ['Giudizio sospeso (in attesa di accertamenti)', String(stats.suspended_count)],
    ],
    styles: { fontSize: 9, cellPadding: 2 },
    headStyles: { fillColor: [60, 80, 120] },
  });
  y = (doc as any).lastAutoTable.finalY + 6;

  // ========== VISITE PER TIPO ==========
  if (Object.keys(stats.visitsByType).length > 0) {
    doc.setFontSize(11).setFont('helvetica', 'bold');
    doc.text('Visite per tipologia', M, y);
    autoTable(doc, {
      startY: y + 2,
      margin: { left: M, right: M },
      head: [['Tipo visita', 'Numero']],
      body: Object.entries(stats.visitsByType).map(([k, v]) => [visitTypeLabel(k), String(v)]),
      styles: { fontSize: 9, cellPadding: 2 },
      headStyles: { fillColor: [60, 80, 120] },
    });
    y = (doc as any).lastAutoTable.finalY + 6;
  }

  // ========== GIUDIZI ==========
  if (stats.judgments.length > 0) {
    if (y > 240) { doc.addPage(); y = M; }
    doc.setFontSize(11).setFont('helvetica', 'bold');
    doc.text('Elenco giudizi di idoneità emessi', M, y);
    autoTable(doc, {
      startY: y + 2,
      margin: { left: M, right: M },
      head: [['Data', 'Esito', 'Limitazioni', 'Valido fino']],
      body: stats.judgments.map((j) => [
        format(parseISO(j.judgment_date), 'dd/MM/yyyy', { locale: it }),
        judgmentLabel(j.judgment),
        j.limitations || '—',
        j.valid_until ? format(parseISO(j.valid_until), 'dd/MM/yyyy', { locale: it }) : '—',
      ]),
      styles: { fontSize: 8, cellPadding: 1.5 },
      headStyles: { fillColor: [60, 80, 120] },
      columnStyles: { 2: { cellWidth: 80 } },
    });
    y = (doc as any).lastAutoTable.finalY + 6;
  }

  // ========== CONTENT / NOTES ==========
  if (report.content) {
    if (y > 240) { doc.addPage(); y = M; }
    doc.setFontSize(11).setFont('helvetica', 'bold');
    doc.text('Considerazioni del Medico Competente', M, y);
    y += 5;
    doc.setFontSize(9).setFont('helvetica', 'normal');
    const lines = doc.splitTextToSize(report.content, W - M * 2);
    doc.text(lines, M, y);
    y += lines.length * 4 + 4;
  }

  // ========== FOOTER + FIRMA ==========
  if (y > 240) { doc.addPage(); y = M; }
  y += 15;
  doc.setFontSize(9).setFont('helvetica', 'normal');
  const reportDate = report.report_date ? format(parseISO(report.report_date), 'dd/MM/yyyy', { locale: it }) : format(new Date(), 'dd/MM/yyyy', { locale: it });
  doc.text(`Data: ${reportDate}`, M, y);
  doc.text('Il Medico Competente', W - M - 60, y);
  y += 12;
  doc.line(W - M - 70, y, W - M - 5, y);
  y += 4;
  if (doctor) {
    doc.text(`Dr. ${doctor.first_name} ${doctor.last_name}`, W - M - 70, y);
  }

  // ========== PAGE NUMBERS ==========
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(7).setTextColor(120);
    doc.text(`Pagina ${i} di ${pageCount}`, W - M, doc.internal.pageSize.getHeight() - 8, { align: 'right' });
    if (branding?.footer_text) {
      doc.text(branding.footer_text, M, doc.internal.pageSize.getHeight() - 8);
    }
    doc.setTextColor(0);
  }

  return doc;
}

/**
 * Generate, download and (optionally) upload the PDF to the medical-records bucket.
 */
export async function generateAndDownloadAnnualReport(ctx: ReportContext, opts?: { upload?: boolean; userId?: string }) {
  const doc = await generateAnnualReportPDF(ctx);
  const azienda = (ctx.contact?.company || ctx.contact?.name || 'azienda').replace(/[^a-z0-9]+/gi, '_').toLowerCase();
  const filename = `relazione_annuale_3B_${azienda}_${ctx.report.reference_year}.pdf`;
  doc.save(filename);

  if (opts?.upload && opts.userId) {
    const blob = doc.output('blob');
    const path = `${opts.userId}/annual-reports/${ctx.report.id}_${Date.now()}.pdf`;
    const { error } = await supabase.storage.from('medical-records').upload(path, blob, {
      contentType: 'application/pdf',
      upsert: true,
    });
    if (!error) {
      await (supabase as any).from('medical_annual_reports').update({ report_file_path: path }).eq('id', ctx.report.id);
      return path;
    }
  }
  return null;
}
