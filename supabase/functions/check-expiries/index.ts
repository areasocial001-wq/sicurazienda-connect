import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Starting expiry check cron job...');

    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    // Check for documents expiring in the next 30 days
    const { data: expiringDocuments, error: docError } = await supabase
      .from('documents')
      .select('id, name, user_id, expiry_date, category')
      .not('expiry_date', 'is', null)
      .lte('expiry_date', thirtyDaysFromNow.toISOString().split('T')[0])
      .gte('expiry_date', now.toISOString().split('T')[0]);

    if (docError) {
      console.error('Error fetching expiring documents:', docError);
      throw docError;
    }

    console.log(`Found ${expiringDocuments?.length || 0} expiring documents`);

    // Create reminders for expiring documents
    const remindersToCreate: any[] = [];

    for (const doc of expiringDocuments || []) {
      if (!doc.user_id) continue;

      const expiryDate = new Date(doc.expiry_date);
      const daysUntilExpiry = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      // Check if reminder already exists
      const { data: existingReminder } = await supabase
        .from('reminders')
        .select('id')
        .eq('reference_id', doc.id)
        .eq('reference_type', 'document')
        .eq('is_completed', false)
        .single();

      if (!existingReminder) {
        const isUrgent = daysUntilExpiry <= 7;
        const reminderType = doc.category === 'attestato' ? 'course_expiry' : 'document_expiry';
        
        remindersToCreate.push({
          user_id: doc.user_id,
          title: isUrgent 
            ? `⚠️ URGENTE: "${doc.name}" scade tra ${daysUntilExpiry} giorni!`
            : `📅 "${doc.name}" scade tra ${daysUntilExpiry} giorni`,
          description: `Il documento "${doc.name}" scadrà il ${expiryDate.toLocaleDateString('it-IT')}. ${
            isUrgent ? 'È necessaria un\'azione immediata.' : 'Pianifica il rinnovo.'
          }`,
          type: reminderType,
          reference_id: doc.id,
          reference_type: 'document',
          due_date: doc.expiry_date,
        });
      }
    }

    // Check for QR codes expiring in the next 1 day
    const oneDayFromNow = new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000);
    
    const { data: expiringQRCodes, error: qrError } = await supabase
      .from('qr_codes')
      .select('id, document_name, created_by, expires_at')
      .eq('is_active', true)
      .not('expires_at', 'is', null)
      .lte('expires_at', oneDayFromNow.toISOString())
      .gte('expires_at', now.toISOString());

    if (qrError) {
      console.error('Error fetching expiring QR codes:', qrError);
    } else {
      console.log(`Found ${expiringQRCodes?.length || 0} QR codes expiring soon`);

      for (const qr of expiringQRCodes || []) {
        // Check if reminder already exists
        const { data: existingReminder } = await supabase
          .from('reminders')
          .select('id')
          .eq('reference_id', qr.id)
          .eq('reference_type', 'qr_code')
          .eq('is_completed', false)
          .maybeSingle();

        if (!existingReminder) {
          const expiryDate = new Date(qr.expires_at);
          const hoursUntilExpiry = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60));

          remindersToCreate.push({
            user_id: qr.created_by,
            title: `⏰ QR Code "${qr.document_name}" scade tra ${hoursUntilExpiry}h`,
            description: `Il link di download per "${qr.document_name}" scadrà il ${expiryDate.toLocaleDateString('it-IT')} alle ${expiryDate.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}. Rinnova il QR code per mantenerlo attivo.`,
            type: 'qr_expiry',
            reference_id: qr.id,
            reference_type: 'qr_code',
            due_date: qr.expires_at,
          });
        }
      }
    }

    // Check for CRM contacts needing follow-up
    const { data: contactsNeedingFollowup, error: contactError } = await supabase
      .from('crm_contacts')
      .select('id, name, user_id, next_followup_at, company')
      .not('next_followup_at', 'is', null)
      .lte('next_followup_at', sevenDaysFromNow.toISOString())
      .gte('next_followup_at', now.toISOString());

    if (contactError) {
      console.error('Error fetching contacts needing followup:', contactError);
    } else {
      console.log(`Found ${contactsNeedingFollowup?.length || 0} contacts needing followup`);

      for (const contact of contactsNeedingFollowup || []) {
        // Check if reminder already exists
        const { data: existingReminder } = await supabase
          .from('reminders')
          .select('id')
          .eq('reference_id', contact.id)
          .eq('reference_type', 'crm_contact')
          .eq('is_completed', false)
          .single();

        if (!existingReminder) {
          const followupDate = new Date(contact.next_followup_at);
          const daysUntilFollowup = Math.ceil((followupDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

          remindersToCreate.push({
            user_id: contact.user_id,
            title: `📞 Follow-up: ${contact.name}${contact.company ? ` (${contact.company})` : ''}`,
            description: `È il momento di contattare ${contact.name}. Follow-up programmato per il ${followupDate.toLocaleDateString('it-IT')}.`,
            type: 'followup',
            reference_id: contact.id,
            reference_type: 'crm_contact',
            due_date: contact.next_followup_at,
          });
        }
      }
    }

    // Check for upcoming Google Calendar events
    let calendarRemindersCreated = 0;
    const { data: calendarTokens } = await supabase
      .from('google_calendar_tokens')
      .select('user_id');

    if (calendarTokens && calendarTokens.length > 0) {
      console.log(`Checking calendar events for ${calendarTokens.length} users...`);
      
      // Call the check-upcoming-events function
      try {
        const response = await fetch(
          `${supabaseUrl}/functions/v1/check-upcoming-events`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${supabaseServiceKey}`,
            },
            body: JSON.stringify({}),
          }
        );
        
        const calendarResult = await response.json();
        calendarRemindersCreated = calendarResult.remindersCreated || 0;
        console.log(`Calendar check completed: ${calendarRemindersCreated} reminders created`);
      } catch (calendarError) {
        console.error('Error checking calendar events:', calendarError);
      }
    }

    // Insert all reminders
    if (remindersToCreate.length > 0) {
      const { error: insertError } = await supabase
        .from('reminders')
        .insert(remindersToCreate);

      if (insertError) {
        console.error('Error inserting reminders:', insertError);
        throw insertError;
      }

      console.log(`Created ${remindersToCreate.length} new reminders`);
    }

    // Clean up old completed reminders (older than 30 days)
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const { error: cleanupError } = await supabase
      .from('reminders')
      .delete()
      .eq('is_completed', true)
      .lt('created_at', thirtyDaysAgo.toISOString());

    if (cleanupError) {
      console.error('Error cleaning up old reminders:', cleanupError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        documentsChecked: expiringDocuments?.length || 0,
        contactsChecked: contactsNeedingFollowup?.length || 0,
        remindersCreated: remindersToCreate.length,
        calendarRemindersCreated,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Cron job error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
