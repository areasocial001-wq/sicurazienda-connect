import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const areaLabels: Record<string, string> = {
  contabilita: 'Contabilità',
  area_tecnica: 'Area Tecnica',
  gestione_corsi: 'Gestione Corsi',
  admin: 'Amministrazione',
};

interface ExpiringDocument {
  id: string;
  name: string;
  expiry_date: string;
  area: string;
  contact_id: string;
  contact_name: string;
  contact_email: string | null;
  client_user_id: string | null;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get documents expiring in the next 30 days
    const today = new Date();
    const thirtyDaysLater = new Date(today);
    thirtyDaysLater.setDate(thirtyDaysLater.getDate() + 30);

    const { data: expiringDocs, error: docsError } = await supabase
      .from('crm_client_documents')
      .select(`
        id,
        name,
        expiry_date,
        area,
        contact_id,
        crm_contacts!inner(name, email, client_user_id)
      `)
      .not('expiry_date', 'is', null)
      .gte('expiry_date', today.toISOString().split('T')[0])
      .lte('expiry_date', thirtyDaysLater.toISOString().split('T')[0])
      .order('expiry_date', { ascending: true });

    if (docsError) {
      console.error("Error fetching expiring documents:", docsError);
      throw docsError;
    }

    console.log(`Found ${expiringDocs?.length || 0} documents expiring in next 30 days`);

    if (!expiringDocs || expiringDocs.length === 0) {
      return new Response(JSON.stringify({ message: "No expiring documents found" }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Group documents by contact
    const docsByContact: Record<string, {
      contactName: string;
      contactEmail: string | null;
      clientUserId: string | null;
      documents: Array<{ name: string; expiryDate: string; area: string; daysUntilExpiry: number }>;
    }> = {};

    for (const doc of expiringDocs) {
      const contact = (doc as any).crm_contacts;
      const contactId = doc.contact_id;
      
      if (!docsByContact[contactId]) {
        docsByContact[contactId] = {
          contactName: contact.name,
          contactEmail: contact.email,
          clientUserId: contact.client_user_id,
          documents: []
        };
      }

      const expiryDate = new Date(doc.expiry_date);
      const daysUntilExpiry = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

      docsByContact[contactId].documents.push({
        name: doc.name,
        expiryDate: doc.expiry_date,
        area: doc.area,
        daysUntilExpiry
      });
    }

    let emailsSent = 0;
    const errors: string[] = [];

    // Send notifications per contact
    for (const [contactId, contactData] of Object.entries(docsByContact)) {
      let recipientEmail = contactData.contactEmail;
      
      // Try to get linked user email
      if (contactData.clientUserId) {
        const { data: authUser } = await supabase.auth.admin.getUserById(contactData.clientUserId);
        if (authUser?.user?.email) {
          recipientEmail = authUser.user.email;
        }
      }

      if (!recipientEmail) {
        console.log(`No email for contact ${contactId}, skipping`);
        continue;
      }

      // Build documents list HTML
      const docsListHtml = contactData.documents.map(doc => {
        const urgencyColor = doc.daysUntilExpiry <= 7 ? '#dc2626' : doc.daysUntilExpiry <= 14 ? '#f59e0b' : '#16a34a';
        const urgencyLabel = doc.daysUntilExpiry <= 7 ? '⚠️ URGENTE' : doc.daysUntilExpiry <= 14 ? '⏰ Prossima scadenza' : '📅 In scadenza';
        
        return `
          <tr>
            <td style="padding: 12px; border-bottom: 1px solid #e2e8f0;">
              <strong>${doc.name}</strong><br>
              <span style="color: #64748b; font-size: 12px;">${areaLabels[doc.area] || doc.area}</span>
            </td>
            <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; text-align: center;">
              ${new Date(doc.expiryDate).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' })}
            </td>
            <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; text-align: right;">
              <span style="color: ${urgencyColor}; font-weight: bold;">
                ${urgencyLabel}<br>
                <span style="font-size: 11px;">${doc.daysUntilExpiry} giorni</span>
              </span>
            </td>
          </tr>
        `;
      }).join('');

      const emailHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 650px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #dc2626, #f59e0b); color: white; padding: 25px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f8fafc; padding: 30px; border-radius: 0 0 8px 8px; }
            table { width: 100%; border-collapse: collapse; background: white; border-radius: 8px; overflow: hidden; }
            th { background: #1e40af; color: white; padding: 12px; text-align: left; }
            .footer { text-align: center; margin-top: 30px; color: #64748b; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>📋 Promemoria Scadenze Documenti</h1>
            </div>
            <div class="content">
              <p>Gentile <strong>${contactData.contactName}</strong>,</p>
              <p>Ti informiamo che i seguenti documenti nel tuo cassetto sono in scadenza:</p>
              
              <table>
                <thead>
                  <tr>
                    <th>Documento</th>
                    <th style="text-align: center;">Scadenza</th>
                    <th style="text-align: right;">Stato</th>
                  </tr>
                </thead>
                <tbody>
                  ${docsListHtml}
                </tbody>
              </table>

              <p style="margin-top: 20px;">
                <strong>Cosa fare?</strong><br>
                Ti consigliamo di verificare e rinnovare i documenti prima della loro scadenza per garantire 
                la continuità delle tue certificazioni e adempimenti.
              </p>

              <div class="footer">
                <p>Questa è un'email automatica inviata da SicurAzienda.</p>
                <p>© ${new Date().getFullYear()} SicurAzienda - Tutti i diritti riservati</p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `;

      try {
        const emailResponse = await resend.emails.send({
          from: "SicurAzienda <noreply@sicurazienda.com>",
          to: [recipientEmail],
          subject: `⚠️ ${contactData.documents.length} documenti in scadenza - Promemoria`,
          html: emailHtml,
        });

        if (emailResponse.error) {
          errors.push(`${recipientEmail}: ${emailResponse.error.message}`);
        } else {
          emailsSent++;
          console.log(`Sent expiry reminder to ${recipientEmail}`);
        }
      } catch (emailError: any) {
        errors.push(`${recipientEmail}: ${emailError.message}`);
      }
    }

    return new Response(JSON.stringify({ 
      success: true, 
      emailsSent,
      totalContacts: Object.keys(docsByContact).length,
      errors: errors.length > 0 ? errors : undefined
    }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error checking document expiries:", error);
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
