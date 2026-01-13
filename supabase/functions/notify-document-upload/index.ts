import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface NotifyDocumentRequest {
  contactId: string;
  documentName: string;
  area: string;
  uploaderName?: string;
}

const areaLabels: Record<string, string> = {
  contabilita: 'Contabilità',
  area_tecnica: 'Area Tecnica',
  gestione_corsi: 'Gestione Corsi',
  admin: 'Amministrazione',
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { contactId, documentName, area, uploaderName }: NotifyDocumentRequest = await req.json();

    // Get contact info including linked user email
    const { data: contact, error: contactError } = await supabase
      .from('crm_contacts')
      .select('name, email, company, client_user_id')
      .eq('id', contactId)
      .single();

    if (contactError || !contact) {
      console.log("Contact not found:", contactId);
      return new Response(JSON.stringify({ message: "Contact not found" }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Try to get the linked user's email if available
    let recipientEmail = contact.email;
    
    if (contact.client_user_id) {
      const { data: authUser } = await supabase.auth.admin.getUserById(contact.client_user_id);
      if (authUser?.user?.email) {
        recipientEmail = authUser.user.email;
      }
    }

    if (!recipientEmail) {
      console.log("No email available for contact:", contactId);
      return new Response(JSON.stringify({ message: "No email available" }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const areaLabel = areaLabels[area] || area;

    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #1e40af; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f8fafc; padding: 30px; border-radius: 0 0 8px 8px; }
          .document-info { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #1e40af; }
          .button { display: inline-block; background: #1e40af; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 20px; }
          .footer { text-align: center; margin-top: 30px; color: #64748b; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📄 Nuovo Documento Disponibile</h1>
          </div>
          <div class="content">
            <p>Gentile <strong>${contact.name}</strong>,</p>
            <p>È stato caricato un nuovo documento nel tuo cassetto documenti.</p>
            
            <div class="document-info">
              <p><strong>📁 Nome documento:</strong> ${documentName}</p>
              <p><strong>🏷️ Area:</strong> ${areaLabel}</p>
              ${uploaderName ? `<p><strong>👤 Caricato da:</strong> ${uploaderName}</p>` : ''}
              <p><strong>📅 Data:</strong> ${new Date().toLocaleDateString('it-IT', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}</p>
            </div>

            <p>Accedi alla piattaforma per visualizzare e scaricare il documento.</p>
            
            <div class="footer">
              <p>Questa è un'email automatica inviata da SicurAzienda.</p>
              <p>© ${new Date().getFullYear()} SicurAzienda - Tutti i diritti riservati</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    console.log("Sending document notification to:", recipientEmail);
    
    const emailResponse = await resend.emails.send({
      from: "SicurAzienda <noreply@sicurazienda.com>",
      to: [recipientEmail],
      subject: `Nuovo documento: ${documentName}`,
      html: emailHtml,
    });

    console.log("Email response:", emailResponse);

    if (emailResponse.error) {
      console.error("Resend error:", emailResponse.error);
      throw new Error(emailResponse.error.message);
    }

    return new Response(JSON.stringify({ success: true, emailId: emailResponse.data?.id }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error sending notification:", error);
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
