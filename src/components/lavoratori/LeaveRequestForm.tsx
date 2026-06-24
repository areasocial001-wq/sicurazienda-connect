import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useWorkerLeave, type LeaveType } from "@/hooks/useWorkerLeave";
import { Paperclip } from "lucide-react";

const TYPES: { value: LeaveType; label: string; usesHours?: boolean }[] = [
  { value: "ferie", label: "Ferie" },
  { value: "permesso_rol", label: "Permesso ROL", usesHours: true },
  { value: "permesso_retribuito", label: "Permesso retribuito", usesHours: true },
  { value: "malattia", label: "Malattia" },
  { value: "altro", label: "Altro" },
];

export function LeaveRequestForm({ onDone }: { onDone?: () => void }) {
  const { user } = useAuth();
  const { createRequest } = useWorkerLeave();
  const { toast } = useToast();
  const [type, setType] = useState<LeaveType>("ferie");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [hours, setHours] = useState("");
  const [reason, setReason] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const usesHours = TYPES.find((t) => t.value === type)?.usesHours;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !startDate || !endDate) return;
    setSubmitting(true);
    try {
      let attachment_path: string | null = null;
      if (file) {
        const path = `${user.id}/leave/${Date.now()}-${file.name}`;
        const { error: upErr } = await supabase.storage.from("worker-files").upload(path, file);
        if (upErr) throw upErr;
        attachment_path = path;
      }
      await createRequest({
        type,
        start_date: startDate,
        end_date: endDate || startDate,
        hours: usesHours && hours ? Number(hours) : null,
        reason: reason || null,
        attachment_path,
      });
      toast({ title: "Richiesta inviata", description: "L'approvatore riceverà una notifica." });
      setStartDate(""); setEndDate(""); setHours(""); setReason(""); setFile(null);
      onDone?.();
    } catch (err: any) {
      toast({ title: "Errore", description: err.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <Label>Tipologia</Label>
        <Select value={type} onValueChange={(v) => setType(v as LeaveType)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Dal</Label>
          <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required />
        </div>
        <div>
          <Label>Al</Label>
          <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} required />
        </div>
      </div>
      {usesHours && (
        <div>
          <Label>Ore (solo per permessi orari)</Label>
          <Input type="number" step="0.5" min="0" value={hours} onChange={(e) => setHours(e.target.value)} />
        </div>
      )}
      <div>
        <Label>Motivo (opzionale)</Label>
        <Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2} />
      </div>
      <div>
        <Label className="flex items-center gap-2"><Paperclip className="h-4 w-4" /> Allegato (opzionale)</Label>
        <Input type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} />
      </div>
      <Button type="submit" disabled={submitting} className="w-full">
        {submitting ? "Invio..." : "Invia richiesta"}
      </Button>
    </form>
  );
}
