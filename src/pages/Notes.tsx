import { useState, useEffect, useMemo } from "react";
import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";
import { useNotes, Note } from "@/hooks/useNotes";
import { useAuth } from "@/hooks/useAuth";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, NotebookPen, StickyNote, Menu } from "lucide-react";
import SicurNoteSidebar from "@/components/notes/SicurNoteSidebar";
import NotesList from "@/components/notes/NotesList";
import NoteEditorPanel from "@/components/notes/NoteEditorPanel";

const Notes = () => {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const {
    notes, allNotes, notebooks, allTags, isLoading,
    searchQuery, setSearchQuery,
    selectedNotebook, setSelectedNotebook,
    selectedTag, setSelectedTag,
    showArchived, setShowArchived,
    createNotebook, deleteNotebook,
    createNote, updateNote, deleteNote,
    fetchAttachments, uploadAttachment, deleteAttachment, getAttachmentUrl,
  } = useNotes();

  const [activeNote, setActiveNote] = useState<Note | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(!isMobile);
  const [mobileView, setMobileView] = useState<'list' | 'editor'>('list');
  const [contactSearch, setContactSearch] = useState("");
  const [contacts, setContacts] = useState<{ id: string; name: string; company: string | null }[]>([]);
  const [showContactPicker, setShowContactPicker] = useState(false);

  // Note count by notebook
  const noteCountByNotebook = useMemo(() => {
    const counts: Record<string, number> = {};
    allNotes.forEach(n => {
      if (n.notebook_id) counts[n.notebook_id] = (counts[n.notebook_id] || 0) + 1;
    });
    return counts;
  }, [allNotes]);

  // Get title for notes list
  const listTitle = useMemo(() => {
    if (showArchived) return "Archivio";
    if (selectedNotebook) {
      const nb = notebooks.find(n => n.id === selectedNotebook);
      return nb ? `${nb.icon} ${nb.name}` : "Taccuino";
    }
    if (selectedTag) return `🏷️ ${selectedTag}`;
    return "Tutte le note";
  }, [showArchived, selectedNotebook, selectedTag, notebooks]);

  // Contact search for linking
  useEffect(() => {
    if (!contactSearch || contactSearch.length < 2) { setContacts([]); return; }
    const timer = setTimeout(async () => {
      const { data } = await supabase
        .from("crm_contacts")
        .select("id, name, company")
        .or(`name.ilike.%${contactSearch}%,company.ilike.%${contactSearch}%`)
        .limit(10);
      setContacts(data || []);
    }, 300);
    return () => clearTimeout(timer);
  }, [contactSearch]);

  const handleCreateNote = async (contactId?: string) => {
    const result = await createNote.mutateAsync({
      title: "Nota senza titolo",
      notebook_id: selectedNotebook,
      contact_id: contactId || null,
    });
    if (result) {
      const newNote = { ...result, tags: result.tags || [], contact: null } as Note;
      setActiveNote(newNote);
      if (isMobile) setMobileView('editor');
    }
  };

  const handleDeleteNote = (id: string) => {
    deleteNote.mutate(id);
    if (activeNote?.id === id) setActiveNote(null);
    if (isMobile) setMobileView('list');
  };

  const handleSelectNote = (note: Note) => {
    setActiveNote(note);
    if (isMobile) setMobileView('editor');
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto p-8 text-center">
          <NotebookPen className="h-16 w-16 mx-auto mb-4 text-emerald-500" />
          <h2 className="text-2xl font-bold mb-2">SicurNote</h2>
          <p className="text-muted-foreground">Accedi per utilizzare SicurNote</p>
        </div>
        <BottomNav />
      </div>
    );
  }

  // Mobile: show either list or editor
  if (isMobile) {
    if (mobileView === 'editor' && activeNote) {
      return (
        <div className="h-screen flex flex-col bg-background">
          <NoteEditorPanel
            note={activeNote}
            notebooks={notebooks}
            onSave={(data) => updateNote.mutate(data)}
            onDelete={handleDeleteNote}
            onClose={() => setMobileView('list')}
            onUploadAttachment={uploadAttachment}
            onDeleteAttachment={deleteAttachment}
            fetchAttachments={fetchAttachments}
            getAttachmentUrl={getAttachmentUrl}
            showBackButton
          />
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-background flex flex-col pb-20">
        {/* Mobile header */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-[hsl(var(--sicurnote-sidebar))] text-[hsl(var(--sicurnote-sidebar-foreground))]">
          <NotebookPen className="h-5 w-5 text-emerald-400" />
          <span className="font-bold flex-1">SicurNote</span>
          <Dialog open={showContactPicker} onOpenChange={setShowContactPicker}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-inherit hover:bg-white/10">
                <Plus className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Collega nota a contatto</DialogTitle></DialogHeader>
              <Input placeholder="Cerca contatto..." value={contactSearch} onChange={e => setContactSearch(e.target.value)} />
              <div className="space-y-1 max-h-60 overflow-auto">
                {contacts.map(c => (
                  <Button key={c.id} variant="ghost" className="w-full justify-start text-sm" onClick={() => {
                    handleCreateNote(c.id);
                    setShowContactPicker(false);
                    setContactSearch("");
                  }}>
                    {c.name} {c.company && <span className="text-muted-foreground ml-1">({c.company})</span>}
                  </Button>
                ))}
              </div>
            </DialogContent>
          </Dialog>
          <Button variant="ghost" size="sm" className="text-inherit hover:bg-white/10" onClick={() => handleCreateNote()}>
            <Plus className="h-4 w-4 mr-1" /> Nota
          </Button>
        </div>

        <NotesList
          notes={notes}
          activeNoteId={activeNote?.id || null}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          onSelectNote={handleSelectNote}
          onCreateNote={() => handleCreateNote()}
          isLoading={isLoading}
          title={listTitle}
        />
        <BottomNav />
      </div>
    );
  }

  // Desktop: 3-panel layout
  return (
    <div className="h-screen flex flex-col">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        {sidebarOpen && (
          <SicurNoteSidebar
            notebooks={notebooks}
            allTags={allTags}
            selectedNotebook={selectedNotebook}
            setSelectedNotebook={setSelectedNotebook}
            selectedTag={selectedTag}
            setSelectedTag={setSelectedTag}
            showArchived={showArchived}
            setShowArchived={setShowArchived}
            onCreateNotebook={(name) => createNotebook.mutate({ name })}
            onDeleteNotebook={(id) => deleteNotebook.mutate(id)}
            noteCountByNotebook={noteCountByNotebook}
            totalNotes={allNotes.filter(n => !n.is_archived).length}
          />
        )}

        {/* Notes List */}
        <div className="flex flex-col" style={{ width: sidebarOpen ? undefined : undefined }}>
          <div className="flex items-center px-2 py-1 border-b border-border gap-1">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setSidebarOpen(!sidebarOpen)}>
              <Menu className="h-4 w-4" />
            </Button>
            <Dialog open={showContactPicker} onOpenChange={setShowContactPicker}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="sm" className="text-xs h-7">
                  <Plus className="h-3 w-3 mr-1" /> Con contatto
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Collega nota a contatto</DialogTitle></DialogHeader>
                <Input placeholder="Cerca contatto..." value={contactSearch} onChange={e => setContactSearch(e.target.value)} />
                <div className="space-y-1 max-h-60 overflow-auto">
                  {contacts.map(c => (
                    <Button key={c.id} variant="ghost" className="w-full justify-start text-sm" onClick={() => {
                      handleCreateNote(c.id);
                      setShowContactPicker(false);
                      setContactSearch("");
                    }}>
                      {c.name} {c.company && <span className="text-muted-foreground ml-1">({c.company})</span>}
                    </Button>
                  ))}
                </div>
              </DialogContent>
            </Dialog>
          </div>
          <NotesList
            notes={notes}
            activeNoteId={activeNote?.id || null}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            onSelectNote={handleSelectNote}
            onCreateNote={() => handleCreateNote()}
            isLoading={isLoading}
            title={listTitle}
          />
        </div>

        {/* Editor */}
        <div className="flex-1 min-w-0">
          {activeNote ? (
            <NoteEditorPanel
              note={activeNote}
              notebooks={notebooks}
              onSave={(data) => updateNote.mutate(data)}
              onDelete={handleDeleteNote}
              onUploadAttachment={uploadAttachment}
              onDeleteAttachment={deleteAttachment}
              fetchAttachments={fetchAttachments}
              getAttachmentUrl={getAttachmentUrl}
            />
          ) : (
            <div className="h-full flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <NotebookPen className="h-16 w-16 mx-auto mb-4 text-emerald-500/30" />
                <p className="text-lg font-medium">Seleziona una nota</p>
                <p className="text-sm">oppure creane una nuova</p>
                <Button className="mt-4" onClick={() => handleCreateNote()}>
                  <Plus className="h-4 w-4 mr-2" /> Nuova nota
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Notes;
