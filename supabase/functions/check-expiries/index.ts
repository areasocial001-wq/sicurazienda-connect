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

    // Check for employee activities expiring in the next 30 days
    const { data: expiringActivities, error: activityError } = await supabase
      .from('crm_employee_activities')
      .select(`
        id, 
        activity_name, 
        activity_type, 
        expiry_date, 
        user_id,
        employee_id,
        crm_employees!inner(first_name, last_name, contact_id, crm_contacts(name, company))
      `)
      .not('expiry_date', 'is', null)
      .lte('expiry_date', thirtyDaysFromNow.toISOString().split('T')[0])
      .gte('expiry_date', now.toISOString().split('T')[0]);

    if (activityError) {
      console.error('Error fetching expiring employee activities:', activityError);
    } else {
      console.log(`Found ${expiringActivities?.length || 0} employee activities expiring soon`);

      for (const activity of expiringActivities || []) {
        const { data: existingReminder } = await supabase
          .from('reminders')
          .select('id')
          .eq('reference_id', activity.id)
          .eq('reference_type', 'employee_activity')
          .eq('is_completed', false)
          .maybeSingle();

        if (!existingReminder) {
          const expiryDate = new Date(activity.expiry_date);
          const daysUntilExpiry = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          const isUrgent = daysUntilExpiry <= 7;

          const employee = activity.crm_employees as any;
          const employeeName = employee ? `${employee.first_name} ${employee.last_name}` : 'Dipendente';
          const contact = employee?.crm_contacts;
          const companyInfo = contact?.company || contact?.name || '';

          const activityTypeLabel = activity.activity_type === 'formazione' ? '📚 Formazione' : '🏥 Visita Medica';
          
          remindersToCreate.push({
            user_id: activity.user_id,
            title: isUrgent 
              ? `⚠️ URGENTE: ${activityTypeLabel} - ${employeeName} scade tra ${daysUntilExpiry}g`
              : `${activityTypeLabel}: ${employeeName} scade tra ${daysUntilExpiry}g`,
            description: `${activity.activity_name} per ${employeeName}${companyInfo ? ` (${companyInfo})` : ''} scade il ${expiryDate.toLocaleDateString('it-IT')}. ${
              isUrgent ? 'Pianifica il rinnovo immediatamente.' : 'Ricorda di pianificare il rinnovo.'
            }`,
            type: 'employee_activity_expiry',
            reference_id: activity.id,
            reference_type: 'employee_activity',
            due_date: activity.expiry_date,
          });
        }
      }
    }

    // Check for course certificate expiries in the next 30 days
    const { data: expiringCertificates, error: certError } = await supabase
      .from('course_enrollments')
      .select(`
        id,
        certificate_expiry,
        user_id,
        employee:crm_employees(first_name, last_name),
        contact:crm_contacts(name, company),
        edition:course_editions(course:courses(name))
      `)
      .eq('certificate_issued', true)
      .not('certificate_expiry', 'is', null)
      .lte('certificate_expiry', thirtyDaysFromNow.toISOString().split('T')[0])
      .gte('certificate_expiry', now.toISOString().split('T')[0]);

    if (certError) {
      console.error('Error fetching expiring certificates:', certError);
    } else {
      console.log(`Found ${expiringCertificates?.length || 0} course certificates expiring soon`);

      for (const cert of expiringCertificates || []) {
        const { data: existingReminder } = await supabase
          .from('reminders')
          .select('id')
          .eq('reference_id', cert.id)
          .eq('reference_type', 'course_certificate')
          .eq('is_completed', false)
          .maybeSingle();

        if (!existingReminder) {
          const expiryDate = new Date(cert.certificate_expiry);
          const daysUntilExpiry = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          const isUrgent = daysUntilExpiry <= 7;

          const employee = cert.employee as any;
          const empName = employee ? `${employee.first_name} ${employee.last_name}` : 'Dipendente';
          const courseName = (cert.edition as any)?.course?.name || 'Corso';
          const company = (cert.contact as any)?.name || (cert.contact as any)?.company || '';

          remindersToCreate.push({
            user_id: cert.user_id,
            title: isUrgent
              ? `⚠️ URGENTE: Attestato "${courseName}" - ${empName} scade tra ${daysUntilExpiry}g`
              : `🎓 Attestato "${courseName}" - ${empName} scade tra ${daysUntilExpiry}g`,
            description: `L'attestato di ${empName}${company ? ` (${company})` : ''} per il corso "${courseName}" scade il ${expiryDate.toLocaleDateString('it-IT')}. ${
              isUrgent ? 'Pianifica il rinnovo immediatamente.' : 'Ricorda di pianificare il rinnovo.'
            }`,
            type: 'course_expiry',
            reference_id: cert.id,
            reference_type: 'course_certificate',
            due_date: cert.certificate_expiry,
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
        certificatesChecked: expiringCertificates?.length || 0,
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
