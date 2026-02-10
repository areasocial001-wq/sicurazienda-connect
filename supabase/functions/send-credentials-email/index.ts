import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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
    const { email, password, fullName, companyName, loginUrl }: SendCredentialsRequest = await req.json();

    if (!email || !password) {
      return new Response(
        JSON.stringify({ error: "Email e password sono obbligatorie" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const appUrl = loginUrl || "https://sicurazienda-connect.lovable.app/auth";
    const greeting = fullName ? `Gentile ${fullName}` : "Gentile Cliente";
    const companyLine = companyName ? `<p>Azienda: <strong>${companyName}</strong></p>` : "";

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
                <p>📧 <strong>Email:</strong> ${email}</p>
                <p>🔑 <strong>Password:</strong> ${password}</p>
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
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
