import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `Sei l'assistente AI di SicurAzienda, un'azienda specializzata in servizi di sicurezza sul lavoro, formazione professionale e consulenza aziendale.

SERVIZI PRINCIPALI:
1. **Sicurezza sul Lavoro**: DVR (Documento di Valutazione dei Rischi), DUVRI, POS, valutazione rischi specifici
2. **Formazione**: Corsi RSPP, RLS, Antincendio, Primo Soccorso, Addetti antincendio, Carrellisti, Lavori in quota
3. **Sorveglianza Sanitaria**: Visite mediche, nomina medico competente
4. **Ambiente**: Gestione rifiuti, emissioni, MUD, SISTRI
5. **Privacy e GDPR**: DPO, registro trattamenti, informative
6. **Consulenza Tecnica**: Pratiche edilizie, SCIA, certificazioni

COMPORTAMENTO:
- Rispondi sempre in italiano
- Sii professionale ma cordiale
- Per richieste specifiche, invita a compilare il form di contatto
- Se non conosci una risposta, suggerisci di contattare l'azienda
- Fornisci informazioni utili sui servizi richiesti
- Per preventivi o appuntamenti, guida verso la sezione "Nuovo Cliente" o "Già Cliente"

CONTATTI:
- Email: gestioneappuntamenti@sicurazienda.com
- Per nuovi clienti: sezione "Nuovo Cliente" dell'app
- Per clienti esistenti: sezione "Già Cliente" dell'app`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, type = "chat" } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Different system prompts based on type
    let systemPrompt = SYSTEM_PROMPT;
    
    if (type === "document_classification") {
      systemPrompt = `Sei un assistente specializzato nella classificazione di documenti aziendali.
      
Analizza il contenuto del documento e restituisci una classificazione JSON con:
- category: categoria del documento (contratto, fattura, attestato, documento_identita, certificazione, altro)
- area_competenza: area di competenza (contabilita, area_tecnica, gestione_corsi, consulenti_tecnici, generale)
- confidence: livello di confidenza (0-1)
- extracted_data: dati estratti rilevanti (date, importi, nomi, codici)

Rispondi SOLO con il JSON, senza altro testo.`;
    } else if (type === "document_search") {
      systemPrompt = `Sei un assistente per la ricerca semantica di documenti.
      
Analizza la query dell'utente e genera termini di ricerca ottimizzati.
Rispondi con un JSON contenente:
- keywords: array di parole chiave
- filters: eventuali filtri (date, categorie, aree)
- intent: l'intento della ricerca`;
    }

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
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Troppi messaggi, riprova tra poco." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Crediti AI esauriti." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      return new Response(JSON.stringify({ error: "Errore nel servizio AI" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (error) {
    console.error("AI chat error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Errore sconosciuto" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
