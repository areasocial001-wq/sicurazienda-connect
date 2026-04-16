import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function refreshAccessToken(refreshToken: string): Promise<{ access_token: string; expires_in: number } | null> {
  const GOOGLE_CLIENT_ID = Deno.env.get('GOOGLE_CLIENT_ID');
  const GOOGLE_CLIENT_SECRET = Deno.env.get('GOOGLE_CLIENT_SECRET');

  try {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: GOOGLE_CLIENT_ID!,
        client_secret: GOOGLE_CLIENT_SECRET!,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    });

    const data = await response.json();
    if (data.error) {
      console.error('Token refresh error:', data);
      return null;
    }
    return { access_token: data.access_token, expires_in: data.expires_in };
  } catch (error) {
    console.error('Error refreshing token:', error);
    return null;
  }
}

async function getOrCreateFolder(accessToken: string, folderName: string): Promise<string | null> {
  try {
    // Search for existing folder
    const searchResponse = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=name='${folderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    const searchData = await searchResponse.json();
    
    if (searchData.files && searchData.files.length > 0) {
      console.log('Found existing folder:', searchData.files[0].id);
      return searchData.files[0].id;
    }

    // Create new folder
    const createResponse = await fetch('https://www.googleapis.com/drive/v3/files', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: folderName,
        mimeType: 'application/vnd.google-apps.folder',
      }),
    });

    const folder = await createResponse.json();
    console.log('Created new folder:', folder.id);
    return folder.id;
  } catch (error) {
    console.error('Error getting/creating folder:', error);
    return null;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    // Validate JWT and get authenticated user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userClient = createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = user.id;
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    const { action, fileName, fileContent, mimeType, documentId } = await req.json();

    console.log(`Google Drive Sync - Action: ${action}, User: ${userId}`);

    // Get user's tokens
    const { data: tokenData, error: tokenError } = await supabase
      .from('google_drive_tokens')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (action === 'check_connection') {
      return new Response(
        JSON.stringify({ success: true, connected: !!tokenData }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'disconnect') {
      await supabase
        .from('google_drive_tokens')
        .delete()
        .eq('user_id', userId);

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!tokenData) {
      return new Response(
        JSON.stringify({ success: false, needsAuth: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if token needs refresh
    let accessToken = tokenData.access_token;
    const expiresAt = new Date(tokenData.expires_at);
    
    if (expiresAt <= new Date()) {
      console.log('Token expired, refreshing...');
      const refreshed = await refreshAccessToken(tokenData.refresh_token);
      
      if (!refreshed) {
        return new Response(
          JSON.stringify({ success: false, needsAuth: true, error: 'Token refresh failed' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      accessToken = refreshed.access_token;
      
      // Update stored token
      await supabase
        .from('google_drive_tokens')
        .update({
          access_token: refreshed.access_token,
          expires_at: new Date(Date.now() + refreshed.expires_in * 1000).toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId);
    }

    // Get or create the SicurAzienda folder
    const folderId = tokenData.folder_id || await getOrCreateFolder(accessToken, 'SicurAzienda Documents');
    
    if (folderId && !tokenData.folder_id) {
      await supabase
        .from('google_drive_tokens')
        .update({ folder_id: folderId })
        .eq('user_id', userId);
    }

    if (action === 'list_files') {
      // List files in the SicurAzienda folder
      const response = await fetch(
        `https://www.googleapis.com/drive/v3/files?q='${folderId}' in parents and trashed=false&fields=files(id,name,mimeType,modifiedTime,size,webViewLink)`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );

      const data = await response.json();
      
      return new Response(
        JSON.stringify({ success: true, files: data.files || [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'upload_file') {
      if (!fileName || !fileContent) {
        throw new Error('Missing fileName or fileContent');
      }

      // Decode base64 content
      const binaryContent = Uint8Array.from(atob(fileContent), c => c.charCodeAt(0));

      // Create file metadata
      const metadata = {
        name: fileName,
        parents: folderId ? [folderId] : undefined,
      };

      // Use multipart upload
      const boundary = '-------314159265358979323846';
      const delimiter = '\r\n--' + boundary + '\r\n';
      const closeDelim = '\r\n--' + boundary + '--';

      const multipartRequestBody =
        delimiter +
        'Content-Type: application/json\r\n\r\n' +
        JSON.stringify(metadata) +
        delimiter +
        'Content-Type: ' + (mimeType || 'application/octet-stream') + '\r\n' +
        'Content-Transfer-Encoding: base64\r\n\r\n' +
        fileContent +
        closeDelim;

      const response = await fetch(
        'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': `multipart/related; boundary="${boundary}"`,
          },
          body: multipartRequestBody,
        }
      );

      const file = await response.json();

      if (file.error) {
        throw new Error(file.error.message);
      }

      console.log('File uploaded successfully:', file.id);

      return new Response(
        JSON.stringify({ success: true, file }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'sync_all_documents') {
      // Get all user documents from Supabase
      const { data: documents, error: docsError } = await supabase
        .from('documents')
        .select('id, name, file_path, file_type')
        .eq('user_id', userId);

      if (docsError) throw docsError;

      const syncedFiles: any[] = [];
      const errors: string[] = [];

      for (const doc of documents || []) {
        try {
          // Download file from Supabase storage
          const { data: fileData, error: downloadError } = await supabase.storage
            .from('documents')
            .download(doc.file_path);

          if (downloadError) {
            errors.push(`Error downloading ${doc.name}: ${downloadError.message}`);
            continue;
          }

          // Convert to base64
          const buffer = await fileData.arrayBuffer();
          const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)));

          // Upload to Drive
          const metadata = {
            name: doc.name,
            parents: folderId ? [folderId] : undefined,
          };

          const boundary = '-------314159265358979323846';
          const delimiter = '\r\n--' + boundary + '\r\n';
          const closeDelim = '\r\n--' + boundary + '--';

          const multipartRequestBody =
            delimiter +
            'Content-Type: application/json\r\n\r\n' +
            JSON.stringify(metadata) +
            delimiter +
            'Content-Type: ' + (doc.file_type || 'application/octet-stream') + '\r\n' +
            'Content-Transfer-Encoding: base64\r\n\r\n' +
            base64 +
            closeDelim;

          const uploadResponse = await fetch(
            'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink',
            {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': `multipart/related; boundary="${boundary}"`,
              },
              body: multipartRequestBody,
            }
          );

          const uploadedFile = await uploadResponse.json();
          
          if (uploadedFile.error) {
            errors.push(`Error uploading ${doc.name}: ${uploadedFile.error.message}`);
          } else {
            syncedFiles.push(uploadedFile);
          }
        } catch (error) {
          errors.push(`Error syncing ${doc.name}: ${error.message}`);
        }
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          syncedCount: syncedFiles.length,
          totalCount: documents?.length || 0,
          errors: errors.length > 0 ? errors : undefined
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: false, error: 'Invalid action' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  } catch (error) {
    console.error('Google Drive Sync Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
