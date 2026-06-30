import { format } from "date-fns";
import { it } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { useLeaveAudit } from "@/hooks/useLeaveAudit";
import { History } from "lucide-react";

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

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <History className="h-5 w-5" />
        <h3 className="font-semibold">Registro azioni</h3>
        <span className="text-xs text-muted-foreground">({items.length})</span>
      </div>
      {loading ? (
        <p className="text-sm text-muted-foreground">Caricamento…</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-muted-foreground py-6 text-center">Nessuna azione registrata.</p>
      ) : (
        <div className="max-h-[65vh] overflow-y-auto border rounded-md divide-y">
          {items.map((e) => {
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