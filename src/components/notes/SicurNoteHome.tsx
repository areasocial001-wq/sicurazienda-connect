import { useState, useMemo, useEffect, useCallback } from "react";
import { Note, Notebook } from "@/hooks/useNotes";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import {
  Plus, NotebookPen, Pin, Clock, StickyNote,
  Settings2, GripVertical, Eye, EyeOff, PenLine,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { it } from "date-fns/locale";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";

/* ── Types ─────────────────────────────────────── */

type WidgetId = "scratchpad" | "recent" | "pinned" | "notebooks";

interface WidgetConfig {
  id: WidgetId;
  label: string;
  visible: boolean;
}

const DEFAULT_WIDGETS: WidgetConfig[] = [
  { id: "scratchpad", label: "Scratch Pad", visible: true },
  { id: "recent", label: "Note recenti", visible: true },
  { id: "pinned", label: "Note fissate", visible: true },
  { id: "notebooks", label: "Taccuini", visible: true },
];

const STORAGE_KEY_WIDGETS = "sicurnote-home-widgets";
const STORAGE_KEY_SCRATCH = "sicurnote-scratch-pad";

/* ── Props ─────────────────────────────────────── */

interface SicurNoteHomeProps {
  allNotes: Note[];
  notebooks: Notebook[];
  noteCountByNotebook: Record<string, number>;
  onSelectNote: (note: Note) => void;
  onCreateNote: () => void;
  userName?: string;
}

/* ── Helpers ───────────────────────────────────── */

const getPreview = (content: string) => {
  if (!content) return "Nessun contenuto";
  const text = content.replace(/<[^>]*>/g, "").trim();
  return text.length > 100 ? text.slice(0, 100) + "…" : text || "Nessun contenuto";
};

const getTimeAgo = (dateStr: string) => {
  try {
    return formatDistanceToNow(new Date(dateStr), { addSuffix: true, locale: it });
  } catch {
    return "";
  }
};

/* ── Component ─────────────────────────────────── */

const SicurNoteHome = ({
  allNotes, notebooks, noteCountByNotebook,
  onSelectNote, onCreateNote, userName,
}: SicurNoteHomeProps) => {
  /* Widget config (persisted in localStorage) */
  const [widgets, setWidgets] = useState<WidgetConfig[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_WIDGETS);
      if (stored) return JSON.parse(stored) as WidgetConfig[];
    } catch { /* ignore */ }
    return DEFAULT_WIDGETS;
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_WIDGETS, JSON.stringify(widgets));
  }, [widgets]);

  const isVisible = useCallback(
    (id: WidgetId) => widgets.find(w => w.id === id)?.visible ?? true,
    [widgets],
  );

  const toggleWidget = (id: WidgetId) =>
    setWidgets(prev => prev.map(w => (w.id === id ? { ...w, visible: !w.visible } : w)));

  const moveWidget = (idx: number, dir: -1 | 1) => {
    const target = idx + dir;
    if (target < 0 || target >= widgets.length) return;
    setWidgets(prev => {
      const next = [...prev];
      [next[idx], next[target]] = [next[target], next[idx]];
      return next;
    });
  };

  /* Scratch pad (persisted in localStorage) */
  const [scratchContent, setScratchContent] = useState(() => {
    try { return localStorage.getItem(STORAGE_KEY_SCRATCH) || ""; } catch { return ""; }
  });

  useEffect(() => {
    const t = setTimeout(() => localStorage.setItem(STORAGE_KEY_SCRATCH, scratchContent), 400);
    return () => clearTimeout(t);
  }, [scratchContent]);

  /* Data */
  const recentNotes = useMemo(() =>
    [...allNotes].filter(n => !n.is_archived).sort((a, b) =>
      new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
    ).slice(0, 6),
  [allNotes]);

  const pinnedNotes = useMemo(() =>
    allNotes.filter(n => n.is_pinned && !n.is_archived),
  [allNotes]);

  const totalActive = allNotes.filter(n => !n.is_archived).length;

  /* ── Widget renderers ────────────────────────── */

  const renderScratchPad = () => (
    <section key="scratchpad">
      <h2 className="text-lg font-semibold flex items-center gap-2 mb-3">
        <PenLine className="h-4 w-4 text-muted-foreground" />
        Scratch Pad
      </h2>
      <Card>
        <CardContent className="p-0">
          <Textarea
            value={scratchContent}
            onChange={e => setScratchContent(e.target.value)}
            placeholder="Scrivi appunti rapidi qui… vengono salvati automaticamente."
            className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0 min-h-[120px] resize-y rounded-lg text-sm"
          />
        </CardContent>
      </Card>
    </section>
  );

  const renderRecent = () => (
    <section key="recent">
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
            <NoteCard key={note.id} note={note} onSelect={onSelectNote} />
          ))}
        </div>
      )}
    </section>
  );

  const renderPinned = () => {
    if (pinnedNotes.length === 0) return null;
    return (
      <section key="pinned">
        <h2 className="text-lg font-semibold flex items-center gap-2 mb-3">
          <Pin className="h-4 w-4 text-amber-500" />
          Note fissate
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {pinnedNotes.map(note => (
            <NoteCard key={note.id} note={note} onSelect={onSelectNote} highlight />
          ))}
        </div>
      </section>
    );
  };

  const renderNotebooks = () => {
    if (notebooks.length === 0) return null;
    return (
      <section key="notebooks">
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
                  style={{ backgroundColor: nb.color || "#3b82f6" }}
                />
                <span className="text-base">{nb.icon || "📓"}</span>
                <span className="text-sm font-medium truncate flex-1">{nb.name}</span>
                <span className="text-xs text-muted-foreground">{noteCountByNotebook[nb.id] || 0}</span>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    );
  };

  const widgetRenderers: Record<WidgetId, () => React.ReactNode> = {
    scratchpad: renderScratchPad,
    recent: renderRecent,
    pinned: renderPinned,
    notebooks: renderNotebooks,
  };

  return (
    <ScrollArea className="flex-1 h-full">
      <div className="max-w-5xl mx-auto p-6 space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Pronto per prendere appunti?</p>
            <h1 className="text-2xl font-bold">
              {userName ? `Home di ${userName}` : "La tua Home"}
            </h1>
          </div>
          {/* Customize widgets */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1.5">
                <Settings2 className="h-3.5 w-3.5" /> Personalizza
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-64 space-y-3">
              <p className="text-sm font-medium">Widget della Home</p>
              {widgets.map((w, idx) => (
                <div key={w.id} className="flex items-center gap-2">
                  <div className="flex flex-col gap-0.5">
                    <button
                      className="text-muted-foreground hover:text-foreground disabled:opacity-20"
                      onClick={() => moveWidget(idx, -1)}
                      disabled={idx === 0}
                      aria-label="Sposta su"
                    >
                      <GripVertical className="h-3 w-3 rotate-180" />
                    </button>
                    <button
                      className="text-muted-foreground hover:text-foreground disabled:opacity-20"
                      onClick={() => moveWidget(idx, 1)}
                      disabled={idx === widgets.length - 1}
                      aria-label="Sposta giù"
                    >
                      <GripVertical className="h-3 w-3" />
                    </button>
                  </div>
                  <Checkbox
                    checked={w.visible}
                    onCheckedChange={() => toggleWidget(w.id)}
                    id={`widget-${w.id}`}
                  />
                  <label htmlFor={`widget-${w.id}`} className="text-sm flex-1 cursor-pointer">
                    {w.label}
                  </label>
                  {w.visible ? (
                    <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                  ) : (
                    <EyeOff className="h-3.5 w-3.5 text-muted-foreground" />
                  )}
                </div>
              ))}
            </PopoverContent>
          </Popover>
        </div>

        {/* Widgets in order */}
        {widgets.filter(w => w.visible).map(w => widgetRenderers[w.id]())}
      </div>
    </ScrollArea>
  );
};

/* ── Note Card sub-component ───────────────────── */

const NoteCard = ({
  note, onSelect, highlight,
}: {
  note: Note;
  onSelect: (n: Note) => void;
  highlight?: boolean;
}) => (
  <Card
    className={`cursor-pointer hover:shadow-md transition-shadow group ${
      highlight
        ? "border-amber-200/50 dark:border-amber-800/30"
        : "border-border hover:border-primary/30"
    }`}
    onClick={() => onSelect(note)}
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
);

export default SicurNoteHome;
