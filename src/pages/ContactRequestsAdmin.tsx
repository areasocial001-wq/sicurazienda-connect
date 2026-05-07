import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Loader2, Download, Search, ArrowLeft, Inbox } from "lucide-react";
import { toast } from "sonner";

type Status = "nuovo" | "in_lavorazione" | "risolto";

interface ContactRequest {
  id: string;
  user_type: string;
  service_type: string;
  name: string;
  email: string;
  phone: string | null;
  company: string | null;
  message: string | null;
  status: Status;
  internal_notes: string | null;
  created_at: string;
  resolved_at: string | null;
}

const STATUS_LABEL: Record<Status, string> = {
  nuovo: "Nuovo",
  in_lavorazione: "In lavorazione",
  risolto: "Risolto",
};

const STATUS_VARIANT: Record<Status, "default" | "secondary" | "outline"> = {
  nuovo: "default",
  in_lavorazione: "secondary",
  risolto: "outline",
};

export default function ContactRequestsAdmin() {
  const navigate = useNavigate();
  const { isAdmin, isContabilita, loading: roleLoading } = useUserRole();
  const allowed = isAdmin || isContabilita;

  const [items, setItems] = useState<ContactRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | Status>("all");
  const [editing, setEditing] = useState<ContactRequest | null>(null);

  useEffect(() => {
    if (!roleLoading && !allowed) navigate("/");
  }, [roleLoading, allowed, navigate]);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("contact_requests")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      toast.error("Errore caricamento richieste");
    } else {
      setItems((data ?? []) as ContactRequest[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (allowed) load();
  }, [allowed]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((it) => {
      if (statusFilter !== "all" && it.status !== statusFilter) return false;
      if (!q) return true;
      return [it.name, it.email, it.phone, it.company, it.service_type, it.message]
        .filter(Boolean)
        .some((v) => (v as string).toLowerCase().includes(q));
    });
  }, [items, search, statusFilter]);

  const counts = useMemo(() => ({
    nuovo: items.filter((i) => i.status === "nuovo").length,
    in_lavorazione: items.filter((i) => i.status === "in_lavorazione").length,
    risolto: items.filter((i) => i.status === "risolto").length,
  }), [items]);

  const updateItem = async (id: string, patch: Partial<ContactRequest>) => {
    const update: any = { ...patch };
    if (patch.status === "risolto") update.resolved_at = new Date().toISOString();
    if (patch.status && patch.status !== "risolto") update.resolved_at = null;
    const { error } = await supabase.from("contact_requests").update(update).eq("id", id);
    if (error) {
      toast.error("Errore aggiornamento");
    } else {
      toast.success("Aggiornato");
      setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...update } : i)));
      if (editing?.id === id) setEditing((e) => (e ? { ...e, ...update } : e));
    }
  };

  const exportCsv = () => {
    const header = [
      "Data", "Stato", "Tipo utente", "Servizio", "Nome", "Email",
      "Telefono", "Azienda", "Messaggio", "Note interne",
    ];
    const rows = filtered.map((i) => [
      new Date(i.created_at).toLocaleString("it-IT"),
      STATUS_LABEL[i.status],
      i.user_type === "new_client" ? "Nuovo" : "Esistente",
      i.service_type,
      i.name,
      i.email,
      i.phone ?? "",
      i.company ?? "",
      (i.message ?? "").replace(/\r?\n/g, " "),
      (i.internal_notes ?? "").replace(/\r?\n/g, " "),
    ]);
    const esc = (v: string) => `="${String(v).replace(/"/g, '""')}"`;
    const csv = "\uFEFF" + [header, ...rows].map((r) => r.map(esc).join(";")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `richieste-contatto-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (roleLoading || !allowed) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto p-4 pb-24 space-y-4">
        <div className="flex items-center justify-between gap-2">
          <Button variant="ghost" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4 mr-2" /> Indietro
          </Button>
          <Button onClick={exportCsv} variant="outline">
            <Download className="h-4 w-4 mr-2" /> Esporta CSV
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {(["nuovo", "in_lavorazione", "risolto"] as Status[]).map((s) => (
            <Card
              key={s}
              className={`cursor-pointer transition ${statusFilter === s ? "ring-2 ring-primary" : ""}`}
              onClick={() => setStatusFilter(statusFilter === s ? "all" : s)}
            >
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{STATUS_LABEL[s]}</p>
                  <p className="text-2xl font-bold">{counts[s]}</p>
                </div>
                <Inbox className="h-6 w-6 text-muted-foreground" />
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between gap-2 flex-wrap">
              <span>Richieste di contatto ({filtered.length})</span>
              <div className="flex gap-2 items-center">
                <div className="relative">
                  <Search className="h-4 w-4 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    className="pl-8 w-64"
                    placeholder="Cerca nome, email, azienda..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
                <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
                  <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-background">
                    <SelectItem value="all">Tutti gli stati</SelectItem>
                    <SelectItem value="nuovo">Nuovo</SelectItem>
                    <SelectItem value="in_lavorazione">In lavorazione</SelectItem>
                    <SelectItem value="risolto">Risolto</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>
            ) : filtered.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">Nessuna richiesta trovata</p>
            ) : (
              <div className="max-h-[60vh] overflow-y-auto divide-y">
                {filtered.map((it) => (
                  <div
                    key={it.id}
                    className="py-3 cursor-pointer hover:bg-muted/40 px-2 rounded"
                    onClick={() => setEditing(it)}
                  >
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div>
                        <p className="font-medium">{it.name} · <span className="text-muted-foreground text-sm">{it.email}</span></p>
                        <p className="text-sm text-muted-foreground">
                          {it.service_type}{it.company ? ` · ${it.company}` : ""}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={STATUS_VARIANT[it.status]}>{STATUS_LABEL[it.status]}</Badge>
                        <span className="text-xs text-muted-foreground">
                          {new Date(it.created_at).toLocaleDateString("it-IT")}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-2xl bg-background">
          {editing && (
            <>
              <DialogHeader>
                <DialogTitle>{editing.name} — {editing.service_type}</DialogTitle>
              </DialogHeader>
              <div className="space-y-3 max-h-[60vh] overflow-y-auto">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><b>Email:</b> {editing.email}</div>
                  <div><b>Telefono:</b> {editing.phone ?? "—"}</div>
                  <div><b>Azienda:</b> {editing.company ?? "—"}</div>
                  <div><b>Tipo:</b> {editing.user_type === "new_client" ? "Nuovo cliente" : "Cliente esistente"}</div>
                  <div><b>Data:</b> {new Date(editing.created_at).toLocaleString("it-IT")}</div>
                  {editing.resolved_at && (
                    <div><b>Risolto:</b> {new Date(editing.resolved_at).toLocaleString("it-IT")}</div>
                  )}
                </div>
                {editing.message && (
                  <div>
                    <p className="font-semibold text-sm mb-1">Messaggio</p>
                    <pre className="whitespace-pre-wrap text-sm bg-muted p-3 rounded">{editing.message}</pre>
                  </div>
                )}
                <div>
                  <p className="font-semibold text-sm mb-1">Stato</p>
                  <Select
                    value={editing.status}
                    onValueChange={(v) => updateItem(editing.id, { status: v as Status })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-background">
                      <SelectItem value="nuovo">Nuovo</SelectItem>
                      <SelectItem value="in_lavorazione">In lavorazione</SelectItem>
                      <SelectItem value="risolto">Risolto</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <p className="font-semibold text-sm mb-1">Note interne</p>
                  <Textarea
                    rows={4}
                    value={editing.internal_notes ?? ""}
                    onChange={(e) => setEditing({ ...editing, internal_notes: e.target.value })}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setEditing(null)}>Chiudi</Button>
                <Button
                  onClick={() => updateItem(editing.id, { internal_notes: editing.internal_notes })}
                >
                  Salva note
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
      <BottomNav />
    </div>
  );
}