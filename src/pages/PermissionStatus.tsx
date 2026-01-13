import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { supabase } from '@/integrations/supabase/client';
import Header from '@/components/Header';
import BottomNav from '@/components/BottomNav';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Shield, RefreshCw, CheckCircle, XCircle, AlertTriangle, 
  User, Key, Database, Clock, ArrowLeft, Loader2 
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

interface DiagnosticResult {
  test: string;
  status: 'success' | 'error' | 'warning';
  message: string;
  details?: any;
}

export default function PermissionStatus() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { role, loading: roleLoading, isAdmin, getRoleDisplayName } = useUserRole();
  
  const [diagnostics, setDiagnostics] = useState<DiagnosticResult[]>([]);
  const [running, setRunning] = useState(false);
  const [rpcResult, setRpcResult] = useState<{ role: string | null; error: string | null }>({ role: null, error: null });
  const [directQueryResult, setDirectQueryResult] = useState<{ role: string | null; error: string | null }>({ role: null, error: null });

  const runDiagnostics = async () => {
    if (!user) return;
    
    setRunning(true);
    const results: DiagnosticResult[] = [];

    // Test 1: RPC get_user_role
    try {
      const { data, error } = await supabase.rpc('get_user_role', { user_uuid: user.id });
      if (error) {
        setRpcResult({ role: null, error: error.message });
        results.push({
          test: 'RPC get_user_role',
          status: 'error',
          message: `Errore: ${error.message}`,
          details: error
        });
      } else {
        setRpcResult({ role: data, error: null });
        results.push({
          test: 'RPC get_user_role',
          status: 'success',
          message: `Ruolo restituito: ${data || 'null'}`,
          details: { role: data }
        });
      }
    } catch (e: any) {
      setRpcResult({ role: null, error: e.message });
      results.push({
        test: 'RPC get_user_role',
        status: 'error',
        message: `Eccezione: ${e.message}`,
        details: e
      });
    }

    // Test 2: Direct query to user_roles
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (error) {
        setDirectQueryResult({ role: null, error: error.message });
        results.push({
          test: 'Query diretta user_roles',
          status: 'error',
          message: `Errore RLS/Query: ${error.message}`,
          details: error
        });
      } else {
        setDirectQueryResult({ role: data?.role || null, error: null });
        results.push({
          test: 'Query diretta user_roles',
          status: data ? 'success' : 'warning',
          message: data ? `Ruolo: ${data.role}` : 'Nessun ruolo trovato',
          details: data
        });
      }
    } catch (e: any) {
      setDirectQueryResult({ role: null, error: e.message });
      results.push({
        test: 'Query diretta user_roles',
        status: 'error',
        message: `Eccezione: ${e.message}`,
        details: e
      });
    }

    // Test 3: has_role check for admin
    try {
      const { data, error } = await supabase.rpc('has_role', { 
        user_uuid: user.id, 
        role_name: 'admin' 
      });
      
      if (error) {
        results.push({
          test: 'RPC has_role (admin)',
          status: 'error',
          message: `Errore: ${error.message}`,
          details: error
        });
      } else {
        results.push({
          test: 'RPC has_role (admin)',
          status: data ? 'success' : 'warning',
          message: data ? 'È admin: Sì' : 'È admin: No',
          details: { isAdmin: data }
        });
      }
    } catch (e: any) {
      results.push({
        test: 'RPC has_role (admin)',
        status: 'error',
        message: `Eccezione: ${e.message}`,
        details: e
      });
    }

    // Test 4: Check profile exists
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, user_id, full_name, company_name')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (error) {
        results.push({
          test: 'Profilo utente',
          status: 'error',
          message: `Errore: ${error.message}`,
          details: error
        });
      } else if (!data) {
        results.push({
          test: 'Profilo utente',
          status: 'warning',
          message: 'Profilo non trovato',
          details: null
        });
      } else {
        results.push({
          test: 'Profilo utente',
          status: 'success',
          message: `Profilo: ${data.full_name || 'N/A'} - ${data.company_name || 'N/A'}`,
          details: data
        });
      }
    } catch (e: any) {
      results.push({
        test: 'Profilo utente',
        status: 'error',
        message: `Eccezione: ${e.message}`,
        details: e
      });
    }

    // Test 5: Check documents access
    try {
      const { count, error } = await supabase
        .from('documents')
        .select('*', { count: 'exact', head: true });
      
      if (error) {
        results.push({
          test: 'Accesso documenti',
          status: 'error',
          message: `Errore RLS: ${error.message}`,
          details: error
        });
      } else {
        results.push({
          test: 'Accesso documenti',
          status: 'success',
          message: `Documenti visibili: ${count || 0}`,
          details: { count }
        });
      }
    } catch (e: any) {
      results.push({
        test: 'Accesso documenti',
        status: 'error',
        message: `Eccezione: ${e.message}`,
        details: e
      });
    }

    // Test 6: Check audit_logs access (only admins)
    try {
      const { count, error } = await supabase
        .from('audit_logs')
        .select('*', { count: 'exact', head: true });
      
      if (error) {
        results.push({
          test: 'Accesso audit logs',
          status: role === 'admin' ? 'error' : 'warning',
          message: role === 'admin' ? `Errore: ${error.message}` : 'Accesso negato (normale per non-admin)',
          details: error
        });
      } else {
        results.push({
          test: 'Accesso audit logs',
          status: 'success',
          message: `Log visibili: ${count || 0}`,
          details: { count }
        });
      }
    } catch (e: any) {
      results.push({
        test: 'Accesso audit logs',
        status: 'error',
        message: `Eccezione: ${e.message}`,
        details: e
      });
    }

    setDiagnostics(results);
    setRunning(false);
    toast.success('Diagnostica completata');
  };

  useEffect(() => {
    if (user && !authLoading && !roleLoading) {
      runDiagnostics();
    }
  }, [user, authLoading, roleLoading]);

  const getStatusIcon = (status: DiagnosticResult['status']) => {
    switch (status) {
      case 'success': return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'error': return <XCircle className="h-5 w-5 text-red-500" />;
      case 'warning': return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
    }
  };

  const getStatusBadge = (status: DiagnosticResult['status']) => {
    switch (status) {
      case 'success': return <Badge className="bg-green-500/20 text-green-700 border-green-500/30">OK</Badge>;
      case 'error': return <Badge variant="destructive">Errore</Badge>;
      case 'warning': return <Badge className="bg-yellow-500/20 text-yellow-700 border-yellow-500/30">Attenzione</Badge>;
    }
  };

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
                <Shield className="h-6 w-6 text-primary" />
                Stato Permessi
              </h1>
              <p className="text-muted-foreground text-sm">
                Diagnostica accessi e ruoli
              </p>
            </div>
          </div>
          <Button onClick={runDiagnostics} disabled={running}>
            <RefreshCw className={`h-4 w-4 mr-2 ${running ? 'animate-spin' : ''}`} />
            Riesegui Test
          </Button>
        </div>

        {/* Current Status Summary */}
        <div className="grid gap-4 md:grid-cols-3 mb-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <User className="h-4 w-4" />
                Utente Corrente
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-mono text-xs break-all">{user.id}</p>
              <p className="text-sm text-muted-foreground mt-1">{user.email}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Key className="h-4 w-4" />
                Ruolo (Hook)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Badge variant={isAdmin ? 'default' : 'secondary'} className="text-lg px-3 py-1">
                {getRoleDisplayName()}
              </Badge>
              <p className="text-xs text-muted-foreground mt-2">
                Valore raw: {role || 'null'}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Database className="h-4 w-4" />
                Ruolo (RPC)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {rpcResult.error ? (
                <div>
                  <Badge variant="destructive">Errore</Badge>
                  <p className="text-xs text-red-500 mt-1">{rpcResult.error}</p>
                </div>
              ) : (
                <div>
                  <Badge variant="outline" className="text-lg px-3 py-1">
                    {rpcResult.role || 'null'}
                  </Badge>
                  <p className="text-xs text-muted-foreground mt-2">
                    Query diretta: {directQueryResult.role || directQueryResult.error || 'null'}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Diagnostic Results */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Risultati Diagnostica
            </CardTitle>
            <CardDescription>
              Test eseguiti per verificare accessi e permessi
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px]">
              <div className="space-y-3">
                {diagnostics.map((diag, idx) => (
                  <div 
                    key={idx} 
                    className="flex items-start gap-3 p-3 rounded-lg border bg-card"
                  >
                    {getStatusIcon(diag.status)}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium">{diag.test}</span>
                        {getStatusBadge(diag.status)}
                      </div>
                      <p className="text-sm text-muted-foreground">{diag.message}</p>
                      {diag.details && (
                        <details className="mt-2">
                          <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                            Dettagli tecnici
                          </summary>
                          <pre className="mt-1 p-2 bg-muted rounded text-xs overflow-auto max-h-32">
                            {JSON.stringify(diag.details, null, 2)}
                          </pre>
                        </details>
                      )}
                    </div>
                  </div>
                ))}
                
                {diagnostics.length === 0 && !running && (
                  <p className="text-center text-muted-foreground py-8">
                    Clicca "Riesegui Test" per avviare la diagnostica
                  </p>
                )}
                
                {running && (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin mr-2" />
                    <span>Esecuzione test in corso...</span>
                  </div>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Admin Link */}
        {isAdmin && (
          <div className="mt-4 flex gap-2">
            <Button variant="outline" onClick={() => navigate('/admin/audit-log')}>
              Visualizza Audit Log
            </Button>
            <Button variant="outline" onClick={() => navigate('/admin')}>
              Dashboard Admin
            </Button>
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
}
