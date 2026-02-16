import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { History, RotateCcw, Eye, X } from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

interface NoteVersion {
  id: string;
  note_id: string;
  user_id: string;
  title: string;
  content: string | null;
  version_number: number;
  created_at: string;
}

interface NoteVersionHistoryProps {
  noteId: string;
  onRestore: (title: string, content: string) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const NoteVersionHistory = ({ noteId, onRestore, open, onOpenChange }: NoteVersionHistoryProps) => {
  const [versions, setVersions] = useState<NoteVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [previewVersion, setPreviewVersion] = useState<NoteVersion | null>(null);

  const fetchVersions = useCallback(async () => {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("note_versions")
      .select("*")
      .eq("note_id", noteId)
      .order("version_number", { ascending: false });
    if (error) { console.error(error); setLoading(false); return; }
    setVersions(data || []);
    setLoading(false);
  }, [noteId]);

  useEffect(() => {
    if (open) fetchVersions();
  }, [open, fetchVersions]);

  const handleRestore = (version: NoteVersion) => {
    if (!confirm(`Ripristinare la versione ${version.version_number}? La versione corrente verrà salvata automaticamente nella cronologia.`)) return;
    onRestore(version.title, version.content || "");
    toast.success(`Versione ${version.version_number} ripristinata`);
    onOpenChange(false);
  };

  const stripHtml = (html: string) => {
    const doc = new DOMParser().parseFromString(html, "text/html");
    return doc.body.textContent || "";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-5 w-5" /> Cronologia versioni
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <p className="text-sm text-muted-foreground py-4">Caricamento...</p>
        ) : versions.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">Nessuna versione precedente disponibile. Le versioni vengono salvate automaticamente ad ogni modifica.</p>
        ) : (
          <ScrollArea className="max-h-[60vh]">
            <div className="space-y-2 pr-2">
              {versions.map(v => (
                <div key={v.id} className="border border-border rounded-md p-3 hover:bg-muted/30 transition-colors">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium">v{v.version_number} — {v.title}</span>
                    <span className="text-[10px] text-muted-foreground">
                      {format(new Date(v.created_at), "dd MMM yyyy HH:mm", { locale: it })}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                    {stripHtml(v.content || "")}
                  </p>
                  <div className="flex gap-1">
                    <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setPreviewVersion(v)}>
                      <Eye className="h-3 w-3 mr-1" /> Anteprima
                    </Button>
                    <Button variant="default" size="sm" className="h-7 text-xs" onClick={() => handleRestore(v)}>
                      <RotateCcw className="h-3 w-3 mr-1" /> Ripristina
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}

        {/* Preview sub-dialog */}
        {previewVersion && (
          <Dialog open={!!previewVersion} onOpenChange={() => setPreviewVersion(null)}>
            <DialogContent className="max-w-2xl max-h-[80vh]">
              <DialogHeader>
                <DialogTitle>Anteprima v{previewVersion.version_number}: {previewVersion.title}</DialogTitle>
              </DialogHeader>
              <ScrollArea className="max-h-[60vh]">
                <div
                  className="prose prose-sm max-w-none dark:prose-invert p-2"
                  dangerouslySetInnerHTML={{ __html: previewVersion.content || "<p>Contenuto vuoto</p>" }}
                />
              </ScrollArea>
              <div className="flex justify-end gap-2 mt-2">
                <Button variant="outline" onClick={() => setPreviewVersion(null)}>Chiudi</Button>
                <Button onClick={() => handleRestore(previewVersion)}>
                  <RotateCcw className="h-4 w-4 mr-1" /> Ripristina questa versione
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default NoteVersionHistory;
