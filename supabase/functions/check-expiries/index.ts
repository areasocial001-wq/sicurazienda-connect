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

    // ============ MEDICINA DEL LAVORO ============
    // Get users with medicina or admin role to limit reminders to authorized staff
    const { data: medicinaUsers } = await supabase
      .from('user_roles')
      .select('user_id')
      .in('role', ['medicina', 'admin']);
    const medicinaUserIds = new Set((medicinaUsers || []).map((u: any) => u.user_id));

    // Check medical visits scheduled or due in the next 30 days
    const { data: upcomingVisits, error: visitsError } = await supabase
      .from('medical_visits')
      .select(`
        id, visit_type, scheduled_date, next_due_date, status, user_id,
        employee:crm_employees(first_name, last_name),
        contact:crm_contacts(name, company)
      `)
      .or(`and(scheduled_date.gte.${now.toISOString().split('T')[0]},scheduled_date.lte.${thirtyDaysFromNow.toISOString().split('T')[0]}),and(next_due_date.gte.${now.toISOString().split('T')[0]},next_due_date.lte.${thirtyDaysFromNow.toISOString().split('T')[0]})`);

    if (visitsError) {
      console.error('Error fetching upcoming medical visits:', visitsError);
    } else {
      console.log(`Found ${upcomingVisits?.length || 0} medical visits due soon`);
      for (const visit of upcomingVisits || []) {
        if (!medicinaUserIds.has(visit.user_id)) continue;
        const targetDate = visit.scheduled_date || visit.next_due_date;
        if (!targetDate) continue;

        const { data: existingReminder } = await supabase
          .from('reminders')
          .select('id')
          .eq('reference_id', visit.id)
          .eq('reference_type', 'medical_visit')
          .eq('is_completed', false)
          .maybeSingle();

        if (!existingReminder) {
          const dueDate = new Date(targetDate);
          const daysUntil = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          const isUrgent = daysUntil <= 7;
          const emp = visit.employee as any;
          const empName = emp ? `${emp.first_name} ${emp.last_name}` : 'Dipendente';
          const company = (visit.contact as any)?.company || (visit.contact as any)?.name || '';

          remindersToCreate.push({
            user_id: visit.user_id,
            title: isUrgent
              ? `⚠️ URGENTE: Visita ${visit.visit_type} - ${empName} tra ${daysUntil}g`
              : `🏥 Visita ${visit.visit_type} - ${empName} tra ${daysUntil}g`,
            description: `Visita medica (${visit.visit_type}) per ${empName}${company ? ` (${company})` : ''} prevista il ${dueDate.toLocaleDateString('it-IT')}. Stato: ${visit.status}.`,
            type: 'medical_visit_due',
            reference_id: visit.id,
            reference_type: 'medical_visit',
            due_date: targetDate,
          });
        }
      }
    }

    // Check medical judgments expiring (valid_until) in the next 30 days
    const { data: expiringJudgments, error: judgmentsError } = await supabase
      .from('medical_judgments')
      .select(`
        id, judgment, valid_until, user_id,
        employee:crm_employees(first_name, last_name, contact_id, crm_contacts(name, company))
      `)
      .not('valid_until', 'is', null)
      .lte('valid_until', thirtyDaysFromNow.toISOString().split('T')[0])
      .gte('valid_until', now.toISOString().split('T')[0]);

    if (judgmentsError) {
      console.error('Error fetching expiring medical judgments:', judgmentsError);
    } else {
      console.log(`Found ${expiringJudgments?.length || 0} medical judgments expiring soon`);
      for (const j of expiringJudgments || []) {
        if (!medicinaUserIds.has(j.user_id)) continue;

        const { data: existingReminder } = await supabase
          .from('reminders')
          .select('id')
          .eq('reference_id', j.id)
          .eq('reference_type', 'medical_judgment')
          .eq('is_completed', false)
          .maybeSingle();

        if (!existingReminder) {
          const expiry = new Date(j.valid_until);
          const daysUntil = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          const isUrgent = daysUntil <= 7;
          const emp = j.employee as any;
          const empName = emp ? `${emp.first_name} ${emp.last_name}` : 'Dipendente';
          const company = emp?.crm_contacts?.company || emp?.crm_contacts?.name || '';

          remindersToCreate.push({
            user_id: j.user_id,
            title: isUrgent
              ? `⚠️ URGENTE: Idoneità ${empName} scade tra ${daysUntil}g`
              : `📋 Idoneità ${empName} scade tra ${daysUntil}g`,
            description: `Il giudizio di idoneità "${j.judgment}" per ${empName}${company ? ` (${company})` : ''} scade il ${expiry.toLocaleDateString('it-IT')}. Pianifica una nuova visita.`,
            type: 'medical_judgment_expiry',
            reference_id: j.id,
            reference_type: 'medical_judgment',
            due_date: j.valid_until,
          });
        }
      }
    }

    // Check medical protocols for periodic review (active protocols with periodicity)
    // Reminder triggered when no visit has been recorded for the periodicity window
    const { data: activeProtocols, error: protocolsError } = await supabase
      .from('medical_protocols')
      .select('id, name, periodicity_months, contact_id, user_id, updated_at')
      .eq('is_active', true)
      .not('periodicity_months', 'is', null);

    if (protocolsError) {
      console.error('Error fetching medical protocols:', protocolsError);
    } else {
      console.log(`Checking ${activeProtocols?.length || 0} active medical protocols for review`);
      for (const p of activeProtocols || []) {
        if (!medicinaUserIds.has(p.user_id)) continue;
        if (!p.periodicity_months) continue;

        const reviewDate = new Date(p.updated_at);
        reviewDate.setMonth(reviewDate.getMonth() + p.periodicity_months);
        const daysUntilReview = Math.ceil((reviewDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

        // Notify only if review is due within 30 days or already overdue (up to 60 days late)
        if (daysUntilReview > 30 || daysUntilReview < -60) continue;

        const { data: existingReminder } = await supabase
          .from('reminders')
          .select('id')
          .eq('reference_id', p.id)
          .eq('reference_type', 'medical_protocol')
          .eq('is_completed', false)
          .maybeSingle();

        if (!existingReminder) {
          const isOverdue = daysUntilReview < 0;
          remindersToCreate.push({
            user_id: p.user_id,
            title: isOverdue
              ? `⚠️ Protocollo "${p.name}" da revisionare (scaduto da ${Math.abs(daysUntilReview)}g)`
              : `📋 Protocollo "${p.name}" da revisionare tra ${daysUntilReview}g`,
            description: `Il protocollo sanitario "${p.name}" richiede una revisione periodica (ogni ${p.periodicity_months} mesi). ${isOverdue ? 'Revisione in ritardo.' : 'Pianifica la revisione.'}`,
            type: 'medical_protocol_review',
            reference_id: p.id,
            reference_type: 'medical_protocol',
            due_date: reviewDate.toISOString().split('T')[0],
          });
        }
      }
    }

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
