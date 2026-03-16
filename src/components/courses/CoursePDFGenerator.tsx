import { Button } from '@/components/ui/button';
import { FileDown, Award } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { CourseEnrollment, CourseLesson } from '@/hooks/useCourses';
import { BrandingSettings, useCourseBranding } from './CourseBrandingSettings';
import { supabase } from '@/integrations/supabase/client';

interface AttendanceMap {
  [lessonId: string]: { [enrollmentId: string]: boolean };
}

interface CoursePDFProps {
  courseName: string;
  editionCode: string;
  startDate?: string;
  endDate?: string;
  location?: string;
  instructorName?: string;
  enrollments: CourseEnrollment[];
  lessons: CourseLesson[];
  attendanceMap: AttendanceMap;
  durationHours?: number | null;
  renewalMonths?: number | null;
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('it-IT');
}

function getBrandingHeader(branding: BrandingSettings | null, logoUrl: string | null) {
  if (!branding) return { logoHtml: '', companyInfoHtml: 'SicurAzienda Connect', footerHtml: 'SicurAzienda Connect - Gestione Corsi' };

  const logoHtml = logoUrl
    ? `<img src="${logoUrl}" style="height:50px;max-width:180px;object-fit:contain;" />`
    : '';

  const name = branding.company_name || 'SicurAzienda Connect';
  const details: string[] = [];
  if (branding.company_address) details.push(branding.company_address);
  if (branding.company_phone) details.push(`Tel: ${branding.company_phone}`);
  if (branding.company_email) details.push(branding.company_email);
  if (branding.company_pec) details.push(`PEC: ${branding.company_pec}`);
  if (branding.company_vat) details.push(`P.IVA: ${branding.company_vat}`);
  if (branding.company_fiscal_code) details.push(`C.F.: ${branding.company_fiscal_code}`);
  if (branding.company_website) details.push(branding.company_website);

  const companyInfoHtml = `<div style="font-size:11px;color:#374151;line-height:1.5;">${details.join(' | ')}</div>`;
  const footerHtml = branding.footer_text || `${name} - Gestione Corsi`;

  return { logoHtml, name, companyInfoHtml, footerHtml };
}

function generateAttendancePDF(
  props: CoursePDFProps,
  branding: BrandingSettings | null,
  logoUrl: string | null
) {
  const { courseName, editionCode, startDate, endDate, location, instructorName, enrollments, lessons, attendanceMap } = props;
  const brand = getBrandingHeader(branding, logoUrl);

  const rows = enrollments.map(enr => {
    const name = enr.employee ? `${enr.employee.last_name} ${enr.employee.first_name}` : 'N/D';
    const attendance = lessons.map(l => attendanceMap[l.id]?.[enr.id] ? '✓' : '—');
    const totalPresent = lessons.filter(l => attendanceMap[l.id]?.[enr.id]).length;
    return { name, attendance, totalPresent };
  }).sort((a, b) => a.name.localeCompare(b.name));

  const lessonHeaders = lessons.map(l =>
    new Date(l.lesson_date).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' })
  );

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8">
<title>Registro Presenze - ${courseName}</title>
<style>
  @page { size: landscape; margin: 15mm; }
  body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 11px; color: #1a1a1a; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; border-bottom: 3px solid #1e40af; padding-bottom: 15px; }
  .logo-area { display: flex; align-items: center; gap: 12px; }
  .logo-area img { height: 50px; }
  .title { font-size: 20px; font-weight: 700; color: #1e40af; }
  .subtitle { font-size: 12px; color: #6b7280; margin-top: 4px; }
  .company-details { font-size: 10px; color: #6b7280; margin-top: 4px; }
  .info-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-bottom: 20px; padding: 10px; background: #f0f4ff; border-radius: 8px; }
  .info-item { font-size: 11px; }
  .info-label { font-weight: 600; color: #374151; }
  table { width: 100%; border-collapse: collapse; margin-top: 10px; }
  th { background: #1e40af; color: white; padding: 6px 4px; font-size: 10px; text-align: center; }
  th:first-child { text-align: left; min-width: 180px; }
  td { border: 1px solid #d1d5db; padding: 5px 4px; text-align: center; font-size: 10px; }
  td:first-child { text-align: left; font-weight: 500; }
  tr:nth-child(even) { background: #f9fafb; }
  .check { color: #16a34a; font-weight: bold; }
  .absent { color: #d1d5db; }
  .total { font-weight: 700; background: #e0e7ff !important; }
  .footer { margin-top: 30px; display: flex; justify-content: space-between; font-size: 10px; color: #6b7280; border-top: 1px solid #e5e7eb; padding-top: 10px; }
  .signature { margin-top: 40px; display: flex; gap: 60px; }
  .signature-line { border-top: 1px solid #374151; width: 200px; padding-top: 5px; text-align: center; font-size: 10px; }
</style></head><body>
<div class="header">
  <div class="logo-area">
    ${brand.logoHtml}
    <div>
      <div class="title">REGISTRO PRESENZE</div>
      <div class="subtitle">Formazione Sicurezza sul Lavoro - D.Lgs. 81/08</div>
      ${brand.companyInfoHtml ? `<div class="company-details">${brand.companyInfoHtml}</div>` : ''}
    </div>
  </div>
  <div style="text-align:right;font-size:11px;color:#6b7280;">
    Edizione: <strong>${editionCode || 'N/D'}</strong><br/>
    Stampato il: ${new Date().toLocaleDateString('it-IT')}
  </div>
</div>
<div class="info-grid">
  <div class="info-item"><span class="info-label">Corso:</span> ${courseName}</div>
  <div class="info-item"><span class="info-label">Sede:</span> ${location || 'N/D'}</div>
  <div class="info-item"><span class="info-label">Docente:</span> ${instructorName || 'N/D'}</div>
  <div class="info-item"><span class="info-label">Data Inizio:</span> ${startDate ? formatDate(startDate) : 'N/D'}</div>
  <div class="info-item"><span class="info-label">Data Fine:</span> ${endDate ? formatDate(endDate) : 'N/D'}</div>
  <div class="info-item"><span class="info-label">Partecipanti:</span> ${enrollments.length}</div>
</div>
<table>
  <thead><tr>
    <th>Cognome e Nome</th>
    ${lessonHeaders.map(h => `<th>${h}</th>`).join('')}
    <th>Tot.</th>
  </tr></thead>
  <tbody>
    ${rows.map(r => `<tr>
      <td>${r.name}</td>
      ${r.attendance.map(a => `<td class="${a === '✓' ? 'check' : 'absent'}">${a}</td>`).join('')}
      <td class="total">${r.totalPresent}/${lessons.length}</td>
    </tr>`).join('')}
  </tbody>
</table>
<div class="signature">
  <div class="signature-line">Il Docente</div>
  <div class="signature-line">Il Responsabile</div>
</div>
<div class="footer">
  <span>${brand.footerHtml}</span>
  <span>Documento generato automaticamente</span>
</div>
</body></html>`;
}

function generateCertificatePDF(
  props: CoursePDFProps & { enrollment: CourseEnrollment },
  branding: BrandingSettings | null,
  logoUrl: string | null
) {
  const { courseName, editionCode, startDate, endDate, location, instructorName, durationHours, enrollment } = props;
  const brand = getBrandingHeader(branding, logoUrl);
  const empName = enrollment.employee
    ? `${enrollment.employee.first_name} ${enrollment.employee.last_name}`
    : 'N/D';
  const companyName = enrollment.contact?.name || enrollment.contact?.company || '';

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8">
<title>Attestato - ${empName}</title>
<style>
  @page { size: A4 landscape; margin: 0; }
  body { font-family: 'Georgia', 'Times New Roman', serif; margin: 0; padding: 0; background: white; }
  .certificate { width: 297mm; height: 210mm; position: relative; display: flex; flex-direction: column; align-items: center; justify-content: center; box-sizing: border-box; padding: 25mm 30mm; }
  .border-frame { position: absolute; inset: 10mm; border: 3px solid #1e40af; border-radius: 4px; }
  .border-inner { position: absolute; inset: 13mm; border: 1px solid #93b4f4; border-radius: 2px; }
  .content { position: relative; z-index: 1; text-align: center; width: 100%; }
  .org-logo { margin-bottom: 10px; }
  .org-logo img { height: 60px; max-width: 240px; object-fit: contain; }
  .org-name { font-size: 14px; letter-spacing: 3px; color: #6b7280; text-transform: uppercase; margin-bottom: 10px; }
  h1 { font-size: 36px; color: #1e40af; margin: 10px 0; letter-spacing: 2px; font-weight: 400; }
  .subtitle { font-size: 14px; color: #374151; margin-bottom: 30px; }
  .participant { font-size: 28px; color: #111827; font-weight: 700; border-bottom: 2px solid #1e40af; display: inline-block; padding-bottom: 5px; margin: 15px 0; }
  .company { font-size: 16px; color: #4b5563; margin-bottom: 20px; }
  .course-info { font-size: 14px; color: #374151; line-height: 1.8; margin: 20px 0; }
  .course-name { font-size: 18px; font-weight: 700; color: #1e40af; }
  .details { display: flex; justify-content: center; gap: 40px; margin: 20px 0; font-size: 12px; color: #6b7280; }
  .detail-item { text-align: center; }
  .detail-value { font-weight: 600; color: #374151; font-size: 13px; }
  .signatures { display: flex; justify-content: space-between; width: 80%; margin: 40px auto 0; }
  .sig-block { text-align: center; }
  .sig-line { width: 180px; border-top: 1px solid #374151; margin-top: 40px; padding-top: 5px; font-size: 11px; color: #6b7280; }
  .cert-id { position: absolute; bottom: 15mm; right: 20mm; font-size: 9px; color: #9ca3af; }
  .cert-footer { position: absolute; bottom: 15mm; left: 20mm; font-size: 9px; color: #9ca3af; max-width: 50%; }
</style></head><body>
<div class="certificate">
  <div class="border-frame"></div>
  <div class="border-inner"></div>
  <div class="content">
    ${brand.logoHtml ? `<div class="org-logo">${brand.logoHtml.replace('height:50px', 'height:60px')}</div>` : ''}
    <div class="org-name">${brand.name || 'SicurAzienda Connect'}</div>
    <h1>ATTESTATO DI FORMAZIONE</h1>
    <div class="subtitle">ai sensi del D.Lgs. 81/2008 e s.m.i.</div>
    <p style="font-size:14px;color:#4b5563;">Si attesta che</p>
    <div class="participant">${empName}</div>
    ${companyName ? `<div class="company">${companyName}</div>` : ''}
    <div class="course-info">
      ha frequentato con esito positivo il corso di formazione<br/>
      <span class="course-name">${courseName}</span>
    </div>
    <div class="details">
      ${durationHours ? `<div class="detail-item"><div class="detail-value">${durationHours} ore</div>Durata</div>` : ''}
      ${startDate ? `<div class="detail-item"><div class="detail-value">${formatDate(startDate)}${endDate && endDate !== startDate ? ` - ${formatDate(endDate)}` : ''}</div>Periodo</div>` : ''}
      ${location ? `<div class="detail-item"><div class="detail-value">${location}</div>Sede</div>` : ''}
      ${enrollment.certificate_date ? `<div class="detail-item"><div class="detail-value">${formatDate(enrollment.certificate_date)}</div>Emissione</div>` : ''}
      ${enrollment.certificate_expiry ? `<div class="detail-item"><div class="detail-value">${formatDate(enrollment.certificate_expiry)}</div>Scadenza</div>` : ''}
    </div>
    <div class="signatures">
      <div class="sig-block"><div class="sig-line">${instructorName || 'Il Docente'}</div></div>
      <div class="sig-block"><div class="sig-line">Il Responsabile</div></div>
    </div>
  </div>
  ${brand.footerHtml ? `<div class="cert-footer">${brand.footerHtml}</div>` : ''}
  <div class="cert-id">Cod. ${editionCode || 'N/D'} | Generato il ${new Date().toLocaleDateString('it-IT')}</div>
</div>
</body></html>`;
}

function printHTML(html: string) {
  const win = window.open('', '_blank');
  if (!win) return;
  win.document.write(html);
  win.document.close();
  win.onload = () => {
    win.print();
  };
}

export function AttendancePDFButton(props: CoursePDFProps) {
  const { toast } = useToast();
  const { branding, logoUrl } = useCourseBranding();

  const handlePrint = () => {
    if (props.lessons.length === 0 || props.enrollments.length === 0) {
      toast({ title: 'Aggiungi lezioni e iscritti per generare il registro', variant: 'destructive' });
      return;
    }
    const html = generateAttendancePDF(props, branding, logoUrl);
    printHTML(html);
  };

  return (
    <Button variant="outline" size="sm" onClick={handlePrint} className="gap-1.5">
      <FileDown className="h-4 w-4" /> Stampa Registro
    </Button>
  );
}

export function CertificatePDFButton(props: CoursePDFProps & { enrollment: CourseEnrollment }) {
  const { branding, logoUrl } = useCourseBranding();

  const handlePrint = () => {
    const html = generateCertificatePDF(props, branding, logoUrl);
    printHTML(html);
  };

  return (
    <Button variant="outline" size="sm" onClick={handlePrint} className="gap-1.5">
      <Award className="h-4 w-4" /> Attestato PDF
    </Button>
  );
}
