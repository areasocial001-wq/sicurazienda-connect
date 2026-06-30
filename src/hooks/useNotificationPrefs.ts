import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface NotificationPrefs {
  notify_new_request: boolean;
  notify_decision: boolean;
  notify_balance: boolean;
}

const DEFAULTS: NotificationPrefs = {
  notify_new_request: true,
  notify_decision: true,
  notify_balance: true,
};

export function useNotificationPrefs() {
  const { user } = useAuth();
  const [prefs, setPrefs] = useState<NotificationPrefs>(DEFAULTS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await (supabase as any)
        .from("worker_notification_prefs")
        .select("notify_new_request, notify_decision, notify_balance")
        .eq("user_id", user.id)
        .maybeSingle();
      if (data) setPrefs(data as NotificationPrefs);
      setLoading(false);
    })();
  }, [user]);

  const save = useCallback(
    async (next: Partial<NotificationPrefs>) => {
      if (!user) return;
      const merged = { ...prefs, ...next };
      setPrefs(merged);
      await (supabase as any)
        .from("worker_notification_prefs")
        .upsert(
          { user_id: user.id, ...merged, updated_at: new Date().toISOString() },
          { onConflict: "user_id" },
        );
    },
    [user, prefs],
  );

  return { prefs, loading, save };
}