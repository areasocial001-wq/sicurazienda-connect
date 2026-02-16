import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
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

const NOTE_ASSISTANT_PROMPT = `Sei SicurNote AI, l'assistente integrato nell'app di note SicurNote di SicurAzienda.

FUNZIONALITÀ:
1. **Riassunto**: Quando l'utente chiede un riassunto, analizza il contenuto della nota e genera un riassunto conciso e strutturato.
2. **Generazione testo**: Genera testo professionale basato su istruzioni dell'utente (email, report, verbali, ecc.).
3. **Miglioramento**: Migliora il testo esistente in termini di chiarezza, grammatica e struttura.
4. **Espansione**: Espandi un concetto o un punto elenco in un testo più dettagliato.
5. **Traduzione**: Traduci il contenuto in altre lingue mantenendo il tono professionale.

COMPORTAMENTO:
- Rispondi sempre in italiano (salvo richieste di traduzione)
- Mantieni un tono professionale ma accessibile
- Formatta le risposte usando HTML semplice (bold, liste, paragrafi) compatibile con un editor di testo ricco
- Sii conciso e vai al punto
- Se il contenuto della nota è fornito, usalo come contesto per le risposte`;

const SEMANTIC_SEARCH_PROMPT = `Sei un assistente per la ricerca semantica di note.

L'utente ti fornirà una query in linguaggio naturale e un elenco di note con titolo e contenuto.
Il tuo compito è analizzare la query e classificare le note per rilevanza.

Rispondi SOLO con un JSON valido nel formato:
{
  "results": [
    {"id": "uuid-della-nota", "relevance": 0.95, "reason": "breve spiegazione della rilevanza"}
  ]
}

Ordina per rilevanza decrescente. Includi solo note con rilevanza > 0.3.
Non aggiungere testo prima o dopo il JSON.`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
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

    const { data, error: claimsError } = await supabase.auth.getUser(token);
    if (claimsError || !data?.user) {
      return new Response(
        JSON.stringify({ error: "Token non valido" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { messages, type = "chat" } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    let systemPrompt = SYSTEM_PROMPT;
    let stream = true;
    
    if (type === "note_assistant") {
      systemPrompt = NOTE_ASSISTANT_PROMPT;
    } else if (type === "semantic_search") {
      systemPrompt = SEMANTIC_SEARCH_PROMPT;
      stream = false;
    } else if (type === "document_classification") {
      systemPrompt = `Sei un assistente specializzato nella classificazione di documenti aziendali.
Analizza il contenuto del documento e restituisci una classificazione JSON con:
- category: categoria del documento (contratto, fattura, attestato, documento_identita, certificazione, altro)
- area_competenza: area di competenza (contabilita, area_tecnica, gestione_corsi, consulenti_tecnici, generale)
- confidence: livello di confidenza (0-1)
- extracted_data: dati estratti rilevanti (date, importi, nomi, codici)
Rispondi SOLO con il JSON, senza altro testo.`;
      stream = false;
    } else if (type === "document_search") {
      systemPrompt = `Sei un assistente per la ricerca semantica di documenti.
Analizza la query dell'utente e genera termini di ricerca ottimizzati.
Rispondi con un JSON contenente:
- keywords: array di parole chiave
- filters: eventuali filtri (date, categorie, aree)
- intent: l'intento della ricerca`;
      stream = false;
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream,
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

    if (stream) {
      return new Response(response.body, {
        headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
      });
    } else {
      const result = await response.json();
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  } catch (error) {
    console.error("AI chat error:", error);
    return new Response(JSON.stringify({ error: "Errore sconosciuto" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
