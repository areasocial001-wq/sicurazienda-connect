import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Award, Send, Eye, Printer } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { CourseEnrollment, CourseLesson } from '@/hooks/useCourses';
import { BrandingSettings, useCourseBranding } from './CourseBrandingSettings';
import { supabase } from '@/integrations/supabase/client';

export type TemplateStyle = 'classico' | 'moderno' | 'minimalista';

interface AttendanceMap {
  [lessonId: string]: { [enrollmentId: string]: boolean };
}

interface CertificateTemplateProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  courseName: string;
  editionCode: string;
  startDate?: string;
  endDate?: string;
  location?: string;
  instructorName?: string;
  durationHours?: number | null;
  renewalMonths?: number | null;
  enrollment: CourseEnrollment;
  enrollments: CourseEnrollment[];
  lessons: CourseLesson[];
  attendanceMap: AttendanceMap;
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('it-IT');
}

function getBrandingData(branding: BrandingSettings | null, logoUrl: string | null) {
  if (!branding) return { logoHtml: '', name: 'SicurAzienda Connect', companyInfoHtml: '', footerHtml: 'SicurAzienda Connect - Gestione Corsi' };
  const logoHtml = logoUrl ? `<img src="${logoUrl}" style="height:60px;max-width:240px;object-fit:contain;" />` : '';
  const name = branding.company_name || 'SicurAzienda Connect';
  const details: string[] = [];
  if (branding.company_address) details.push(branding.company_address);
  if (branding.company_phone) details.push(`Tel: ${branding.company_phone}`);
  if (branding.company_email) details.push(branding.company_email);
  if (branding.company_pec) details.push(`PEC: ${branding.company_pec}`);
  if (branding.company_vat) details.push(`P.IVA: ${branding.company_vat}`);
  if (branding.company_fiscal_code) details.push(`C.F.: ${branding.company_fiscal_code}`);
  if (branding.company_website) details.push(branding.company_website);
  const companyInfoHtml = details.length > 0 ? details.join(' | ') : '';
  const footerHtml = branding.footer_text || `${name} - Gestione Corsi`;
  return { logoHtml, name, companyInfoHtml, footerHtml };
}

export function generateCertificateHTML(
  style: TemplateStyle,
  props: {
    courseName: string;
    editionCode: string;
    startDate?: string;
    endDate?: string;
    location?: string;
    instructorName?: string;
    durationHours?: number | null;
    enrollment: CourseEnrollment;
  },
  branding: BrandingSettings | null,
  logoUrl: string | null
): string {
  const brand = getBrandingData(branding, logoUrl);
  const empName = props.enrollment.employee
    ? `${props.enrollment.employee.first_name} ${props.enrollment.employee.last_name}`
    : 'N/D';
  const companyName = props.enrollment.contact?.name || props.enrollment.contact?.company || '';

  const detailsHtml = [
    props.durationHours ? `<div class="detail-item"><div class="detail-value">${props.durationHours} ore</div><div class="detail-label">Durata</div></div>` : '',
    props.startDate ? `<div class="detail-item"><div class="detail-value">${formatDate(props.startDate)}${props.endDate && props.endDate !== props.startDate ? ` - ${formatDate(props.endDate)}` : ''}</div><div class="detail-label">Periodo</div></div>` : '',
    props.location ? `<div class="detail-item"><div class="detail-value">${props.location}</div><div class="detail-label">Sede</div></div>` : '',
    props.enrollment.certificate_date ? `<div class="detail-item"><div class="detail-value">${formatDate(props.enrollment.certificate_date)}</div><div class="detail-label">Emissione</div></div>` : '',
    props.enrollment.certificate_expiry ? `<div class="detail-item"><div class="detail-value">${formatDate(props.enrollment.certificate_expiry)}</div><div class="detail-label">Scadenza</div></div>` : '',
  ].filter(Boolean).join('');

  if (style === 'classico') {
    return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Attestato - ${empName}</title>
<style>
@page { size: A4 landscape; margin: 0; }
body { font-family: 'Georgia', 'Times New Roman', serif; margin: 0; padding: 0; background: white; }
.certificate { width: 297mm; height: 210mm; position: relative; display: flex; flex-direction: column; align-items: center; justify-content: center; box-sizing: border-box; padding: 25mm 30mm; }
.border-frame { position: absolute; inset: 10mm; border: 3px solid #1e40af; border-radius: 4px; }
.border-inner { position: absolute; inset: 13mm; border: 1px solid #93b4f4; border-radius: 2px; }
.content { position: relative; z-index: 1; text-align: center; width: 100%; }
.org-logo { margin-bottom: 10px; }
.org-name { font-size: 14px; letter-spacing: 3px; color: #6b7280; text-transform: uppercase; margin-bottom: 10px; }
h1 { font-size: 36px; color: #1e40af; margin: 10px 0; letter-spacing: 2px; font-weight: 400; }
.subtitle { font-size: 14px; color: #374151; margin-bottom: 30px; }
.participant { font-size: 28px; color: #111827; font-weight: 700; border-bottom: 2px solid #1e40af; display: inline-block; padding-bottom: 5px; margin: 15px 0; }
.company { font-size: 16px; color: #4b5563; margin-bottom: 20px; }
.course-info { font-size: 14px; color: #374151; line-height: 1.8; margin: 20px 0; }
.course-name { font-size: 18px; font-weight: 700; color: #1e40af; }
.details { display: flex; justify-content: center; gap: 40px; margin: 20px 0; }
.detail-item { text-align: center; }
.detail-value { font-weight: 600; color: #374151; font-size: 13px; }
.detail-label { font-size: 11px; color: #6b7280; }
.signatures { display: flex; justify-content: space-between; width: 80%; margin: 40px auto 0; }
.sig-line { width: 180px; border-top: 1px solid #374151; margin-top: 40px; padding-top: 5px; font-size: 11px; color: #6b7280; text-align: center; }
.cert-footer { position: absolute; bottom: 15mm; left: 20mm; font-size: 9px; color: #9ca3af; max-width: 50%; }
.cert-id { position: absolute; bottom: 15mm; right: 20mm; font-size: 9px; color: #9ca3af; }
</style></head><body>
<div class="certificate">
  <div class="border-frame"></div><div class="border-inner"></div>
  <div class="content">
    ${brand.logoHtml ? `<div class="org-logo">${brand.logoHtml}</div>` : ''}
    <div class="org-name">${brand.name}</div>
    <h1>ATTESTATO DI FORMAZIONE</h1>
    <div class="subtitle">ai sensi del D.Lgs. 81/2008 e s.m.i.</div>
    <p style="font-size:14px;color:#4b5563;">Si attesta che</p>
    <div class="participant">${empName}</div>
    ${companyName ? `<div class="company">${companyName}</div>` : ''}
    <div class="course-info">ha frequentato con esito positivo il corso di formazione<br/><span class="course-name">${props.courseName}</span></div>
    <div class="details">${detailsHtml}</div>
    <div class="signatures">
      <div><div class="sig-line">${props.instructorName || 'Il Docente'}</div></div>
      <div><div class="sig-line">Il Responsabile</div></div>
    </div>
  </div>
  ${brand.footerHtml ? `<div class="cert-footer">${brand.footerHtml}</div>` : ''}
  <div class="cert-id">Cod. ${props.editionCode || 'N/D'} | ${new Date().toLocaleDateString('it-IT')}</div>
</div></body></html>`;
  }

  if (style === 'moderno') {
    return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Attestato - ${empName}</title>
<style>
@page { size: A4 landscape; margin: 0; }
body { font-family: 'Segoe UI', 'Helvetica Neue', Arial, sans-serif; margin: 0; padding: 0; background: white; }
.certificate { width: 297mm; height: 210mm; position: relative; display: flex; box-sizing: border-box; overflow: hidden; }
.sidebar { width: 80mm; background: linear-gradient(180deg, #1e40af 0%, #3b82f6 50%, #60a5fa 100%); display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 30mm 15mm; color: white; }
.sidebar .logo-area { margin-bottom: 20px; }
.sidebar .logo-area img { height: 50px; filter: brightness(0) invert(1); }
.sidebar .org-name { font-size: 16px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; text-align: center; margin-bottom: 15px; }
.sidebar .divider { width: 40px; height: 2px; background: rgba(255,255,255,0.5); margin: 15px 0; }
.sidebar .info-label { font-size: 10px; opacity: 0.8; text-transform: uppercase; letter-spacing: 1px; margin-top: 12px; }
.sidebar .info-value { font-size: 12px; font-weight: 600; text-align: center; }
.main-content { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 25mm 30mm; text-align: center; }
.badge { display: inline-block; background: #dbeafe; color: #1e40af; padding: 6px 20px; border-radius: 20px; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 15px; }
h1 { font-size: 32px; color: #111827; margin: 10px 0; font-weight: 300; }
h1 strong { font-weight: 700; }
.participant { font-size: 30px; color: #1e40af; font-weight: 700; margin: 20px 0 5px; }
.company { font-size: 14px; color: #6b7280; margin-bottom: 20px; }
.course-box { background: #f0f4ff; border-radius: 12px; padding: 15px 30px; margin: 15px 0; }
.course-box .label { font-size: 11px; color: #6b7280; text-transform: uppercase; letter-spacing: 1px; }
.course-box .value { font-size: 18px; font-weight: 700; color: #1e40af; margin-top: 4px; }
.details { display: flex; gap: 30px; margin: 20px 0; }
.detail-item { text-align: center; }
.detail-value { font-weight: 600; color: #374151; font-size: 13px; }
.detail-label { font-size: 10px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; }
.signatures { display: flex; justify-content: space-between; width: 100%; margin-top: 30px; }
.sig-line { width: 160px; border-top: 2px solid #e5e7eb; padding-top: 8px; font-size: 11px; color: #6b7280; text-align: center; }
.cert-id { position: absolute; bottom: 10mm; right: 15mm; font-size: 8px; color: #9ca3af; }
</style></head><body>
<div class="certificate">
  <div class="sidebar">
    ${brand.logoHtml ? `<div class="logo-area">${brand.logoHtml}</div>` : ''}
    <div class="org-name">${brand.name}</div>
    <div class="divider"></div>
    ${props.durationHours ? `<div class="info-label">Durata</div><div class="info-value">${props.durationHours} ore</div>` : ''}
    ${props.location ? `<div class="info-label">Sede</div><div class="info-value">${props.location}</div>` : ''}
    ${props.enrollment.certificate_date ? `<div class="info-label">Emissione</div><div class="info-value">${formatDate(props.enrollment.certificate_date)}</div>` : ''}
    ${props.enrollment.certificate_expiry ? `<div class="info-label">Scadenza</div><div class="info-value">${formatDate(props.enrollment.certificate_expiry)}</div>` : ''}
    <div class="divider"></div>
    <div style="font-size:9px;opacity:0.7;text-align:center;margin-top:10px;">${brand.companyInfoHtml || ''}</div>
  </div>
  <div class="main-content">
    <div class="badge">Attestato di Formazione</div>
    <h1><strong>CERTIFICATO</strong> DI COMPLETAMENTO</h1>
    <p style="font-size:14px;color:#6b7280;margin:5px 0 15px;">ai sensi del D.Lgs. 81/2008 e s.m.i.</p>
    <p style="font-size:13px;color:#6b7280;">Si attesta che</p>
    <div class="participant">${empName}</div>
    ${companyName ? `<div class="company">${companyName}</div>` : ''}
    <div class="course-box">
      <div class="label">Corso completato</div>
      <div class="value">${props.courseName}</div>
    </div>
    ${props.startDate ? `<p style="font-size:12px;color:#6b7280;">Periodo: ${formatDate(props.startDate)}${props.endDate && props.endDate !== props.startDate ? ` - ${formatDate(props.endDate)}` : ''}</p>` : ''}
    <div class="signatures">
      <div><div class="sig-line">${props.instructorName || 'Il Docente'}</div></div>
      <div><div class="sig-line">Il Responsabile</div></div>
    </div>
  </div>
  <div class="cert-id">Cod. ${props.editionCode || 'N/D'} | ${new Date().toLocaleDateString('it-IT')}</div>
</div></body></html>`;
  }

  // Minimalista
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Attestato - ${empName}</title>
<style>
@page { size: A4 landscape; margin: 0; }
body { font-family: 'Helvetica Neue', Arial, sans-serif; margin: 0; padding: 0; background: white; }
.certificate { width: 297mm; height: 210mm; position: relative; display: flex; flex-direction: column; align-items: center; justify-content: center; box-sizing: border-box; padding: 30mm 40mm; }
.top-line { position: absolute; top: 0; left: 0; right: 0; height: 4px; background: #111827; }
.content { text-align: center; width: 100%; }
.org-row { display: flex; align-items: center; justify-content: center; gap: 12px; margin-bottom: 30px; }
.org-row img { height: 40px; }
.org-name { font-size: 12px; letter-spacing: 4px; text-transform: uppercase; color: #6b7280; }
h1 { font-size: 28px; color: #111827; margin: 0 0 8px; font-weight: 300; letter-spacing: 6px; text-transform: uppercase; }
.line { width: 60px; height: 1px; background: #111827; margin: 20px auto; }
.participant { font-size: 32px; color: #111827; font-weight: 300; margin: 20px 0 8px; letter-spacing: 1px; }
.company { font-size: 13px; color: #9ca3af; margin-bottom: 25px; }
.course-name { font-size: 16px; color: #111827; font-weight: 600; margin: 15px 0 5px; }
.course-desc { font-size: 12px; color: #6b7280; line-height: 1.6; }
.details { display: flex; justify-content: center; gap: 50px; margin: 30px 0; }
.detail-item { text-align: center; }
.detail-value { font-size: 12px; font-weight: 600; color: #111827; }
.detail-label { font-size: 9px; color: #9ca3af; text-transform: uppercase; letter-spacing: 1px; margin-top: 2px; }
.signatures { display: flex; justify-content: space-between; width: 70%; margin: 40px auto 0; }
.sig-line { width: 150px; border-top: 1px solid #d1d5db; padding-top: 8px; font-size: 10px; color: #9ca3af; text-align: center; }
.footer-row { position: absolute; bottom: 12mm; left: 20mm; right: 20mm; display: flex; justify-content: space-between; font-size: 8px; color: #d1d5db; }
</style></head><body>
<div class="certificate">
  <div class="top-line"></div>
  <div class="content">
    <div class="org-row">
      ${brand.logoHtml ? brand.logoHtml.replace('height:60px', 'height:40px') : ''}
      <div class="org-name">${brand.name}</div>
    </div>
    <h1>Attestato</h1>
    <div class="line"></div>
    <p style="font-size:12px;color:#9ca3af;">Si certifica che</p>
    <div class="participant">${empName}</div>
    ${companyName ? `<div class="company">${companyName}</div>` : ''}
    <p style="font-size:12px;color:#6b7280;">ha completato con successo</p>
    <div class="course-name">${props.courseName}</div>
    <div class="course-desc">ai sensi del D.Lgs. 81/2008 e s.m.i.</div>
    <div class="details">${detailsHtml}</div>
    <div class="signatures">
      <div><div class="sig-line">${props.instructorName || 'Il Docente'}</div></div>
      <div><div class="sig-line">Il Responsabile</div></div>
    </div>
  </div>
  <div class="footer-row">
    <span>${brand.footerHtml || ''}</span>
    <span>Cod. ${props.editionCode || 'N/D'} | ${new Date().toLocaleDateString('it-IT')}</span>
  </div>
</div></body></html>`;
}

const TEMPLATES: { value: TemplateStyle; label: string; description: string }[] = [
  { value: 'classico', label: 'Classico', description: 'Bordo doppio, serif, stile tradizionale' },
  { value: 'moderno', label: 'Moderno', description: 'Sidebar a colori, sans-serif, layout contemporaneo' },
  { value: 'minimalista', label: 'Minimalista', description: 'Essenziale, linee pulite, tipografia leggera' },
];

export default function CertificateTemplateDialog(props: CertificateTemplateProps) {
  const { open, onOpenChange, enrollment } = props;
  const { branding, logoUrl } = useCourseBranding();
  const { toast } = useToast();
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateStyle>('classico');
  const [sendEmail, setSendEmail] = useState(false);
  const [emailAddress, setEmailAddress] = useState('');
  const [sending, setSending] = useState(false);

  // Pre-fill email from employee or contact
  const empEmail = enrollment.employee ? '' : '';
  const contactEmail = enrollment.contact ? '' : '';
  const defaultEmail = empEmail || contactEmail || '';

  const certProps = {
    courseName: props.courseName,
    editionCode: props.editionCode,
    startDate: props.startDate,
    endDate: props.endDate,
    location: props.location,
    instructorName: props.instructorName,
    durationHours: props.durationHours,
    enrollment: props.enrollment,
  };

  const handlePrint = () => {
    const html = generateCertificateHTML(selectedTemplate, certProps, branding, logoUrl);
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(html);
    win.document.close();
    win.onload = () => win.print();
  };

  const handleSendEmail = async () => {
    if (!emailAddress || !emailAddress.includes('@')) {
      toast({ title: 'Inserisci un indirizzo email valido', variant: 'destructive' });
      return;
    }
    setSending(true);
    try {
      const html = generateCertificateHTML(selectedTemplate, certProps, branding, logoUrl);
      const empName = enrollment.employee
        ? `${enrollment.employee.first_name} ${enrollment.employee.last_name}`
        : 'Partecipante';

      const { data, error } = await supabase.functions.invoke('send-certificate-email', {
        body: {
          to: emailAddress,
          participantName: empName,
          courseName: props.courseName,
          certificateHtml: html,
          companyName: branding?.company_name || 'SicurAzienda Connect',
        },
      });

      if (error) throw error;
      toast({ title: 'Email inviata', description: `Attestato inviato a ${emailAddress}` });
      onOpenChange(false);
    } catch (err: any) {
      toast({ title: 'Errore invio email', description: err.message, variant: 'destructive' });
    } finally {
      setSending(false);
    }
  };

  // Live preview HTML (scaled down)
  const previewHtml = generateCertificateHTML(selectedTemplate, certProps, branding, logoUrl);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Award className="h-5 w-5" /> Genera Attestato
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Template selection */}
          <div className="space-y-4">
            <Label className="text-sm font-semibold">Scegli Template</Label>
            <div className="space-y-2">
              {TEMPLATES.map(t => (
                <Card
                  key={t.value}
                  className={`cursor-pointer transition-all ${selectedTemplate === t.value ? 'ring-2 ring-primary shadow-md' : 'hover:shadow-sm'}`}
                  onClick={() => setSelectedTemplate(t.value)}
                >
                  <CardContent className="p-3 flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full border-2 ${selectedTemplate === t.value ? 'bg-primary border-primary' : 'border-muted-foreground'}`} />
                    <div>
                      <p className="font-medium text-sm">{t.label}</p>
                      <p className="text-xs text-muted-foreground">{t.description}</p>
                    </div>
                    {selectedTemplate === t.value && <Badge className="ml-auto" variant="secondary">Selezionato</Badge>}
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Email option */}
            <div className="space-y-3 pt-2 border-t">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold">Invia via Email</Label>
                <Switch checked={sendEmail} onCheckedChange={setSendEmail} />
              </div>
              {sendEmail && (
                <div className="space-y-2">
                  <Label className="text-xs">Indirizzo email destinatario</Label>
                  <Input
                    type="email"
                    placeholder="email@esempio.it"
                    value={emailAddress}
                    onChange={e => setEmailAddress(e.target.value)}
                  />
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-2">
              <Button onClick={handlePrint} className="flex-1 gap-1.5">
                <Printer className="h-4 w-4" /> Stampa PDF
              </Button>
              {sendEmail && (
                <Button onClick={handleSendEmail} disabled={sending} variant="secondary" className="flex-1 gap-1.5">
                  <Send className="h-4 w-4" /> {sending ? 'Invio...' : 'Invia Email'}
                </Button>
              )}
            </div>
          </div>

          {/* Live Preview */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold flex items-center gap-1.5">
              <Eye className="h-4 w-4" /> Anteprima in tempo reale
            </Label>
            <div className="border rounded-lg overflow-hidden bg-muted/30" style={{ aspectRatio: '297/210' }}>
              <iframe
                srcDoc={previewHtml}
                className="w-full h-full border-0"
                style={{ transform: 'scale(1)', transformOrigin: 'top left' }}
                title="Anteprima attestato"
                sandbox="allow-same-origin"
              />
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
