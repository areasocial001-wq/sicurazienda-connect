import { Note } from "@/hooks/useNotes";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, Plus, Pin, StickyNote } from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";

interface NotesListProps {
  notes: Note[];
  activeNoteId: string | null;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  onSelectNote: (note: Note) => void;
  onCreateNote: () => void;
  isLoading: boolean;
  title: string;
}

const stripHtml = (html: string) => {
  const tmp = document.createElement("div");
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || "";
};

const NotesList = ({
  notes, activeNoteId, searchQuery, setSearchQuery,
  onSelectNote, onCreateNote, isLoading, title,
}: NotesListProps) => {
  return (
    <div className="w-72 shrink-0 flex flex-col h-full border-r border-border bg-background">
      {/* Header */}
      <div className="px-3 py-3 border-b border-border space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground truncate">{title}</h2>
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={onCreateNote} title="Nuova nota">
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Cerca nelle note..."
            className="pl-8 h-8 text-xs"
          />
        </div>
      </div>

      {/* Notes List */}
      <ScrollArea className="flex-1">
        {isLoading ? (
          <div className="p-4 text-center text-sm text-muted-foreground">Caricamento...</div>
        ) : notes.length === 0 ? (
          <div className="p-6 text-center">
            <StickyNote className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">Nessuna nota trovata</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {notes.map(note => (
              <button
                key={note.id}
                onClick={() => onSelectNote(note)}
                className={`w-full text-left px-3 py-2.5 transition-colors hover:bg-muted/50 ${
                  activeNoteId === note.id ? 'bg-accent/50 border-l-2 border-l-primary' : ''
                }`}
                style={note.color ? { borderLeftColor: note.color, borderLeftWidth: activeNoteId === note.id ? 3 : 0 } : {}}
              >
                <div className="flex items-start gap-1.5">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1">
                      {note.is_pinned && <Pin className="h-3 w-3 text-primary shrink-0" />}
                      <span className="text-sm font-medium truncate">{note.title}</span>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                      {stripHtml(note.content) || "Nota vuota"}
                    </p>
                    <div className="flex items-center gap-1.5 mt-1">
                      <span className="text-[10px] text-muted-foreground">
                        {format(new Date(note.updated_at), "dd MMM yyyy", { locale: it })}
                      </span>
                      {note.tags.slice(0, 2).map(tag => (
                        <Badge key={tag} variant="outline" className="text-[9px] px-1 py-0 h-3.5">{tag}</Badge>
                      ))}
                    </div>
                    {note.contact && (
                      <span className="text-[10px] text-muted-foreground">📌 {note.contact.name}</span>
                    )}
                  </div>
                  {note.color && (
                    <div className="w-2 h-2 rounded-full shrink-0 mt-1.5" style={{ backgroundColor: note.color }} />
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </ScrollArea>

      <div className="px-3 py-2 border-t border-border">
        <p className="text-[10px] text-muted-foreground text-center">{notes.length} note</p>
      </div>
    </div>
  );
};

export default NotesList;
