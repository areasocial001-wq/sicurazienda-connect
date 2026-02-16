import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Bell, Check, Share2, X } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { it } from "date-fns/locale";

interface ShareNotification {
  id: string;
  note_id: string;
  shared_by_name: string | null;
  note_title: string | null;
  is_read: boolean;
  created_at: string;
}

interface NoteShareNotificationsProps {
  onOpenNote?: (noteId: string) => void;
}

const NoteShareNotifications = ({ onOpenNote }: NoteShareNotificationsProps) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<ShareNotification[]>([]);
  const [open, setOpen] = useState(false);

  const fetchNotifications = async () => {
    if (!user) return;
    const { data } = await (supabase as any)
      .from("note_share_notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20);
    if (data) setNotifications(data as ShareNotification[]);
  };

  // Resolve pending shares on mount
  useEffect(() => {
    if (!user) return;
    (supabase as any).rpc("resolve_my_note_shares").then(() => {
      fetchNotifications();
    });
  }, [user]);

  // Realtime subscription
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("note-share-notifications")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "note_share_notifications", filter: `user_id=eq.${user.id}` },
        () => fetchNotifications()
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const markAsRead = async (id: string) => {
    await (supabase as any)
      .from("note_share_notifications")
      .update({ is_read: true })
      .eq("id", id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
  };

  const markAllRead = async () => {
    const unreadIds = notifications.filter(n => !n.is_read).map(n => n.id);
    if (unreadIds.length === 0) return;
    await (supabase as any)
      .from("note_share_notifications")
      .update({ is_read: true })
      .in("id", unreadIds);
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
  };

  const dismissNotification = async (id: string) => {
    await (supabase as any)
      .from("note_share_notifications")
      .delete()
      .eq("id", id);
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const handleClick = (notif: ShareNotification) => {
    markAsRead(notif.id);
    onOpenNote?.(notif.note_id);
    setOpen(false);
  };

  if (!user) return null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-8 w-8 hover:bg-white/10">
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-emerald-500 text-[10px] font-bold flex items-center justify-center text-white">
              {unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between px-3 py-2 border-b border-border">
          <span className="text-sm font-semibold">Notifiche condivisione</span>
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
                  !notif.is_read ? "bg-emerald-500/5" : ""
                }`}
                onClick={() => handleClick(notif)}
              >
                <Share2 className={`h-4 w-4 mt-0.5 shrink-0 ${!notif.is_read ? "text-emerald-500" : "text-muted-foreground"}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs">
                    <span className="font-medium">{notif.shared_by_name || "Un utente"}</span>
                    {" ha condiviso "}
                    <span className="font-medium truncate">"{notif.note_title || "una nota"}"</span>
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {formatDistanceToNow(new Date(notif.created_at), { addSuffix: true, locale: it })}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5 shrink-0 opacity-50 hover:opacity-100"
                  onClick={(e) => { e.stopPropagation(); dismissNotification(notif.id); }}
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
