import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Hash, Users as UsersIcon, Send, Paperclip, ArrowLeft } from "lucide-react";
import { useWorkerChannels, useChannelMessages } from "@/hooks/useWorkerChat";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { cn } from "@/lib/utils";

export function ChatPanel() {
  const { channels, loading, refresh } = useWorkerChannels();
  const [active, setActive] = useState<string | null>(null);
  const activeChannel = channels.find((c) => c.id === active);

  // auto-pick first channel on desktop
  useEffect(() => {
    if (!active && channels.length && window.innerWidth >= 1024) {
      setActive(channels[0].id);
    }
  }, [channels, active]);

  if (loading) return <p className="text-sm text-muted-foreground py-8 text-center">Caricamento chat...</p>;
  if (!channels.length) {
    return <p className="text-sm text-muted-foreground py-8 text-center">Nessun canale disponibile.</p>;
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-3 h-[70vh]">
      <div className={cn("border rounded-lg overflow-y-auto", active && "hidden lg:block")}>
        {channels.map((c) => (
          <button
            key={c.id}
            onClick={() => setActive(c.id)}
            className={cn(
              "w-full text-left px-3 py-2 border-b hover:bg-muted/50 flex items-center justify-between gap-2",
              active === c.id && "bg-muted",
            )}
          >
            <span className="flex items-center gap-2 min-w-0">
              {c.type === "general" ? <UsersIcon className="h-4 w-4 shrink-0" /> : <Hash className="h-4 w-4 shrink-0" />}
              <span className="truncate">{c.name}</span>
            </span>
            {(c.unread ?? 0) > 0 && <Badge className="shrink-0">{c.unread}</Badge>}
          </button>
        ))}
      </div>
      <div className={cn("border rounded-lg flex flex-col", !active && "hidden lg:flex")}>
        {activeChannel ? (
          <ChatWindow
            channelId={activeChannel.id}
            channelName={activeChannel.name}
            onBack={() => { setActive(null); refresh(); }}
          />
        ) : (
          <p className="text-sm text-muted-foreground p-8 text-center m-auto">Seleziona un canale</p>
        )}
      </div>
    </div>
  );
}

function ChatWindow({ channelId, channelName, onBack }: { channelId: string; channelName: string; onBack: () => void }) {
  const { user } = useAuth();
  const { messages, sendMessage } = useChannelMessages(channelId);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const { toast } = useToast();
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || (!text.trim() && !file)) return;
    setSending(true);
    try {
      let attachment;
      if (file) {
        const path = `${user.id}/chat/${Date.now()}-${file.name}`;
        const { error: upErr } = await supabase.storage.from("worker-files").upload(path, file);
        if (upErr) throw upErr;
        attachment = { path, name: file.name };
      }
      await sendMessage(text, attachment);
      setText("");
      setFile(null);
    } catch (err: any) {
      toast({ title: "Errore", description: err.message, variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  const openAttachment = async (path: string) => {
    const { data } = await supabase.storage.from("worker-files").createSignedUrl(path, 3600);
    if (data?.signedUrl) window.open(data.signedUrl, "_blank");
  };

  return (
    <>
      <div className="px-3 py-2 border-b flex items-center gap-2">
        <Button variant="ghost" size="icon" className="lg:hidden" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <Hash className="h-4 w-4" />
        <span className="font-medium">{channelName}</span>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {messages.map((m) => {
          const mine = m.user_id === user?.id;
          return (
            <div key={m.id} className={cn("flex", mine ? "justify-end" : "justify-start")}>
              <Card className={cn("max-w-[85%]", mine && "bg-primary text-primary-foreground")}>
                <CardContent className="p-2">
                  {!mine && <div className="text-xs font-medium mb-1">{m.author_name}</div>}
                  {m.content && <div className="whitespace-pre-wrap break-words text-sm">{m.content}</div>}
                  {m.attachment_path && (
                    <button
                      onClick={() => openAttachment(m.attachment_path!)}
                      className="text-xs underline mt-1 flex items-center gap-1"
                    >
                      <Paperclip className="h-3 w-3" /> {m.attachment_name || "Allegato"}
                    </button>
                  )}
                  <div className={cn("text-[10px] mt-1", mine ? "opacity-70" : "text-muted-foreground")}>
                    {format(new Date(m.created_at), "d MMM HH:mm", { locale: it })}
                  </div>
                </CardContent>
              </Card>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>
      <form onSubmit={handleSend} className="border-t p-2 flex items-center gap-2">
        <label className="cursor-pointer">
          <input type="file" className="hidden" onChange={(e) => setFile(e.target.files?.[0] || null)} />
          <Button type="button" variant="ghost" size="icon" asChild>
            <span><Paperclip className="h-4 w-4" /></span>
          </Button>
        </label>
        <Input
          placeholder={file ? `File: ${file.name}` : "Scrivi un messaggio..."}
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <Button type="submit" size="icon" disabled={sending}>
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </>
  );
}
