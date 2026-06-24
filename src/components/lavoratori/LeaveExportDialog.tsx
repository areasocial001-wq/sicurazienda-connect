import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, FileText, FileSpreadsheet } from "lucide-react";
import { applyFilters, exportLeaveCSV, exportLeavePDF, type ExportFilters } from "@/lib/leaveExport";
import type { LeaveRequest } from "@/hooks/useWorkerLeave";

const ROLE_OPTIONS = [
  { value: "all", label: "Tutti i ruoli" },
  { value: "admin", label: "Amministrazione" },
  { value: "contabilita", label: "Contabilità" },
  { value: "area_tecnica", label: "Area Tecnica" },
  { value: "gestione_corsi", label: "Gestione Corsi" },
  { value: "consulenti_tecnici", label: "Consulenti Tecnici" },
  { value: "medicina", label: "Medicina" },
];

const TYPE_OPTIONS = [
  { value: "all", label: "Tutti i tipi" },
  { value: "ferie", label: "Ferie" },
  { value: "permesso_rol", label: "Permesso ROL" },
  { value: "permesso_retribuito", label: "Permesso retribuito" },
  { value: "malattia", label: "Malattia" },
  { value: "altro", label: "Altro" },
];

const STATUS_OPTIONS = [
  { value: "all", label: "Tutti gli stati" },
  { value: "in_attesa", label: "In attesa" },
  { value: "approvata", label: "Approvata" },
  { value: "rifiutata", label: "Rifiutata" },
];

export function LeaveExportDialog({ requests }: { requests: LeaveRequest[] }) {
  const [open, setOpen] = useState(false);
  const today = new Date().toISOString().slice(0, 10);
  const yearStart = `${new Date().getFullYear()}-01-01`;
  const [filters, setFilters] = useState<ExportFilters>({
    from: yearStart,
    to: today,
    role: "all",
    type: "all",
    status: "all",
  });

  const filtered = useMemo(() => applyFilters(requests, filters), [requests, filters]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm"><Download className="h-4 w-4 mr-2" /> Esporta</Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Esporta ferie e permessi</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Dal</Label>
              <Input type="date" value={filters.from || ""} onChange={(e) => setFilters({ ...filters, from: e.target.value })} />
            </div>
            <div>
              <Label>Al</Label>
              <Input type="date" value={filters.to || ""} onChange={(e) => setFilters({ ...filters, to: e.target.value })} />
            </div>
          </div>
          <div>
            <Label>Ruolo</Label>
            <Select value={filters.role} onValueChange={(v) => setFilters({ ...filters, role: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{ROLE_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Tipo</Label>
              <Select value={filters.type} onValueChange={(v) => setFilters({ ...filters, type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{TYPE_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Stato</Label>
              <Select value={filters.status} onValueChange={(v) => setFilters({ ...filters, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{STATUS_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">{filtered.length} record corrispondono ai filtri.</p>
          <div className="flex gap-2 pt-2">
            <Button className="flex-1" onClick={() => exportLeaveCSV(filtered)} disabled={!filtered.length}>
              <FileSpreadsheet className="h-4 w-4 mr-2" /> CSV
            </Button>
            <Button className="flex-1" variant="secondary" onClick={() => exportLeavePDF(filtered, filters)} disabled={!filtered.length}>
              <FileText className="h-4 w-4 mr-2" /> PDF
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
