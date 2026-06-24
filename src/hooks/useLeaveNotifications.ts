import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useUserRole } from "./useUserRole";
import { useToast } from "./use-toast";

/**
 * Realtime toast notifications for the worker area.
 * - Approvers (admin/contabilita) get a toast on every new request.
 * - Requesters get a toast when their request is approved/rejected.
 * - Anyone with a balance row gets a toast when their saldo changes.
 */
export function useLeaveNotifications(enabled = true) {
  const { user } = useAuth();
  const { isAdmin, isContabilita } = useUserRole();
  const { toast } = useToast();
  const nameCache = useRef<Map<string, string>>(new Map());

  useEffect(() => {
    if (!enabled || !user) return;
    const isApprover = isAdmin || isContabilita;

    const channel = supabase.channel(`leave-notif-${user.id}`);

    if (isApprover) {
      channel.on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "worker_leave_requests" },
        async (payload) => {
          const row: any = payload.new;
          let name = nameCache.current.get(row.user_id);
          if (!name) {
            const { data } = await supabase
              .from("profiles")
              .select("full_name")
              .eq("user_id", row.user_id)
              .maybeSingle();
            name = (data as any)?.full_name || "Un dipendente";
            nameCache.current.set(row.user_id, name as string);
          }
          toast({
            title: "Nuova richiesta da evadere",
            description: `${name} · ${row.type.replace("_", " ")} dal ${row.start_date}`,
          });
        },
      );
    }

    channel.on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "worker_leave_requests",
        filter: `user_id=eq.${user.id}`,
      },
      (payload) => {
        const before: any = payload.old;
        const after: any = payload.new;
        if (before.status === after.status) return;
        if (after.status === "approvata") {
          toast({ title: "Richiesta approvata", description: `Dal ${after.start_date} al ${after.end_date}` });
        } else if (after.status === "rifiutata") {
          toast({
            title: "Richiesta rifiutata",
            description: after.review_note || `Dal ${after.start_date} al ${after.end_date}`,
            variant: "destructive",
          });
        }
      },
    );

    channel.on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "worker_leave_balances",
        filter: `user_id=eq.${user.id}`,
      },
      (payload) => {
        const b: any = payload.new;
        const o: any = payload.old;
        const parts: string[] = [];
        if (b.vacation_days_used !== o.vacation_days_used) {
          parts.push(`Ferie residue: ${(b.vacation_days_total - b.vacation_days_used).toFixed(1)} gg`);
        }
        if (b.permit_hours_used !== o.permit_hours_used) {
          parts.push(`Permessi residui: ${(b.permit_hours_total - b.permit_hours_used).toFixed(1)} h`);
        }
        if (parts.length) toast({ title: "Saldo aggiornato", description: parts.join(" · ") });
      },
    );

    channel.subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, isAdmin, isContabilita, enabled, toast]);
}
