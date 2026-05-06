import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { Loader2, Shield, FileText, QrCode, User as UserIcon } from 'lucide-react';
import Header from '@/components/Header';
import BottomNav from '@/components/BottomNav';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface AccessLog {
  id: string;
  document_id: string | null;
  file_path: string;
  qr_code_id: string | null;
  user_id: string | null;
  access_type: string;
  ip_address: string | null;
  user_agent: string | null;
  details: any;
  created_at: string;
}

const typeMeta: Record<string, { label: string; icon: any; className: string }> = {
  authenticated: { label: 'Utente autenticato', icon: UserIcon, className: 'bg-blue-500/20 text-blue-700 border-blue-500/30' },
  qr_signed_url: { label: 'Accesso via QR', icon: QrCode, className: 'bg-emerald-500/20 text-emerald-700 border-emerald-500/30' },
  qr_redirect: { label: 'Redirect QR', icon: QrCode, className: 'bg-amber-500/20 text-amber-700 border-amber-500/30' },
};

export default function DocumentAccessLog() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<AccessLog[]>([]);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from('document_access_logs' as any)
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500);
      if (error) {
        toast({ title: 'Errore', description: error.message, variant: 'destructive' });
      } else {
        setLogs((data || []) as any);
      }
      setLoading(false);
    })();
  }, [toast]);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto p-4 pb-24">
        <div className="flex items-center gap-3 mb-6">
          <Shield className="h-7 w-7 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Audit accessi documenti</h1>
            <p className="text-sm text-muted-foreground">Cronologia download e accessi via signed URL / QR</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Ultimi accessi
              <Badge variant="secondary" className="ml-2">{logs.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="py-12 flex justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>
            ) : logs.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Nessun accesso registrato</p>
            ) : (
              <div className="max-h-[70vh] overflow-y-auto divide-y">
                {logs.map((log) => {
                  const meta = typeMeta[log.access_type] || { label: log.access_type, icon: FileText, className: 'bg-gray-500/20 text-gray-700' };
                  const Icon = meta.icon;
                  return (
                    <div key={log.id} className="py-3 flex items-start gap-3">
                      <Icon className="h-4 w-4 mt-1 text-muted-foreground shrink-0" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge className={meta.className}>{meta.label}</Badge>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(log.created_at), 'dd MMM yyyy HH:mm:ss', { locale: it })}
                          </span>
                        </div>
                        <p className="text-sm font-mono truncate mt-1">{log.file_path}</p>
                        <div className="text-xs text-muted-foreground flex flex-wrap gap-x-3 mt-1">
                          {log.ip_address && <span>IP: {log.ip_address}</span>}
                          {log.user_id && <span>User: {log.user_id.slice(0, 8)}…</span>}
                          {log.qr_code_id && <span>QR: {log.qr_code_id.slice(0, 8)}…</span>}
                        </div>
                        {log.user_agent && (
                          <p className="text-xs text-muted-foreground/70 truncate mt-0.5">{log.user_agent}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
      <BottomNav />
    </div>
  );
}