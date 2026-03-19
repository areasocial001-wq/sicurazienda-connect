import { useState } from "react";
import JSZip from "jszip";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { File, Folder, FileText, Image, Music, Download, Loader2 } from "lucide-react";

interface ZipEntry {
  name: string;
  size: number;
  isDir: boolean;
  path: string;
}

interface ZipPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fileName: string;
  zipUrl: string;
}

const formatSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const getIcon = (name: string, isDir: boolean) => {
  if (isDir) return <Folder className="h-4 w-4 text-amber-500" />;
  const ext = name.split(".").pop()?.toLowerCase() || "";
  if (["jpg", "jpeg", "png", "gif", "webp", "svg"].includes(ext))
    return <Image className="h-4 w-4 text-blue-500" />;
  if (["mp3", "wav", "ogg", "m4a"].includes(ext))
    return <Music className="h-4 w-4 text-purple-500" />;
  if (["pdf", "doc", "docx", "txt", "md"].includes(ext))
    return <FileText className="h-4 w-4 text-red-500" />;
  return <File className="h-4 w-4 text-muted-foreground" />;
};

const ZipPreviewDialog = ({ open, onOpenChange, fileName, zipUrl }: ZipPreviewDialogProps) => {
  const [entries, setEntries] = useState<ZipEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  const loadZip = async () => {
    if (loaded) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(zipUrl);
      const blob = await res.blob();
      const zip = await JSZip.loadAsync(blob);
      const items: ZipEntry[] = [];
      zip.forEach((path, entry) => {
        items.push({
          name: entry.name.split("/").filter(Boolean).pop() || entry.name,
          size: entry._data?.uncompressedSize || 0,
          isDir: entry.dir,
          path: entry.name,
        });
      });
      items.sort((a, b) => {
        if (a.isDir !== b.isDir) return a.isDir ? -1 : 1;
        return a.path.localeCompare(b.path);
      });
      setEntries(items);
      setLoaded(true);
    } catch {
      setError("Impossibile leggere il file .zip");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenChange = (v: boolean) => {
    if (v) loadZip();
    onOpenChange(v);
  };

  const totalSize = entries.filter(e => !e.isDir).reduce((s, e) => s + e.size, 0);
  const fileCount = entries.filter(e => !e.isDir).length;
  const dirCount = entries.filter(e => e.isDir).length;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-sm">
            <File className="h-4 w-4" />
            {fileName}
          </DialogTitle>
        </DialogHeader>

        {loading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {error && <p className="text-sm text-destructive text-center py-4">{error}</p>}

        {!loading && !error && entries.length > 0 && (
          <>
            <div className="text-[11px] text-muted-foreground px-1">
              {fileCount} file{fileCount !== 1 ? "" : ""} · {dirCount > 0 ? `${dirCount} cartell${dirCount === 1 ? "a" : "e"} · ` : ""}
              {formatSize(totalSize)}
            </div>
            <ScrollArea className="max-h-[300px]">
              <div className="space-y-0.5">
                {entries.map((entry, i) => {
                  const depth = entry.path.split("/").filter(Boolean).length - 1;
                  return (
                    <div
                      key={i}
                      className={`flex items-center gap-2 px-2 py-1.5 rounded text-xs hover:bg-muted/50 ${entry.isDir ? "font-medium" : ""}`}
                      style={{ paddingLeft: `${8 + depth * 16}px` }}
                    >
                      {getIcon(entry.name, entry.isDir)}
                      <span className="truncate flex-1">{entry.name}</span>
                      {!entry.isDir && (
                        <span className="text-[10px] text-muted-foreground shrink-0">
                          {formatSize(entry.size)}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ZipPreviewDialog;
