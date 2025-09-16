import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface ContactRequest {
  name: string;
  email: string;
  phone?: string;
  company?: string;
  message?: string;
  serviceType: string;
  userType: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const contactData: ContactRequest = await req.json();
    console.log("Received contact data:", contactData);

    const emailHtml = `
      <h2>Nuova richiesta di contatto</h2>
      <p><strong>Tipo utente:</strong> ${contactData.userType === 'new_client' ? 'Nuovo Cliente' : 'Cliente Esistente'}</p>
      <p><strong>Servizio:</strong> ${contactData.serviceType}</p>
      <p><strong>Nome:</strong> ${contactData.name}</p>
      <p><strong>Email:</strong> ${contactData.email}</p>
      ${contactData.phone ? `<p><strong>Telefono:</strong> ${contactData.phone}</p>` : ''}
      ${contactData.company ? `<p><strong>Azienda:</strong> ${contactData.company}</p>` : ''}
      ${contactData.message ? `<p><strong>Messaggio:</strong><br>${contactData.message}</p>` : ''}
      <p><strong>Data richiesta:</strong> ${new Date().toLocaleString('it-IT')}</p>
    `;

    console.log("Attempting to send email to gestioneappuntamenti@sicurazienda.com");
    const emailResponse = await resend.emails.send({
      from: "SicurAzienda <noreply@sicurazienda.com>",
      to: ["gestioneappuntamenti@sicurazienda.com"],
      subject: `Nuova richiesta: ${contactData.serviceType} - ${contactData.name}`,
      html: emailHtml,
    });

    console.log("Resend response:", emailResponse);

    if (emailResponse.error) {
      console.error("Resend error:", emailResponse.error);
      throw new Error(`Resend error: ${emailResponse.error.message}`);
    }

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Errore nell'invio email:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);