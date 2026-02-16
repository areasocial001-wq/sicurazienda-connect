import { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
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
import { Plus, NotebookPen, StickyNote, Menu, Sparkles, FileText, Scissors, Upload } from "lucide-react";
import SicurNoteSidebar from "@/components/notes/SicurNoteSidebar";
import SicurNoteHome from "@/components/notes/SicurNoteHome";
import NotesList from "@/components/notes/NotesList";
import NoteEditorPanel from "@/components/notes/NoteEditorPanel";
import NoteSemanticSearch from "@/components/notes/NoteSemanticSearch";
import { NOTE_TEMPLATES } from "@/components/notes/noteTemplates";
import WebClipperDialog from "@/components/notes/WebClipperDialog";
import EnexImportDialog from "@/components/notes/EnexImportDialog";

const Notes = () => {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const {
    notes, allNotes, sharedNotes, notebooks, allTags, isLoading,
    searchQuery, setSearchQuery,
    selectedNotebook, setSelectedNotebook,
    selectedTag, setSelectedTag,
    showArchived, setShowArchived,
    showSharedWithMe, setShowSharedWithMe,
    createNotebook, updateNotebook, deleteNotebook,
    createNote, updateNote, deleteNote,
    fetchAttachments, uploadAttachment, deleteAttachment, getAttachmentUrl,
  } = useNotes();

  const [activeNote, setActiveNote] = useState<Note | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(!isMobile);
  const [mobileView, setMobileView] = useState<'list' | 'editor'>('list');
  const [contactSearch, setContactSearch] = useState("");
  const [contacts, setContacts] = useState<{ id: string; name: string; company: string | null }[]>([]);
  const [showContactPicker, setShowContactPicker] = useState(false);
  const [showSemanticSearch, setShowSemanticSearch] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showWebClipper, setShowWebClipper] = useState(false);
  const [showEnexImport, setShowEnexImport] = useState(false);
  const [showHome, setShowHome] = useState(true);
  // Open specific note from URL param (e.g., from CRM contact detail)
  useEffect(() => {
    const noteId = searchParams.get("noteId");
    if (noteId && allNotes.length > 0) {
      const found = allNotes.find(n => n.id === noteId);
      if (found) {
        setActiveNote(found);
        if (isMobile) setMobileView('editor');
      }
    }
  }, [searchParams, allNotes]);

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
    if (showSharedWithMe) return "Condivise con me";
    if (showArchived) return "Archivio";
    if (selectedNotebook) {
      const nb = notebooks.find(n => n.id === selectedNotebook);
      return nb ? `${nb.icon} ${nb.name}` : "Taccuino";
    }
    if (selectedTag) return `🏷️ ${selectedTag}`;
    return "Tutte le note";
  }, [showSharedWithMe, showArchived, selectedNotebook, selectedTag, notebooks]);

  // Handle bookmarklet clip params
  useEffect(() => {
    const clip = searchParams.get("clip");
    if (clip === "1") {
      const clipTitle = searchParams.get("title") || "";
      const clipUrl = searchParams.get("url") || "";
      const clipText = searchParams.get("text") || "";
      if (clipTitle || clipUrl || clipText) {
        handleWebClip({
          title: clipTitle || `Clip: ${clipUrl}`,
          url: clipUrl,
          content: clipText,
          notebook_id: null,
        });
        // Clean URL params
        window.history.replaceState({}, '', '/notes');
      }
    }
  }, [searchParams]);

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

  const handleCreateFromTemplate = async (templateId: string) => {
    const template = NOTE_TEMPLATES.find(t => t.id === templateId);
    if (!template) return;
    const result = await createNote.mutateAsync({
      title: template.title,
      content: template.content,
      notebook_id: selectedNotebook,
    });
    if (result) {
      const newNote = { ...result, tags: result.tags || [], contact: null } as Note;
      setActiveNote(newNote);
      if (isMobile) setMobileView('editor');
      setShowTemplates(false);
    }
  };

  const handleDeleteNote = (id: string) => {
    deleteNote.mutate(id);
    if (activeNote?.id === id) setActiveNote(null);
    if (isMobile) setMobileView('list');
  };

  const handleSelectNote = (note: Note) => {
    setActiveNote(note);
    setShowHome(false);
    if (isMobile) setMobileView('editor');
  };

  const handleOpenNoteById = (noteId: string) => {
    const found = allNotes.find(n => n.id === noteId) || sharedNotes.find(n => n.id === noteId);
    if (found) {
      setActiveNote(found);
      if (!showSharedWithMe && !allNotes.find(n => n.id === noteId)) {
        setShowSharedWithMe(true);
      }
      if (isMobile) setMobileView('editor');
    }
  };

  const handleWebClip = async (data: { title: string; url: string; content: string; notebook_id: string | null }) => {
    const result = await createNote.mutateAsync({
      title: data.title,
      content: data.content,
      notebook_id: data.notebook_id,
      tags: ["web-clip"],
    });
    if (result) {
      const newNote = { ...result, tags: result.tags || [], contact: null } as Note;
      setActiveNote(newNote);
      if (isMobile) setMobileView('editor');
      toast.success("Web clip salvato in SicurNote");
    }
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
            showSharedWithMe={showSharedWithMe}
            setShowSharedWithMe={setShowSharedWithMe}
            showHome={showHome}
            setShowHome={setShowHome}
            onCreateNotebook={(name, color) => createNotebook.mutate({ name, color })}
            onDeleteNotebook={(id) => deleteNotebook.mutate(id)}
            onUpdateNotebook={(id, data) => updateNotebook.mutate({ id, ...data })}
            noteCountByNotebook={noteCountByNotebook}
            totalNotes={allNotes.filter(n => !n.is_archived).length}
            sharedNotesCount={sharedNotes.length}
            onOpenNote={handleOpenNoteById}
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
            <Dialog open={showTemplates} onOpenChange={setShowTemplates}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="sm" className="text-xs h-7">
                  <FileText className="h-3 w-3 mr-1" /> Template
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader><DialogTitle>Crea da Template</DialogTitle></DialogHeader>
                <div className="space-y-2">
                  {NOTE_TEMPLATES.map(t => (
                    <button
                      key={t.id}
                      onClick={() => handleCreateFromTemplate(t.id)}
                      className="w-full text-left p-3 rounded-md border border-border hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-lg">{t.icon}</span>
                        <span className="text-sm font-medium">{t.name}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">{t.description}</p>
                    </button>
                  ))}
                </div>
              </DialogContent>
            </Dialog>
            <Button
              variant="ghost" size="sm"
              className={`text-xs h-7 ${showSemanticSearch ? 'text-primary' : ''}`}
              onClick={() => setShowSemanticSearch(!showSemanticSearch)}
            >
              <Sparkles className="h-3 w-3 mr-1" /> AI Search
            </Button>
            <Button
              variant="ghost" size="sm"
              className="text-xs h-7"
              onClick={() => setShowWebClipper(true)}
            >
              <Scissors className="h-3 w-3 mr-1" /> Web Clip
            </Button>
            <Button
              variant="ghost" size="sm"
              className="text-xs h-7"
              onClick={() => setShowEnexImport(true)}
            >
              <Upload className="h-3 w-3 mr-1" /> Import .enex
            </Button>
          </div>
          {showSemanticSearch && (
            <div className="p-2 border-b border-border bg-muted/20">
              <NoteSemanticSearch
                notes={allNotes}
                onSelectNote={handleSelectNote}
                onClose={() => setShowSemanticSearch(false)}
              />
            </div>
          )}
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

        {/* Editor / Home */}
        <div className="flex-1 min-w-0">
          {showHome ? (
            <SicurNoteHome
              allNotes={allNotes}
              notebooks={notebooks}
              noteCountByNotebook={noteCountByNotebook}
              onSelectNote={handleSelectNote}
              onCreateNote={() => handleCreateNote()}
              onCreateNoteFromScratch={async (content) => {
                const result = await createNote.mutateAsync({
                  title: "Da Scratch Pad",
                  content: `<p>${content.replace(/\n/g, '</p><p>')}</p>`,
                  notebook_id: selectedNotebook,
                });
                if (result) {
                  const newNote = { ...result, tags: result.tags || [], contact: null } as Note;
                  setActiveNote(newNote);
                  setShowHome(false);
                }
              }}
              userName={user?.email?.split('@')[0]}
            />
          ) : activeNote ? (
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

      {/* Web Clipper Dialog */}
      <WebClipperDialog
        open={showWebClipper}
        onOpenChange={setShowWebClipper}
        notebooks={notebooks}
        selectedNotebook={selectedNotebook}
        onClip={handleWebClip}
      />

      {/* Enex Import Dialog */}
      <EnexImportDialog
        open={showEnexImport}
        onOpenChange={setShowEnexImport}
        onImportComplete={() => {
          queryClient.invalidateQueries({ queryKey: ['notes'] });
        }}
        selectedNotebook={selectedNotebook}
      />
    </div>
  );
};

export default Notes;
