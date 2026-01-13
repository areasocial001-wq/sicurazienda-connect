import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { supabase } from '@/integrations/supabase/client';
import Header from '@/components/Header';
import BottomNav from '@/components/BottomNav';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  FileText, RefreshCw, ArrowLeft, Loader2, Search,
  User, Shield, Key, LogIn, LogOut, Trash2, RotateCcw,
  CheckCircle, UserPlus, UserMinus, Clock
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { toast } from 'sonner';

interface AuditLogEntry {
  id: string;
  user_id: string | null;
  action: string;
  target_user_id: string | null;
  details: Record<string, any> | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
  // Joined data
  user_email?: string;
  target_email?: string;
}

const actionIcons: Record<string, React.ReactNode> = {
  login: <LogIn className="h-4 w-4 text-green-500" />,
  logout: <LogOut className="h-4 w-4 text-gray-500" />,
  login_failed: <LogIn className="h-4 w-4 text-red-500" />,
  role_assigned: <UserPlus className="h-4 w-4 text-blue-500" />,
  role_changed: <Key className="h-4 w-4 text-yellow-500" />,
  role_removed: <UserMinus className="h-4 w-4 text-red-500" />,
  user_confirmed: <CheckCircle className="h-4 w-4 text-green-500" />,
  user_deleted: <Trash2 className="h-4 w-4 text-red-500" />,
  password_reset: <RotateCcw className="h-4 w-4 text-blue-500" />,
};

const actionLabels: Record<string, string> = {
  login: 'Login',
  logout: 'Logout',
  login_failed: 'Login Fallito',
  role_assigned: 'Ruolo Assegnato',
  role_changed: 'Ruolo Modificato',
  role_removed: 'Ruolo Rimosso',
  user_confirmed: 'Utente Confermato',
  user_deleted: 'Utente Eliminato',
  password_reset: 'Reset Password',
};

const actionColors: Record<string, string> = {
  login: 'bg-green-500/20 text-green-700 border-green-500/30',
  logout: 'bg-gray-500/20 text-gray-700 border-gray-500/30',
  login_failed: 'bg-red-500/20 text-red-700 border-red-500/30',
  role_assigned: 'bg-blue-500/20 text-blue-700 border-blue-500/30',
  role_changed: 'bg-yellow-500/20 text-yellow-700 border-yellow-500/30',
  role_removed: 'bg-red-500/20 text-red-700 border-red-500/30',
  user_confirmed: 'bg-green-500/20 text-green-700 border-green-500/30',
  user_deleted: 'bg-red-500/20 text-red-700 border-red-500/30',
  password_reset: 'bg-blue-500/20 text-blue-700 border-blue-500/30',
};

export default function AuditLog() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading: roleLoading } = useUserRole();
  
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [limit, setLimit] = useState(50);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      
      let query = supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (actionFilter !== 'all') {
        query = query.eq('action', actionFilter);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Fetch user emails for display
      const userIds = [...new Set([
        ...(data || []).map(l => l.user_id).filter(Boolean),
        ...(data || []).map(l => l.target_user_id).filter(Boolean)
      ])] as string[];

      let emailMap: Record<string, string> = {};
      
      if (userIds.length > 0) {
        // Try to get emails from profiles
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, full_name')
          .in('user_id', userIds);
        
        profiles?.forEach(p => {
          if (p.user_id) emailMap[p.user_id] = p.full_name || p.user_id;
        });
      }

      // Enrich logs with user info
      const enrichedLogs: AuditLogEntry[] = (data || []).map(log => ({
        ...log,
        details: (typeof log.details === 'object' && log.details !== null) ? log.details as Record<string, any> : {},
        user_email: log.user_id ? emailMap[log.user_id] || log.user_id.substring(0, 8) + '...' : undefined,
        target_email: log.target_user_id ? emailMap[log.target_user_id] || log.target_user_id.substring(0, 8) + '...' : undefined,
      }));

      setLogs(enrichedLogs);
    } catch (error: any) {
      console.error('Error fetching audit logs:', error);
      toast.error('Errore nel caricamento dei log');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user && isAdmin && !authLoading && !roleLoading) {
      fetchLogs();
    }
  }, [user, isAdmin, authLoading, roleLoading, actionFilter, limit]);

  const filteredLogs = logs.filter(log => {
    if (!searchQuery) return true;
    const search = searchQuery.toLowerCase();
    return (
      log.action.toLowerCase().includes(search) ||
      log.user_email?.toLowerCase().includes(search) ||
      log.target_email?.toLowerCase().includes(search) ||
      JSON.stringify(log.details).toLowerCase().includes(search)
    );
  });

  if (authLoading || roleLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!user) {
    navigate('/');
    return null;
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto p-4 pb-24">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-500">
                <Shield className="h-5 w-5" />
                Accesso Negato
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p>Solo gli amministratori possono visualizzare l'audit log.</p>
              <Button className="mt-4" onClick={() => navigate('/')}>
                Torna alla Home
              </Button>
            </CardContent>
          </Card>
        </main>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto p-4 pb-24">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <FileText className="h-6 w-6 text-primary" />
                Audit Log
              </h1>
              <p className="text-muted-foreground text-sm">
                {logs.length} eventi registrati
              </p>
            </div>
          </div>
          <Button onClick={fetchLogs} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Aggiorna
          </Button>
        </div>

        {/* Filters */}
        <Card className="mb-4">
          <CardContent className="pt-4">
            <div className="flex gap-4 flex-wrap">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Cerca per azione, utente, dettagli..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={actionFilter} onValueChange={setActionFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Tipo azione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tutte le azioni</SelectItem>
                  <SelectItem value="login">Login</SelectItem>
                  <SelectItem value="logout">Logout</SelectItem>
                  <SelectItem value="login_failed">Login Fallito</SelectItem>
                  <SelectItem value="role_assigned">Ruolo Assegnato</SelectItem>
                  <SelectItem value="role_changed">Ruolo Modificato</SelectItem>
                  <SelectItem value="role_removed">Ruolo Rimosso</SelectItem>
                  <SelectItem value="user_confirmed">Utente Confermato</SelectItem>
                  <SelectItem value="user_deleted">Utente Eliminato</SelectItem>
                  <SelectItem value="password_reset">Reset Password</SelectItem>
                </SelectContent>
              </Select>
              <Select value={limit.toString()} onValueChange={(v) => setLimit(parseInt(v))}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="25">25 righe</SelectItem>
                  <SelectItem value="50">50 righe</SelectItem>
                  <SelectItem value="100">100 righe</SelectItem>
                  <SelectItem value="200">200 righe</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Log List */}
        <Card>
          <CardHeader>
            <CardTitle>Eventi</CardTitle>
            <CardDescription>
              Cronologia delle azioni eseguite nel sistema
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin mr-2" />
                <span>Caricamento...</span>
              </div>
            ) : filteredLogs.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                Nessun evento trovato
              </p>
            ) : (
              <ScrollArea className="h-[500px]">
                <div className="space-y-2">
                  {filteredLogs.map((log) => (
                    <div 
                      key={log.id} 
                      className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                    >
                      <div className="mt-1">
                        {actionIcons[log.action] || <Clock className="h-4 w-4 text-gray-400" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <Badge className={actionColors[log.action] || 'bg-gray-500/20 text-gray-700'}>
                            {actionLabels[log.action] || log.action}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(log.created_at), "dd/MM/yyyy HH:mm:ss", { locale: it })}
                          </span>
                        </div>
                        
                        <div className="text-sm space-y-1">
                          {log.user_email && (
                            <div className="flex items-center gap-1">
                              <User className="h-3 w-3" />
                              <span>Eseguito da: <strong>{log.user_email}</strong></span>
                            </div>
                          )}
                          {log.target_email && (
                            <div className="flex items-center gap-1">
                              <User className="h-3 w-3" />
                              <span>Target: <strong>{log.target_email}</strong></span>
                            </div>
                          )}
                          {log.details && Object.keys(log.details).length > 0 && (
                            <details>
                              <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                                Dettagli
                              </summary>
                              <pre className="mt-1 p-2 bg-muted rounded text-xs overflow-auto max-h-24">
                                {JSON.stringify(log.details, null, 2)}
                              </pre>
                            </details>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="mt-4 flex gap-2">
          <Button variant="outline" onClick={() => navigate('/admin/permission-status')}>
            Stato Permessi
          </Button>
          <Button variant="outline" onClick={() => navigate('/admin')}>
            Dashboard Admin
          </Button>
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
