import { useState, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { Upload, FileUp, CheckCircle2, AlertCircle } from "lucide-react";

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
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [total, setTotal] = useState(0);
  const [imported, setImported] = useState(0);
  const [errors, setErrors] = useState(0);
  const [done, setDone] = useState(false);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (!file.name.endsWith(".enex")) {
      toast.error("Seleziona un file .enex di Evernote");
      return;
    }

    setImporting(true);
    setDone(false);
    setErrors(0);
    setImported(0);

    try {
      const text = await file.text();
      const enexNotes = parseEnex(text);
      setTotal(enexNotes.length);

      if (enexNotes.length === 0) {
        toast.error("Nessuna nota trovata nel file .enex");
        setImporting(false);
        return;
      }

      let ok = 0;
      let err = 0;

      for (let i = 0; i < enexNotes.length; i++) {
        const n = enexNotes[i];
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

        setImported(ok);
        setErrors(err);
        setProgress(Math.round(((i + 1) / enexNotes.length) * 100));
      }

      setDone(true);
      if (ok > 0) {
        toast.success(`${ok} note importate da Evernote`);
        onImportComplete();
      }
    } catch (err) {
      console.error("Parse error:", err);
      toast.error("Errore nel parsing del file .enex");
    } finally {
      setImporting(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const handleClose = () => {
    if (!importing) {
      setDone(false);
      setProgress(0);
      setTotal(0);
      setImported(0);
      setErrors(0);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" /> Importa da Evernote (.enex)
          </DialogTitle>
        </DialogHeader>

        {!done && !importing && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Esporta le tue note da Evernote in formato .enex e importale in SicurNote.
              Verranno preservati titolo, contenuto, tag e date.
            </p>
            <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
              <FileUp className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
              <Button onClick={() => fileRef.current?.click()}>
                Seleziona file .enex
              </Button>
              <p className="text-xs text-muted-foreground mt-2">Max 20MB</p>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept=".enex"
              className="hidden"
              onChange={handleFileSelect}
            />
          </div>
        )}

        {importing && (
          <div className="space-y-4 py-4">
            <p className="text-sm text-center">Importazione in corso...</p>
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
