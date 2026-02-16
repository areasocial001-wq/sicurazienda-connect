import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Send, Reply, Trash2, ChevronDown, ChevronRight, MessageSquare, Search, AtSign } from "lucide-react";
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

interface UserSuggestion {
  id: string;
  full_name: string;
}

const NoteComments = ({ noteId, noteOwnerId }: NoteCommentsProps) => {
  const { user } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [loading, setLoading] = useState(true);
  const [expandedThreads, setExpandedThreads] = useState<Set<string>>(new Set());
  const [searchFilter, setSearchFilter] = useState("");
  const [showSearch, setShowSearch] = useState(false);

  // @mention state
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionUsers, setMentionUsers] = useState<UserSuggestion[]>([]);
  const [mentionTarget, setMentionTarget] = useState<"new" | "reply">("new");
  const mainTextareaRef = useRef<HTMLTextAreaElement>(null);
  const replyTextareaRef = useRef<HTMLTextAreaElement>(null);

  const fetchComments = useCallback(async () => {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("note_comments")
      .select("*")
      .eq("note_id", noteId)
      .order("created_at", { ascending: true });
    if (error) { console.error(error); setLoading(false); return; }

    const userIds = [...new Set((data || []).map((c: any) => c.user_id))] as string[];
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", userIds);
    const nameMap: Record<string, string> = {};
    (profiles || []).forEach((p: any) => { nameMap[p.id] = p.full_name || "Utente"; });

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

  // Fetch mention suggestions
  useEffect(() => {
    if (mentionQuery === null || mentionQuery.length < 1) {
      setMentionUsers([]);
      return;
    }
    const timer = setTimeout(async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, full_name")
        .ilike("full_name", `%${mentionQuery}%`)
        .limit(5);
      setMentionUsers((data || []).filter(u => u.full_name) as UserSuggestion[]);
    }, 200);
    return () => clearTimeout(timer);
  }, [mentionQuery]);

  const handleTextChange = (value: string, target: "new" | "reply") => {
    if (target === "new") setNewComment(value);
    else setReplyText(value);

    // Detect @mention
    const cursorPos = target === "new"
      ? mainTextareaRef.current?.selectionStart || value.length
      : replyTextareaRef.current?.selectionStart || value.length;
    const textBeforeCursor = value.substring(0, cursorPos);
    const mentionMatch = textBeforeCursor.match(/@(\w*)$/);
    if (mentionMatch) {
      setMentionQuery(mentionMatch[1]);
      setMentionTarget(target);
    } else {
      setMentionQuery(null);
    }
  };

  const insertMention = (userName: string) => {
    const target = mentionTarget;
    const text = target === "new" ? newComment : replyText;
    const ref = target === "new" ? mainTextareaRef.current : replyTextareaRef.current;
    const cursorPos = ref?.selectionStart || text.length;
    const textBeforeCursor = text.substring(0, cursorPos);
    const newText = textBeforeCursor.replace(/@(\w*)$/, `@${userName} `) + text.substring(cursorPos);
    if (target === "new") setNewComment(newText);
    else setReplyText(newText);
    setMentionQuery(null);
    setMentionUsers([]);
    ref?.focus();
  };

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
    setMentionQuery(null);
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

  // Filter comments by search
  const filterComments = (commentList: Comment[]): Comment[] => {
    if (!searchFilter) return commentList;
    const q = searchFilter.toLowerCase();
    return commentList.filter(c => {
      const matches = c.content.toLowerCase().includes(q) ||
        (c.author_name || "").toLowerCase().includes(q);
      const childMatches = c.replies && filterComments(c.replies).length > 0;
      return matches || childMatches;
    }).map(c => ({
      ...c,
      replies: c.replies ? filterComments(c.replies) : [],
    }));
  };

  const filteredComments = filterComments(comments);

  // Render content with @mentions highlighted
  const renderContent = (text: string) => {
    const parts = text.split(/(@\w+(?:\s\w+)?)/g);
    return parts.map((part, i) =>
      part.startsWith("@") ? (
        <span key={i} className="text-primary font-medium bg-primary/10 rounded px-0.5">{part}</span>
      ) : (
        <span key={i}>{part}</span>
      )
    );
  };

  const MentionDropdown = () => {
    if (mentionQuery === null || mentionUsers.length === 0) return null;
    return (
      <div className="absolute bottom-full left-0 mb-1 bg-popover border border-border rounded-md shadow-md z-50 w-48">
        {mentionUsers.map(u => (
          <button
            key={u.id}
            className="w-full text-left px-3 py-1.5 text-xs hover:bg-accent transition-colors flex items-center gap-1.5"
            onMouseDown={e => { e.preventDefault(); insertMention(u.full_name); }}
          >
            <AtSign className="h-3 w-3 text-primary" />
            {u.full_name}
          </button>
        ))}
      </div>
    );
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
        <p className="text-sm mt-1 whitespace-pre-wrap">{renderContent(comment.content)}</p>

        {replyTo === comment.id && (
          <div className="relative mt-2">
            <div className="flex gap-2">
              <Textarea
                ref={replyTextareaRef}
                value={replyText}
                onChange={e => handleTextChange(e.target.value, "reply")}
                placeholder="Rispondi... usa @ per menzionare"
                className="min-h-[40px] text-xs"
                rows={1}
              />
              <Button size="icon" className="h-8 w-8 shrink-0" onClick={() => handlePost(comment.id, replyText)} disabled={!replyText.trim()}>
                <Send className="h-3 w-3" />
              </Button>
            </div>
            {mentionTarget === "reply" && <MentionDropdown />}
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
          <div className="flex-1" />
          <Button variant="ghost" size="icon" className={`h-5 w-5 ${showSearch ? 'text-primary' : ''}`} onClick={() => setShowSearch(!showSearch)}>
            <Search className="h-3 w-3" />
          </Button>
        </div>

        {showSearch && (
          <div className="mb-2">
            <Input
              value={searchFilter}
              onChange={e => setSearchFilter(e.target.value)}
              placeholder="Filtra commenti..."
              className="h-7 text-xs"
            />
          </div>
        )}

        {loading ? (
          <p className="text-xs text-muted-foreground">Caricamento...</p>
        ) : (
          <div className="max-h-64 overflow-auto space-y-1">
            {filteredComments.length === 0 && (
              <p className="text-xs text-muted-foreground py-2">
                {searchFilter ? "Nessun commento trovato" : "Nessun commento. Inizia la discussione!"}
              </p>
            )}
            {filteredComments.map(c => renderComment(c))}
          </div>
        )}

        <div className="relative mt-2">
          <div className="flex gap-2">
            <Textarea
              ref={mainTextareaRef}
              value={newComment}
              onChange={e => handleTextChange(e.target.value, "new")}
              placeholder="Scrivi un commento... usa @ per menzionare"
              className="min-h-[40px] text-xs"
              rows={1}
            />
            <Button size="icon" className="h-8 w-8 shrink-0" onClick={() => handlePost(null, newComment)} disabled={!newComment.trim()}>
              <Send className="h-3 w-3" />
            </Button>
          </div>
          {mentionTarget === "new" && <MentionDropdown />}
        </div>
      </div>
    </div>
  );
};

export default NoteComments;
