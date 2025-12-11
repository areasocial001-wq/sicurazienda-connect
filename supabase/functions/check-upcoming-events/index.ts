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
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    console.log('Checking upcoming Google Calendar events...');

    // Get all users with Google Calendar tokens
    const { data: tokens, error: tokensError } = await supabase
      .from('google_calendar_tokens')
      .select('*');

    if (tokensError) {
      console.error('Error fetching tokens:', tokensError);
      throw tokensError;
    }

    if (!tokens || tokens.length === 0) {
      console.log('No users connected to Google Calendar');
      return new Response(
        JSON.stringify({ success: true, message: 'No users to check', remindersCreated: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let totalRemindersCreated = 0;

    for (const tokenData of tokens) {
      const userId = tokenData.user_id;
      console.log(`Processing user: ${userId}`);

      // Check if token needs refresh
      let accessToken = tokenData.access_token;
      const expiresAt = new Date(tokenData.expires_at);
      
      if (expiresAt <= new Date()) {
        console.log('Token expired, refreshing...');
        const newTokens = await refreshAccessToken(tokenData.refresh_token);
        
        if (!newTokens) {
          console.error(`Failed to refresh token for user ${userId}`);
          continue;
        }

        accessToken = newTokens.access_token;
        
        await supabase.from('google_calendar_tokens').update({
          access_token: newTokens.access_token,
          expires_at: new Date(Date.now() + newTokens.expires_in * 1000).toISOString(),
          updated_at: new Date().toISOString(),
        }).eq('user_id', userId);
      }

      // Fetch upcoming events (next 24 hours)
      const now = new Date();
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      
      const timeMin = now.toISOString();
      const timeMax = tomorrow.toISOString();

      const response = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${timeMin}&timeMax=${timeMax}&singleEvents=true&orderBy=startTime`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );

      const data = await response.json();
      
      if (data.error) {
        console.error(`Google Calendar API error for user ${userId}:`, data.error);
        continue;
      }

      const events = data.items || [];
      console.log(`Found ${events.length} upcoming events for user ${userId}`);

      // Create reminders for events starting soon (within 1 hour or within 24 hours)
      for (const event of events) {
        const eventStart = new Date(event.start?.dateTime || event.start?.date);
        const hoursUntilEvent = (eventStart.getTime() - now.getTime()) / (1000 * 60 * 60);
        
        // Check if event is within 1 hour (urgent) or within 24 hours
        if (hoursUntilEvent <= 0) continue; // Skip past events
        
        const reminderTitle = hoursUntilEvent <= 1 
          ? `📅 Tra poco: ${event.summary || 'Evento'}`
          : `📅 Oggi: ${event.summary || 'Evento'}`;

        const reminderDescription = event.description 
          ? `${event.description}\n\nInizio: ${eventStart.toLocaleString('it-IT')}`
          : `Inizio: ${eventStart.toLocaleString('it-IT')}`;

        // Check if reminder already exists for this event
        const { data: existingReminder } = await supabase
          .from('reminders')
          .select('id')
          .eq('user_id', userId)
          .eq('reference_id', event.id)
          .eq('reference_type', 'google_calendar_event')
          .single();

        if (!existingReminder) {
          // Create new reminder
          const { error: insertError } = await supabase
            .from('reminders')
            .insert({
              user_id: userId,
              title: reminderTitle,
              description: reminderDescription,
              type: 'calendar_event',
              reference_id: event.id,
              reference_type: 'google_calendar_event',
              due_date: eventStart.toISOString(),
              is_read: false,
              is_completed: false,
            });

          if (insertError) {
            console.error(`Error creating reminder for event ${event.id}:`, insertError);
          } else {
            totalRemindersCreated++;
            console.log(`Created reminder for event: ${event.summary}`);
          }
        }
      }
    }

    console.log(`Total reminders created: ${totalRemindersCreated}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Checked ${tokens.length} users, created ${totalRemindersCreated} reminders`,
        remindersCreated: totalRemindersCreated 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Check Upcoming Events Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
