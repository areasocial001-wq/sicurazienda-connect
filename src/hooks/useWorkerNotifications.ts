import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

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
    await (supabase as any)
      .from("worker_notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("id", id);
  }, []);

  const markAllRead = useCallback(async () => {
    if (!user) return;
    await (supabase as any)
      .from("worker_notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("user_id", user.id)
      .is("read_at", null);
  }, [user]);

  const remove = useCallback(async (id: string) => {
    await (supabase as any).from("worker_notifications").delete().eq("id", id);
  }, []);

  return { items, loading, unreadCount, markRead, markAllRead, remove, refresh: load };
}