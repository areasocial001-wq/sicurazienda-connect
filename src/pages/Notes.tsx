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
import {
  Plus, NotebookPen, StickyNote, Menu, Sparkles, FileText, Scissors, Upload,
  MoreVertical, Archive, Users, Tag, Home, FolderOpen, Search,
} from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
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
        <div className="flex items-center gap-2 px-3 py-2.5 border-b border-border bg-[hsl(var(--sicurnote-sidebar))] text-[hsl(var(--sicurnote-sidebar-foreground))]">
          <NotebookPen className="h-5 w-5 text-emerald-400" />
          <span className="font-bold flex-1 text-sm">SicurNote</span>

          {/* Template button - prominent */}
          <Dialog open={showTemplates} onOpenChange={setShowTemplates}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 px-2 text-inherit hover:bg-white/10 text-xs">
                <FileText className="h-4 w-4 mr-1" /> Template
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-[calc(100vw-2rem)]">
              <DialogHeader><DialogTitle>Crea da Template</DialogTitle></DialogHeader>
              <div className="space-y-2 max-h-[60vh] overflow-auto">
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

          {/* New note button */}
          <Button variant="ghost" size="icon" className="h-8 w-8 text-inherit hover:bg-white/10" onClick={() => handleCreateNote()}>
            <Plus className="h-4 w-4" />
          </Button>

          {/* Mobile menu sheet */}
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-inherit hover:bg-white/10">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72 p-0">
              <SheetHeader className="px-4 py-3 border-b">
                <SheetTitle className="flex items-center gap-2 text-base">
                  <NotebookPen className="h-4 w-4 text-emerald-500" /> Menu SicurNote
                </SheetTitle>
              </SheetHeader>
              <div className="py-2 space-y-1 px-2">
                {/* Navigation */}
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground px-2 pt-2 pb-1">Navigazione</p>
                <button
                  onClick={() => { setShowHome(true); setSelectedNotebook(null); setSelectedTag(null); setShowArchived(false); setShowSharedWithMe(false); }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors hover:bg-muted ${showHome ? 'bg-accent font-medium' : ''}`}
                >
                  <Home className="h-4 w-4" /> Home
                </button>
                <button
                  onClick={() => { setSelectedNotebook(null); setSelectedTag(null); setShowArchived(false); setShowSharedWithMe(false); setShowHome(false); }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors hover:bg-muted ${!selectedNotebook && !selectedTag && !showArchived && !showSharedWithMe && !showHome ? 'bg-accent font-medium' : ''}`}
                >
                  <StickyNote className="h-4 w-4" /> Tutte le note
                  <span className="ml-auto text-xs text-muted-foreground">{allNotes.filter(n => !n.is_archived).length}</span>
                </button>
                <button
                  onClick={() => { setShowArchived(!showArchived); setSelectedNotebook(null); setSelectedTag(null); setShowSharedWithMe(false); setShowHome(false); }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors hover:bg-muted ${showArchived ? 'bg-accent font-medium' : ''}`}
                >
                  <Archive className="h-4 w-4" /> Archivio
                </button>
                <button
                  onClick={() => { setShowSharedWithMe(!showSharedWithMe); setSelectedNotebook(null); setSelectedTag(null); setShowArchived(false); setShowHome(false); }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors hover:bg-muted ${showSharedWithMe ? 'bg-accent font-medium' : ''}`}
                >
                  <Users className="h-4 w-4" /> Condivise con me
                  {sharedNotes.length > 0 && <span className="ml-auto text-xs text-muted-foreground">{sharedNotes.length}</span>}
                </button>

                {/* Notebooks */}
                {notebooks.length > 0 && (
                  <>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground px-2 pt-3 pb-1">Taccuini</p>
                    {notebooks.map(nb => (
                      <button
                        key={nb.id}
                        onClick={() => { setSelectedNotebook(nb.id); setSelectedTag(null); setShowArchived(false); setShowSharedWithMe(false); setShowHome(false); }}
                        className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors hover:bg-muted ${selectedNotebook === nb.id ? 'bg-accent font-medium' : ''}`}
                      >
                        <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: nb.color || '#3b82f6' }} />
                        <span>{nb.icon || '📓'}</span>
                        <span className="flex-1 truncate text-left">{nb.name}</span>
                        <span className="text-xs text-muted-foreground">{noteCountByNotebook[nb.id] || 0}</span>
                      </button>
                    ))}
                  </>
                )}

                {/* Tags */}
                {allTags.length > 0 && (
                  <>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground px-2 pt-3 pb-1">Tag</p>
                    {allTags.slice(0, 10).map(tag => (
                      <button
                        key={tag}
                        onClick={() => { setSelectedTag(selectedTag === tag ? null : tag); setSelectedNotebook(null); setShowArchived(false); setShowHome(false); }}
                        className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors hover:bg-muted ${selectedTag === tag ? 'bg-accent font-medium' : ''}`}
                      >
                        <Tag className="h-3.5 w-3.5" />
                        <span className="truncate">{tag}</span>
                      </button>
                    ))}
                  </>
                )}

                {/* Actions */}
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground px-2 pt-3 pb-1">Strumenti</p>
                <Dialog open={showContactPicker} onOpenChange={setShowContactPicker}>
                  <DialogTrigger asChild>
                    <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors hover:bg-muted">
                      <FolderOpen className="h-4 w-4" /> Nota con contatto
                    </button>
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
                <button
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors hover:bg-muted"
                  onClick={() => setShowSemanticSearch(!showSemanticSearch)}
                >
                  <Sparkles className="h-4 w-4" /> Ricerca AI
                </button>
                <button
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors hover:bg-muted"
                  onClick={() => setShowWebClipper(true)}
                >
                  <Scissors className="h-4 w-4" /> Web Clipper
                </button>
                <button
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors hover:bg-muted"
                  onClick={() => setShowEnexImport(true)}
                >
                  <Upload className="h-4 w-4" /> Importa .enex
                </button>
              </div>
            </SheetContent>
          </Sheet>
        </div>

        {/* Mobile semantic search */}
        {showSemanticSearch && (
          <div className="p-2 border-b border-border bg-muted/20">
            <NoteSemanticSearch
              notes={allNotes}
              onSelectNote={(note) => { handleSelectNote(note); setShowSemanticSearch(false); }}
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

        {/* Mobile Dialogs */}
        <WebClipperDialog
          open={showWebClipper}
          onOpenChange={setShowWebClipper}
          notebooks={notebooks}
          selectedNotebook={selectedNotebook}
          onClip={handleWebClip}
        />
        <EnexImportDialog
          open={showEnexImport}
          onOpenChange={setShowEnexImport}
          onImportComplete={() => {
            queryClient.invalidateQueries({ queryKey: ['notes'] });
          }}
          selectedNotebook={selectedNotebook}
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
