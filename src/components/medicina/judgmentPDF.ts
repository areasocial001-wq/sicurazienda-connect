import jsPDF from 'jspdf';
import { supabase } from '@/integrations/supabase/client';

export interface JudgmentPDFData {
  judgment: any;
  employee?: { first_name?: string; last_name?: string; fiscal_code?: string | null; birth_date?: string | null; birth_place?: string | null } | null;
  company?: { name?: string; company?: string; vat_number?: string | null; address?: string | null } | null;
  doctor?: { first_name: string; last_name: string; medical_order?: string | null; order_number?: string | null; signature_path?: string | null } | null;
  protocol?: { name?: string; job_role?: string | null; risks?: string[] | null } | null;
  visit?: { visit_type?: string; execution_date?: string | null; scheduled_date?: string | null } | null;
  signatureDataUrl?: string | null;
}

const JUDGMENT_LABELS: Record<string, string> = {
  idoneo: 'IDONEO alla mansione specifica',
  idoneo_con_limitazioni: 'IDONEO con LIMITAZIONI',
  idoneo_con_prescrizioni: 'IDONEO con PRESCRIZIONI',
  non_idoneo_temporaneo: 'NON IDONEO TEMPORANEO',
  non_idoneo_permanente: 'NON IDONEO PERMANENTE',
  sospeso: 'GIUDIZIO SOSPESO',
};

async function loadSignatureDataUrl(path?: string | null): Promise<string | null> {
  if (!path) return null;
  try {
    const { data } = await supabase.storage.from('medical-records').createSignedUrl(path, 300);
    if (!data?.signedUrl) return null;
    const res = await fetch(data.signedUrl);
    const blob = await res.blob();
    return await new Promise<string>((resolve) => {
      const fr = new FileReader();
      fr.onloadend = () => resolve(fr.result as string);
      fr.readAsDataURL(blob);
    });
  } catch { return null; }
}

export async function generateJudgmentPDF(d: JudgmentPDFData): Promise<Blob> {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const W = 210; const M = 15; let y = 20;

  doc.setFont('helvetica', 'bold'); doc.setFontSize(14);
  doc.text('GIUDIZIO DI IDONEITÀ ALLA MANSIONE SPECIFICA', W / 2, y, { align: 'center' }); y += 5;
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
  doc.text('(ai sensi dell\'art. 41, comma 6, D.Lgs. 81/08 e s.m.i. — Allegato 3A)', W / 2, y, { align: 'center' }); y += 8;

  doc.setDrawColor(0); doc.line(M, y, W - M, y); y += 6;

  // Datore di lavoro
  doc.setFont('helvetica', 'bold'); doc.setFontSize(10);
  doc.text('Datore di lavoro / Azienda', M, y); y += 5;
  doc.setFont('helvetica', 'normal');
  const az = d.company?.company || d.company?.name || '—';
  doc.text(`Denominazione: ${az}`, M, y); y += 4;
  if (d.company?.vat_number) { doc.text(`P.IVA / C.F.: ${d.company.vat_number}`, M, y); y += 4; }
  if (d.company?.address) { doc.text(`Sede: ${d.company.address}`, M, y); y += 4; }
  y += 3;

  // Lavoratore
  doc.setFont('helvetica', 'bold'); doc.text('Lavoratore', M, y); y += 5;
  doc.setFont('helvetica', 'normal');
  const nome = `${d.employee?.last_name || ''} ${d.employee?.first_name || ''}`.trim() || '—';
  doc.text(`Cognome e nome: ${nome}`, M, y); y += 4;
  if (d.employee?.fiscal_code) { doc.text(`Codice fiscale: ${d.employee.fiscal_code}`, M, y); y += 4; }
  if (d.employee?.birth_date || d.employee?.birth_place) {
    doc.text(`Nato/a a ${d.employee?.birth_place || '—'} il ${d.employee?.birth_date || '—'}`, M, y); y += 4;
  }
  y += 3;

  // Mansione e rischi
  doc.setFont('helvetica', 'bold'); doc.text('Mansione e rischi valutati', M, y); y += 5;
  doc.setFont('helvetica', 'normal');
  doc.text(`Mansione: ${d.judgment.job_role || d.protocol?.job_role || '—'}`, M, y); y += 4;
  const risks = (d.judgment.risks_evaluated || d.protocol?.risks || []).join(', ') || '—';
  const risksLines = doc.splitTextToSize(`Rischi: ${risks}`, W - 2 * M);
  doc.text(risksLines, M, y); y += risksLines.length * 4;
  doc.text(`Protocollo sanitario: ${d.protocol?.name || '—'}`, M, y); y += 4;
  y += 3;

  // Visita
  doc.setFont('helvetica', 'bold'); doc.text('Visita medica', M, y); y += 5;
  doc.setFont('helvetica', 'normal');
  const vType = d.judgment.visit_type || d.visit?.visit_type || '—';
  const vDate = d.judgment.visit_date || d.visit?.execution_date || d.visit?.scheduled_date || '—';
  doc.text(`Tipo visita: ${vType} — Data: ${vDate}`, M, y); y += 4;
  const examsArr = Array.isArray(d.judgment.exams_evaluated) ? d.judgment.exams_evaluated : [];
  if (examsArr.length) {
    const examStr = examsArr.map((e: any) => e?.name || e).filter(Boolean).join(', ');
    const lines = doc.splitTextToSize(`Esami effettuati: ${examStr}`, W - 2 * M);
    doc.text(lines, M, y); y += lines.length * 4;
  }
  y += 4;

  // Esito
  doc.setDrawColor(120); doc.line(M, y, W - M, y); y += 6;
  doc.setFont('helvetica', 'bold'); doc.setFontSize(12);
  doc.text('ESITO DEL GIUDIZIO', M, y); y += 6;
  doc.setFontSize(11);
  doc.text(JUDGMENT_LABELS[d.judgment.judgment] || d.judgment.judgment, M, y); y += 6;

  doc.setFontSize(10); doc.setFont('helvetica', 'normal');
  doc.text(`Data giudizio: ${d.judgment.judgment_date}`, M, y); y += 4;
  if (d.judgment.valid_until) { doc.text(`Valido fino al: ${d.judgment.valid_until}`, M, y); y += 4; }
  y += 2;

  if (d.judgment.limitations) {
    doc.setFont('helvetica', 'bold'); doc.text('Limitazioni:', M, y); y += 4;
    doc.setFont('helvetica', 'normal');
    const l = doc.splitTextToSize(d.judgment.limitations, W - 2 * M);
    doc.text(l, M, y); y += l.length * 4 + 2;
  }
  if (d.judgment.prescriptions) {
    doc.setFont('helvetica', 'bold'); doc.text('Prescrizioni:', M, y); y += 4;
    doc.setFont('helvetica', 'normal');
    const l = doc.splitTextToSize(d.judgment.prescriptions, W - 2 * M);
    doc.text(l, M, y); y += l.length * 4 + 2;
  }
  if (d.judgment.notes) {
    doc.setFont('helvetica', 'bold'); doc.text('Note:', M, y); y += 4;
    doc.setFont('helvetica', 'normal');
    const l = doc.splitTextToSize(d.judgment.notes, W - 2 * M);
    doc.text(l, M, y); y += l.length * 4 + 2;
  }

  y += 8;
  doc.setFont('helvetica', 'italic'); doc.setFontSize(9);
  doc.text('Avverso il presente giudizio è ammesso ricorso, entro 30 giorni dalla data di comunicazione, all\'organo di vigilanza territorialmente competente (art. 41, c. 9 D.Lgs. 81/08).', M, y, { maxWidth: W - 2 * M }); y += 10;

  // Firma
  const signUrl = d.signatureDataUrl || await loadSignatureDataUrl(d.doctor?.signature_path);
  const signY = 260;
  doc.setFont('helvetica', 'normal'); doc.setFontSize(10);
  doc.text('Il Medico Competente', W - M - 60, signY - 4);
  if (signUrl) {
    try { doc.addImage(signUrl, 'PNG', W - M - 60, signY, 55, 20); } catch {}
  }
  doc.line(W - M - 65, signY + 22, W - M - 5, signY + 22);
  const docName = d.doctor ? `Dr. ${d.doctor.first_name} ${d.doctor.last_name}` : '________________________';
  doc.text(docName, W - M - 60, signY + 26);
  if (d.doctor?.medical_order || d.doctor?.order_number) {
    doc.setFontSize(8);
    doc.text(`Ordine dei Medici di ${d.doctor?.medical_order || ''} n° ${d.doctor?.order_number || ''}`, W - M - 60, signY + 30);
  }

  return doc.output('blob');
}
