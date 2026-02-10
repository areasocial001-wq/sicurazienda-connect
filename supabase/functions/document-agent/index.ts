import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const CLASSIFICATION_PROMPT = `Sei un assistente specializzato nella classificazione di documenti aziendali italiani.

Analizza il nome del file e/o il contenuto fornito e restituisci una classificazione JSON.

CATEGORIE DISPONIBILI:
- contratto: contratti di lavoro, accordi commerciali
- fattura: fatture, note di credito, ricevute
- attestato: certificati di formazione, attestati
- documento_identita: carte d'identità, passaporti, codici fiscali
- certificazione: certificazioni ISO, HACCP, etc.
- dvr: documenti valutazione rischi
- duvri: documenti unici valutazione rischi interferenze
- pos: piani operativi sicurezza
- verbale: verbali di riunione, ispezioni
- altro: documenti non classificabili

AREE DI COMPETENZA:
- contabilita: fatture, bilanci, documenti fiscali
- area_tecnica: DVR, DUVRI, POS, certificazioni tecniche
- gestione_corsi: attestati formazione, calendari corsi
- consulenti_tecnici: relazioni tecniche, perizie
- generale: documenti trasversali

Rispondi SEMPRE e SOLO con un JSON valido in questo formato:
{
  "category": "categoria",
  "area_competenza": "area",
  "confidence": 0.95,
  "extracted_data": {
    "tipo": "tipo specifico",
    "date_rilevanti": ["2024-01-01"],
    "importi": ["€1000"],
    "soggetti": ["Nome Cognome"],
    "codici": ["ABC123"]
  },
  "suggerimento": "breve descrizione del documento"
}`;

const SEARCH_PROMPT = `Sei un assistente per la ricerca semantica di documenti aziendali.

Analizza la query dell'utente e genera criteri di ricerca ottimizzati.

Rispondi SEMPRE e SOLO con un JSON valido:
{
  "keywords": ["parola1", "parola2"],
  "categories": ["categoria1"],
  "areas": ["area1"],
  "date_range": {"from": "2024-01-01", "to": "2024-12-31"},
  "intent": "descrizione dell'intento"
}

Se non ci sono filtri specifici, usa array vuoti.`;

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
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });

    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(
        JSON.stringify({ success: false, error: "Token non valido" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { action, filename, content, query } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY non configurata");
    }

    let systemPrompt = "";
    let userMessage = "";

    if (action === "classify") {
      systemPrompt = CLASSIFICATION_PROMPT;
      userMessage = `Classifica questo documento:\nNome file: ${filename}\n${content ? `Contenuto: ${content}` : ""}`;
    } else if (action === "search") {
      systemPrompt = SEARCH_PROMPT;
      userMessage = `Query di ricerca: ${query}`;
    } else if (action === "extract") {
      systemPrompt = `Sei un assistente per l'estrazione di dati da documenti.
      
Estrai tutte le informazioni rilevanti dal testo fornito e restituisci un JSON strutturato con:
- date: array di date trovate
- importi: array di importi monetari
- persone: array di nomi di persone
- aziende: array di nomi di aziende
- codici: array di codici (fiscali, partita IVA, etc.)
- indirizzi: array di indirizzi
- contatti: oggetto con email, telefoni
- summary: breve riassunto del contenuto

Rispondi SOLO con JSON valido.`;
      userMessage = `Estrai i dati da questo documento:\nNome: ${filename}\nContenuto: ${content}`;
    } else {
      throw new Error("Azione non valida");
    }

    console.log(`Document agent action: ${action}`, { filename, hasContent: !!content });

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
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Troppi messaggi, riprova tra poco." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      throw new Error("Errore nel servizio AI");
    }

    const data = await response.json();
    const aiResponse = data.choices?.[0]?.message?.content;

    let result;
    try {
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        result = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No JSON found in response");
      }
    } catch (parseError) {
      console.error("JSON parse error:", parseError);
      result = { raw: aiResponse, error: "Impossibile parsare la risposta" };
    }

    return new Response(JSON.stringify({ success: true, result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Document agent error:", error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error instanceof Error ? error.message : "Errore sconosciuto" 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
