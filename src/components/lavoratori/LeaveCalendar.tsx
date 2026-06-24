import { Card, CardContent } from "@/components/ui/card";
import type { LeaveRequest } from "@/hooks/useWorkerLeave";
import { format, eachDayOfInterval } from "date-fns";
import { it } from "date-fns/locale";

const TYPE_LABEL: Record<string, string> = {
  ferie: "Ferie",
  permesso_rol: "Permesso ROL",
  permesso_retribuito: "Permesso retribuito",
  malattia: "Malattia",
  altro: "Altro",
};

export function LeaveCalendar({ requests }: { requests: LeaveRequest[] }) {
  const today = new Date();
  const future = requests
    .filter((r) => r.status === "approvata" && new Date(r.end_date) >= today)
    .sort((a, b) => a.start_date.localeCompare(b.start_date));

  // group by month
  const byMonth = new Map<string, LeaveRequest[]>();
  for (const r of future) {
    const days = eachDayOfInterval({ start: new Date(r.start_date), end: new Date(r.end_date) });
    for (const d of days) {
      if (d < today) continue;
      const key = format(d, "yyyy-MM");
      const arr = byMonth.get(key) || [];
      arr.push(r);
      byMonth.set(key, arr);
    }
  }

  if (!future.length) {
    return <p className="text-sm text-muted-foreground text-center py-8">Nessuna assenza approvata in arrivo.</p>;
  }

  return (
    <div className="space-y-3 max-h-[60vh] overflow-y-auto">
      {future.map((r) => (
        <Card key={r.id}>
          <CardContent className="p-3">
            <div className="font-medium">{r.requester_name || "Utente"}</div>
            <div className="text-sm text-muted-foreground">
              {TYPE_LABEL[r.type]} · {format(new Date(r.start_date), "d MMM", { locale: it })}
              {r.start_date !== r.end_date && (
                <> → {format(new Date(r.end_date), "d MMM yyyy", { locale: it })}</>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
