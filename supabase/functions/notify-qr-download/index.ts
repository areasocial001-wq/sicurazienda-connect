import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotifyQRDownloadRequest {
  qrCodeId: string;
  userAgent?: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { qrCodeId, userAgent }: NotifyQRDownloadRequest = await req.json();

    console.log("[notify-qr-download] Processing notification for QR:", qrCodeId);

    // Create Supabase client with service role to bypass RLS
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Get QR code info and owner
    const { data: qrCode, error: qrError } = await supabaseAdmin
      .from("qr_codes")
      .select("id, document_name, created_by, document_id")
      .eq("id", qrCodeId)
      .single();

    if (qrError || !qrCode) {
      console.error("[notify-qr-download] QR code not found:", qrError);
      return new Response(
        JSON.stringify({ success: false, error: "QR code not found" }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log("[notify-qr-download] QR code found:", qrCode.document_name, "Owner:", qrCode.created_by);

    // Determine device type from user agent
    let deviceInfo = "dispositivo sconosciuto";
    if (userAgent) {
      if (/iPhone|iPad|iPod/i.test(userAgent)) {
        deviceInfo = "dispositivo iOS";
      } else if (/Android/i.test(userAgent)) {
        deviceInfo = "dispositivo Android";
      } else if (/Windows/i.test(userAgent)) {
        deviceInfo = "PC Windows";
      } else if (/Mac/i.test(userAgent)) {
        deviceInfo = "Mac";
      } else if (/Linux/i.test(userAgent)) {
        deviceInfo = "Linux";
      }
    }

    // Create notification/reminder for the document owner
    const { data: reminder, error: reminderError } = await supabaseAdmin
      .from("reminders")
      .insert({
        user_id: qrCode.created_by,
        title: `📲 Download: ${qrCode.document_name}`,
        description: `Qualcuno ha scaricato il documento tramite QR code da un ${deviceInfo}`,
        type: "qr_download",
        reference_id: qrCode.document_id,
        reference_type: "document",
        due_date: new Date().toISOString(),
        is_read: false,
        is_completed: false,
      })
      .select()
      .single();

    if (reminderError) {
      console.error("[notify-qr-download] Error creating reminder:", reminderError);
      return new Response(
        JSON.stringify({ success: false, error: reminderError.message }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log("[notify-qr-download] Notification created:", reminder.id);

    return new Response(
      JSON.stringify({ success: true, reminderId: reminder.id }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("[notify-qr-download] Error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
