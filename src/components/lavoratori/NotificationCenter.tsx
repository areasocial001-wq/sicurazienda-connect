import { formatDistanceToNow } from "date-fns";
import { it } from "date-fns/locale";
import { Bell, Check, CheckCheck, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useWorkerNotifications } from "@/hooks/useWorkerNotifications";

const TYPE_BADGE: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  new_request: { label: "Nuova richiesta", variant: "default" },
  approved: { label: "Approvata", variant: "secondary" },
  rejected: { label: "Rifiutata", variant: "destructive" },
  balance: { label: "Saldo", variant: "outline" },
};

export function NotificationCenter() {
  const { items, unreadCount, markRead, markAllRead, remove } = useWorkerNotifications();

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          <h3 className="font-semibold">Notifiche</h3>
          {unreadCount > 0 && <Badge variant="destructive">{unreadCount} non lette</Badge>}
        </div>
        {unreadCount > 0 && (
          <Button variant="ghost" size="sm" onClick={markAllRead}>
            <CheckCheck className="h-4 w-4 mr-1" /> Segna tutte come lette
          </Button>
        )}
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground py-6 text-center">Nessuna notifica.</p>
      ) : (
        <div className="max-h-[60vh] overflow-y-auto space-y-2 pr-1">
          {items.map((n) => {
            const badge = TYPE_BADGE[n.type] ?? { label: n.type, variant: "outline" as const };
            const unread = !n.read_at;
            return (
              <div
                key={n.id}
                className={`rounded-md border p-3 flex items-start justify-between gap-2 ${unread ? "bg-accent/40 border-accent" : "bg-card"}`}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant={badge.variant}>{badge.label}</Badge>
                    <span className="font-medium text-sm">{n.title}</span>
                    {unread && <span className="h-2 w-2 rounded-full bg-primary" />}
                  </div>
                  {n.body && <p className="text-sm text-muted-foreground mt-1">{n.body}</p>}
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: it })}
                  </p>
                </div>
                <div className="flex flex-col gap-1">
                  {unread && (
                    <Button variant="ghost" size="icon" onClick={() => markRead(n.id)} title="Segna come letta">
                      <Check className="h-4 w-4" />
                    </Button>
                  )}
                  <Button variant="ghost" size="icon" onClick={() => remove(n.id)} title="Elimina">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}