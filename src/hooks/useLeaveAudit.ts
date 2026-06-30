import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface LeaveAuditEntry {
  id: string;
  request_id: string | null;
  request_owner_id: string;
  actor_id: string | null;
  actor_name: string | null;
  action: string;
  details: Record<string, unknown>;
  created_at: string;
  owner_name?: string | null;
}

export function useLeaveAudit(limit = 200) {
  const [items, setItems] = useState<LeaveAuditEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await (supabase as any)
      .from("worker_leave_audit")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);
    const rows = (data as LeaveAuditEntry[]) ?? [];
    const ownerIds = Array.from(new Set(rows.map((r) => r.request_owner_id))).filter(Boolean);
    let nameMap = new Map<string, string>();
    if (ownerIds.length) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", ownerIds);
      nameMap = new Map((profs ?? []).map((p: any) => [p.user_id, p.full_name]));
    }
    setItems(rows.map((r) => ({ ...r, owner_name: nameMap.get(r.request_owner_id) ?? null })));
    setLoading(false);
  }, [limit]);

  useEffect(() => {
    load();
    const channel = supabase
      .channel("leave-audit-stream")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "worker_leave_audit" },
        () => load(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [load]);

  return { items, loading, refresh: load };
}