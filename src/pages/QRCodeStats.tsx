import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  QrCode, 
  ArrowLeft, 
  Eye, 
  Calendar,
  Clock,
  TrendingUp,
  Ban,
  CheckCircle,
  ExternalLink
} from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface QRCodeDetails {
  id: string;
  document_name: string;
  public_url: string;
  created_at: string;
  is_active: boolean;
  sent_to_email: string | null;
}

interface ScanRecord {
  id: string;
  scanned_at: string;
  user_agent: string | null;
}

interface ChartDataPoint {
  date: string;
  count: number;
}

const QRCodeStats = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [qrCode, setQrCode] = useState<QRCodeDetails | null>(null);
  const [scans, setScans] = useState<ScanRecord[]>([]);
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);

  useEffect(() => {
    if (user && id) {
      fetchQRCodeDetails();
      fetchScans();
    }
  }, [user, id]);

  const fetchQRCodeDetails = async () => {
    try {
      const { data, error } = await supabase
        .from('qr_codes')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error) throw error;
      setQrCode(data);
    } catch (error) {
      console.error('Error fetching QR code:', error);
      toast.error('Errore nel caricamento del QR code');
    } finally {
      setLoading(false);
    }
  };

  const fetchScans = async () => {
    try {
      const { data, error } = await supabase
        .from('qr_scans')
        .select('*')
        .eq('qr_code_id', id)
        .order('scanned_at', { ascending: false });

      if (error) throw error;
      setScans(data || []);

      // Process chart data
      const grouped: Record<string, number> = {};
      data?.forEach(scan => {
        const date = new Date(scan.scanned_at).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' });
        grouped[date] = (grouped[date] || 0) + 1;
      });

      const chartDataArray = Object.entries(grouped)
        .map(([date, count]) => ({ date, count }))
        .slice(-30);
      setChartData(chartDataArray);
    } catch (error) {
      console.error('Error fetching scans:', error);
    }
  };

  const toggleQRCode = async () => {
    if (!qrCode) return;

    setToggling(true);
    try {
      const { error } = await supabase
        .from('qr_codes')
        .update({ is_active: !qrCode.is_active })
        .eq('id', qrCode.id);

      if (error) throw error;

      setQrCode({ ...qrCode, is_active: !qrCode.is_active });
      toast.success(qrCode.is_active ? 'QR Code disabilitato' : 'QR Code riabilitato');
    } catch (error) {
      console.error('Error toggling QR code:', error);
      toast.error('Errore nella modifica dello stato');
    } finally {
      setToggling(false);
    }
  };

  const getLastScan = () => {
    if (scans.length === 0) return null;
    return new Date(scans[0].scanned_at);
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

  if (!qrCode) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto p-4 pb-20">
          <div className="text-center py-12">
            <QrCode className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-2xl font-bold mb-2">QR Code non trovato</h2>
            <Button onClick={() => navigate('/qr-history')} className="mt-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Torna alla cronologia
            </Button>
          </div>
        </main>
        <BottomNav />
      </div>
    );
  }

  const lastScan = getLastScan();

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto p-4 pb-20">
        <Button 
          variant="ghost" 
          onClick={() => navigate('/qr-history')}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Torna alla cronologia
        </Button>

        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <QrCode className="h-8 w-8 text-primary" />
            <h1 className="text-2xl font-bold">{qrCode.document_name}</h1>
            <Badge variant={qrCode.is_active ? "default" : "destructive"}>
              {qrCode.is_active ? "Attivo" : "Disabilitato"}
            </Badge>
          </div>
          <p className="text-muted-foreground">
            Statistiche dettagliate delle scansioni
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Scansioni Totali</CardTitle>
              <Eye className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{scans.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Ultima Scansione</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-lg font-bold">
                {lastScan 
                  ? lastScan.toLocaleDateString('it-IT', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
                  : 'Mai'
                }
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Creato il</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-lg font-bold">
                {new Date(qrCode.created_at).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' })}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Stato</CardTitle>
              {qrCode.is_active ? (
                <CheckCircle className="h-4 w-4 text-green-500" />
              ) : (
                <Ban className="h-4 w-4 text-destructive" />
              )}
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <Switch
                  checked={qrCode.is_active}
                  onCheckedChange={toggleQRCode}
                  disabled={toggling}
                />
                <span className="text-sm">
                  {qrCode.is_active ? 'Attivo' : 'Disabilitato'}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Chart */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Andamento Scansioni
            </CardTitle>
          </CardHeader>
          <CardContent>
            {chartData.length === 0 ? (
              <div className="flex items-center justify-center h-[200px] text-muted-foreground">
                Nessuna scansione registrata
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                  <YAxis className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--background))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }} 
                  />
                  <Line 
                    type="monotone" 
                    dataKey="count" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={2}
                    dot={{ fill: 'hsl(var(--primary))' }}
                    name="Scansioni"
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Recent Scans */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Scansioni Recenti
            </CardTitle>
          </CardHeader>
          <CardContent>
            {scans.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Eye className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>Nessuna scansione registrata</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {scans.slice(0, 50).map((scan) => (
                  <div 
                    key={scan.id}
                    className="flex items-center justify-between p-3 border rounded-lg text-sm"
                  >
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span>
                        {new Date(scan.scanned_at).toLocaleDateString('it-IT', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit'
                        })}
                      </span>
                    </div>
                    {scan.user_agent && (
                      <span className="text-xs text-muted-foreground truncate max-w-[200px]">
                        {scan.user_agent.includes('Mobile') ? '📱 Mobile' : '💻 Desktop'}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="mt-6 flex gap-3">
          <Button
            variant="outline"
            onClick={() => window.open(qrCode.public_url, '_blank')}
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            Apri Documento
          </Button>
        </div>
      </main>
      
      <BottomNav />
    </div>
  );
};

export default QRCodeStats;