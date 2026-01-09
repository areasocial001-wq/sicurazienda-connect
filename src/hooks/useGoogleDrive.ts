import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime: string;
  size?: string;
  webViewLink?: string;
}

export function useGoogleDrive(userId: string | undefined) {
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [files, setFiles] = useState<DriveFile[]>([]);

  const checkConnection = useCallback(async () => {
    if (!userId) {
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('google-drive-sync', {
        body: { action: 'check_connection', userId },
      });

      if (error) throw error;
      setIsConnected(data?.connected || false);
    } catch (error) {
      console.log('Not connected to Google Drive');
      setIsConnected(false);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    checkConnection();
  }, [checkConnection]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'GOOGLE_DRIVE_SUCCESS') {
        toast.success('Google Drive collegato con successo!');
        setIsConnected(true);
        checkConnection();
      } else if (event.data?.type === 'GOOGLE_DRIVE_ERROR') {
        toast.error(`Errore: ${event.data.error}`);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [checkConnection]);

  const connect = async () => {
    if (!userId) {
      toast.error('Devi essere autenticato');
      return;
    }

    try {
      const redirectUri = `https://obzflzotzvwlmgyjxfpv.supabase.co/functions/v1/google-drive-callback`;
      
      const { data, error } = await supabase.functions.invoke('google-drive-auth', {
        body: { action: 'get_auth_url', userId, redirectUri },
      });

      if (error) throw error;

      if (data?.authUrl) {
        // Open popup for OAuth
        const popup = window.open(
          data.authUrl,
          'Google Drive Login',
          'width=500,height=600,scrollbars=yes'
        );

        if (!popup) {
          toast.error('Popup bloccato. Abilita i popup per questo sito.');
        }
      }
    } catch (error) {
      console.error('Error connecting:', error);
      toast.error('Errore durante la connessione');
    }
  };

  const disconnect = async () => {
    if (!userId) return;

    try {
      const { error } = await supabase.functions.invoke('google-drive-sync', {
        body: { action: 'disconnect', userId },
      });

      if (error) throw error;

      setIsConnected(false);
      setFiles([]);
      toast.success('Google Drive disconnesso');
    } catch (error) {
      console.error('Error disconnecting:', error);
      toast.error('Errore durante la disconnessione');
    }
  };

  const listFiles = async (): Promise<DriveFile[]> => {
    if (!userId || !isConnected) return [];

    try {
      const { data, error } = await supabase.functions.invoke('google-drive-sync', {
        body: { action: 'list_files', userId },
      });

      if (error) throw error;

      if (data?.needsAuth) {
        setIsConnected(false);
        toast.error('Sessione Google scaduta, riconnetti');
        return [];
      }

      const fetchedFiles = data?.files || [];
      setFiles(fetchedFiles);
      return fetchedFiles;
    } catch (error: any) {
      console.error('Error listing files:', error);
      toast.error('Errore nel recupero file');
      return [];
    }
  };

  const syncAllDocuments = async () => {
    if (!userId || !isConnected) {
      toast.error('Connetti prima Google Drive');
      return null;
    }

    try {
      const { data, error } = await supabase.functions.invoke('google-drive-sync', {
        body: { action: 'sync_all_documents', userId },
      });

      if (error) throw error;

      if (data?.needsAuth) {
        setIsConnected(false);
        toast.error('Sessione scaduta, riconnetti Google Drive');
        return null;
      }

      if (data?.syncedCount !== undefined) {
        toast.success(`${data.syncedCount}/${data.totalCount} documenti sincronizzati su Drive`);
        if (data.errors?.length > 0) {
          console.warn('Sync errors:', data.errors);
        }
      }

      return data;
    } catch (error) {
      console.error('Error syncing:', error);
      toast.error('Errore durante la sincronizzazione');
      return null;
    }
  };

  const uploadFile = async (fileName: string, fileContent: string, mimeType: string) => {
    if (!userId || !isConnected) {
      toast.error('Connetti prima Google Drive');
      return null;
    }

    try {
      const { data, error } = await supabase.functions.invoke('google-drive-sync', {
        body: { action: 'upload_file', userId, fileName, fileContent, mimeType },
      });

      if (error) throw error;

      if (data?.needsAuth) {
        setIsConnected(false);
        toast.error('Sessione scaduta, riconnetti Google Drive');
        return null;
      }

      toast.success(`"${fileName}" caricato su Google Drive`);
      return data?.file;
    } catch (error) {
      console.error('Error uploading:', error);
      toast.error('Errore nel caricamento file');
      return null;
    }
  };

  return {
    isConnected,
    isLoading,
    files,
    connect,
    disconnect,
    listFiles,
    syncAllDocuments,
    uploadFile,
  };
}
