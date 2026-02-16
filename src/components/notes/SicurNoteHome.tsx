import { useMemo } from "react";
import { Note, Notebook } from "@/hooks/useNotes";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Plus, NotebookPen, Pin, Clock, StickyNote, Star,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { it } from "date-fns/locale";

interface SicurNoteHomeProps {
  allNotes: Note[];
  notebooks: Notebook[];
  noteCountByNotebook: Record<string, number>;
  onSelectNote: (note: Note) => void;
  onCreateNote: () => void;
  userName?: string;
}

const SicurNoteHome = ({
  allNotes, notebooks, noteCountByNotebook,
  onSelectNote, onCreateNote, userName,
}: SicurNoteHomeProps) => {
  const recentNotes = useMemo(() =>
    [...allNotes].filter(n => !n.is_archived).sort((a, b) =>
      new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
    ).slice(0, 6),
  [allNotes]);

  const pinnedNotes = useMemo(() =>
    allNotes.filter(n => n.is_pinned && !n.is_archived),
  [allNotes]);

  const totalActive = allNotes.filter(n => !n.is_archived).length;

  const getPreview = (content: string) => {
    if (!content) return "Nessun contenuto";
    const text = content.replace(/<[^>]*>/g, '').trim();
    return text.length > 100 ? text.slice(0, 100) + "..." : text || "Nessun contenuto";
  };

  const getTimeAgo = (dateStr: string) => {
    try {
      return formatDistanceToNow(new Date(dateStr), { addSuffix: true, locale: it });
    } catch { return ""; }
  };

  return (
    <ScrollArea className="flex-1 h-full">
      <div className="max-w-5xl mx-auto p-6 space-y-8">
        {/* Header */}
        <div>
          <p className="text-sm text-muted-foreground">Pronto per prendere appunti?</p>
          <h1 className="text-2xl font-bold">
            {userName ? `Home di ${userName}` : "La tua Home"}
          </h1>
        </div>

        {/* Recent Notes */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              Note recenti
            </h2>
            <span className="text-xs text-muted-foreground">{totalActive} note totali</span>
          </div>
          {recentNotes.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                <NotebookPen className="h-10 w-10 mx-auto mb-2 opacity-30" />
                <p>Nessuna nota ancora. Crea la tua prima nota!</p>
                <Button className="mt-3" onClick={onCreateNote}>
                  <Plus className="h-4 w-4 mr-1" /> Nuova nota
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {recentNotes.map(note => (
                <Card
                  key={note.id}
                  className="cursor-pointer hover:shadow-md transition-shadow border-border hover:border-primary/30 group"
                  onClick={() => onSelectNote(note)}
                >
                  <CardContent className="p-4 space-y-2">
                    <div className="flex items-start gap-2">
                      <h3 className="font-medium text-sm flex-1 line-clamp-2 group-hover:text-primary transition-colors">
                        {note.title || "Senza titolo"}
                      </h3>
                      {note.is_pinned && <Pin className="h-3 w-3 text-amber-500 shrink-0 mt-0.5" />}
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-3">
                      {getPreview(note.content)}
                    </p>
                    <div className="flex items-center gap-2 pt-1">
                      <span className="text-[10px] text-muted-foreground">
                        {getTimeAgo(note.updated_at)}
                      </span>
                      {note.tags.length > 0 && (
                        <div className="flex gap-1">
                          {note.tags.slice(0, 2).map(tag => (
                            <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                              {tag}
                            </span>
                          ))}
                          {note.tags.length > 2 && (
                            <span className="text-[10px] text-muted-foreground">+{note.tags.length - 2}</span>
                          )}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>

        {/* Pinned Notes */}
        {pinnedNotes.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold flex items-center gap-2 mb-3">
              <Pin className="h-4 w-4 text-amber-500" />
              Note fissate
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {pinnedNotes.map(note => (
                <Card
                  key={note.id}
                  className="cursor-pointer hover:shadow-md transition-shadow border-amber-200/50 dark:border-amber-800/30 group"
                  onClick={() => onSelectNote(note)}
                >
                  <CardContent className="p-4 space-y-2">
                    <h3 className="font-medium text-sm line-clamp-2 group-hover:text-primary transition-colors">
                      {note.title || "Senza titolo"}
                    </h3>
                    <p className="text-xs text-muted-foreground line-clamp-3">
                      {getPreview(note.content)}
                    </p>
                    <span className="text-[10px] text-muted-foreground">
                      {getTimeAgo(note.updated_at)}
                    </span>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        )}

        {/* Notebooks overview */}
        {notebooks.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold flex items-center gap-2 mb-3">
              <StickyNote className="h-4 w-4 text-muted-foreground" />
              I tuoi taccuini
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {notebooks.slice(0, 8).map(nb => (
                <Card key={nb.id} className="hover:shadow-sm transition-shadow">
                  <CardContent className="p-3 flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: nb.color || '#3b82f6' }}
                    />
                    <span className="text-base">{nb.icon || "📓"}</span>
                    <span className="text-sm font-medium truncate flex-1">{nb.name}</span>
                    <span className="text-xs text-muted-foreground">{noteCountByNotebook[nb.id] || 0}</span>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        )}
      </div>
    </ScrollArea>
  );
};

export default SicurNoteHome;
