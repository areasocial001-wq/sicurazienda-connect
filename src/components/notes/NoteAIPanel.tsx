import { useState } from "react";
import { Note } from "@/hooks/useNotes";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Sparkles, Send, Loader2, FileText, Wand2, Languages,
  ArrowUpRight, X, Bot,
} from "lucide-react";

interface NoteAIPanelProps {
  note: Note;
  onInsertText: (text: string) => void;
}

const QUICK_ACTIONS = [
  { id: "summarize", label: "Riassumi", icon: FileText, prompt: "Riassumi il contenuto di questa nota in modo conciso e strutturato." },
  { id: "improve", label: "Migliora", icon: Wand2, prompt: "Migliora il testo di questa nota rendendolo più chiaro, professionale e ben strutturato." },
  { id: "expand", label: "Espandi", icon: ArrowUpRight, prompt: "Espandi il contenuto di questa nota aggiungendo dettagli e approfondimenti." },
  { id: "translate", label: "Traduci EN", icon: Languages, prompt: "Traduci il contenuto di questa nota in inglese." },
];

const stripHtml = (html: string) => {
  const tmp = document.createElement("div");
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || "";
};

const NoteAIPanel = ({ note, onInsertText }: NoteAIPanelProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [response, setResponse] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const sendToAI = async (userPrompt: string) => {
    setIsLoading(true);
    setResponse("");

    const noteContent = stripHtml(note.content);
    const contextMessage = noteContent
      ? `Contesto - Titolo nota: "${note.title}"\nContenuto nota:\n${noteContent}\n\nRichiesta: ${userPrompt}`
      : userPrompt;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Sessione scaduta");
        return;
      }

      const resp = await fetch(
        `https://obzflzotzvwlmgyjxfpv.supabase.co/functions/v1/ai-chat`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            messages: [{ role: "user", content: contextMessage }],
            type: "note_assistant",
          }),
        }
      );

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err.error || "Errore AI");
      }

      if (!resp.body) throw new Error("No stream body");

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let fullText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = buffer.indexOf("\n")) !== -1) {
          let line = buffer.slice(0, newlineIndex);
          buffer = buffer.slice(newlineIndex + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") break;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              fullText += content;
              setResponse(fullText);
            }
          } catch { /* partial */ }
        }
      }
    } catch (err: any) {
      toast.error(err.message || "Errore AI");
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickAction = (action: typeof QUICK_ACTIONS[0]) => {
    sendToAI(action.prompt);
  };

  const handleSend = () => {
    if (!prompt.trim()) return;
    sendToAI(prompt);
    setPrompt("");
  };

  const handleInsert = () => {
    if (response) {
      onInsertText(response);
      toast.success("Testo inserito nella nota");
      setResponse("");
    }
  };

  if (!isOpen) {
    return (
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7"
        onClick={() => setIsOpen(true)}
        title="Assistente AI"
      >
        <Sparkles className="h-4 w-4" />
      </Button>
    );
  }

  return (
    <div className="border-t border-border bg-muted/20 shrink-0">
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-border">
        <div className="flex items-center gap-1.5 text-xs font-medium">
          <Bot className="h-3.5 w-3.5 text-primary" />
          SicurNote AI
        </div>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setIsOpen(false)}>
          <X className="h-3 w-3" />
        </Button>
      </div>

      <div className="p-2 space-y-2">
        {/* Quick actions */}
        <div className="flex flex-wrap gap-1">
          {QUICK_ACTIONS.map(action => (
            <Button
              key={action.id}
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              onClick={() => handleQuickAction(action)}
              disabled={isLoading}
            >
              <action.icon className="h-3 w-3 mr-1" />
              {action.label}
            </Button>
          ))}
        </div>

        {/* Custom prompt */}
        <div className="flex gap-1">
          <Textarea
            value={prompt}
            onChange={e => setPrompt(e.target.value)}
            placeholder="Chiedi all'AI qualsiasi cosa sulla nota..."
            className="min-h-[36px] h-9 text-xs resize-none"
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
          />
          <Button size="icon" className="h-9 w-9 shrink-0" onClick={handleSend} disabled={isLoading || !prompt.trim()}>
            {isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
          </Button>
        </div>

        {/* Response */}
        {(response || isLoading) && (
          <div className="bg-background rounded-md border border-border p-2">
            {isLoading && !response && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" /> Elaborazione...
              </div>
            )}
            {response && (
              <>
                <ScrollArea className="max-h-[150px]">
                  <div className="text-xs whitespace-pre-wrap">{response}</div>
                </ScrollArea>
                <div className="flex justify-end mt-1.5">
                  <Button size="sm" className="h-6 text-[10px]" onClick={handleInsert}>
                    Inserisci nella nota
                  </Button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default NoteAIPanel;
