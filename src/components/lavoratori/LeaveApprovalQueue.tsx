import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Check, X } from "lucide-react";
import { useWorkerLeave, type LeaveRequest } from "@/hooks/useWorkerLeave";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { it } from "date-fns/locale";

const TYPE_LABEL: Record<string, string> = {
  ferie: "Ferie",
  permesso_rol: "Permesso ROL",
  permesso_retribuito: "Permesso retribuito",
  malattia: "Malattia",
  altro: "Altro",
};

export function LeaveApprovalQueue() {
  const { allRequests, reviewRequest } = useWorkerLeave();
  const { toast } = useToast();
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);

  const pending = allRequests.filter((r) => r.status === "in_attesa");
  const decided = allRequests.filter((r) => r.status !== "in_attesa").slice(0, 30);

  const handle = async (id: string, status: "approvata" | "rifiutata") => {
    setBusy(id);
    try {
      await reviewRequest(id, status, notes[id]);
      toast({ title: status === "approvata" ? "Richiesta approvata" : "Richiesta rifiutata" });
    } catch (e: any) {
      toast({ title: "Errore", description: e.message, variant: "destructive" });
    } finally {
      setBusy(null);
    }
  };

  const renderItem = (r: LeaveRequest) => (
    <Card key={r.id}>
      <CardContent className="p-3 space-y-2">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div>
            <span className="font-medium">{r.requester_name || "Utente"}</span>
            <span className="text-muted-foreground"> · {TYPE_LABEL[r.type]}</span>
          </div>
          {r.status !== "in_attesa" && (
            <Badge variant={r.status === "approvata" ? "default" : "destructive"}>
              {r.status === "approvata" ? "Approvata" : "Rifiutata"}
            </Badge>
          )}
        </div>
        <div className="text-sm">
          {format(new Date(r.start_date), "d MMM yyyy", { locale: it })}
          {r.start_date !== r.end_date && (
            <> → {format(new Date(r.end_date), "d MMM yyyy", { locale: it })}</>
          )}
          {r.hours ? ` · ${r.hours}h` : ""}
        </div>
        {r.reason && <div className="text-xs italic text-muted-foreground">{r.reason}</div>}
        {r.status === "in_attesa" ? (
          <>
            <Textarea
              placeholder="Nota (opzionale)"
              value={notes[r.id] || ""}
              onChange={(e) => setNotes((n) => ({ ...n, [r.id]: e.target.value }))}
              rows={2}
            />
            <div className="flex gap-2">
              <Button size="sm" disabled={busy === r.id} onClick={() => handle(r.id, "approvata")}>
                <Check className="h-4 w-4 mr-1" /> Approva
              </Button>
              <Button size="sm" variant="destructive" disabled={busy === r.id} onClick={() => handle(r.id, "rifiutata")}>
                <X className="h-4 w-4 mr-1" /> Rifiuta
              </Button>
            </div>
          </>
        ) : (
          r.review_note && (
            <div className="text-xs border-l-2 border-muted pl-2">Nota: {r.review_note}</div>
          )
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-semibold mb-2">Da evadere ({pending.length})</h3>
        {pending.length ? (
          <div className="space-y-2 max-h-[50vh] overflow-y-auto">{pending.map(renderItem)}</div>
        ) : (
          <p className="text-sm text-muted-foreground">Nessuna richiesta in attesa.</p>
        )}
      </div>
      {decided.length > 0 && (
        <div>
          <h3 className="font-semibold mb-2">Recenti</h3>
          <div className="space-y-2 max-h-[40vh] overflow-y-auto">{decided.map(renderItem)}</div>
        </div>
      )}
    </div>
  );
}
