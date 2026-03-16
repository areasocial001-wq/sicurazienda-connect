import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate JWT
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Non autorizzato' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { to, participantName, courseName, certificateHtml, companyName } = await req.json();

    if (!to || !participantName || !courseName || !certificateHtml) {
      return new Response(JSON.stringify({ error: 'Parametri mancanti' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(to)) {
      return new Response(JSON.stringify({ error: 'Email non valida' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
    if (!RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY non configurata');
    }

    const safeName = escapeHtml(participantName);
    const safeCourse = escapeHtml(courseName);
    const safeCompany = escapeHtml(companyName || 'SicurAzienda Connect');

    const emailHtml = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: 'Segoe UI', Arial, sans-serif; background: #f5f5f5; padding: 20px;">
  <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
    <div style="background: linear-gradient(135deg, #1e40af, #3b82f6); padding: 30px; text-align: center; color: white;">
      <h1 style="margin: 0; font-size: 24px;">🎓 Attestato di Formazione</h1>
      <p style="margin: 8px 0 0; opacity: 0.9; font-size: 14px;">${safeCompany}</p>
    </div>
    <div style="padding: 30px;">
      <p style="font-size: 16px; color: #374151;">Gentile <strong>${safeName}</strong>,</p>
      <p style="font-size: 14px; color: #6b7280; line-height: 1.6;">
        siamo lieti di comunicarLe che il Suo attestato di formazione per il corso 
        <strong style="color: #1e40af;">${safeCourse}</strong> è stato emesso con successo.
      </p>
      <div style="background: #f0f4ff; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center;">
        <p style="font-size: 13px; color: #6b7280; margin: 0 0 5px;">Corso completato</p>
        <p style="font-size: 18px; font-weight: 700; color: #1e40af; margin: 0;">${safeCourse}</p>
      </div>
      <p style="font-size: 14px; color: #6b7280; line-height: 1.6;">
        In allegato troverà il Suo attestato in formato PDF. La preghiamo di conservarlo per i Suoi archivi.
      </p>
      <p style="font-size: 14px; color: #6b7280; margin-top: 20px;">
        Cordiali saluti,<br/>
        <strong>${safeCompany}</strong>
      </p>
    </div>
    <div style="background: #f9fafb; padding: 15px; text-align: center; border-top: 1px solid #e5e7eb;">
      <p style="font-size: 11px; color: #9ca3af; margin: 0;">
        Questo è un messaggio automatico generato da ${safeCompany} - Gestione Corsi
      </p>
    </div>
  </div>
</body>
</html>`;

    // Send email with Resend - certificate HTML as attachment
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'noreply@sicurazienda.com',
        to: [to],
        subject: `Attestato di Formazione - ${courseName}`,
        html: emailHtml,
        attachments: [
          {
            filename: `Attestato_${participantName.replace(/\s+/g, '_')}.html`,
            content: btoa(unescape(encodeURIComponent(certificateHtml))),
          },
        ],
      }),
    });

    if (!res.ok) {
      const errorData = await res.text();
      throw new Error(`Resend error: ${res.status} - ${errorData}`);
    }

    const result = await res.json();

    return new Response(JSON.stringify({ success: true, id: result.id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error sending certificate email:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
