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

// HTML escape function to prevent XSS
function escapeHtml(text: string | undefined | null): string {
  if (!text) return '';
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, m => map[m]);
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const contactData: ContactRequest = await req.json();
    console.log("Received contact data for:", contactData.email);

    // Validate required fields
    if (!contactData.name || !contactData.email || !contactData.serviceType || !contactData.userType) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(contactData.email)) {
      return new Response(
        JSON.stringify({ error: "Invalid email format" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Validate field lengths to prevent abuse
    if (contactData.name.length > 100 || 
        contactData.email.length > 255 || 
        (contactData.phone && contactData.phone.length > 30) ||
        (contactData.company && contactData.company.length > 200) ||
        (contactData.message && contactData.message.length > 5000) ||
        contactData.serviceType.length > 100 ||
        contactData.userType.length > 50) {
      return new Response(
        JSON.stringify({ error: "Field length exceeds maximum allowed" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Escape all user input to prevent XSS in email
    const safeName = escapeHtml(contactData.name);
    const safeEmail = escapeHtml(contactData.email);
    const safePhone = escapeHtml(contactData.phone);
    const safeCompany = escapeHtml(contactData.company);
    const safeMessage = escapeHtml(contactData.message);
    const safeServiceType = escapeHtml(contactData.serviceType);
    const safeUserType = contactData.userType === 'new_client' ? 'Nuovo Cliente' : 'Cliente Esistente';

    const emailHtml = `
      <h2>Nuova richiesta di contatto</h2>
      <p><strong>Tipo utente:</strong> ${safeUserType}</p>
      <p><strong>Servizio:</strong> ${safeServiceType}</p>
      <p><strong>Nome:</strong> ${safeName}</p>
      <p><strong>Email:</strong> ${safeEmail}</p>
      ${safePhone ? `<p><strong>Telefono:</strong> ${safePhone}</p>` : ''}
      ${safeCompany ? `<p><strong>Azienda:</strong> ${safeCompany}</p>` : ''}
      ${safeMessage ? `<p><strong>Messaggio:</strong><br>${safeMessage.replace(/\n/g, '<br>')}</p>` : ''}
      <p><strong>Data richiesta:</strong> ${new Date().toLocaleString('it-IT')}</p>
    `;

    console.log("Attempting to send email to gestioneappuntamenti@sicurazienda.com");
    const emailResponse = await resend.emails.send({
      from: "SicurAzienda <noreply@sicurazienda.com>",
      to: ["gestioneappuntamenti@sicurazienda.com"],
      subject: `Nuova richiesta: ${safeServiceType} - ${safeName}`,
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
