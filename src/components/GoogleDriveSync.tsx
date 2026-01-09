import { useState } from 'react';
import { HardDrive, Link2, Link2Off, RefreshCw, Upload, Loader2, ExternalLink, FolderSync } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
            <Button onClick={connect} className="w-full">
              <Link2 className="h-4 w-4 mr-2" />
              Connetti Google Drive
            </Button>
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
      </CardContent>
    </Card>
  );
}
