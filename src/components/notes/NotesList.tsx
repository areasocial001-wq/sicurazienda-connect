import { useState } from "react";
import { Note } from "@/hooks/useNotes";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Search, Plus, Pin, StickyNote, Filter, X, Calendar } from "lucide-react";
import { format, isAfter, isBefore, startOfDay, endOfDay, parseISO } from "date-fns";
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

const extractFirstImage = (html: string): string | null => {
  const match = html.match(/<img[^>]+src="([^"]+)"/);
  return match?.[1] || null;
};

const NotesList = ({
  notes, activeNoteId, searchQuery, setSearchQuery,
  onSelectNote, onCreateNote, isLoading, title,
}: NotesListProps) => {
  const [showDateFilters, setShowDateFilters] = useState(false);
  const [createdFrom, setCreatedFrom] = useState("");
  const [createdTo, setCreatedTo] = useState("");
  const [modifiedFrom, setModifiedFrom] = useState("");
  const [modifiedTo, setModifiedTo] = useState("");

  const hasDateFilters = createdFrom || createdTo || modifiedFrom || modifiedTo;

  const clearDateFilters = () => {
    setCreatedFrom("");
    setCreatedTo("");
    setModifiedFrom("");
    setModifiedTo("");
  };

  const filteredNotes = notes.filter(note => {
    if (createdFrom && isBefore(parseISO(note.created_at), startOfDay(new Date(createdFrom)))) return false;
    if (createdTo && isAfter(parseISO(note.created_at), endOfDay(new Date(createdTo)))) return false;
    if (modifiedFrom && isBefore(parseISO(note.updated_at), startOfDay(new Date(modifiedFrom)))) return false;
    if (modifiedTo && isAfter(parseISO(note.updated_at), endOfDay(new Date(modifiedTo)))) return false;
    return true;
  });

  return (
    <div className="w-72 shrink-0 flex flex-col h-full border-r border-border bg-background">
      {/* Header */}
      <div className="px-3 py-3 border-b border-border space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground truncate">{title}</h2>
          <div className="flex items-center gap-1">
            <Popover open={showDateFilters} onOpenChange={setShowDateFilters}>
              <PopoverTrigger asChild>
                <Button
                  size="icon"
                  variant="ghost"
                  className={`h-7 w-7 ${hasDateFilters ? 'text-primary' : ''}`}
                  title="Filtri data"
                >
                  <Filter className="h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-64 p-3" align="start">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium">Filtri avanzati</span>
                    {hasDateFilters && (
                      <Button variant="ghost" size="sm" className="h-5 text-[10px] px-1.5" onClick={clearDateFilters}>
                        <X className="h-3 w-3 mr-0.5" /> Reset
                      </Button>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1 text-[10px] font-medium text-muted-foreground">
                      <Calendar className="h-3 w-3" /> Creazione
                    </div>
                    <div className="grid grid-cols-2 gap-1.5">
                      <Input type="date" value={createdFrom} onChange={e => setCreatedFrom(e.target.value)} className="h-7 text-[10px]" placeholder="Da" />
                      <Input type="date" value={createdTo} onChange={e => setCreatedTo(e.target.value)} className="h-7 text-[10px]" placeholder="A" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1 text-[10px] font-medium text-muted-foreground">
                      <Calendar className="h-3 w-3" /> Modifica
                    </div>
                    <div className="grid grid-cols-2 gap-1.5">
                      <Input type="date" value={modifiedFrom} onChange={e => setModifiedFrom(e.target.value)} className="h-7 text-[10px]" placeholder="Da" />
                      <Input type="date" value={modifiedTo} onChange={e => setModifiedTo(e.target.value)} className="h-7 text-[10px]" placeholder="A" />
                    </div>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={onCreateNote} title="Nuova nota">
              <Plus className="h-4 w-4" />
            </Button>
          </div>
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
        {hasDateFilters && (
          <div className="flex items-center gap-1 flex-wrap">
            <Badge variant="secondary" className="text-[9px] px-1.5 py-0 h-4">
              <Filter className="h-2.5 w-2.5 mr-0.5" /> Filtri attivi
            </Badge>
          </div>
        )}
      </div>

      {/* Notes List */}
      <ScrollArea className="flex-1">
        {isLoading ? (
          <div className="p-4 text-center text-sm text-muted-foreground">Caricamento...</div>
        ) : filteredNotes.length === 0 ? (
          <div className="p-6 text-center">
            <StickyNote className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">Nessuna nota trovata</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filteredNotes.map(note => (
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
                  {(() => {
                    const thumb = extractFirstImage(note.content);
                    if (thumb) return (
                      <img src={thumb} alt="" className="w-10 h-10 rounded object-cover shrink-0 mt-0.5" loading="lazy" />
                    );
                    if (note.color) return (
                      <div className="w-2 h-2 rounded-full shrink-0 mt-1.5" style={{ backgroundColor: note.color }} />
                    );
                    return null;
                  })()}
                </div>
              </button>
            ))}
          </div>
        )}
      </ScrollArea>

      <div className="px-3 py-2 border-t border-border">
        <p className="text-[10px] text-muted-foreground text-center">{filteredNotes.length} note</p>
      </div>
    </div>
  );
};

export default NotesList;
