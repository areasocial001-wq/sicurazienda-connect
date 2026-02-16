import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Notebook } from "@/hooks/useNotes";
import { Globe, Scissors, Loader2 } from "lucide-react";

interface WebClipperDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  notebooks: Notebook[];
  selectedNotebook: string | null;
  onClip: (data: { title: string; url: string; content: string; notebook_id: string | null }) => Promise<void>;
}

const WebClipperDialog = ({ open, onOpenChange, notebooks, selectedNotebook, onClip }: WebClipperDialogProps) => {
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [notebookId, setNotebookId] = useState(selectedNotebook || "none");
  const [isClipping, setIsClipping] = useState(false);

  const handleClip = async () => {
    if (!title.trim() && !url.trim() && !content.trim()) return;
    setIsClipping(true);
    try {
      const noteTitle = title.trim() || (url ? `Clip: ${url}` : "Web Clip");
      const parts: string[] = [];
      if (url.trim()) {
        parts.push(`<p><strong>🔗 Fonte:</strong> <a href="${url.trim()}" target="_blank" rel="noopener noreferrer">${url.trim()}</a></p>`);
        parts.push(`<hr />`);
      }
      if (content.trim()) {
        parts.push(`<p>${content.trim().replace(/\n/g, '</p><p>')}</p>`);
      }

      await onClip({
        title: noteTitle,
        url: url.trim(),
        content: parts.join("\n"),
        notebook_id: notebookId === "none" ? null : notebookId,
      });

      // Reset
      setUrl("");
      setTitle("");
      setContent("");
      onOpenChange(false);
    } finally {
      setIsClipping(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Scissors className="h-5 w-5" />
            Web Clipper
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <Label className="text-xs">URL della pagina</Label>
            <div className="relative">
              <Globe className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                value={url}
                onChange={e => setUrl(e.target.value)}
                placeholder="https://esempio.com/articolo"
                className="pl-8"
                type="url"
              />
            </div>
          </div>

          <div>
            <Label className="text-xs">Titolo</Label>
            <Input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Titolo della nota..."
            />
          </div>

          <div>
            <Label className="text-xs">Testo / Appunti</Label>
            <Textarea
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder="Incolla qui il testo che vuoi salvare..."
              rows={5}
            />
          </div>

          <div>
            <Label className="text-xs">Taccuino</Label>
            <Select value={notebookId} onValueChange={setNotebookId}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Nessun taccuino" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nessun taccuino</SelectItem>
                {notebooks.map(nb => (
                  <SelectItem key={nb.id} value={nb.id}>{nb.icon} {nb.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button onClick={handleClip} disabled={isClipping} className="w-full">
            {isClipping ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Salvataggio...</>
            ) : (
              <><Scissors className="h-4 w-4 mr-2" /> Salva in SicurNote</>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default WebClipperDialog;
