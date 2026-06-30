import { Settings2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useNotificationPrefs } from "@/hooks/useNotificationPrefs";
import { useUserRole } from "@/hooks/useUserRole";

export function NotificationSettings() {
  const { prefs, save, loading } = useNotificationPrefs();
  const { isAdmin, isContabilita } = useUserRole();
  const isApprover = isAdmin || isContabilita;

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Settings2 className="h-4 w-4 mr-2" /> Notifiche
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Preferenze notifica</DialogTitle>
          <DialogDescription>
            Scegli quali avvisi ricevere via toast e nel centro notifiche.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {isApprover && (
            <Row
              id="notify_new_request"
              label="Nuove richieste da evadere"
              hint="Avviso quando un lavoratore invia una richiesta."
              checked={prefs.notify_new_request}
              disabled={loading}
              onChange={(v) => save({ notify_new_request: v })}
            />
          )}
          <Row
            id="notify_decision"
            label="Esiti delle mie richieste"
            hint="Avviso quando la tua richiesta viene approvata o rifiutata."
            checked={prefs.notify_decision}
            disabled={loading}
            onChange={(v) => save({ notify_decision: v })}
          />
          <Row
            id="notify_balance"
            label="Variazioni di saldo"
            hint="Avviso quando cambia il saldo di ferie o permessi."
            checked={prefs.notify_balance}
            disabled={loading}
            onChange={(v) => save({ notify_balance: v })}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Row({
  id,
  label,
  hint,
  checked,
  disabled,
  onChange,
}: {
  id: string;
  label: string;
  hint: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="space-y-0.5">
        <Label htmlFor={id} className="text-sm font-medium">
          {label}
        </Label>
        <p className="text-xs text-muted-foreground">{hint}</p>
      </div>
      <Switch id={id} checked={checked} disabled={disabled} onCheckedChange={onChange} />
    </div>
  );
}