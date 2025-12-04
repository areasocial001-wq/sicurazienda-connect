import { useState, useEffect } from "react";
import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { 
  QrCode, 
  Trash2, 
  ExternalLink, 
  Mail, 
  Calendar,
  FileText,
  Lock,
  User,
  Filter,
  RefreshCw,
  Download
} from "lucide-react";
import AuthModal from "@/components/AuthModal";
import QRCodeModal from "@/components/QRCodeModal";

interface QRCodeRecord {
  id: string;
  document_id: string;
  document_name: string;
  public_url: string;
  created_at: string;
  sent_to_email: string | null;
  sent_at: string | null;
}

const QRCodeHistory = () => {
  const { user, loading } = useAuth();
  const { isAdmin } = useUserRole();
  const navigate = useNavigate();
  const [qrCodes, setQrCodes] = useState<QRCodeRecord[]>([]);
  const [filteredQRCodes, setFilteredQRCodes] = useState<QRCodeRecord[]>([]);
  const [loadingQRs, setLoadingQRs] = useState(true);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  
  // Filters
  const [emailFilter, setEmailFilter] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  
  // QR Modal for regeneration
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [selectedQR, setSelectedQR] = useState<{ url: string; name: string; id: string } | null>(null);

  useEffect(() => {
    if (user) {
      fetchQRCodes();
    }
  }, [user]);

  useEffect(() => {
    applyFilters();
  }, [qrCodes, emailFilter, dateFrom, dateTo]);

  const fetchQRCodes = async () => {
    try {
      setLoadingQRs(true);
      const { data, error } = await supabase
        .from('qr_codes')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setQrCodes(data || []);
    } catch (error) {
      console.error('Error fetching QR codes:', error);
      toast.error('Errore nel caricamento della cronologia');
    } finally {
      setLoadingQRs(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...qrCodes];

    // Email filter
    if (emailFilter === "sent") {
      filtered = filtered.filter(qr => qr.sent_to_email !== null);
    } else if (emailFilter === "not_sent") {
      filtered = filtered.filter(qr => qr.sent_to_email === null);
    }

    // Date from filter
    if (dateFrom) {
      const fromDate = new Date(dateFrom);
      fromDate.setHours(0, 0, 0, 0);
      filtered = filtered.filter(qr => new Date(qr.created_at) >= fromDate);
    }

    // Date to filter
    if (dateTo) {
      const toDate = new Date(dateTo);
      toDate.setHours(23, 59, 59, 999);
      filtered = filtered.filter(qr => new Date(qr.created_at) <= toDate);
    }

    setFilteredQRCodes(filtered);
  };

  const clearFilters = () => {
    setEmailFilter("all");
    setDateFrom("");
    setDateTo("");
  };

  const exportToCSV = () => {
    if (filteredQRCodes.length === 0) {
      toast.error('Nessun dato da esportare');
      return;
    }

    const headers = ['Nome Documento', 'Data Creazione', 'Email Invio', 'Data Invio', 'URL'];
    const rows = filteredQRCodes.map(qr => [
      qr.document_name,
      new Date(qr.created_at).toLocaleString('it-IT'),
      qr.sent_to_email || '',
      qr.sent_at ? new Date(qr.sent_at).toLocaleString('it-IT') : '',
      qr.public_url
    ]);

    const csvContent = [
      headers.join(';'),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(';'))
    ].join('\n');

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `qr-codes-export-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success('Export completato');
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Sei sicuro di voler eliminare questo QR Code dalla cronologia?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('qr_codes')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setQrCodes(qrCodes.filter(qr => qr.id !== id));
      toast.success('QR Code eliminato');
    } catch (error) {
      console.error('Error deleting QR code:', error);
      toast.error('Errore nell\'eliminazione');
    }
  };

  const handleOpenLink = (url: string) => {
    window.open(url, '_blank');
  };

  const handleRegenerate = (qr: QRCodeRecord) => {
    setSelectedQR({ url: qr.public_url, name: qr.document_name, id: qr.document_id });
    setQrModalOpen(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Caricamento...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        
        <main className="container mx-auto p-4 pb-20">
          <div className="text-center mb-6">
            <Lock className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
            <h2 className="text-2xl font-bold mb-2">Cronologia QR Code</h2>
            <p className="text-muted-foreground">
              Accedi per visualizzare i tuoi QR Code generati
            </p>
          </div>

          <div className="text-center">
            <Button onClick={() => setAuthModalOpen(true)} size="lg">
              <User className="h-5 w-5 mr-2" />
              Accedi / Registrati
            </Button>
          </div>

          <AuthModal 
            open={authModalOpen} 
            onOpenChange={setAuthModalOpen} 
          />
        </main>
        
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto p-4 pb-20">
        <div className="text-center mb-6">
          <QrCode className="h-12 w-12 mx-auto mb-3 text-primary" />
          <h2 className="text-2xl font-bold mb-2">Cronologia QR Code</h2>
          <p className="text-muted-foreground">
            Tutti i QR Code che hai generato
          </p>
        </div>

        {/* Filters */}
        <Card className="mb-4">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                <Filter className="h-4 w-4" />
                Filtri
              </CardTitle>
              <Button 
                variant="outline" 
                size="sm"
                onClick={exportToCSV}
                disabled={filteredQRCodes.length === 0}
              >
                <Download className="h-4 w-4 mr-2" />
                Esporta CSV
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1">
                <label className="text-sm text-muted-foreground mb-1 block">Stato Email</label>
                <Select value={emailFilter} onValueChange={setEmailFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Tutti" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tutti</SelectItem>
                    <SelectItem value="sent">Inviati via email</SelectItem>
                    <SelectItem value="not_sent">Non inviati</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-1">
                <label className="text-sm text-muted-foreground mb-1 block">Da data</label>
                <Input 
                  type="date" 
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                />
              </div>
              <div className="flex-1">
                <label className="text-sm text-muted-foreground mb-1 block">A data</label>
                <Input 
                  type="date" 
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                />
              </div>
              <div className="flex items-end">
                <Button variant="outline" onClick={clearFilters} size="sm">
                  Pulisci
                </Button>
              </div>
            </div>
            {(emailFilter !== "all" || dateFrom || dateTo) && (
              <p className="text-sm text-muted-foreground mt-2">
                Mostrati {filteredQRCodes.length} di {qrCodes.length} risultati
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <QrCode className="h-5 w-5" />
              QR Code Generati
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingQRs ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-muted-foreground">Caricamento...</p>
              </div>
            ) : filteredQRCodes.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <QrCode className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p className="font-medium">
                  {qrCodes.length === 0 ? "Nessun QR Code generato" : "Nessun risultato con i filtri applicati"}
                </p>
                <p className="text-sm mt-1">
                  {qrCodes.length === 0 
                    ? "I QR Code che generi appariranno qui"
                    : "Prova a modificare i filtri"
                  }
                </p>
                {qrCodes.length === 0 && (
                  <Button 
                    variant="outline" 
                    className="mt-4"
                    onClick={() => navigate('/documents')}
                  >
                    Vai ai Documenti
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {filteredQRCodes.map((qr) => (
                  <div 
                    key={qr.id} 
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <div className="p-2 bg-primary/10 rounded-full">
                        <FileText className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1">
                        <span className="font-medium block">{qr.document_name}</span>
                        <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground mt-1">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {new Date(qr.created_at).toLocaleDateString('it-IT', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                          {qr.sent_to_email ? (
                            <Badge variant="secondary" className="flex items-center gap-1">
                              <Mail className="h-3 w-3" />
                              {qr.sent_to_email}
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="flex items-center gap-1 text-muted-foreground">
                              Non inviato
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleRegenerate(qr)}
                        title="Rigenera QR / Invia email"
                      >
                        <RefreshCw className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleOpenLink(qr.public_url)}
                        title="Apri link"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="destructive" 
                        size="sm"
                        onClick={() => handleDelete(qr.id)}
                        title="Elimina"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
      
      <BottomNav />

      {selectedQR && (
        <QRCodeModal
          open={qrModalOpen}
          onOpenChange={setQrModalOpen}
          url={selectedQR.url}
          fileName={selectedQR.name}
          documentId={selectedQR.id}
        />
      )}
    </div>
  );
};

export default QRCodeHistory;
