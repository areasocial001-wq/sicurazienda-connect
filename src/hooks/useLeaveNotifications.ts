import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useToast } from "./use-toast";

/**
 * Realtime toast notifications for the worker area.
 * - Approvers (admin/contabilita) get a toast on every new request.
 * - Requesters get a toast when their request is approved/rejected.
 * - Anyone with a balance row gets a toast when their saldo changes.
 */
/**
 * Subscribes to the centralised `worker_notifications` table and surfaces each
 * new row as a toast. Server-side triggers already respect per-user preferences,
 * so the client just mirrors what the DB delivers.
 */
export function useLeaveNotifications(enabled = true) {
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (!enabled || !user) return;
    const channel = supabase
      .channel(`worker-notif-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "worker_notifications",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const n: any = payload.new;
          toast({
            title: n.title,
            description: n.body ?? undefined,
            variant: n.type === "rejected" ? "destructive" : "default",
          });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, enabled, toast]);
}
