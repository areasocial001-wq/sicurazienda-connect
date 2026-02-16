import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Bell, Check, Share2, MessageSquare, X } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { it } from "date-fns/locale";

interface ShareNotification {
  id: string;
  note_id: string;
  shared_by_name: string | null;
  note_title: string | null;
  is_read: boolean;
  created_at: string;
  type: "share";
}

interface CommentNotification {
  id: string;
  note_id: string;
  commenter_name: string | null;
  note_title: string | null;
  comment_preview: string | null;
  is_read: boolean;
  created_at: string;
  type: "comment";
}

type Notification = ShareNotification | CommentNotification;

interface NoteShareNotificationsProps {
  onOpenNote?: (noteId: string) => void;
}

const NoteShareNotifications = ({ onOpenNote }: NoteShareNotificationsProps) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);

  const fetchNotifications = async () => {
    if (!user) return;
    
    const [shareRes, commentRes] = await Promise.all([
      (supabase as any)
        .from("note_share_notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(15),
      (supabase as any)
        .from("note_comment_notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(15),
    ]);

    const shares: Notification[] = (shareRes.data || []).map((n: any) => ({ ...n, type: "share" as const }));
    const comments: Notification[] = (commentRes.data || []).map((n: any) => ({
      ...n,
      type: "comment" as const,
    }));

    const all = [...shares, ...comments].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    ).slice(0, 20);

    setNotifications(all);
  };

  useEffect(() => {
    if (!user) return;
    (supabase as any).rpc("resolve_my_note_shares").then(() => fetchNotifications());
  }, [user]);

  // Realtime for both tables
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("note-all-notifications")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "note_share_notifications", filter: `user_id=eq.${user.id}` }, () => fetchNotifications())
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "note_comment_notifications", filter: `user_id=eq.${user.id}` }, () => fetchNotifications())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const markAsRead = async (notif: Notification) => {
    const table = notif.type === "share" ? "note_share_notifications" : "note_comment_notifications";
    await (supabase as any).from(table).update({ is_read: true }).eq("id", notif.id);
    setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, is_read: true } : n));
  };

  const markAllRead = async () => {
    const shareIds = notifications.filter(n => !n.is_read && n.type === "share").map(n => n.id);
    const commentIds = notifications.filter(n => !n.is_read && n.type === "comment").map(n => n.id);
    
    if (shareIds.length) await (supabase as any).from("note_share_notifications").update({ is_read: true }).in("id", shareIds);
    if (commentIds.length) await (supabase as any).from("note_comment_notifications").update({ is_read: true }).in("id", commentIds);
    
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
  };

  const dismiss = async (notif: Notification) => {
    const table = notif.type === "share" ? "note_share_notifications" : "note_comment_notifications";
    await (supabase as any).from(table).delete().eq("id", notif.id);
    setNotifications(prev => prev.filter(n => n.id !== notif.id));
  };

  const handleClick = (notif: Notification) => {
    markAsRead(notif);
    onOpenNote?.(notif.note_id);
    setOpen(false);
  };

  const getNotifText = (notif: Notification) => {
    if (notif.type === "share") {
      const s = notif as ShareNotification;
      return <><span className="font-medium">{s.shared_by_name || "Un utente"}</span>{" ha condiviso "}<span className="font-medium">"{s.note_title || "una nota"}"</span></>;
    }
    const c = notif as CommentNotification;
    return <><span className="font-medium">{c.commenter_name || "Un utente"}</span>{" ha commentato "}<span className="font-medium">"{c.note_title || "una nota"}"</span></>;
  };

  if (!user) return null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-8 w-8 hover:bg-white/10">
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-primary text-[10px] font-bold flex items-center justify-center text-primary-foreground">
              {unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between px-3 py-2 border-b border-border">
          <span className="text-sm font-semibold">Notifiche</span>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" className="text-xs h-6" onClick={markAllRead}>
              <Check className="h-3 w-3 mr-1" /> Segna tutte lette
            </Button>
          )}
        </div>
        <ScrollArea className="max-h-72">
          {notifications.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              <Bell className="h-8 w-8 mx-auto mb-2 opacity-30" />
              Nessuna notifica
            </div>
          ) : (
            notifications.map(notif => (
              <div
                key={notif.id}
                className={`flex items-start gap-2 px-3 py-2 border-b border-border/50 hover:bg-muted/50 cursor-pointer transition-colors ${
                  !notif.is_read ? "bg-primary/5" : ""
                }`}
                onClick={() => handleClick(notif)}
              >
                {notif.type === "share" ? (
                  <Share2 className={`h-4 w-4 mt-0.5 shrink-0 ${!notif.is_read ? "text-primary" : "text-muted-foreground"}`} />
                ) : (
                  <MessageSquare className={`h-4 w-4 mt-0.5 shrink-0 ${!notif.is_read ? "text-primary" : "text-muted-foreground"}`} />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-xs">{getNotifText(notif)}</p>
                  {notif.type === "comment" && (notif as CommentNotification).comment_preview && (
                    <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-1">
                      "{(notif as CommentNotification).comment_preview}"
                    </p>
                  )}
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {formatDistanceToNow(new Date(notif.created_at), { addSuffix: true, locale: it })}
                  </p>
                </div>
                <Button
                  variant="ghost" size="icon"
                  className="h-5 w-5 shrink-0 opacity-50 hover:opacity-100"
                  onClick={(e) => { e.stopPropagation(); dismiss(notif); }}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ))
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
};

export default NoteShareNotifications;
