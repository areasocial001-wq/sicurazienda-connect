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
  ExternalLink,
  Timer,
  Smartphone,
  Monitor,
  Tablet,
  Globe
} from "lucide-react";
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Legend
} from 'recharts';

interface QRCodeDetails {
  id: string;
  document_name: string;
  public_url: string;
  created_at: string;
  expires_at: string | null;
  is_active: boolean;
  sent_to_email: string | null;
}

interface ScanRecord {
  id: string;
  scanned_at: string;
  user_agent: string | null;
  ip_address: string | null;
}

interface ChartDataPoint {
  date: string;
  count: number;
}

interface DeviceData {
  name: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
}

interface HourlyData {
  hour: string;
  count: number;
}

interface BrowserData {
  name: string;
  value: number;
}

// Parse user agent to get device type
const parseDeviceType = (userAgent: string | null): 'mobile' | 'tablet' | 'desktop' => {
  if (!userAgent) return 'desktop';
  const ua = userAgent.toLowerCase();
  if (/ipad|tablet|playbook|silk/i.test(ua)) return 'tablet';
  if (/mobile|iphone|ipod|android.*mobile|blackberry|opera mini|iemobile/i.test(ua)) return 'mobile';
  return 'desktop';
};

// Parse user agent to get OS
const parseOS = (userAgent: string | null): string => {
  if (!userAgent) return 'Sconosciuto';
  if (/windows/i.test(userAgent)) return 'Windows';
  if (/macintosh|mac os x/i.test(userAgent)) return 'macOS';
  if (/linux/i.test(userAgent)) return 'Linux';
  if (/android/i.test(userAgent)) return 'Android';
  if (/iphone|ipad|ipod/i.test(userAgent)) return 'iOS';
  return 'Altro';
};

// Parse user agent to get browser
const parseBrowser = (userAgent: string | null): string => {
  if (!userAgent) return 'Sconosciuto';
  if (/edg/i.test(userAgent)) return 'Edge';
  if (/chrome/i.test(userAgent) && !/edg/i.test(userAgent)) return 'Chrome';
  if (/firefox/i.test(userAgent)) return 'Firefox';
  if (/safari/i.test(userAgent) && !/chrome/i.test(userAgent)) return 'Safari';
  if (/opera|opr/i.test(userAgent)) return 'Opera';
  return 'Altro';
};

const COLORS = ['hsl(var(--primary))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

const QRCodeStats = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [qrCode, setQrCode] = useState<QRCodeDetails | null>(null);
  const [scans, setScans] = useState<ScanRecord[]>([]);
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [deviceData, setDeviceData] = useState<DeviceData[]>([]);
  const [hourlyData, setHourlyData] = useState<HourlyData[]>([]);
  const [osData, setOsData] = useState<{ name: string; value: number }[]>([]);
  const [browserData, setBrowserData] = useState<BrowserData[]>([]);
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

      // Process daily chart data
      const grouped: Record<string, number> = {};
      data?.forEach(scan => {
        const date = new Date(scan.scanned_at).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' });
        grouped[date] = (grouped[date] || 0) + 1;
      });

      const chartDataArray = Object.entries(grouped)
        .map(([date, count]) => ({ date, count }))
        .slice(-30);
      setChartData(chartDataArray);

      // Process device data
      const devices: Record<string, number> = { mobile: 0, tablet: 0, desktop: 0 };
      data?.forEach(scan => {
        const device = parseDeviceType(scan.user_agent);
        devices[device]++;
      });
      setDeviceData([
        { name: 'Mobile', value: devices.mobile, icon: Smartphone },
        { name: 'Tablet', value: devices.tablet, icon: Tablet },
        { name: 'Desktop', value: devices.desktop, icon: Monitor },
      ].filter(d => d.value > 0));

      // Process hourly data
      const hourly: Record<number, number> = {};
      for (let i = 0; i < 24; i++) hourly[i] = 0;
      data?.forEach(scan => {
        const hour = new Date(scan.scanned_at).getHours();
        hourly[hour]++;
      });
      setHourlyData(
        Object.entries(hourly).map(([hour, count]) => ({
          hour: `${hour.padStart(2, '0')}:00`,
          count
        }))
      );

      // Process OS data
      const osStats: Record<string, number> = {};
      data?.forEach(scan => {
        const os = parseOS(scan.user_agent);
        osStats[os] = (osStats[os] || 0) + 1;
      });
      setOsData(
        Object.entries(osStats)
          .map(([name, value]) => ({ name, value }))
          .sort((a, b) => b.value - a.value)
      );

      // Process browser data
      const browserStats: Record<string, number> = {};
      data?.forEach(scan => {
        const browser = parseBrowser(scan.user_agent);
        browserStats[browser] = (browserStats[browser] || 0) + 1;
      });
      setBrowserData(
        Object.entries(browserStats)
          .map(([name, value]) => ({ name, value }))
          .sort((a, b) => b.value - a.value)
      );

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
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
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
              <CardTitle className="text-sm font-medium">Scadenza</CardTitle>
              <Timer className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {qrCode.expires_at ? (
                <div className={`text-lg font-bold ${new Date(qrCode.expires_at) < new Date() ? 'text-destructive' : ''}`}>
                  {new Date(qrCode.expires_at) < new Date() 
                    ? 'Scaduto' 
                    : new Date(qrCode.expires_at).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' })
                  }
                </div>
              ) : (
                <div className="text-lg font-bold text-muted-foreground">-</div>
              )}
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

        {/* Device & OS Charts */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* Device Type Pie Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Smartphone className="h-5 w-5" />
                Dispositivi
              </CardTitle>
            </CardHeader>
            <CardContent>
              {deviceData.length === 0 ? (
                <div className="flex items-center justify-center h-[200px] text-muted-foreground">
                  Nessun dato disponibile
                </div>
              ) : (
                <div className="flex items-center gap-4">
                  <ResponsiveContainer width="60%" height={200}>
                    <PieChart>
                      <Pie
                        data={deviceData}
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {deviceData.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--background))', 
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px'
                        }} 
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex-1 space-y-2">
                    {deviceData.map((device, index) => {
                      const Icon = device.icon;
                      return (
                        <div key={device.name} className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: COLORS[index % COLORS.length] }} 
                          />
                          <Icon className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">{device.name}</span>
                          <span className="text-sm font-bold ml-auto">{device.value}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* OS Pie Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                Sistema Operativo
              </CardTitle>
            </CardHeader>
            <CardContent>
              {osData.length === 0 ? (
                <div className="flex items-center justify-center h-[200px] text-muted-foreground">
                  Nessun dato disponibile
                </div>
              ) : (
                <div className="flex items-center gap-4">
                  <ResponsiveContainer width="60%" height={200}>
                    <PieChart>
                      <Pie
                        data={osData}
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {osData.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--background))', 
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px'
                        }} 
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex-1 space-y-2">
                    {osData.map((os, index) => (
                      <div key={os.name} className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: COLORS[index % COLORS.length] }} 
                        />
                        <span className="text-sm">{os.name}</span>
                        <span className="text-sm font-bold ml-auto">{os.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Hourly Distribution Chart */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Distribuzione Oraria
            </CardTitle>
          </CardHeader>
          <CardContent>
            {hourlyData.every(h => h.count === 0) ? (
              <div className="flex items-center justify-center h-[200px] text-muted-foreground">
                Nessun dato disponibile
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={hourlyData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="hour" 
                    className="text-xs" 
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                    interval={2}
                  />
                  <YAxis className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--background))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }} 
                  />
                  <Bar 
                    dataKey="count" 
                    fill="hsl(var(--primary))" 
                    radius={[4, 4, 0, 0]}
                    name="Scansioni"
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Browser Chart */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Monitor className="h-5 w-5" />
              Browser Utilizzati
            </CardTitle>
          </CardHeader>
          <CardContent>
            {browserData.length === 0 ? (
              <div className="flex items-center justify-center h-[150px] text-muted-foreground">
                Nessun dato disponibile
              </div>
            ) : (
              <div className="space-y-3">
                {browserData.map((browser, index) => {
                  const maxValue = Math.max(...browserData.map(b => b.value));
                  const percentage = maxValue > 0 ? (browser.value / maxValue) * 100 : 0;
                  return (
                    <div key={browser.name} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span>{browser.name}</span>
                        <span className="font-bold">{browser.value}</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div 
                          className="h-full rounded-full transition-all"
                          style={{ 
                            width: `${percentage}%`,
                            backgroundColor: COLORS[index % COLORS.length]
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
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
                {scans.slice(0, 50).map((scan) => {
                  const deviceType = parseDeviceType(scan.user_agent);
                  const os = parseOS(scan.user_agent);
                  const browser = parseBrowser(scan.user_agent);
                  const DeviceIcon = deviceType === 'mobile' ? Smartphone : deviceType === 'tablet' ? Tablet : Monitor;
                  
                  return (
                    <div 
                      key={scan.id}
                      className="flex items-center justify-between p-3 border rounded-lg text-sm"
                    >
                      <div className="flex items-center gap-3">
                        <DeviceIcon className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <span className="font-medium">
                            {new Date(scan.scanned_at).toLocaleDateString('it-IT', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                          <div className="text-xs text-muted-foreground">
                            {os} • {browser}
                          </div>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {deviceType === 'mobile' ? '📱 Mobile' : deviceType === 'tablet' ? '📱 Tablet' : '💻 Desktop'}
                      </Badge>
                    </div>
                  );
                })}
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