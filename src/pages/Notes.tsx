import { useState, useEffect, useRef, useCallback } from "react";
import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";
import { useNotes, Note, NoteAttachment } from "@/hooks/useNotes";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Plus, Search, Pin, PinOff, Archive, ArchiveRestore, Trash2,
  BookOpen, Tag, Paperclip, Download, X, StickyNote, FolderPlus,
  ChevronLeft, Save, FileText, Image, Music, File,
} from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";

const NOTE_COLORS = [
  null, "#fef3c7", "#dcfce7", "#dbeafe", "#fce7f3", "#f3e8ff", "#fed7aa",
];

const NoteEditor = ({
  note,
  onSave,
  onClose,
  notebooks,
  onUploadAttachment,
  onDeleteAttachment,
  fetchAttachments,
  getAttachmentUrl,
}: {
  note: Note;
  onSave: (data: Partial<Note> & { id: string }) => void;
  onClose: () => void;
  notebooks: any[];
  onUploadAttachment: (noteId: string, file: File) => Promise<any>;
  onDeleteAttachment: (att: NoteAttachment) => Promise<void>;
  fetchAttachments: (noteId: string) => Promise<NoteAttachment[]>;
  getAttachmentUrl: (path: string) => Promise<string>;
}) => {
  const [title, setTitle] = useState(note.title);
  const [content, setContent] = useState(note.content);
  const [notebookId, setNotebookId] = useState(note.notebook_id || "none");
  const [tags, setTags] = useState(note.tags.join(", "));
  const [color, setColor] = useState(note.color);
  const [attachments, setAttachments] = useState<NoteAttachment[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    fetchAttachments(note.id).then(setAttachments).catch(console.error);
  }, [note.id, fetchAttachments]);

  const doSave = useCallback(() => {
    const parsedTags = tags.split(",").map(t => t.trim()).filter(Boolean);
    onSave({
      id: note.id,
      title: title || "Nota senza titolo",
      content,
      notebook_id: notebookId === "none" ? null : notebookId,
      tags: parsedTags,
      color,
    });
  }, [title, content, notebookId, tags, color, note.id, onSave]);

  // Auto-save on content change
  useEffect(() => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(doSave, 1500);
    return () => { if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current); };
  }, [title, content, notebookId, tags, color, doSave]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;
    setIsUploading(true);
    try {
      for (const file of Array.from(files)) {
        if (file.size > 20 * 1024 * 1024) {
          toast.error(`${file.name} supera il limite di 20MB`);
          continue;
        }
        await onUploadAttachment(note.id, file);
      }
      const updated = await fetchAttachments(note.id);
      setAttachments(updated);
      toast.success("File allegato");
    } catch {
      toast.error("Errore nel caricamento");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDeleteAttachment = async (att: NoteAttachment) => {
    try {
      await onDeleteAttachment(att);
      setAttachments(prev => prev.filter(a => a.id !== att.id));
      toast.success("Allegato rimosso");
    } catch {
      toast.error("Errore nella rimozione");
    }
  };

  const handleDownload = async (att: NoteAttachment) => {
    try {
      const url = await getAttachmentUrl(att.file_path);
      window.open(url, "_blank");
    } catch {
      toast.error("Errore nel download");
    }
  };

  const getFileIcon = (type: string | null) => {
    if (!type) return <File className="h-4 w-4" />;
    if (type.startsWith("image/")) return <Image className="h-4 w-4" />;
    if (type.startsWith("audio/")) return <Music className="h-4 w-4" />;
    if (type.includes("pdf")) return <FileText className="h-4 w-4" />;
    return <File className="h-4 w-4" />;
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 p-3 border-b border-border">
        <Button variant="ghost" size="icon" onClick={() => { doSave(); onClose(); }}>
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1 min-w-0">
          <Input
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Titolo nota..."
            className="border-none text-lg font-semibold p-0 h-auto focus-visible:ring-0"
          />
        </div>
        <Button variant="ghost" size="icon" onClick={() => { doSave(); toast.success("Salvato"); }}>
          <Save className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex-1 overflow-auto p-3 space-y-3">
        {/* Color & Notebook row */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex gap-1">
            {NOTE_COLORS.map((c, i) => (
              <button
                key={i}
                onClick={() => setColor(c)}
                className={`w-6 h-6 rounded-full border-2 transition-all ${color === c ? "border-foreground scale-110" : "border-border"}`}
                style={{ backgroundColor: c || "hsl(var(--background))" }}
              />
            ))}
          </div>
          <Select value={notebookId} onValueChange={setNotebookId}>
            <SelectTrigger className="w-40 h-8 text-xs">
              <SelectValue placeholder="Quaderno" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Nessun quaderno</SelectItem>
              {notebooks.map(nb => (
                <SelectItem key={nb.id} value={nb.id}>{nb.icon} {nb.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Tags */}
        <div className="flex items-center gap-2">
          <Tag className="h-4 w-4 text-muted-foreground shrink-0" />
          <Input
            value={tags}
            onChange={e => setTags(e.target.value)}
            placeholder="Tag separati da virgola..."
            className="h-8 text-xs"
          />
        </div>

        {/* Content */}
        <Textarea
          value={content}
          onChange={e => setContent(e.target.value)}
          placeholder="Scrivi qui la tua nota..."
          className="min-h-[200px] flex-1 resize-none text-sm leading-relaxed"
        />

        {/* Attachments */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground flex items-center gap-1">
              <Paperclip className="h-3 w-3" /> Allegati ({attachments.length})
            </span>
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
            >
              <Plus className="h-3 w-3 mr-1" /> Aggiungi
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={handleFileUpload}
              accept="image/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
            />
          </div>
          {attachments.map(att => (
            <div key={att.id} className="flex items-center gap-2 p-2 bg-muted rounded-md text-xs">
              {getFileIcon(att.file_type)}
              <span className="flex-1 truncate">{att.file_name}</span>
              <span className="text-muted-foreground shrink-0">
                {att.file_size ? `${(att.file_size / 1024).toFixed(0)}KB` : ""}
              </span>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleDownload(att)}>
                <Download className="h-3 w-3" />
              </Button>
              <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => handleDeleteAttachment(att)}>
                <X className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>

        {/* Contact link info */}
        {note.contact && (
          <div className="text-xs text-muted-foreground bg-muted p-2 rounded-md">
            📌 Collegata a: <strong>{note.contact.name}</strong>
            {note.contact.company && ` (${note.contact.company})`}
          </div>
        )}
      </div>
    </div>
  );
};

const Notes = () => {
  const { user } = useAuth();
  const {
    notes, notebooks, allTags, isLoading,
    searchQuery, setSearchQuery,
    selectedNotebook, setSelectedNotebook,
    selectedTag, setSelectedTag,
    showArchived, setShowArchived,
    createNotebook, deleteNotebook,
    createNote, updateNote, deleteNote,
    fetchAttachments, uploadAttachment, deleteAttachment, getAttachmentUrl,
  } = useNotes();

  const [activeNote, setActiveNote] = useState<Note | null>(null);
  const [newNotebookName, setNewNotebookName] = useState("");
  const [showNewNotebook, setShowNewNotebook] = useState(false);
  const [contactSearch, setContactSearch] = useState("");
  const [contacts, setContacts] = useState<{ id: string; name: string; company: string | null }[]>([]);
  const [showContactPicker, setShowContactPicker] = useState(false);

  // Search contacts for linking
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
      setActiveNote({
        ...result,
        tags: result.tags || [],
        contact: null,
      } as Note);
    }
  };

  const handleCreateNotebook = () => {
    if (!newNotebookName.trim()) return;
    createNotebook.mutate({ name: newNotebookName.trim() });
    setNewNotebookName("");
    setShowNewNotebook(false);
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto p-8 text-center">
          <StickyNote className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
          <p className="text-lg text-muted-foreground">Accedi per usare le note</p>
        </div>
        <BottomNav />
      </div>
    );
  }

  // Mobile-first: show editor full screen when note is active
  if (activeNote) {
    return (
      <div className="min-h-screen bg-background flex flex-col" style={activeNote.color ? { backgroundColor: activeNote.color } : {}}>
        <NoteEditor
          note={activeNote}
          notebooks={notebooks}
          onSave={(data) => updateNote.mutate(data)}
          onClose={() => setActiveNote(null)}
          onUploadAttachment={uploadAttachment}
          onDeleteAttachment={deleteAttachment}
          fetchAttachments={fetchAttachments}
          getAttachmentUrl={getAttachmentUrl}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <Header />
      <div className="container mx-auto px-4 py-4 max-w-4xl">
        {/* Title */}
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <StickyNote className="h-6 w-6 text-primary" />
            Le mie Note
          </h1>
          <div className="flex gap-2">
            <Dialog open={showContactPicker} onOpenChange={setShowContactPicker}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Plus className="h-4 w-4 mr-1" /> Con contatto
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Collega nota a un contatto</DialogTitle>
                </DialogHeader>
                <Input
                  placeholder="Cerca contatto..."
                  value={contactSearch}
                  onChange={e => setContactSearch(e.target.value)}
                />
                <div className="space-y-1 max-h-60 overflow-auto">
                  {contacts.map(c => (
                    <Button
                      key={c.id}
                      variant="ghost"
                      className="w-full justify-start text-sm"
                      onClick={() => {
                        handleCreateNote(c.id);
                        setShowContactPicker(false);
                        setContactSearch("");
                      }}
                    >
                      {c.name} {c.company && <span className="text-muted-foreground ml-1">({c.company})</span>}
                    </Button>
                  ))}
                  {contactSearch.length >= 2 && contacts.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-2">Nessun contatto trovato</p>
                  )}
                </div>
              </DialogContent>
            </Dialog>
            <Button size="sm" onClick={() => handleCreateNote()}>
              <Plus className="h-4 w-4 mr-1" /> Nuova nota
            </Button>
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Cerca nelle note..."
            className="pl-9"
          />
        </div>

        <Tabs defaultValue="notes" className="space-y-4">
          <TabsList className="w-full">
            <TabsTrigger value="notes" className="flex-1">Note</TabsTrigger>
            <TabsTrigger value="notebooks" className="flex-1">Quaderni</TabsTrigger>
            <TabsTrigger value="tags" className="flex-1">Tag</TabsTrigger>
          </TabsList>

          <TabsContent value="notes" className="space-y-3">
            {/* Filters */}
            <div className="flex flex-wrap gap-2">
              <Button
                variant={showArchived ? "default" : "outline"}
                size="sm"
                onClick={() => setShowArchived(!showArchived)}
                className="text-xs"
              >
                <Archive className="h-3 w-3 mr-1" /> {showArchived ? "Archiviate" : "Archivio"}
              </Button>
              {selectedNotebook && (
                <Badge variant="secondary" className="cursor-pointer" onClick={() => setSelectedNotebook(null)}>
                  📓 {notebooks.find(n => n.id === selectedNotebook)?.name} <X className="h-3 w-3 ml-1" />
                </Badge>
              )}
              {selectedTag && (
                <Badge variant="secondary" className="cursor-pointer" onClick={() => setSelectedTag(null)}>
                  🏷️ {selectedTag} <X className="h-3 w-3 ml-1" />
                </Badge>
              )}
            </div>

            {/* Notes list */}
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Caricamento...</div>
            ) : notes.length === 0 ? (
              <div className="text-center py-12">
                <StickyNote className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
                <p className="text-muted-foreground">
                  {showArchived ? "Nessuna nota archiviata" : "Nessuna nota. Crea la tua prima nota!"}
                </p>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {notes.map(note => (
                  <Card
                    key={note.id}
                    className="cursor-pointer hover:shadow-md transition-shadow overflow-hidden"
                    style={note.color ? { backgroundColor: note.color } : {}}
                    onClick={() => setActiveNote(note)}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-start justify-between mb-1">
                        <h3 className="font-semibold text-sm truncate flex-1">{note.title}</h3>
                        {note.is_pinned && <Pin className="h-3 w-3 text-primary shrink-0" />}
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-3 mb-2">
                        {note.content || "Nota vuota"}
                      </p>
                      <div className="flex items-center justify-between">
                        <div className="flex gap-1 flex-wrap">
                          {note.tags.slice(0, 3).map(tag => (
                            <Badge key={tag} variant="outline" className="text-[10px] px-1 py-0">{tag}</Badge>
                          ))}
                        </div>
                        <span className="text-[10px] text-muted-foreground">
                          {format(new Date(note.updated_at), "dd MMM", { locale: it })}
                        </span>
                      </div>
                      {note.contact && (
                        <div className="text-[10px] text-muted-foreground mt-1">
                          📌 {note.contact.name}
                        </div>
                      )}
                      {/* Quick actions */}
                      <div className="flex gap-1 mt-2 justify-end" onClick={e => e.stopPropagation()}>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => updateNote.mutate({ id: note.id, is_pinned: !note.is_pinned })}
                        >
                          {note.is_pinned ? <PinOff className="h-3 w-3" /> : <Pin className="h-3 w-3" />}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => updateNote.mutate({ id: note.id, is_archived: !note.is_archived })}
                        >
                          {note.is_archived ? <ArchiveRestore className="h-3 w-3" /> : <Archive className="h-3 w-3" />}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-destructive"
                          onClick={() => { if (confirm("Eliminare questa nota?")) deleteNote.mutate(note.id); }}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="notebooks" className="space-y-3">
            <div className="flex gap-2">
              {showNewNotebook ? (
                <div className="flex gap-2 flex-1">
                  <Input
                    value={newNotebookName}
                    onChange={e => setNewNotebookName(e.target.value)}
                    placeholder="Nome quaderno..."
                    className="flex-1"
                    onKeyDown={e => e.key === "Enter" && handleCreateNotebook()}
                  />
                  <Button size="sm" onClick={handleCreateNotebook}>Crea</Button>
                  <Button size="sm" variant="ghost" onClick={() => setShowNewNotebook(false)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <Button variant="outline" size="sm" onClick={() => setShowNewNotebook(true)}>
                  <FolderPlus className="h-4 w-4 mr-1" /> Nuovo quaderno
                </Button>
              )}
            </div>

            {notebooks.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">Nessun quaderno creato</p>
            ) : (
              <div className="space-y-2">
                {notebooks.map(nb => {
                  const count = notes.filter(n => n.notebook_id === nb.id).length;
                  return (
                    <div
                      key={nb.id}
                      className="flex items-center justify-between p-3 bg-card rounded-lg border border-border cursor-pointer hover:bg-muted transition-colors"
                      onClick={() => { setSelectedNotebook(nb.id); }}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{nb.icon}</span>
                        <div>
                          <p className="font-medium text-sm">{nb.name}</p>
                          <p className="text-xs text-muted-foreground">{count} note</p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive"
                        onClick={e => {
                          e.stopPropagation();
                          if (confirm("Eliminare questo quaderno? Le note non verranno eliminate.")) {
                            deleteNotebook.mutate(nb.id);
                          }
                        }}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="tags" className="space-y-3">
            {allTags.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">Nessun tag usato</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {allTags.map(tag => (
                  <Badge
                    key={tag}
                    variant={selectedTag === tag ? "default" : "outline"}
                    className="cursor-pointer text-sm"
                    onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
                  >
                    <Tag className="h-3 w-3 mr-1" /> {tag}
                  </Badge>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
      <BottomNav />
    </div>
  );
};

export default Notes;
