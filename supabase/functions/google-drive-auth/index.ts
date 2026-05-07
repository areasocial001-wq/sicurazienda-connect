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

    if (action === 'verify_config') {
      const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
      const expectedRedirectUri = `${SUPABASE_URL}/functions/v1/google-drive-callback`;
      const expectedOrigins = [
        'https://sicurazienda-connect.com',
        'https://www.sicurazienda-connect.com',
        'https://sicurazienda-connect.lovable.app',
      ];

      const checks: Array<{ name: string; ok: boolean; detail: string }> = [];

      // 1) Probe redirect_uri by hitting Google's OAuth endpoint
      const probeUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
      probeUrl.searchParams.set('client_id', GOOGLE_CLIENT_ID);
      probeUrl.searchParams.set('redirect_uri', expectedRedirectUri);
      probeUrl.searchParams.set('response_type', 'code');
      probeUrl.searchParams.set('scope', 'https://www.googleapis.com/auth/drive.file');

      let redirectOk = false;
      let redirectDetail = '';
      let probeDebug: any = null;
      try {
        const res = await fetch(probeUrl.toString(), { redirect: 'manual' });
        const location = res.headers.get('location') ?? '';
        const body = await res.text();
        probeDebug = { status: res.status, location: location.slice(0, 500), bodyPreview: body.slice(0, 300) };
        const haystack = location + '\n' + body;
        // Decode any base64 authError payload to inspect the actual error code
        let decoded = '';
        const m = location.match(/[?&]authError=([^&]+)/);
        if (m) {
          try { decoded = atob(m[1].replace(/-/g, '+').replace(/_/g, '/')); } catch { /* noop */ }
        }
        const all = haystack + '\n' + decoded;
        if (/redirect_uri_mismatch/i.test(all)) {
          redirectDetail = `Google ha risposto: redirect_uri_mismatch. L'URI "${expectedRedirectUri}" NON è registrato nelle "Authorized redirect URIs" del Client ID.`;
        } else if (/invalid_client|deleted_client/i.test(all)) {
          redirectDetail = 'Client ID non valido o eliminato in Google Cloud.';
        } else if (/admin_policy_enforced|disallowed_useragent|access_denied/i.test(all)) {
          redirectDetail = `Risposta Google inattesa: ${decoded || location.slice(0, 200)}`;
        } else if (res.status === 302 && !location.includes('/signin/oauth/error')) {
          redirectOk = true;
          redirectDetail = 'Redirect URI accettato da Google (302 → consent screen).';
        } else if (res.status === 200 && !decoded) {
          redirectOk = true;
          redirectDetail = 'Redirect URI accettato da Google.';
        } else {
          redirectDetail = `Risposta Google ambigua (status ${res.status}). Location: ${location.slice(0, 200)}`;
        }
      } catch (e) {
        redirectDetail = `Impossibile contattare Google: ${(e as Error).message}`;
      }
      checks.push({ name: 'Authorized redirect URI', ok: redirectOk, detail: redirectDetail });

      // 2) Client ID format
      const clientIdOk = /\.apps\.googleusercontent\.com$/.test(GOOGLE_CLIENT_ID);
      checks.push({
        name: 'Formato Client ID',
        ok: clientIdOk,
        detail: clientIdOk ? 'Formato corretto.' : 'Il Client ID non termina con .apps.googleusercontent.com',
      });

      // 3) Client Secret presence
      const hasSecret = !!Deno.env.get('GOOGLE_CLIENT_SECRET');
      checks.push({
        name: 'GOOGLE_CLIENT_SECRET',
        ok: hasSecret,
        detail: hasSecret ? 'Configurato.' : 'Manca il secret nei Supabase Edge Function secrets.',
      });

      const credentialsConsoleUrl = `https://console.cloud.google.com/apis/credentials/oauthclient/${encodeURIComponent(GOOGLE_CLIENT_ID)}`;

      return new Response(
        JSON.stringify({
          success: true,
          allOk: checks.every((c) => c.ok),
          clientId: GOOGLE_CLIENT_ID,
          expectedRedirectUri,
          expectedOrigins,
          credentialsConsoleUrl,
          checks,
          probeDebug,
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
