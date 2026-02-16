import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Notebook } from "@/hooks/useNotes";
import {
  StickyNote, Tag, Plus, Trash2, X,
  FolderPlus, Archive, ChevronDown, ChevronRight,
  NotebookPen, Users, Copy, Check, Scissors, Pencil, Home, ArrowUpDown,
} from "lucide-react";
import NoteShareNotifications from "./NoteShareNotifications";

const NOTEBOOK_ICONS = ["📓", "📕", "📗", "📘", "📙", "📔", "📒", "🗂️", "💼", "🎯", "💡", "🔒", "⭐", "🏠", "🛠️", "📊"];

const NOTEBOOK_LABEL_COLORS = [
  "#ef4444", "#f97316", "#eab308", "#22c55e", "#3b82f6", "#8b5cf6", "#ec4899", "#14b8a6",
];

interface SicurNoteSidebarProps {
  notebooks: Notebook[];
  allTags: string[];
  selectedNotebook: string | null;
  setSelectedNotebook: (id: string | null) => void;
  selectedTag: string | null;
  setSelectedTag: (tag: string | null) => void;
  showArchived: boolean;
  setShowArchived: (show: boolean) => void;
  showSharedWithMe: boolean;
  setShowSharedWithMe: (show: boolean) => void;
  showHome: boolean;
  setShowHome: (show: boolean) => void;
  onCreateNotebook: (name: string, color?: string) => void;
  onDeleteNotebook: (id: string) => void;
  onUpdateNotebook?: (id: string, data: { name?: string; color?: string; icon?: string }) => void;
  noteCountByNotebook: Record<string, number>;
  totalNotes: number;
  sharedNotesCount: number;
  collapsed?: boolean;
  onOpenNote?: (noteId: string) => void;
}

const SicurNoteSidebar = ({
  notebooks, allTags, selectedNotebook, setSelectedNotebook,
  selectedTag, setSelectedTag, showArchived, setShowArchived,
  showSharedWithMe, setShowSharedWithMe, showHome, setShowHome,
  onCreateNotebook, onDeleteNotebook, onUpdateNotebook, noteCountByNotebook,
  totalNotes, sharedNotesCount, collapsed, onOpenNote,
}: SicurNoteSidebarProps) => {
  const [showNewNotebook, setShowNewNotebook] = useState(false);
  const [newNotebookName, setNewNotebookName] = useState("");
  const [newNotebookColor, setNewNotebookColor] = useState(NOTEBOOK_LABEL_COLORS[4]);
  const [notebooksOpen, setNotebooksOpen] = useState(true);
  const [tagsOpen, setTagsOpen] = useState(true);
  const [bookmarkletCopied, setBookmarkletCopied] = useState(false);
  const [editingNotebook, setEditingNotebook] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState("");
  const [editIcon, setEditIcon] = useState("");
  const [notebookSort, setNotebookSort] = useState<"name" | "created" | "count">("name");

  const sortedNotebooks = useMemo(() => {
    return [...notebooks].sort((a, b) => {
      if (notebookSort === "name") return a.name.localeCompare(b.name);
      if (notebookSort === "created") return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      return (noteCountByNotebook[b.id] || 0) - (noteCountByNotebook[a.id] || 0);
    });
  }, [notebooks, notebookSort, noteCountByNotebook]);

  const bookmarkletCode = `javascript:void(function(){var t=document.title,u=location.href,s=window.getSelection().toString().substring(0,2000);window.open('${window.location.origin}/notes?clip=1&title='+encodeURIComponent(t)+'&url='+encodeURIComponent(u)+'&text='+encodeURIComponent(s),'_blank','width=500,height=400')}())`;

  const handleCopyBookmarklet = () => {
    navigator.clipboard.writeText(bookmarkletCode);
    setBookmarkletCopied(true);
    setTimeout(() => setBookmarkletCopied(false), 2000);
  };

  const handleCreate = () => {
    if (!newNotebookName.trim()) return;
    onCreateNotebook(newNotebookName.trim(), newNotebookColor);
    setNewNotebookName("");
    setNewNotebookColor(NOTEBOOK_LABEL_COLORS[4]);
    setShowNewNotebook(false);
  };

  const startEdit = (nb: Notebook) => {
    setEditingNotebook(nb.id);
    setEditName(nb.name);
    setEditColor(nb.color || "#3b82f6");
    setEditIcon(nb.icon || "📓");
  };

  const saveEdit = () => {
    if (!editingNotebook || !onUpdateNotebook) return;
    onUpdateNotebook(editingNotebook, { name: editName, color: editColor, icon: editIcon });
    setEditingNotebook(null);
  };

  if (collapsed) return null;

  return (
    <div className="w-60 shrink-0 bg-[hsl(var(--sicurnote-sidebar))] text-[hsl(var(--sicurnote-sidebar-foreground))] flex flex-col h-full border-r border-border">
      {/* Logo */}
      <div className="px-4 py-4 border-b border-white/10">
        <div className="flex items-center gap-2">
          <NotebookPen className="h-6 w-6 text-emerald-400" />
          <span className="text-lg font-bold tracking-tight flex-1">SicurNote</span>
          <NoteShareNotifications onOpenNote={onOpenNote} />
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-3 space-y-1">
          {/* Home */}
          <button
            onClick={() => { setShowHome(true); setSelectedNotebook(null); setSelectedTag(null); setShowArchived(false); setShowSharedWithMe(false); }}
            className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors hover:bg-white/10 ${
              showHome ? 'bg-white/15 font-medium' : ''
            }`}
          >
            <Home className="h-4 w-4 shrink-0" />
            <span className="flex-1 text-left">Home</span>
          </button>

          {/* All Notes */}
          <button
            onClick={() => { setSelectedNotebook(null); setSelectedTag(null); setShowArchived(false); setShowSharedWithMe(false); setShowHome(false); }}
            className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors hover:bg-white/10 ${
              !selectedNotebook && !selectedTag && !showArchived && !showSharedWithMe && !showHome ? 'bg-white/15 font-medium' : ''
            }`}
          >
            <StickyNote className="h-4 w-4 shrink-0" />
            <span className="flex-1 text-left">Tutte le note</span>
            <span className="text-xs opacity-60">{totalNotes}</span>
          </button>

          {/* Archive */}
          <button
            onClick={() => { setShowArchived(!showArchived); setSelectedNotebook(null); setSelectedTag(null); setShowSharedWithMe(false); setShowHome(false); }}
            className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors hover:bg-white/10 ${
              showArchived ? 'bg-white/15 font-medium' : ''
            }`}
          >
            <Archive className="h-4 w-4 shrink-0" />
            <span className="flex-1 text-left">Archivio</span>
          </button>

          {/* Shared with me */}
          <button
            onClick={() => { setShowSharedWithMe(!showSharedWithMe); setSelectedNotebook(null); setSelectedTag(null); setShowArchived(false); setShowHome(false); }}
            className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors hover:bg-white/10 ${
              showSharedWithMe ? 'bg-white/15 font-medium' : ''
            }`}
          >
            <Users className="h-4 w-4 shrink-0" />
            <span className="flex-1 text-left">Condivise con me</span>
            {sharedNotesCount > 0 && <span className="text-xs opacity-60">{sharedNotesCount}</span>}
          </button>

          {/* Notebooks Section */}
          <div className="pt-3">
            <div className="flex items-center gap-1 px-3 py-1">
              <button
                onClick={() => setNotebooksOpen(!notebooksOpen)}
                className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wider opacity-70 hover:opacity-100 flex-1"
              >
                {notebooksOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                Taccuini
              </button>
              {notebooksOpen && (
                <Select value={notebookSort} onValueChange={(v) => setNotebookSort(v as any)}>
                  <SelectTrigger className="h-5 w-5 p-0 border-0 bg-transparent opacity-60 hover:opacity-100 [&>svg]:hidden">
                    <ArrowUpDown className="h-3 w-3" />
                  </SelectTrigger>
                  <SelectContent align="end">
                    <SelectItem value="name">Per nome</SelectItem>
                    <SelectItem value="created">Per data creazione</SelectItem>
                    <SelectItem value="count">Per n° note</SelectItem>
                  </SelectContent>
                </Select>
              )}
            </div>
            
            {notebooksOpen && (
              <div className="mt-1 space-y-0.5">
                {sortedNotebooks.map(nb => (
                  <div
                    key={nb.id}
                    className={`group flex items-center gap-2 px-3 py-1.5 rounded-md text-sm cursor-pointer transition-colors hover:bg-white/10 ${
                      selectedNotebook === nb.id ? 'bg-white/15 font-medium' : ''
                    }`}
                    onClick={() => { setSelectedNotebook(nb.id); setSelectedTag(null); setShowArchived(false); setShowHome(false); }}
                  >
                    <div
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: nb.color || '#3b82f6' }}
                    />
                    <span className="text-base shrink-0">{nb.icon}</span>
                    <span className="flex-1 truncate">{nb.name}</span>
                    <span className="text-xs opacity-60">{noteCountByNotebook[nb.id] || 0}</span>
                    <Popover open={editingNotebook === nb.id} onOpenChange={(open) => { if (!open) setEditingNotebook(null); }}>
                      <PopoverTrigger asChild>
                        <button
                          onClick={e => { e.stopPropagation(); startEdit(nb); }}
                          className="opacity-0 group-hover:opacity-100 hover:text-primary transition-opacity"
                        >
                          <Pencil className="h-3 w-3" />
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="w-56 p-3 space-y-2" align="start" side="right" onClick={e => e.stopPropagation()}>
                        <p className="text-xs font-medium">Modifica taccuino</p>
                        <Input
                          value={editName}
                          onChange={e => setEditName(e.target.value)}
                          className="h-7 text-xs"
                          placeholder="Nome..."
                          onKeyDown={e => e.key === "Enter" && saveEdit()}
                        />
                        <div>
                          <p className="text-[10px] text-muted-foreground mb-1">Colore</p>
                          <div className="flex gap-1 flex-wrap">
                            {NOTEBOOK_LABEL_COLORS.map(c => (
                              <button
                                key={c}
                                onClick={() => setEditColor(c)}
                                className={`w-5 h-5 rounded-full border-2 transition-all ${editColor === c ? 'border-foreground scale-110' : 'border-transparent'}`}
                                style={{ backgroundColor: c }}
                              />
                            ))}
                          </div>
                        </div>
                        <div>
                          <p className="text-[10px] text-muted-foreground mb-1">Icona</p>
                          <div className="flex gap-1 flex-wrap">
                            {NOTEBOOK_ICONS.map(icon => (
                              <button
                                key={icon}
                                onClick={() => setEditIcon(icon)}
                                className={`w-6 h-6 rounded text-sm flex items-center justify-center transition-all ${editIcon === icon ? 'bg-accent ring-1 ring-primary' : 'hover:bg-muted'}`}
                              >
                                {icon}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div className="flex gap-1 pt-1">
                          <Button size="sm" className="h-6 text-xs flex-1" onClick={saveEdit}>
                            <Check className="h-3 w-3 mr-1" /> Salva
                          </Button>
                          <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={() => setEditingNotebook(null)}>
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      </PopoverContent>
                    </Popover>
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        if (confirm("Eliminare questo taccuino?")) onDeleteNotebook(nb.id);
                      }}
                      className="opacity-0 group-hover:opacity-100 hover:text-destructive transition-opacity"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                ))}

                {showNewNotebook ? (
                  <div className="px-2 pt-1 space-y-1.5">
                    <Input
                      value={newNotebookName}
                      onChange={e => setNewNotebookName(e.target.value)}
                      placeholder="Nome taccuino..."
                      className="h-7 text-xs bg-white/10 border-white/20 text-inherit placeholder:text-white/40"
                      onKeyDown={e => e.key === "Enter" && handleCreate()}
                      autoFocus
                    />
                    <div className="flex items-center gap-1 px-1">
                      <span className="text-[10px] opacity-60 mr-1">Colore:</span>
                      {NOTEBOOK_LABEL_COLORS.map(c => (
                        <button
                          key={c}
                          onClick={() => setNewNotebookColor(c)}
                          className={`w-4 h-4 rounded-full border-2 transition-all ${newNotebookColor === c ? 'border-white scale-110' : 'border-transparent'}`}
                          style={{ backgroundColor: c }}
                        />
                      ))}
                    </div>
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" className="h-7 w-7 hover:bg-white/10" onClick={handleCreate}>
                        <Plus className="h-3 w-3" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7 hover:bg-white/10" onClick={() => setShowNewNotebook(false)}>
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowNewNotebook(true)}
                    className="w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-xs transition-colors hover:bg-white/10 opacity-70 hover:opacity-100"
                  >
                    <FolderPlus className="h-3 w-3" />
                    Nuovo taccuino
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Tags Section */}
          <div className="pt-3">
            <button
              onClick={() => setTagsOpen(!tagsOpen)}
              className="w-full flex items-center gap-1 px-3 py-1 text-xs font-semibold uppercase tracking-wider opacity-70 hover:opacity-100"
            >
              {tagsOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
              Tag
            </button>
            
            {tagsOpen && (
              <div className="mt-1 space-y-0.5">
                {allTags.length === 0 ? (
                  <p className="px-3 py-1 text-xs opacity-50">Nessun tag</p>
                ) : (
                  allTags.map(tag => (
                    <button
                      key={tag}
                      onClick={() => { 
                        setSelectedTag(selectedTag === tag ? null : tag); 
                        setSelectedNotebook(null); 
                        setShowArchived(false); 
                      }}
                      className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-colors hover:bg-white/10 ${
                        selectedTag === tag ? 'bg-white/15 font-medium' : ''
                      }`}
                    >
                      <Tag className="h-3 w-3 shrink-0" />
                      <span className="truncate">{tag}</span>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Bookmarklet Section */}
          <div className="pt-4">
            <div className="px-3 py-1 text-xs font-semibold uppercase tracking-wider opacity-70">
              Web Clipper
            </div>
            <div className="px-3 py-2 space-y-2">
              <p className="text-[10px] opacity-60 leading-relaxed">
                Trascina il link qui sotto nella barra dei segnalibri per clipare pagine web:
              </p>
              <a
                href={bookmarkletCode}
                onClick={e => e.preventDefault()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-300 rounded text-xs font-medium transition-colors cursor-grab"
                draggable
              >
                <Scissors className="h-3 w-3" />
                📎 Clip in SicurNote
              </a>
              <Button
                variant="ghost"
                size="sm"
                className="w-full h-7 text-[10px] opacity-70 hover:opacity-100 hover:bg-white/10"
                onClick={handleCopyBookmarklet}
              >
                {bookmarkletCopied ? <Check className="h-3 w-3 mr-1" /> : <Copy className="h-3 w-3 mr-1" />}
                {bookmarkletCopied ? "Copiato!" : "Copia codice bookmarklet"}
              </Button>
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
};

export default SicurNoteSidebar;
