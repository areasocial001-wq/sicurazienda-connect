import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

interface SendCredentialsRequest {
  email: string;
  password: string;
  fullName?: string;
  companyName?: string;
  loginUrl?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate authentication
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Autenticazione richiesta" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });

    const { data, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !data?.claims) {
      return new Response(
        JSON.stringify({ error: "Token non valido" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check that user has an appropriate role (not just any user)
    const supabaseAdmin = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const userId = data.claims.sub as string;
    const { data: roleData } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .single();

    const allowedRoles = ["admin", "contabilita", "area_tecnica", "gestione_corsi", "consulenti_tecnici", "medicina"];
    if (!roleData || !allowedRoles.includes(roleData.role)) {
      return new Response(
        JSON.stringify({ error: "Permessi insufficienti" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { email, password, fullName, companyName, loginUrl }: SendCredentialsRequest = await req.json();

    if (!email || !password) {
      return new Response(
        JSON.stringify({ error: "Email e password sono obbligatorie" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return new Response(
        JSON.stringify({ error: "Formato email non valido" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const appUrl = loginUrl || "https://sicurazienda-connect.lovable.app/auth";
    const safeFullName = fullName ? escapeHtml(fullName) : null;
    const safeCompanyName = companyName ? escapeHtml(companyName) : null;
    const safeEmail = escapeHtml(email);
    const safePassword = escapeHtml(password);
    
    const greeting = safeFullName ? `Gentile ${safeFullName}` : "Gentile Cliente";
    const companyLine = safeCompanyName ? `<p>Azienda: <strong>${safeCompanyName}</strong></p>` : "";

    const emailResponse = await resend.emails.send({
      from: "SicurAzienda <noreply@sicurazienda.com>",
      to: [email],
      subject: "Le tue credenziali di accesso - SicurAzienda",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #1a365d; color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .header h1 { margin: 0; font-size: 24px; }
            .content { background: #f8f9fa; padding: 30px; border: 1px solid #e2e8f0; }
            .credentials { background: white; border: 2px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 20px 0; }
            .credentials p { margin: 8px 0; }
            .credentials strong { color: #1a365d; }
            .btn { display: inline-block; background: #2563eb; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 20px 0; }
            .footer { text-align: center; padding: 20px; color: #718096; font-size: 12px; }
            .warning { background: #fef3c7; border: 1px solid #f59e0b; border-radius: 6px; padding: 12px; margin-top: 20px; font-size: 13px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>SicurAzienda</h1>
              <p style="margin: 5px 0 0;">Portale Documenti</p>
            </div>
            <div class="content">
              <p>${greeting},</p>
              <p>è stato creato il tuo account per accedere al portale documenti di SicurAzienda. 
              Di seguito trovi le tue credenziali di accesso:</p>
              ${companyLine}
              <div class="credentials">
                <p>📧 <strong>Email:</strong> ${safeEmail}</p>
                <p>🔑 <strong>Password:</strong> ${safePassword}</p>
              </div>
              <p style="text-align: center;">
                <a href="${appUrl}" class="btn">Accedi al Portale</a>
              </p>
              <div class="warning">
                ⚠️ <strong>Importante:</strong> Ti consigliamo di cambiare la password al primo accesso 
                per motivi di sicurezza.
              </div>
            </div>
            <div class="footer">
              <p>Questa email è stata inviata automaticamente da SicurAzienda.<br>
              Per assistenza, contatta il tuo referente aziendale.</p>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    console.log("Credentials email sent successfully:", emailResponse);

    return new Response(
      JSON.stringify({ success: true, message: "Email inviata con successo" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error sending credentials email:", error);
    return new Response(
      JSON.stringify({ error: "Errore nell'invio dell'email" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
