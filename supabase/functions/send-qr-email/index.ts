import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface SendQREmailRequest {
  recipientEmail: string;
  documentName: string;
  downloadUrl: string;
  qrCodeBase64: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { recipientEmail, documentName, downloadUrl, qrCodeBase64 }: SendQREmailRequest = await req.json();

    console.log("Sending QR code email to:", recipientEmail);
    console.log("Document name:", documentName);

    const emailResponse = await resend.emails.send({
      from: "SicurAzienda <onboarding@resend.dev>",
      to: [recipientEmail],
      subject: `QR Code per il download: ${documentName}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #FFC107, #DC3545); padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .header h1 { color: white; margin: 0; font-size: 24px; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
            .qr-container { text-align: center; margin: 20px 0; padding: 20px; background: white; border-radius: 8px; }
            .qr-code { max-width: 200px; height: auto; }
            .btn { display: inline-block; background: #DC3545; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; margin-top: 15px; }
            .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>SicurAzienda</h1>
            </div>
            <div class="content">
              <h2>Il tuo documento è pronto per il download</h2>
              <p>Ti è stato inviato un QR Code per scaricare il seguente documento:</p>
              <p><strong>${documentName}</strong></p>
              
              <div class="qr-container">
                <p>Scansiona questo QR Code con il tuo smartphone:</p>
                <img src="${qrCodeBase64}" alt="QR Code" class="qr-code" />
              </div>
              
              <p>Oppure clicca sul pulsante qui sotto:</p>
              <p style="text-align: center;">
                <a href="${downloadUrl}" class="btn">Scarica Documento</a>
              </p>
              
              <div class="footer">
                <p>Questo link è permanente e funzionerà finché il documento sarà disponibile.</p>
                <p>© SicurAzienda - L'azione di tanti per la sicurezza di tutti</p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true, data: emailResponse }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-qr-email function:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
