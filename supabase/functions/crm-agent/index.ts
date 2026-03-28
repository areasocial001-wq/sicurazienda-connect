import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const CRM_AGENT_PROMPT = `Sei un assistente CRM intelligente per SicurAzienda.

AZIONI DISPONIBILI:
1. analyze_contact: Analizza un contatto e suggerisci azioni
2. suggest_followup: Suggerisci quando e come fare follow-up
3. categorize_lead: Categorizza un lead (lead, prospect, client)
4. generate_email: Genera una bozza email per un contatto
5. summarize_interactions: Riassumi le interazioni con un contatto

Rispondi SEMPRE con JSON valido nel formato:
{
  "action": "nome_azione",
  "result": {
    // dati specifici per l'azione
  },
  "suggestions": ["suggerimento1", "suggerimento2"],
  "next_steps": ["passo1", "passo2"]
}`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate authentication
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ success: false, error: "Autenticazione richiesta" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const userClient = createClient(SUPABASE_URL, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });

    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(
        JSON.stringify({ success: false, error: "Token non valido" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Use the authenticated user's ID instead of trusting client-supplied userId
    const authenticatedUserId = claimsData.claims.sub as string;

    const body = await req.json();
    const { action, data } = body;

    // Validate action
    const validActions = ['analyze_contact', 'suggest_followup', 'categorize_lead', 'generate_email', 'summarize_interactions', 'check_reminders', 'extract_contact', 'cleanup_data'];
    if (!action || typeof action !== 'string' || !validActions.includes(action)) {
      return new Response(
        JSON.stringify({ success: false, error: "Azione non valida" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate request body size (limit to 2MB)
    const bodyStr = JSON.stringify(body);
    if (bodyStr.length > 2000000) {
      return new Response(
        JSON.stringify({ success: false, error: "Richiesta troppo grande (max 2MB)" }),
        { status: 413, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY!);

    let userMessage = "";
    let additionalContext = "";
    let systemPrompt = CRM_AGENT_PROMPT;

    // Fetch relevant data based on action — always use authenticatedUserId
    if (action === "analyze_contact" && data.contactId) {
      const { data: contact } = await supabase
        .from("crm_contacts")
        .select("*")
        .eq("id", data.contactId)
        .eq("user_id", authenticatedUserId)
        .single();
      
      if (!contact) {
        return new Response(JSON.stringify({ success: false, error: "Contatto non trovato" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: interactions } = await supabase
        .from("crm_interactions")
        .select("*")
        .eq("contact_id", data.contactId)
        .order("created_at", { ascending: false })
        .limit(10);

      additionalContext = `
Contatto: ${JSON.stringify(contact)}
Ultime interazioni: ${JSON.stringify(interactions)}`;
      
      userMessage = `Analizza questo contatto e suggerisci le prossime azioni da intraprendere.${additionalContext}`;
    } 
    else if (action === "suggest_followup") {
      const { data: contacts } = await supabase
        .from("crm_contacts")
        .select("*")
        .eq("user_id", authenticatedUserId)
        .order("last_contact_at", { ascending: true })
        .limit(20);

      userMessage = `Analizza questi contatti e suggerisci chi contattare e quando:
${JSON.stringify(contacts)}

Per ogni contatto suggerisci:
- Priorità (alta/media/bassa)
- Motivo del follow-up
- Canale consigliato (telefono/email/meeting)
- Messaggio suggerito`;
    }
    else if (action === "categorize_lead" && data.contact) {
      userMessage = `Categorizza questo lead basandoti sulle informazioni disponibili:
${JSON.stringify(data.contact)}

Determina:
- Status suggerito (lead/prospect/client)
- Probabilità di conversione (0-100%)
- Servizi di interesse potenziale
- Valore stimato`;
    }
    else if (action === "generate_email" && data.contact) {
      userMessage = `Genera una bozza email professionale per questo contatto:
${JSON.stringify(data.contact)}

Tipo di email: ${data.emailType || 'follow-up'}
Contesto: ${data.context || 'follow-up generale'}

L'email deve essere in italiano, professionale ma cordiale.`;
    }
    else if (action === "summarize_interactions" && data.contactId) {
      const { data: interactions } = await supabase
        .from("crm_interactions")
        .select("*")
        .eq("contact_id", data.contactId)
        .order("created_at", { ascending: false });

      userMessage = `Riassumi le seguenti interazioni con il cliente:
${JSON.stringify(interactions)}

Fornisci:
- Riassunto generale della relazione
- Temi principali discussi
- Problemi o richieste pendenti
- Stato attuale della relazione`;
    }
    else if (action === "check_reminders") {
      const { data: reminders } = await supabase
        .from("reminders")
        .select("*")
        .eq("user_id", authenticatedUserId)
        .eq("is_completed", false)
        .lte("due_date", new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString())
        .order("due_date", { ascending: true });

      const { data: expiringDocs } = await supabase
        .from("documents")
        .select("*")
        .eq("user_id", authenticatedUserId)
        .not("expiry_date", "is", null)
        .lte("expiry_date", new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString())
        .order("expiry_date", { ascending: true });

      userMessage = `Analizza questi promemoria e scadenze e suggerisci priorità:
Promemoria: ${JSON.stringify(reminders)}
Documenti in scadenza: ${JSON.stringify(expiringDocs)}

Per ogni item fornisci:
- Urgenza (critica/alta/media/bassa)
- Azione consigliata
- Tempo stimato per completare`;
    }
    else if (action === "extract_contact" && data.text) {
      systemPrompt = `Sei un assistente per l'estrazione di dati di contatto da testi non strutturati (email, biglietti da visita, note).

Estrai TUTTI i dati di contatto trovati nel testo e rispondi SOLO con un JSON valido con questi campi (usa null se non trovato):
{
  "name": "Nome e Cognome",
  "email": "email@esempio.it",
  "phone": "+39 xxx",
  "company": "Nome Azienda",
  "role": "Ruolo/Posizione",
  "address": "Indirizzo completo",
  "website": "https://...",
  "vat_number": "P.IVA",
  "fiscal_code": "Codice Fiscale",
  "pec": "email PEC",
  "sdi_code": "Codice SDI",
  "notes": "Altre info rilevanti non mappabili"
}`;
      userMessage = `Estrai i dati di contatto dal seguente testo:\n\n${data.text}`;
    }
    else if (action === "cleanup_data" && data.contacts) {
      systemPrompt = `Sei un assistente per la pulizia e normalizzazione di dati CRM aziendali italiani.

Analizza l'elenco contatti e rispondi con un JSON valido:
{
  "duplicates": [
    {"group": ["id1", "id2"], "names": ["Nome1", "Nome2"], "reason": "Motivo duplicato"}
  ],
  "normalizations": [
    {"contact_id": "id", "contact_name": "Nome", "field": "phone", "current_value": "valore attuale", "suggested_value": "valore corretto", "reason": "Motivo"}
  ],
  "missing_data": [
    {"contact_id": "id", "contact_name": "Nome", "missing_fields": ["email", "phone"]}
  ],
  "summary": "Riepilogo dell'analisi in markdown"
}

Cerca: duplicati per nome/email/P.IVA simili, numeri di telefono non formattati, email invalide, P.IVA malformate, dati mancanti importanti.`;
      userMessage = `Analizza questi ${data.contacts.length} contatti CRM per pulizia dati:\n${JSON.stringify(data.contacts)}`;
    }
    else {
      userMessage = data?.query || "Fornisci suggerimenti generali per migliorare la gestione dei contatti CRM.";
    }

    console.log(`CRM Agent action: ${action}`, { userId: authenticatedUserId });

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error("Errore nel servizio AI");
    }

    const aiData = await response.json();
    const aiResponse = aiData.choices?.[0]?.message?.content;

    let result;
    try {
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        result = JSON.parse(jsonMatch[0]);
      } else {
        result = { raw: aiResponse };
      }
    } catch {
      result = { raw: aiResponse };
    }

    return new Response(JSON.stringify({ success: true, result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("CRM Agent error:", error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error instanceof Error ? error.message : "Errore sconosciuto" 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
