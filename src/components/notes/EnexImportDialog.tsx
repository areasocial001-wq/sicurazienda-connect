import { useState, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { Upload, FileUp, CheckCircle2, AlertCircle, X, FileText } from "lucide-react";

interface EnexNote {
  title: string;
  content: string;
  tags: string[];
  created: string;
  updated: string;
}

interface EnexImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImportComplete: () => void;
  selectedNotebook: string | null;
}

const parseEnex = (xmlStr: string): EnexNote[] => {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlStr, "text/xml");
  const noteElements = doc.querySelectorAll("note");
  const notes: EnexNote[] = [];

  noteElements.forEach((noteEl) => {
    const title = noteEl.querySelector("title")?.textContent || "Nota importata";
    const contentEl = noteEl.querySelector("content");
    let content = "";
    if (contentEl) {
      // ENEX wraps content in CDATA, extract it
      const raw = contentEl.textContent || "";
      // Parse the en-note HTML content
      const innerDoc = new DOMParser().parseFromString(raw, "text/html");
      // Convert en-note body to HTML
      const body = innerDoc.querySelector("en-note") || innerDoc.body;
      content = body?.innerHTML || raw;
      // Clean up Evernote-specific tags
      content = content.replace(/<en-todo\s+checked="true"\s*\/?>/gi, '<input type="checkbox" checked disabled> ');
      content = content.replace(/<en-todo\s+checked="false"\s*\/?>/gi, '<input type="checkbox" disabled> ');
      content = content.replace(/<en-todo\s*\/?>/gi, '<input type="checkbox" disabled> ');
      content = content.replace(/<en-media[^>]*\/>/gi, "[allegato]");
    }

    const tags: string[] = [];
    noteEl.querySelectorAll("tag").forEach(t => {
      if (t.textContent) tags.push(t.textContent);
    });

    const created = noteEl.querySelector("created")?.textContent || "";
    const updated = noteEl.querySelector("updated")?.textContent || created;

    // Parse Evernote date format: 20231215T120000Z
    const parseEnDate = (d: string) => {
      if (!d || d.length < 15) return new Date().toISOString();
      try {
        const y = d.substring(0, 4);
        const m = d.substring(4, 6);
        const day = d.substring(6, 8);
        const h = d.substring(9, 11);
        const min = d.substring(11, 13);
        const s = d.substring(13, 15);
        return new Date(`${y}-${m}-${day}T${h}:${min}:${s}Z`).toISOString();
      } catch {
        return new Date().toISOString();
      }
    };

    notes.push({
      title,
      content,
      tags,
      created: parseEnDate(created),
      updated: parseEnDate(updated),
    });
  });

  return notes;
};

const EnexImportDialog = ({ open, onOpenChange, onImportComplete, selectedNotebook }: EnexImportDialogProps) => {
  const { user } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const dragCounter = useRef(0);
  const [files, setFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [total, setTotal] = useState(0);
  const [imported, setImported] = useState(0);
  const [errors, setErrors] = useState(0);
  const [done, setDone] = useState(false);
  const [currentFileName, setCurrentFileName] = useState<string>("");

  const addFiles = (incoming: File[]) => {
    const valid = incoming.filter(f => f.name.toLowerCase().endsWith(".enex"));
    const skipped = incoming.length - valid.length;
    if (skipped > 0) toast.error(`${skipped} file ignorati (solo .enex)`);
    if (valid.length === 0) return;
    setFiles(prev => {
      const map = new Map(prev.map(f => [f.name + f.size, f]));
      valid.forEach(f => map.set(f.name + f.size, f));
      return Array.from(map.values());
    });
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const list = e.target.files ? Array.from(e.target.files) : [];
    addFiles(list);
    if (fileRef.current) fileRef.current.value = "";
  };

  const removeFile = (idx: number) => {
    setFiles(prev => prev.filter((_, i) => i !== idx));
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current++;
    setIsDragging(true);
  };
  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current--;
    if (dragCounter.current === 0) setIsDragging(false);
  };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current = 0;
    setIsDragging(false);
    const dropped = Array.from(e.dataTransfer.files || []);
    addFiles(dropped);
  };

  const startImport = async () => {
    if (!user || files.length === 0) return;
    setImporting(true);
    setDone(false);
    setErrors(0);
    setImported(0);
    setProgress(0);

    try {
      // Parse all files first to get the total count
      const parsed: { fileName: string; notes: EnexNote[] }[] = [];
      for (const f of files) {
        try {
          const text = await f.text();
          parsed.push({ fileName: f.name, notes: parseEnex(text) });
        } catch (err) {
          console.error("Parse error:", f.name, err);
          toast.error(`Errore parsing: ${f.name}`);
        }
      }

      const totalNotes = parsed.reduce((s, p) => s + p.notes.length, 0);
      setTotal(totalNotes);

      if (totalNotes === 0) {
        toast.error("Nessuna nota trovata nei file selezionati");
        setImporting(false);
        return;
      }

      let ok = 0;
      let err = 0;
      let processed = 0;

      for (const { fileName, notes } of parsed) {
        setCurrentFileName(fileName);
        for (const n of notes) {
          const { error } = await supabase
            .from("notes")
            .insert({
              user_id: user.id,
              title: n.title,
              content: n.content,
              tags: n.tags,
              notebook_id: selectedNotebook,
              created_at: n.created,
              updated_at: n.updated,
            });
          if (error) {
            console.error("Import error:", error);
            err++;
          } else {
            ok++;
          }
          processed++;
          setImported(ok);
          setErrors(err);
          setProgress(Math.round((processed / totalNotes) * 100));
        }
      }

      setDone(true);
      if (ok > 0) {
        toast.success(`${ok} note importate da ${files.length} file`);
        onImportComplete();
      }
    } catch (err) {
      console.error("Import failure:", err);
      toast.error("Errore durante l'importazione");
    } finally {
      setImporting(false);
      setCurrentFileName("");
    }
  };

  const handleClose = () => {
    if (!importing) {
      setDone(false);
      setProgress(0);
      setTotal(0);
      setImported(0);
      setErrors(0);
      setFiles([]);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" /> Importa da Evernote (.enex)
          </DialogTitle>
        </DialogHeader>

        {!done && !importing && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Esporta le tue note da Evernote in formato .enex e importale in SicurNote.
              Puoi caricare più file contemporaneamente trascinandoli qui sotto.
              Verranno preservati titolo, contenuto, tag e date.
            </p>
            <div
              onDragOver={handleDragOver}
              onDragEnter={handleDragEnter}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                isDragging ? "border-primary bg-primary/10" : "border-border"
              }`}
            >
              <FileUp className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
              <p className="text-sm mb-3">
                {isDragging
                  ? "Rilascia i file .enex qui"
                  : "Trascina i file .enex qui oppure"}
              </p>
              <Button onClick={() => fileRef.current?.click()} variant="outline">
                Seleziona file
              </Button>
              <p className="text-xs text-muted-foreground mt-2">
                Più file supportati · Max 20MB ciascuno
              </p>
            </div>

            {files.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">
                  {files.length} file selezionat{files.length === 1 ? "o" : "i"}
                </p>
                <div className="max-h-[200px] overflow-y-auto space-y-1 border rounded-md p-2">
                  {files.map((f, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-2 text-xs p-2 rounded hover:bg-muted/50"
                    >
                      <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="flex-1 truncate">{f.name}</span>
                      <span className="text-muted-foreground shrink-0">
                        {(f.size / 1024).toFixed(0)} KB
                      </span>
                      <button
                        onClick={() => removeFile(i)}
                        className="text-muted-foreground hover:text-destructive"
                        title="Rimuovi"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
                <Button onClick={startImport} className="w-full">
                  <Upload className="h-4 w-4 mr-2" />
                  Importa {files.length} file
                </Button>
              </div>
            )}

            <input
              ref={fileRef}
              type="file"
              accept=".enex"
              multiple
              className="hidden"
              onChange={handleFileSelect}
            />
          </div>
        )}

        {importing && (
          <div className="space-y-4 py-4">
            <p className="text-sm text-center">Importazione in corso...</p>
            {currentFileName && (
              <p className="text-xs text-center text-muted-foreground truncate">
                {currentFileName}
              </p>
            )}
            <Progress value={progress} className="h-2" />
            <p className="text-xs text-center text-muted-foreground">
              {imported} di {total} note importate
              {errors > 0 && <span className="text-destructive"> ({errors} errori)</span>}
            </p>
          </div>
        )}

        {done && (
          <div className="space-y-4 py-4 text-center">
            <CheckCircle2 className="h-12 w-12 mx-auto text-emerald-500" />
            <p className="text-sm font-medium">Importazione completata!</p>
            <p className="text-xs text-muted-foreground">
              {imported} note importate con successo
              {errors > 0 && (
                <span className="flex items-center justify-center gap-1 mt-1 text-destructive">
                  <AlertCircle className="h-3 w-3" /> {errors} note non importate
                </span>
              )}
            </p>
            <Button onClick={handleClose}>Chiudi</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default EnexImportDialog;
