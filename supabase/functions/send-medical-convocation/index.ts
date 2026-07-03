import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function escapeHtml(s: string): string {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return new Response(JSON.stringify({ error: 'Non autorizzato' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: userData } = await userClient.auth.getUser();
    const user = userData?.user;
    if (!user) return new Response(JSON.stringify({ error: 'Non autenticato' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const body = await req.json();
    const { convocation_id } = body || {};
    if (!convocation_id) return new Response(JSON.stringify({ error: 'convocation_id mancante' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const admin = createClient(supabaseUrl, serviceKey);
    const { data: conv, error: convErr } = await admin.from('medical_convocations').select('*').eq('id', convocation_id).maybeSingle();
    if (convErr || !conv) return new Response(JSON.stringify({ error: 'Convocazione non trovata' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const to = (conv.recipient_email || '').trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(to)) return new Response(JSON.stringify({ error: 'Email destinatario non valida' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
    if (!RESEND_API_KEY) return new Response(JSON.stringify({ error: 'RESEND_API_KEY non configurata' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const subject = conv.subject || 'Convocazione visita medica di sorveglianza sanitaria';
    const html = conv.body_html || `<p>Gentile lavoratore,</p><p>si comunica la convocazione per la visita medica di sorveglianza sanitaria prevista per il ${escapeHtml(conv.scheduled_date || '')}.</p>`;

    const resendResp = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${RESEND_API_KEY}` },
      body: JSON.stringify({
        from: 'SicurAzienda - Medicina del Lavoro <noreply@sicurazienda.com>',
        to: [to],
        subject,
        html,
      }),
    });

    const resendJson = await resendResp.json().catch(() => ({}));

    if (!resendResp.ok) {
      await admin.from('medical_convocations').update({
        status: 'failed',
        error_message: resendJson?.message || `HTTP ${resendResp.status}`,
      }).eq('id', convocation_id);
      return new Response(JSON.stringify({ error: 'Invio fallito', details: resendJson }), { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const nowIso = new Date().toISOString();
    await admin.from('medical_convocations').update({
      status: 'sent',
      sent_at: nowIso,
      sent_channel: 'email',
      error_message: null,
    }).eq('id', convocation_id);

    if (conv.visit_id) {
      await admin.from('medical_visits').update({
        convocation_id: convocation_id,
        convocation_sent_at: nowIso,
      }).eq('id', conv.visit_id);
    }

    return new Response(JSON.stringify({ ok: true, id: resendJson?.id }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    console.error('[send-medical-convocation]', e);
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});