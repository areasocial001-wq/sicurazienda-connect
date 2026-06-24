import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface ChatChannel {
  id: string;
  name: string;
  type: "general" | "role" | "direct";
  role: string | null;
  unread?: number;
}

export interface ChatMessage {
  id: string;
  channel_id: string;
  user_id: string;
  content: string | null;
  attachment_path: string | null;
  attachment_name: string | null;
  created_at: string;
  author_name?: string | null;
}

export function useWorkerChannels() {
  const { user } = useAuth();
  const [channels, setChannels] = useState<ChatChannel[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data: memberships } = await supabase
      .from("worker_chat_members")
      .select("channel_id, last_read_at")
      .eq("user_id", user.id);

    const ids = (memberships || []).map((m: any) => m.channel_id);
    if (!ids.length) {
      setChannels([]);
      setLoading(false);
      return;
    }

    const { data: chans } = await supabase
      .from("worker_chat_channels")
      .select("*")
      .in("id", ids);

    // unread counts
    const lastRead = new Map((memberships || []).map((m: any) => [m.channel_id, m.last_read_at]));
    const out: ChatChannel[] = [];
    for (const c of (chans as any[]) || []) {
      const { count } = await supabase
        .from("worker_chat_messages")
        .select("id", { count: "exact", head: true })
        .eq("channel_id", c.id)
        .gt("created_at", lastRead.get(c.id) || "1970-01-01")
        .neq("user_id", user.id);
      out.push({ ...c, unread: count || 0 });
    }
    out.sort((a, b) => {
      const order = (t: string) => (t === "general" ? 0 : t === "role" ? 1 : 2);
      return order(a.type) - order(b.type) || a.name.localeCompare(b.name);
    });
    setChannels(out);
    setLoading(false);
  }, [user]);

  useEffect(() => { refresh(); }, [refresh]);

  return { channels, loading, refresh };
}

export function useChannelMessages(channelId: string | null) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const nameCache = useRef<Map<string, string>>(new Map());

  const resolveNames = useCallback(async (msgs: ChatMessage[]) => {
    const missing = Array.from(new Set(msgs.map((m) => m.user_id))).filter(
      (id) => !nameCache.current.has(id),
    );
    if (missing.length) {
      const { data } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", missing);
      for (const p of (data as any[]) || []) {
        nameCache.current.set(p.user_id, p.full_name || "Utente");
      }
    }
    return msgs.map((m) => ({ ...m, author_name: nameCache.current.get(m.user_id) || "Utente" }));
  }, []);

  const load = useCallback(async () => {
    if (!channelId) return;
    setLoading(true);
    const { data } = await supabase
      .from("worker_chat_messages")
      .select("*")
      .eq("channel_id", channelId)
      .order("created_at", { ascending: true })
      .limit(500);
    const enriched = await resolveNames((data as ChatMessage[]) || []);
    setMessages(enriched);
    setLoading(false);

    // mark as read
    if (user) {
      await supabase
        .from("worker_chat_members")
        .update({ last_read_at: new Date().toISOString() })
        .eq("channel_id", channelId)
        .eq("user_id", user.id);
    }
  }, [channelId, user, resolveNames]);

  useEffect(() => { load(); }, [load]);

  // Realtime subscription
  useEffect(() => {
    if (!channelId) return;
    const channel = supabase
      .channel(`worker-chat-${channelId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "worker_chat_messages", filter: `channel_id=eq.${channelId}` },
        async (payload) => {
          const newMsg = payload.new as ChatMessage;
          const [enriched] = await resolveNames([newMsg]);
          setMessages((prev) => (prev.some((m) => m.id === enriched.id) ? prev : [...prev, enriched]));
          if (user && newMsg.user_id !== user.id) {
            await supabase
              .from("worker_chat_members")
              .update({ last_read_at: new Date().toISOString() })
              .eq("channel_id", channelId)
              .eq("user_id", user.id);
          }
        },
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [channelId, user, resolveNames]);

  const sendMessage = async (content: string, attachment?: { path: string; name: string }) => {
    if (!channelId || !user) return;
    const trimmed = content.trim();
    if (!trimmed && !attachment) return;
    const { error } = await supabase.from("worker_chat_messages").insert({
      channel_id: channelId,
      user_id: user.id,
      content: trimmed || null,
      attachment_path: attachment?.path || null,
      attachment_name: attachment?.name || null,
    });
    if (error) throw error;
  };

  return { messages, loading, sendMessage, reload: load };
}
