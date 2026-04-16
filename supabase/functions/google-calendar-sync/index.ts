import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function refreshAccessToken(refreshToken: string): Promise<{ access_token: string; expires_in: number } | null> {
  const GOOGLE_CLIENT_ID = Deno.env.get('GOOGLE_CLIENT_ID');
  const GOOGLE_CLIENT_SECRET = Deno.env.get('GOOGLE_CLIENT_SECRET');

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

  return data;
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
    const { action, event } = await req.json();

    console.log(`Google Calendar Sync - Action: ${action}, User: ${userId}`);

    // Get user's tokens
    const { data: tokenData, error: tokenError } = await supabase
      .from('google_calendar_tokens')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (tokenError || !tokenData) {
      return new Response(
        JSON.stringify({ success: false, error: 'Not connected to Google Calendar', needsAuth: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if token needs refresh
    let accessToken = tokenData.access_token;
    const expiresAt = new Date(tokenData.expires_at);
    
    if (expiresAt <= new Date()) {
      console.log('Token expired, refreshing...');
      const newTokens = await refreshAccessToken(tokenData.refresh_token);
      
      if (!newTokens) {
        // Token refresh failed, user needs to re-authenticate
        await supabase.from('google_calendar_tokens').delete().eq('user_id', userId);
        return new Response(
          JSON.stringify({ success: false, error: 'Session expired, please reconnect', needsAuth: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      accessToken = newTokens.access_token;
      
      // Update stored tokens
      await supabase.from('google_calendar_tokens').update({
        access_token: newTokens.access_token,
        expires_at: new Date(Date.now() + newTokens.expires_in * 1000).toISOString(),
        updated_at: new Date().toISOString(),
      }).eq('user_id', userId);
    }

    if (action === 'check_connection') {
      return new Response(
        JSON.stringify({ success: true, connected: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'disconnect') {
      await supabase.from('google_calendar_tokens').delete().eq('user_id', userId);
      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'list_events') {
      console.log('Fetching Google Calendar events...');
      
      const now = new Date();
      const timeMin = now.toISOString();
      const timeMax = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString(); // Next 30 days

      const apiUrl = `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}&singleEvents=true&orderBy=startTime&maxResults=50`;
      
      console.log('Calling Google Calendar API...');
      
      const response = await fetch(apiUrl, { 
        headers: { Authorization: `Bearer ${accessToken}` } 
      });

      const data = await response.json();
      
      if (data.error) {
        console.error('Google Calendar API error:', JSON.stringify(data.error));
        return new Response(
          JSON.stringify({ success: false, error: data.error.message || 'API error', needsAuth: data.error.code === 401 }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: response.status }
        );
      }

      const events = (data.items || []).map((item: any) => ({
        id: item.id,
        title: item.summary || 'Senza titolo',
        description: item.description || '',
        start: item.start?.dateTime || item.start?.date,
        end: item.end?.dateTime || item.end?.date,
        allDay: !item.start?.dateTime,
        location: item.location || '',
      }));

      console.log(`Successfully fetched ${events.length} events`);

      return new Response(
        JSON.stringify({ success: true, events }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'create_event') {
      const googleEvent = {
        summary: event.title,
        description: event.description || '',
        start: event.allDay 
          ? { date: event.start.split('T')[0] }
          : { dateTime: event.start, timeZone: 'Europe/Rome' },
        end: event.allDay
          ? { date: event.end.split('T')[0] }
          : { dateTime: event.end, timeZone: 'Europe/Rome' },
      };

      const response = await fetch(
        'https://www.googleapis.com/calendar/v3/calendars/primary/events',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(googleEvent),
        }
      );

      const data = await response.json();

      if (data.error) {
        console.error('Error creating event:', data.error);
        throw new Error(data.error.message);
      }

      console.log('Event created successfully:', data.id);

      return new Response(
        JSON.stringify({ success: true, eventId: data.id }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'export_followups') {
      // Get all CRM contacts with upcoming follow-ups
      const { data: contacts } = await supabase
        .from('crm_contacts')
        .select('id, name, company, next_followup_at')
        .eq('user_id', userId)
        .not('next_followup_at', 'is', null)
        .gte('next_followup_at', new Date().toISOString());

      if (!contacts || contacts.length === 0) {
        return new Response(
          JSON.stringify({ success: true, exported: 0, message: 'Nessun follow-up da esportare' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      let exported = 0;
      for (const contact of contacts) {
        const followupDate = new Date(contact.next_followup_at);
        const endDate = new Date(followupDate.getTime() + 60 * 60 * 1000); // 1 hour duration

        const googleEvent = {
          summary: `Follow-up: ${contact.name}${contact.company ? ` (${contact.company})` : ''}`,
          description: `Follow-up CRM per ${contact.name}`,
          start: { dateTime: followupDate.toISOString(), timeZone: 'Europe/Rome' },
          end: { dateTime: endDate.toISOString(), timeZone: 'Europe/Rome' },
        };

        const response = await fetch(
          'https://www.googleapis.com/calendar/v3/calendars/primary/events',
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(googleEvent),
          }
        );

        if (response.ok) {
          exported++;
        }
      }

      return new Response(
        JSON.stringify({ success: true, exported, message: `${exported} follow-up esportati` }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: false, error: 'Invalid action' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  } catch (error) {
    console.error('Google Calendar Sync Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
