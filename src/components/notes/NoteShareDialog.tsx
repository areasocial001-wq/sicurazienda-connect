import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Share2, Trash2, Users } from "lucide-react";

interface NoteShare {
  id: string;
  shared_with_email: string;
  shared_with_user_id: string | null;
  permission: string;
  created_at: string;
}

interface NoteShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  noteId: string;
  noteTitle: string;
}

const NoteShareDialog = ({ open, onOpenChange, noteId, noteTitle }: NoteShareDialogProps) => {
  const { user } = useAuth();
  const [email, setEmail] = useState("");
  const [permission, setPermission] = useState("read");
  const [shares, setShares] = useState<NoteShare[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (open && noteId) fetchShares();
  }, [open, noteId]);

  const fetchShares = async () => {
    const { data, error } = await (supabase as any)
      .from("note_shares")
      .select("*")
      .eq("note_id", noteId)
      .order("created_at", { ascending: false });
    if (!error) setShares((data || []) as NoteShare[]);
  };

  const handleShare = async () => {
    if (!email.trim() || !user) return;
    setIsLoading(true);
    try {

      const { error } = await (supabase as any).from("note_shares").insert({
        note_id: noteId,
        owner_id: user.id,
        shared_with_email: email.trim().toLowerCase(),
        shared_with_user_id: null,
        permission,
      });

      if (error) throw error;
      toast.success(`Nota condivisa con ${email}`);
      setEmail("");
      fetchShares();
    } catch (err: any) {
      toast.error("Errore nella condivisione");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveShare = async (shareId: string) => {
    const { error } = await (supabase as any).from("note_shares").delete().eq("id", shareId);
    if (error) {
      toast.error("Errore nella rimozione");
    } else {
      toast.success("Condivisione rimossa");
      setShares(prev => prev.filter(s => s.id !== shareId));
    }
  };

  const handleUpdatePermission = async (shareId: string, newPermission: string) => {
    const { error } = await (supabase as any)
      .from("note_shares")
      .update({ permission: newPermission })
      .eq("id", shareId);
    if (error) {
      toast.error("Errore nell'aggiornamento");
    } else {
      setShares(prev => prev.map(s => s.id === shareId ? { ...s, permission: newPermission } : s));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5" />
            Condividi nota
          </DialogTitle>
        </DialogHeader>

        <p className="text-sm text-muted-foreground truncate">"{noteTitle}"</p>

        {/* Add share */}
        <div className="flex gap-2">
          <Input
            placeholder="Email utente..."
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="flex-1"
            type="email"
          />
          <Select value={permission} onValueChange={setPermission}>
            <SelectTrigger className="w-28">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="read">Lettura</SelectItem>
              <SelectItem value="write">Scrittura</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={handleShare} disabled={isLoading || !email.trim()} size="sm">
            <Share2 className="h-4 w-4" />
          </Button>
        </div>

        {/* Current shares */}
        <div className="space-y-2 max-h-60 overflow-auto">
          {shares.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              <Users className="h-8 w-8 mx-auto mb-2 opacity-30" />
              Nota non ancora condivisa
            </p>
          ) : (
            shares.map(share => (
              <div key={share.id} className="flex items-center gap-2 p-2 rounded-md border border-border">
                <span className="text-sm flex-1 truncate">{share.shared_with_email}</span>
                <Select
                  value={share.permission}
                  onValueChange={(val) => handleUpdatePermission(share.id, val)}
                >
                  <SelectTrigger className="w-24 h-7 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="read">Lettura</SelectItem>
                    <SelectItem value="write">Scrittura</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-destructive"
                  onClick={() => handleRemoveShare(share.id)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default NoteShareDialog;
