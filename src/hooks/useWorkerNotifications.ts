import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";

export interface WorkerNotification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string | null;
  request_id: string | null;
  meta: Record<string, unknown>;
  read_at: string | null;
  created_at: string;
}

export function useWorkerNotifications() {
  const { user } = useAuth();
  const [items, setItems] = useState<WorkerNotification[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await (supabase as any)
      .from("worker_notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(100);
    setItems((data as WorkerNotification[]) ?? []);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (!user) return;
    load();
    const channel = supabase
      .channel(`wn-list-${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "worker_notifications", filter: `user_id=eq.${user.id}` },
        () => load(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, load]);

  const unreadCount = items.filter((n) => !n.read_at).length;

  const markRead = useCallback(async (id: string) => {
    const { error } = await (supabase as any)
      .from("worker_notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("id", id);
    if (error) toast.error("Impossibile segnare come letta");
    else toast.success("Notifica segnata come letta");
  }, []);

  const markUnread = useCallback(async (id: string) => {
    const { error } = await (supabase as any)
      .from("worker_notifications")
      .update({ read_at: null })
      .eq("id", id);
    if (error) toast.error("Impossibile segnare come non letta");
    else toast.success("Notifica segnata come non letta");
  }, []);

  const markAllRead = useCallback(async () => {
    if (!user) return;
    const { error } = await (supabase as any)
      .from("worker_notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("user_id", user.id)
      .is("read_at", null);
    if (error) toast.error("Operazione non riuscita");
    else toast.success("Tutte le notifiche segnate come lette");
  }, [user]);

  const markAllUnread = useCallback(async () => {
    if (!user) return;
    const { error } = await (supabase as any)
      .from("worker_notifications")
      .update({ read_at: null })
      .eq("user_id", user.id)
      .not("read_at", "is", null);
    if (error) toast.error("Operazione non riuscita");
    else toast.success("Tutte le notifiche segnate come non lette");
  }, [user]);

  const remove = useCallback(async (id: string) => {
    const { error } = await (supabase as any).from("worker_notifications").delete().eq("id", id);
    if (error) toast.error("Impossibile eliminare la notifica");
    else toast.success("Notifica eliminata");
  }, []);

  return { items, loading, unreadCount, markRead, markUnread, markAllRead, markAllUnread, remove, refresh: load };
}