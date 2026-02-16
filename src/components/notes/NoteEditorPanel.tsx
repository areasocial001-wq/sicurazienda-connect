import { useState, useEffect, useRef, useCallback } from "react";
import { Note, NoteAttachment, Notebook } from "@/hooks/useNotes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import RichTextEditor from "./RichTextEditor";
import NoteAIPanel from "./NoteAIPanel";
import { toast } from "sonner";
import {
  Pin, PinOff, Archive, ArchiveRestore, Trash2,
  Tag, Paperclip, Download, X, Plus, Save,
  FileText, Image, Music, File, ChevronLeft, Sparkles, Share2,
  MessageSquare, History,
} from "lucide-react";
import NoteShareDialog from "./NoteShareDialog";
import NoteComments from "./NoteComments";
import NoteVersionHistory from "./NoteVersionHistory";
import { format } from "date-fns";
import { it } from "date-fns/locale";

const NOTE_COLORS = [
  null, "#fef3c7", "#dcfce7", "#dbeafe", "#fce7f3", "#f3e8ff", "#fed7aa",
];

interface NoteEditorPanelProps {
  note: Note;
  notebooks: Notebook[];
  onSave: (data: Partial<Note> & { id: string }) => void;
  onDelete: (id: string) => void;
  onClose?: () => void;
  onUploadAttachment: (noteId: string, file: File) => Promise<any>;
  onDeleteAttachment: (att: NoteAttachment) => Promise<void>;
  fetchAttachments: (noteId: string) => Promise<NoteAttachment[]>;
  getAttachmentUrl: (path: string) => Promise<string>;
  showBackButton?: boolean;
}

const NoteEditorPanel = ({
  note, notebooks, onSave, onDelete, onClose,
  onUploadAttachment, onDeleteAttachment, fetchAttachments, getAttachmentUrl,
  showBackButton,
}: NoteEditorPanelProps) => {
  const [title, setTitle] = useState(note.title);
  const [content, setContent] = useState(note.content);
  const [notebookId, setNotebookId] = useState(note.notebook_id || "none");
  const [tags, setTags] = useState(note.tags.join(", "));
  const [color, setColor] = useState(note.color);
  const [attachments, setAttachments] = useState<NoteAttachment[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [showAI, setShowAI] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

  // Reset state when note changes
  useEffect(() => {
    setTitle(note.title);
    setContent(note.content);
    setNotebookId(note.notebook_id || "none");
    setTags(note.tags.join(", "));
    setColor(note.color);
    fetchAttachments(note.id).then(setAttachments).catch(console.error);
  }, [note.id]);

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

  // Auto-save
  useEffect(() => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(doSave, 2000);
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
    <div className="flex flex-col h-full bg-background">
      {/* Top bar */}
      <div className="flex items-center gap-2 px-4 py-2 border-b border-border shrink-0">
        {showBackButton && onClose && (
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { doSave(); onClose(); }}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
        )}
        <div className="flex-1" />
        
        {/* Quick actions */}
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onSave({ id: note.id, is_pinned: !note.is_pinned })} title={note.is_pinned ? "Rimuovi pin" : "Fissa"}>
          {note.is_pinned ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
        </Button>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onSave({ id: note.id, is_archived: !note.is_archived })} title={note.is_archived ? "Ripristina" : "Archivia"}>
          {note.is_archived ? <ArchiveRestore className="h-4 w-4" /> : <Archive className="h-4 w-4" />}
        </Button>
        <Button
          variant="ghost" size="icon" className="h-7 w-7"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          title="Allega file"
        >
         <Paperclip className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" className={`h-7 w-7 ${showAI ? 'text-primary' : ''}`} onClick={() => setShowAI(!showAI)} title="Assistente AI">
          <Sparkles className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setShowShare(true)} title="Condividi">
          <Share2 className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" className={`h-7 w-7 ${showComments ? 'text-primary' : ''}`} onClick={() => setShowComments(!showComments)} title="Commenti">
          <MessageSquare className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setShowVersionHistory(true)} title="Cronologia versioni">
          <History className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setShowDetails(!showDetails)} title="Dettagli">
          <Tag className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { doSave(); toast.success("Salvato"); }} title="Salva">
          <Save className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost" size="icon" className="h-7 w-7 text-destructive"
          onClick={() => { if (confirm("Eliminare questa nota?")) onDelete(note.id); }}
          title="Elimina"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
        <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleFileUpload} accept="image/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.txt" />
      </div>

      {/* Details panel (collapsible) */}
      {showDetails && (
        <div className="px-4 py-2 border-b border-border space-y-2 bg-muted/20 shrink-0">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex gap-1">
              {NOTE_COLORS.map((c, i) => (
                <button
                  key={i}
                  onClick={() => setColor(c)}
                  className={`w-5 h-5 rounded-full border-2 transition-all ${color === c ? "border-foreground scale-110" : "border-border"}`}
                  style={{ backgroundColor: c || "hsl(var(--background))" }}
                />
              ))}
            </div>
            <Select value={notebookId} onValueChange={setNotebookId}>
              <SelectTrigger className="w-36 h-7 text-xs">
                <SelectValue placeholder="Taccuino" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nessun taccuino</SelectItem>
                {notebooks.map(nb => (
                  <SelectItem key={nb.id} value={nb.id}>{nb.icon} {nb.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <Tag className="h-3 w-3 text-muted-foreground shrink-0" />
            <Input
              value={tags}
              onChange={e => setTags(e.target.value)}
              placeholder="Tag separati da virgola..."
              className="h-7 text-xs"
            />
          </div>
          {note.contact && (
            <div className="text-xs text-muted-foreground">
              📌 Collegata a: <strong>{note.contact.name}</strong>
              {note.contact.company && ` (${note.contact.company})`}
            </div>
          )}
          <div className="text-[10px] text-muted-foreground">
            Modificata: {format(new Date(note.updated_at), "dd MMM yyyy HH:mm", { locale: it })}
            {" · "}Creata: {format(new Date(note.created_at), "dd MMM yyyy", { locale: it })}
          </div>
        </div>
      )}

      {/* Title */}
      <div className="px-4 pt-3 shrink-0">
        <Input
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="Titolo della nota..."
          className="border-none text-xl font-bold p-0 h-auto focus-visible:ring-0 bg-transparent"
        />
      </div>

      {/* Rich Text Editor */}
      <div className="flex-1 overflow-hidden flex flex-col min-h-0">
        <RichTextEditor
          content={content}
          onChange={setContent}
          placeholder="Inizia a scrivere..."
        />
      </div>

      {/* AI Panel */}
      {showAI && (
        <NoteAIPanel
          note={note}
          onInsertText={(text) => {
            setContent(prev => prev + `<p>${text.replace(/\n/g, '</p><p>')}</p>`);
          }}
        />
      )}

      {/* Attachments bar */}
      {attachments.length > 0 && (
        <div className="px-4 py-2 border-t border-border bg-muted/20 shrink-0">
          <p className="text-[10px] font-medium text-muted-foreground mb-1">
            <Paperclip className="h-3 w-3 inline mr-1" />Allegati ({attachments.length})
          </p>
          <div className="flex flex-wrap gap-1.5">
            {attachments.map(att => (
              <div key={att.id} className="flex items-center gap-1 px-2 py-1 bg-background rounded border border-border text-xs">
                {getFileIcon(att.file_type)}
                <span className="truncate max-w-[100px]">{att.file_name}</span>
                <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => handleDownload(att)}>
                  <Download className="h-3 w-3" />
                </Button>
                <Button variant="ghost" size="icon" className="h-5 w-5 text-destructive" onClick={() => handleDeleteAttachment(att)}>
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
      {/* Comments */}
      {showComments && (
        <NoteComments noteId={note.id} noteOwnerId={note.user_id} />
      )}
      {/* Share Dialog */}
      <NoteShareDialog
        open={showShare}
        onOpenChange={setShowShare}
        noteId={note.id}
        noteTitle={note.title}
      />
      {/* Version History Dialog */}
      <NoteVersionHistory
        noteId={note.id}
        open={showVersionHistory}
        onOpenChange={setShowVersionHistory}
        onRestore={(title, content) => {
          setTitle(title);
          setContent(content);
          onSave({ id: note.id, title, content });
        }}
      />
    </div>
  );
};

export default NoteEditorPanel;
