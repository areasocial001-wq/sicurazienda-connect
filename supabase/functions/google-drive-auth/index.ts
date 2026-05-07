import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const GOOGLE_CLIENT_ID = Deno.env.get('GOOGLE_CLIENT_ID');
    
    if (!GOOGLE_CLIENT_ID) {
      throw new Error('GOOGLE_CLIENT_ID not configured');
    }

    const { action, userId, redirectUri } = await req.json();
    
    console.log(`Google Drive Auth - Action: ${action}, User: ${userId}`);

    if (action === 'get_auth_url') {
      // Generate OAuth URL for Google Drive
      const scopes = [
        'https://www.googleapis.com/auth/drive.file',
        'https://www.googleapis.com/auth/drive.appdata'
      ].join(' ');

      const state = btoa(JSON.stringify({ userId, service: 'drive', timestamp: Date.now() }));
      
      const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
      authUrl.searchParams.set('client_id', GOOGLE_CLIENT_ID);
      authUrl.searchParams.set('redirect_uri', redirectUri);
      authUrl.searchParams.set('response_type', 'code');
      authUrl.searchParams.set('scope', scopes);
      authUrl.searchParams.set('access_type', 'offline');
      authUrl.searchParams.set('prompt', 'consent');
      authUrl.searchParams.set('state', state);

      return new Response(
        JSON.stringify({ success: true, authUrl: authUrl.toString() }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'get_oauth_config') {
      const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
      const expectedRedirectUri = `${SUPABASE_URL}/functions/v1/google-drive-callback`;
      const clientIdMasked = GOOGLE_CLIENT_ID.length > 20
        ? `${GOOGLE_CLIENT_ID.slice(0, 12)}…${GOOGLE_CLIENT_ID.slice(-16)}`
        : GOOGLE_CLIENT_ID;
      return new Response(
        JSON.stringify({
          success: true,
          clientId: GOOGLE_CLIENT_ID,
          clientIdMasked,
          expectedRedirectUri,
          expectedOrigins: [
            'https://sicurazienda-connect.com',
            'https://www.sicurazienda-connect.com',
            'https://sicurazienda-connect.lovable.app',
          ],
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: false, error: 'Invalid action' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  } catch (error) {
    console.error('Google Drive Auth Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
