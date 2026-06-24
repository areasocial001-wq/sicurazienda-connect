import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Paperclip, Upload, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

/**
 * Compact attachment widget for a leave request.
 * - Always shows download link if attachment exists.
 * - When `canEdit` is true, allows replacing/uploading a new file (the row owner or approver).
 */
export function LeaveAttachment({
  requestId,
  requestOwnerId,
  attachmentPath,
  attachmentName,
  canEdit,
  onUpdated,
}: {
  requestId: string;
  requestOwnerId: string;
  attachmentPath: string | null;
  attachmentName?: string | null;
  canEdit?: boolean;
  onUpdated?: () => void;
}) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);

  const open = async () => {
    if (!attachmentPath) return;
    const { data, error } = await supabase.storage
      .from("worker-files")
      .createSignedUrl(attachmentPath, 3600);
    if (error || !data) {
      toast({ title: "Errore", description: error?.message || "Impossibile aprire il file", variant: "destructive" });
      return;
    }
    window.open(data.signedUrl, "_blank");
  };

  const upload = async (file: File) => {
    if (!user) return;
    setBusy(true);
    try {
      // Files MUST live under the request owner's folder for RLS to allow access.
      const path = `${requestOwnerId}/leave/${requestId}/${Date.now()}-${file.name}`;
      const { error: upErr } = await supabase.storage.from("worker-files").upload(path, file, { upsert: false });
      if (upErr) throw upErr;
      const { error: dbErr } = await supabase
        .from("worker_leave_requests")
        .update({ attachment_path: path })
        .eq("id", requestId);
      if (dbErr) throw dbErr;
      toast({ title: "Allegato caricato" });
      onUpdated?.();
    } catch (e: any) {
      toast({ title: "Errore upload", description: e.message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {attachmentPath ? (
        <Button size="sm" variant="outline" onClick={open}>
          <Paperclip className="h-3 w-3 mr-1" />
          {attachmentName || "Apri allegato"}
          <ExternalLink className="h-3 w-3 ml-1" />
        </Button>
      ) : (
        <span className="text-xs text-muted-foreground">Nessun allegato</span>
      )}
      {canEdit && (
        <label className="cursor-pointer">
          <input
            type="file"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])}
            disabled={busy}
          />
          <Button type="button" size="sm" variant="ghost" asChild disabled={busy}>
            <span><Upload className="h-3 w-3 mr-1" /> {attachmentPath ? "Sostituisci" : "Carica"}</span>
          </Button>
        </label>
      )}
    </div>
  );
}
