import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const PROMPTS: Record<string, string> = {
  ocr: `Estrai TUTTO il testo visibile in questa immagine. Mantieni la formattazione il più possibile (paragrafi, elenchi, tabelle). Rispondi SOLO con il testo estratto, senza commenti aggiuntivi. Se non c'è testo, rispondi "Nessun testo rilevato".`,
  recognize: `Analizza questa immagine e identifica:
- Oggetti principali visibili
- Marche, modelli o prodotti riconoscibili
- Attrezzature, macchinari o dispositivi di sicurezza
- Eventuali segnali, etichette o cartelli
- Contesto ambientale (interno/esterno, tipo di luogo)

Fornisci una descrizione strutturata e dettagliata in italiano.`,
  translate: `Estrai il testo visibile in questa immagine e traducilo in italiano. Fornisci:
1. **Testo originale**: il testo nella lingua originale
2. **Lingua rilevata**: la lingua del testo originale
3. **Traduzione italiana**: la traduzione completa in italiano

Se ci sono più blocchi di testo, traducili tutti mantenendo l'ordine.`,
  search: `Analizza questa immagine e fornisci informazioni utili su ciò che vedi:
- Identifica l'oggetto, prodotto, luogo o soggetto principale
- Fornisci dettagli tecnici, specifiche o informazioni rilevanti
- Se è un prodotto, indica possibili marche, modelli e caratteristiche
- Se è un documento o certificazione, spiega il contesto normativo
- Se è un'attrezzatura di lavoro, indica requisiti di sicurezza pertinenti
- Suggerisci possibili azioni o approfondimenti

Rispondi in italiano in modo dettagliato e strutturato.`,
  general: `Analizza questa immagine e descrivi in dettaglio cosa vedi. Rispondi in italiano.`,
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const { image_base64, mode, custom_prompt } = await req.json();

    if (!image_base64) {
      return new Response(JSON.stringify({ error: "image_base64 is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const systemPrompt = custom_prompt || PROMPTS[mode] || PROMPTS.general;

    // Determine mime type from base64 header or default to jpeg
    let mimeType = "image/jpeg";
    const mimeMatch = image_base64.match(/^data:(image\/\w+);base64,/);
    let cleanBase64 = image_base64;
    if (mimeMatch) {
      mimeType = mimeMatch[1];
      cleanBase64 = image_base64.replace(/^data:image\/\w+;base64,/, "");
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
          {
            role: "user",
            content: [
              { type: "text", text: systemPrompt },
              {
                type: "image_url",
                image_url: { url: `data:${mimeType};base64,${cleanBase64}` },
              },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit superato, riprova tra qualche secondo." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Crediti AI esauriti. Aggiungi fondi nelle impostazioni." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "Errore gateway AI" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const result = data.choices?.[0]?.message?.content || "Nessun risultato";

    return new Response(JSON.stringify({ result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("vision-ai error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Errore sconosciuto" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
