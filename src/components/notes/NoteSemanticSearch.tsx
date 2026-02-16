import { useState } from "react";
import { Note } from "@/hooks/useNotes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Search, Loader2, Sparkles, X } from "lucide-react";

interface NoteSemanticSearchProps {
  notes: Note[];
  onSelectNote: (note: Note) => void;
  onClose: () => void;
}

const stripHtml = (html: string) => {
  const tmp = document.createElement("div");
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || "";
};

const NoteSemanticSearch = ({ notes, onSelectNote, onClose }: NoteSemanticSearchProps) => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<{ id: string; relevance: number; reason: string }[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const handleSearch = async () => {
    if (!query.trim() || notes.length === 0) return;
    setIsSearching(true);
    setResults([]);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { toast.error("Sessione scaduta"); return; }

      const noteSummaries = notes.slice(0, 50).map(n => ({
        id: n.id,
        title: n.title,
        content: stripHtml(n.content).slice(0, 300),
        tags: n.tags,
      }));

      const resp = await fetch(
        `https://obzflzotzvwlmgyjxfpv.supabase.co/functions/v1/ai-chat`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            messages: [{
              role: "user",
              content: `Query di ricerca: "${query}"\n\nNote disponibili:\n${JSON.stringify(noteSummaries, null, 2)}`,
            }],
            type: "semantic_search",
          }),
        }
      );

      if (!resp.ok) throw new Error("Errore ricerca AI");

      const data = await resp.json();
      const content = data.choices?.[0]?.message?.content;
      if (content) {
        try {
          const cleaned = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
          const parsed = JSON.parse(cleaned);
          setResults(parsed.results || []);
        } catch {
          toast.error("Errore nel parsing dei risultati");
        }
      }
    } catch {
      toast.error("Errore nella ricerca semantica");
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-sm font-medium">
          <Sparkles className="h-4 w-4 text-primary" />
          Ricerca Semantica AI
        </div>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onClose}>
          <X className="h-3 w-3" />
        </Button>
      </div>

      <div className="flex gap-1.5">
        <Input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Descrivi cosa cerchi in linguaggio naturale..."
          className="text-sm"
          onKeyDown={e => { if (e.key === "Enter") handleSearch(); }}
        />
        <Button size="sm" onClick={handleSearch} disabled={isSearching || !query.trim()}>
          {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
        </Button>
      </div>

      {results.length > 0 && (
        <ScrollArea className="max-h-[300px]">
          <div className="space-y-1.5">
            {results.map(r => {
              const note = notes.find(n => n.id === r.id);
              if (!note) return null;
              return (
                <button
                  key={r.id}
                  onClick={() => onSelectNote(note)}
                  className="w-full text-left p-2.5 bg-background border border-border rounded-md hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium truncate">{note.title}</span>
                    <Badge variant="outline" className="text-[10px] shrink-0">
                      {Math.round(r.relevance * 100)}%
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-1">{r.reason}</p>
                </button>
              );
            })}
          </div>
        </ScrollArea>
      )}

      {isSearching && (
        <div className="text-center py-3 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin mx-auto mb-1" />
          Ricerca in corso...
        </div>
      )}
    </div>
  );
};

export default NoteSemanticSearch;
