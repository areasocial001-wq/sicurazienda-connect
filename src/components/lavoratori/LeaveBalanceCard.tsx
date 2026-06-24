import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { LeaveBalance } from "@/hooks/useWorkerLeave";

export function LeaveBalanceCard({ balance }: { balance: LeaveBalance | null }) {
  const vacUsed = balance?.vacation_days_used ?? 0;
  const vacTot = balance?.vacation_days_total ?? 26;
  const permUsed = balance?.permit_hours_used ?? 0;
  const permTot = balance?.permit_hours_total ?? 104;
  const year = balance?.year ?? new Date().getFullYear();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Saldo {year}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <div className="flex justify-between text-sm mb-1">
            <span>Ferie</span>
            <span className="font-medium">{vacTot - vacUsed} / {vacTot} giorni residui</span>
          </div>
          <Progress value={vacTot ? (vacUsed / vacTot) * 100 : 0} />
        </div>
        <div>
          <div className="flex justify-between text-sm mb-1">
            <span>Permessi</span>
            <span className="font-medium">{permTot - permUsed} / {permTot} ore residue</span>
          </div>
          <Progress value={permTot ? (permUsed / permTot) * 100 : 0} />
        </div>
        {!balance && (
          <p className="text-xs text-muted-foreground">
            Saldo non ancora impostato. Verrà creato automaticamente alla prima approvazione, oppure dall'amministrazione.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
