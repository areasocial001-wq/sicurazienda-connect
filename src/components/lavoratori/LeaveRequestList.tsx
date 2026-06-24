import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Trash2 } from "lucide-react";
import type { LeaveRequest } from "@/hooks/useWorkerLeave";
import { format } from "date-fns";
import { it } from "date-fns/locale";

const TYPE_LABEL: Record<string, string> = {
  ferie: "Ferie",
  permesso_rol: "Permesso ROL",
  permesso_retribuito: "Permesso retribuito",
  malattia: "Malattia",
  altro: "Altro",
};

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  in_attesa: "secondary",
  approvata: "default",
  rifiutata: "destructive",
};

const STATUS_LABEL: Record<string, string> = {
  in_attesa: "In attesa",
  approvata: "Approvata",
  rifiutata: "Rifiutata",
};

export function LeaveRequestList({
  requests,
  showRequester,
  onCancel,
}: {
  requests: LeaveRequest[];
  showRequester?: boolean;
  onCancel?: (id: string) => void;
}) {
  if (!requests.length) {
    return <p className="text-sm text-muted-foreground text-center py-8">Nessuna richiesta.</p>;
  }
  return (
    <div className="space-y-2 max-h-[60vh] overflow-y-auto">
      {requests.map((r) => (
        <Card key={r.id}>
          <CardContent className="p-3 flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium">{TYPE_LABEL[r.type]}</span>
                <Badge variant={STATUS_VARIANT[r.status]}>{STATUS_LABEL[r.status]}</Badge>
              </div>
              <div className="text-sm text-muted-foreground mt-1">
                {format(new Date(r.start_date), "d MMM yyyy", { locale: it })}
                {r.start_date !== r.end_date && (
                  <> → {format(new Date(r.end_date), "d MMM yyyy", { locale: it })}</>
                )}
                {r.hours ? ` · ${r.hours}h` : ""}
              </div>
              {showRequester && r.requester_name && (
                <div className="text-xs mt-1">👤 {r.requester_name}</div>
              )}
              {r.reason && <div className="text-xs italic mt-1 text-muted-foreground">{r.reason}</div>}
              {r.review_note && (
                <div className="text-xs mt-1 border-l-2 border-muted pl-2">Nota: {r.review_note}</div>
              )}
            </div>
            {onCancel && r.status === "in_attesa" && (
              <Button size="icon" variant="ghost" onClick={() => onCancel(r.id)} title="Annulla">
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
