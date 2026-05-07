import { useState } from 'react';
import { HardDrive, Link2, Link2Off, RefreshCw, Upload, Loader2, ExternalLink, FolderSync, ShieldCheck, CheckCircle2, XCircle, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useGoogleDrive } from '@/hooks/useGoogleDrive';

interface GoogleDriveSyncProps {
  userId: string | undefined;
}

export default function GoogleDriveSync({ userId }: GoogleDriveSyncProps) {
  const {
    isConnected,
    isLoading,
    files,
    connect,
    disconnect,
    listFiles,
    syncAllDocuments,
  } = useGoogleDrive(userId);
  
  const [syncing, setSyncing] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [verifyResult, setVerifyResult] = useState<any>(null);

  const handleSync = async () => {
    setSyncing(true);
    await syncAllDocuments();
    await listFiles();
    setSyncing(false);
  };

  const handleFetchFiles = async () => {
    if (fetching) return;
    setFetching(true);
    try {
      await listFiles();
    } finally {
      setFetching(false);
    }
  };

  const handleVerifyConfig = async () => {
    setVerifying(true);
    setVerifyResult(null);
    try {
      const { data, error } = await supabase.functions.invoke('google-drive-auth', {
        body: { action: 'verify_config', userId },
      });
      if (error) throw error;
      setVerifyResult(data);
    } catch (e: any) {
      toast.error(`Errore verifica: ${e.message}`);
    } finally {
      setVerifying(false);
    }
  };

  const copy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copiato negli appunti');
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <HardDrive className="h-5 w-5" />
          Google Drive
          <Badge variant={isConnected ? 'default' : 'secondary'} className="ml-auto">
            {isConnected ? 'Connesso' : 'Non connesso'}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {!isConnected ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Collega Google Drive per sincronizzare automaticamente i tuoi documenti.
            </p>
            <div className="flex gap-2">
              <Button onClick={connect} className="flex-1">
                <Link2 className="h-4 w-4 mr-2" />
                Connetti Google Drive
              </Button>
              <Button variant="outline" onClick={handleVerifyConfig} disabled={verifying}>
                {verifying ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <ShieldCheck className="h-4 w-4 mr-2" />}
                Verifica configurazione
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex gap-2 flex-wrap">
              <Button variant="default" size="sm" onClick={handleSync} disabled={syncing}>
                {syncing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <FolderSync className="h-4 w-4 mr-2" />}
                Sincronizza Tutti
              </Button>
              <Button variant="outline" size="sm" onClick={handleFetchFiles} disabled={fetching}>
                {fetching ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                Aggiorna Lista
              </Button>
              <Button variant="outline" size="sm" onClick={handleVerifyConfig} disabled={verifying}>
                {verifying ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <ShieldCheck className="h-4 w-4 mr-2" />}
                Verifica config
              </Button>
              <Button variant="ghost" size="sm" onClick={disconnect}>
                <Link2Off className="h-4 w-4 mr-2" />
                Disconnetti
              </Button>
            </div>

            {files.length > 0 && (
              <div className="space-y-2 mt-4">
                <p className="text-sm text-muted-foreground font-medium">
                  File su Drive ({files.length}):
                </p>
                <div className="max-h-40 overflow-y-auto space-y-2">
                  {files.slice(0, 5).map((file) => (
                    <div
                      key={file.id}
                      className="text-sm p-2 rounded bg-muted/50 border flex items-center justify-between"
                    >
                      <span className="font-medium truncate flex-1">{file.name}</span>
                      {file.webViewLink && (
                        <a
                          href={file.webViewLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="ml-2 text-primary hover:underline"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      )}
                    </div>
                  ))}
                  {files.length > 5 && (
                    <p className="text-xs text-muted-foreground text-center">
                      ...e altri {files.length - 5} file
                    </p>
                  )}
                </div>
              </div>
            )}
          </>
        )}

        {verifyResult && (
          <Alert variant={verifyResult.allOk ? 'default' : 'destructive'} className="mt-2">
            <AlertTitle className="flex items-center gap-2">
              {verifyResult.allOk ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
              {verifyResult.allOk ? 'Configurazione OAuth corretta' : 'Configurazione OAuth da correggere'}
            </AlertTitle>
            <AlertDescription className="space-y-3 mt-2">
              <ul className="text-sm space-y-1">
                {verifyResult.checks?.map((c: any, i: number) => (
                  <li key={i} className="flex items-start gap-2">
                    {c.ok ? <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0 mt-0.5" /> : <XCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />}
                    <span><strong>{c.name}:</strong> {c.detail}</span>
                  </li>
                ))}
              </ul>

              <div className="text-sm space-y-2 border-t pt-2">
                <p className="font-medium">Valori attesi in Google Cloud Console:</p>

                <div>
                  <p className="text-xs text-muted-foreground">Authorized redirect URI:</p>
                  <div className="flex items-center gap-2">
                    <code className="text-xs bg-muted p-1 rounded flex-1 break-all">{verifyResult.expectedRedirectUri}</code>
                    <Button size="sm" variant="ghost" onClick={() => copy(verifyResult.expectedRedirectUri)}>
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                </div>

                <div>
                  <p className="text-xs text-muted-foreground">Authorized JavaScript origins:</p>
                  {verifyResult.expectedOrigins?.map((o: string) => (
                    <div key={o} className="flex items-center gap-2">
                      <code className="text-xs bg-muted p-1 rounded flex-1 break-all">{o}</code>
                      <Button size="sm" variant="ghost" onClick={() => copy(o)}>
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>

                {verifyResult.credentialsConsoleUrl && (
                  <a
                    href={verifyResult.credentialsConsoleUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-primary hover:underline text-sm"
                  >
                    <ExternalLink className="h-3 w-3" />
                    Apri il Client OAuth in Google Cloud Console
                  </a>
                )}
              </div>
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
