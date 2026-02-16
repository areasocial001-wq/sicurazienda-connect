import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Notebook } from "@/hooks/useNotes";
import {
  StickyNote, BookOpen, Tag, Plus, Trash2, X,
  FolderPlus, Archive, Search, ChevronDown, ChevronRight,
  NotebookPen,
} from "lucide-react";

interface SicurNoteSidebarProps {
  notebooks: Notebook[];
  allTags: string[];
  selectedNotebook: string | null;
  setSelectedNotebook: (id: string | null) => void;
  selectedTag: string | null;
  setSelectedTag: (tag: string | null) => void;
  showArchived: boolean;
  setShowArchived: (show: boolean) => void;
  onCreateNotebook: (name: string) => void;
  onDeleteNotebook: (id: string) => void;
  noteCountByNotebook: Record<string, number>;
  totalNotes: number;
  collapsed?: boolean;
}

const SicurNoteSidebar = ({
  notebooks, allTags, selectedNotebook, setSelectedNotebook,
  selectedTag, setSelectedTag, showArchived, setShowArchived,
  onCreateNotebook, onDeleteNotebook, noteCountByNotebook,
  totalNotes, collapsed,
}: SicurNoteSidebarProps) => {
  const [showNewNotebook, setShowNewNotebook] = useState(false);
  const [newNotebookName, setNewNotebookName] = useState("");
  const [notebooksOpen, setNotebooksOpen] = useState(true);
  const [tagsOpen, setTagsOpen] = useState(true);

  const handleCreate = () => {
    if (!newNotebookName.trim()) return;
    onCreateNotebook(newNotebookName.trim());
    setNewNotebookName("");
    setShowNewNotebook(false);
  };

  if (collapsed) return null;

  return (
    <div className="w-60 shrink-0 bg-[hsl(var(--sicurnote-sidebar))] text-[hsl(var(--sicurnote-sidebar-foreground))] flex flex-col h-full border-r border-border">
      {/* Logo */}
      <div className="px-4 py-4 border-b border-white/10">
        <div className="flex items-center gap-2">
          <NotebookPen className="h-6 w-6 text-emerald-400" />
          <span className="text-lg font-bold tracking-tight">SicurNote</span>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-3 space-y-1">
          {/* All Notes */}
          <button
            onClick={() => { setSelectedNotebook(null); setSelectedTag(null); setShowArchived(false); }}
            className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors hover:bg-white/10 ${
              !selectedNotebook && !selectedTag && !showArchived ? 'bg-white/15 font-medium' : ''
            }`}
          >
            <StickyNote className="h-4 w-4 shrink-0" />
            <span className="flex-1 text-left">Tutte le note</span>
            <span className="text-xs opacity-60">{totalNotes}</span>
          </button>

          {/* Archive */}
          <button
            onClick={() => { setShowArchived(!showArchived); setSelectedNotebook(null); setSelectedTag(null); }}
            className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors hover:bg-white/10 ${
              showArchived ? 'bg-white/15 font-medium' : ''
            }`}
          >
            <Archive className="h-4 w-4 shrink-0" />
            <span className="flex-1 text-left">Archivio</span>
          </button>

          {/* Notebooks Section */}
          <div className="pt-3">
            <button
              onClick={() => setNotebooksOpen(!notebooksOpen)}
              className="w-full flex items-center gap-1 px-3 py-1 text-xs font-semibold uppercase tracking-wider opacity-70 hover:opacity-100"
            >
              {notebooksOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
              Taccuini
            </button>
            
            {notebooksOpen && (
              <div className="mt-1 space-y-0.5">
                {notebooks.map(nb => (
                  <div
                    key={nb.id}
                    className={`group flex items-center gap-2 px-3 py-1.5 rounded-md text-sm cursor-pointer transition-colors hover:bg-white/10 ${
                      selectedNotebook === nb.id ? 'bg-white/15 font-medium' : ''
                    }`}
                    onClick={() => { setSelectedNotebook(nb.id); setSelectedTag(null); setShowArchived(false); }}
                  >
                    <span className="text-base shrink-0">{nb.icon}</span>
                    <span className="flex-1 truncate">{nb.name}</span>
                    <span className="text-xs opacity-60">{noteCountByNotebook[nb.id] || 0}</span>
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
                  <div className="flex gap-1 px-2 pt-1">
                    <Input
                      value={newNotebookName}
                      onChange={e => setNewNotebookName(e.target.value)}
                      placeholder="Nome taccuino..."
                      className="h-7 text-xs bg-white/10 border-white/20 text-inherit placeholder:text-white/40"
                      onKeyDown={e => e.key === "Enter" && handleCreate()}
                      autoFocus
                    />
                    <Button size="icon" variant="ghost" className="h-7 w-7 hover:bg-white/10" onClick={handleCreate}>
                      <Plus className="h-3 w-3" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7 hover:bg-white/10" onClick={() => setShowNewNotebook(false)}>
                      <X className="h-3 w-3" />
                    </Button>
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
        </div>
      </ScrollArea>
    </div>
  );
};

export default SicurNoteSidebar;
