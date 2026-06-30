import { useMemo, useState } from "react";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLeaveAudit } from "@/hooks/useLeaveAudit";
import { ArrowDownUp, History, X } from "lucide-react";

const ACTION_LABEL: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  creata: { label: "Creata", variant: "default" },
  modificata: { label: "Modificata", variant: "outline" },
  approvata: { label: "Approvata", variant: "secondary" },
  rifiutata: { label: "Rifiutata", variant: "destructive" },
  eliminata: { label: "Eliminata", variant: "destructive" },
  allegato_caricato: { label: "Allegato caricato", variant: "default" },
  allegato_rimosso: { label: "Allegato rimosso", variant: "outline" },
};

function summarise(action: string, details: Record<string, unknown>): string {
  if (!details) return "";
  if (action === "creata") {
    return `${details.type} · ${details.start_date} → ${details.end_date}${details.hours ? ` · ${details.hours}h` : ""}`;
  }
  if (action === "approvata" || action === "rifiutata") {
    return (details.note as string) || "";
  }
  if (action === "modificata" && details.before && details.after) {
    const b = details.before as any;
    const a = details.after as any;
    const changed: string[] = [];
    for (const k of ["type", "start_date", "end_date", "hours", "reason"]) {
      if (b[k] !== a[k]) changed.push(`${k}: ${b[k] ?? "—"} → ${a[k] ?? "—"}`);
    }
    return changed.join(" · ");
  }
  if (action.startsWith("allegato")) {
    return (details.path as string) || "";
  }
  return "";
}

export function LeaveAuditLog() {
  const { items, loading } = useLeaveAudit();
  const [action, setAction] = useState<string>("all");
  const [worker, setWorker] = useState<string>("all");
  const [author, setAuthor] = useState<string>("all");
  const [from, setFrom] = useState<string>("");
  const [to, setTo] = useState<string>("");
  const [q, setQ] = useState<string>("");
  const [order, setOrder] = useState<"desc" | "asc">("desc");

  const workerOptions = useMemo(() => {
    const map = new Map<string, string>();
    items.forEach((i) => map.set(i.request_owner_id, i.owner_name || "Dipendente"));
    return Array.from(map.entries());
  }, [items]);
  const authorOptions = useMemo(() => {
    const map = new Map<string, string>();
    items.forEach((i) => {
      if (i.actor_id) map.set(i.actor_id, i.actor_name || "—");
    });
    return Array.from(map.entries());
  }, [items]);

  const filtered = useMemo(() => {
    const fromMs = from ? new Date(from).getTime() : null;
    const toMs = to ? new Date(to).getTime() + 24 * 3600 * 1000 - 1 : null;
    const needle = q.trim().toLowerCase();
    return items
      .filter((e) => {
        if (action !== "all" && e.action !== action) return false;
        if (worker !== "all" && e.request_owner_id !== worker) return false;
        if (author !== "all" && e.actor_id !== author) return false;
        const t = new Date(e.created_at).getTime();
        if (fromMs != null && t < fromMs) return false;
        if (toMs != null && t > toMs) return false;
        if (needle) {
          const hay = `${e.owner_name ?? ""} ${e.actor_name ?? ""} ${e.action} ${JSON.stringify(e.details ?? {})}`.toLowerCase();
          if (!hay.includes(needle)) return false;
        }
        return true;
      })
      .sort((a, b) => {
        const d = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        return order === "asc" ? d : -d;
      });
  }, [items, action, worker, author, from, to, q, order]);

  const reset = () => {
    setAction("all"); setWorker("all"); setAuthor("all");
    setFrom(""); setTo(""); setQ("");
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <History className="h-5 w-5" />
        <h3 className="font-semibold">Registro azioni</h3>
        <span className="text-xs text-muted-foreground">({filtered.length} / {items.length})</span>
        <Button variant="ghost" size="sm" className="ml-auto" onClick={() => setOrder(order === "desc" ? "asc" : "desc")}>
          <ArrowDownUp className="h-4 w-4 mr-1" /> {order === "desc" ? "Più recenti" : "Più vecchi"}
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 rounded-md border p-3 bg-muted/30">
        <div>
          <Label className="text-xs">Ricerca</Label>
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Parola chiave…" />
        </div>
        <div>
          <Label className="text-xs">Tipo evento</Label>
          <Select value={action} onValueChange={setAction}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tutti</SelectItem>
              {Object.entries(ACTION_LABEL).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Lavoratore</Label>
          <Select value={worker} onValueChange={setWorker}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tutti</SelectItem>
              {workerOptions.map(([id, name]) => (
                <SelectItem key={id} value={id}>{name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Autore</Label>
          <Select value={author} onValueChange={setAuthor}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tutti</SelectItem>
              {authorOptions.map(([id, name]) => (
                <SelectItem key={id} value={id}>{name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Dal</Label>
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div>
          <Label className="text-xs">Al</Label>
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        <div className="sm:col-span-2 lg:col-span-3 flex justify-end">
          <Button variant="ghost" size="sm" onClick={reset}>
            <X className="h-4 w-4 mr-1" /> Azzera filtri
          </Button>
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Caricamento…</p>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground py-6 text-center">Nessuna azione corrisponde ai filtri.</p>
      ) : (
        <div className="max-h-[65vh] overflow-y-auto border rounded-md divide-y">
          {filtered.map((e) => {
            const meta = ACTION_LABEL[e.action] ?? { label: e.action, variant: "outline" as const };
            return (
              <div key={e.id} className="p-3 flex items-start justify-between gap-3 hover:bg-muted/40">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant={meta.variant}>{meta.label}</Badge>
                    <span className="text-sm font-medium">
                      {e.owner_name || "Dipendente"}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      da {e.actor_name || "—"}
                    </span>
                  </div>
                  {summarise(e.action, e.details) && (
                    <p className="text-xs text-muted-foreground mt-1 break-words">
                      {summarise(e.action, e.details)}
                    </p>
                  )}
                </div>
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  {format(new Date(e.created_at), "dd/MM/yyyy HH:mm", { locale: it })}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}