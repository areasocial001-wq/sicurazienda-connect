import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Send, Reply, Trash2, ChevronDown, ChevronRight, MessageSquare } from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";

interface Comment {
  id: string;
  note_id: string;
  user_id: string;
  parent_id: string | null;
  content: string;
  created_at: string;
  updated_at: string;
  author_name?: string;
  replies?: Comment[];
}

interface NoteCommentsProps {
  noteId: string;
  noteOwnerId: string;
}

const NoteComments = ({ noteId, noteOwnerId }: NoteCommentsProps) => {
  const { user } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [loading, setLoading] = useState(true);
  const [expandedThreads, setExpandedThreads] = useState<Set<string>>(new Set());

  const fetchComments = useCallback(async () => {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("note_comments")
      .select("*")
      .eq("note_id", noteId)
      .order("created_at", { ascending: true });
    if (error) { console.error(error); setLoading(false); return; }

    // Fetch author names
    const userIds = [...new Set((data || []).map((c: any) => c.user_id))] as string[];
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", userIds);
    const nameMap: Record<string, string> = {};
    (profiles || []).forEach((p: any) => { nameMap[p.id] = p.full_name || "Utente"; });

    // Build tree
    const all = (data || []).map((c: any) => ({
      ...c,
      author_name: nameMap[c.user_id] || "Utente",
      replies: [] as Comment[],
    }));
    const roots: Comment[] = [];
    const map: Record<string, Comment> = {};
    all.forEach((c: Comment) => { map[c.id] = c; });
    all.forEach((c: Comment) => {
      if (c.parent_id && map[c.parent_id]) {
        map[c.parent_id].replies!.push(c);
      } else {
        roots.push(c);
      }
    });

    setComments(roots);
    setLoading(false);
  }, [noteId]);

  useEffect(() => { fetchComments(); }, [fetchComments]);

  const handlePost = async (parentId: string | null, text: string) => {
    if (!text.trim() || !user) return;
    const { error } = await (supabase as any)
      .from("note_comments")
      .insert({
        note_id: noteId,
        user_id: user.id,
        parent_id: parentId,
        content: text.trim(),
      });
    if (error) { toast.error("Errore nell'invio del commento"); return; }
    if (parentId) { setReplyText(""); setReplyTo(null); }
    else setNewComment("");
    fetchComments();
  };

  const handleDelete = async (id: string) => {
    const { error } = await (supabase as any)
      .from("note_comments")
      .delete()
      .eq("id", id);
    if (error) { toast.error("Errore nell'eliminazione"); return; }
    fetchComments();
  };

  const toggleThread = (id: string) => {
    setExpandedThreads(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const renderComment = (comment: Comment, depth = 0) => (
    <div key={comment.id} className={`${depth > 0 ? "ml-4 pl-3 border-l-2 border-border" : ""}`}>
      <div className="py-2">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="font-medium text-foreground">{comment.author_name}</span>
          <span>·</span>
          <span>{format(new Date(comment.created_at), "dd MMM HH:mm", { locale: it })}</span>
          <div className="flex-1" />
          <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => setReplyTo(replyTo === comment.id ? null : comment.id)}>
            <Reply className="h-3 w-3" />
          </Button>
          {(comment.user_id === user?.id || noteOwnerId === user?.id) && (
            <Button variant="ghost" size="icon" className="h-5 w-5 text-destructive" onClick={() => handleDelete(comment.id)}>
              <Trash2 className="h-3 w-3" />
            </Button>
          )}
        </div>
        <p className="text-sm mt-1 whitespace-pre-wrap">{comment.content}</p>

        {replyTo === comment.id && (
          <div className="flex gap-2 mt-2">
            <Textarea
              value={replyText}
              onChange={e => setReplyText(e.target.value)}
              placeholder="Rispondi..."
              className="min-h-[40px] text-xs"
              rows={1}
            />
            <Button size="icon" className="h-8 w-8 shrink-0" onClick={() => handlePost(comment.id, replyText)} disabled={!replyText.trim()}>
              <Send className="h-3 w-3" />
            </Button>
          </div>
        )}
      </div>

      {comment.replies && comment.replies.length > 0 && (
        <>
          <button className="text-xs text-muted-foreground flex items-center gap-1 mb-1 hover:text-foreground" onClick={() => toggleThread(comment.id)}>
            {expandedThreads.has(comment.id) ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
            {comment.replies.length} {comment.replies.length === 1 ? "risposta" : "risposte"}
          </button>
          {expandedThreads.has(comment.id) && comment.replies.map(r => renderComment(r, depth + 1))}
        </>
      )}
    </div>
  );

  return (
    <div className="border-t border-border bg-muted/10">
      <div className="px-4 py-2">
        <div className="flex items-center gap-2 mb-2">
          <MessageSquare className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs font-medium">Commenti</span>
        </div>

        {loading ? (
          <p className="text-xs text-muted-foreground">Caricamento...</p>
        ) : (
          <div className="max-h-64 overflow-auto space-y-1">
            {comments.length === 0 && <p className="text-xs text-muted-foreground py-2">Nessun commento. Inizia la discussione!</p>}
            {comments.map(c => renderComment(c))}
          </div>
        )}

        <div className="flex gap-2 mt-2">
          <Textarea
            value={newComment}
            onChange={e => setNewComment(e.target.value)}
            placeholder="Scrivi un commento..."
            className="min-h-[40px] text-xs"
            rows={1}
          />
          <Button size="icon" className="h-8 w-8 shrink-0" onClick={() => handlePost(null, newComment)} disabled={!newComment.trim()}>
            <Send className="h-3 w-3" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default NoteComments;
