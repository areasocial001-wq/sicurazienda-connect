import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RecordScanRequest {
  qrCodeId: string;
  userAgent?: string;
}

interface GeoData {
  country?: string;
  countryCode?: string;
  city?: string;
  region?: string;
}

// Lookup IP geolocation using free ip-api.com service
async function lookupGeo(ip: string): Promise<GeoData> {
  try {
    // Skip private/local IPs
    if (ip.startsWith('10.') || ip.startsWith('192.168.') || ip.startsWith('127.') || ip === '::1') {
      return {};
    }
    
    const response = await fetch(`http://ip-api.com/json/${ip}?fields=status,country,countryCode,regionName,city`);
    if (!response.ok) return {};
    
    const data = await response.json();
    if (data.status !== 'success') return {};
    
    return {
      country: data.country,
      countryCode: data.countryCode,
      city: data.city,
      region: data.regionName,
    };
  } catch (error) {
    console.error('[record-qr-scan] Geo lookup error:', error);
    return {};
  }
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { qrCodeId, userAgent }: RecordScanRequest = await req.json();

    console.log("[record-qr-scan] Recording scan for QR:", qrCodeId);

    // Get client IP from headers
    const forwardedFor = req.headers.get("x-forwarded-for");
    const realIp = req.headers.get("x-real-ip");
    const cfConnectingIp = req.headers.get("cf-connecting-ip");
    
    const clientIp = cfConnectingIp || (forwardedFor?.split(',')[0]?.trim()) || realIp || 'unknown';
    
    console.log("[record-qr-scan] Client IP:", clientIp);

    // Lookup geolocation
    const geoData = await lookupGeo(clientIp);
    console.log("[record-qr-scan] Geo data:", geoData);

    // Create Supabase client with service role to bypass RLS
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Insert scan record with geo data
    const { data: scan, error: scanError } = await supabaseAdmin
      .from("qr_scans")
      .insert({
        qr_code_id: qrCodeId,
        user_agent: userAgent || null,
        ip_address: clientIp !== 'unknown' ? clientIp : null,
        country: geoData.country || null,
        country_code: geoData.countryCode || null,
        city: geoData.city || null,
        region: geoData.region || null,
      })
      .select()
      .single();

    if (scanError) {
      console.error("[record-qr-scan] Error inserting scan:", scanError);
      return new Response(
        JSON.stringify({ success: false, error: scanError.message }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log("[record-qr-scan] Scan recorded:", scan.id);

    // Also send notification to document owner (fire and forget)
    const notifyUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/notify-qr-download`;
    fetch(notifyUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
      },
      body: JSON.stringify({ qrCodeId, userAgent }),
    }).catch(err => console.error('[record-qr-scan] Notify error:', err));

    return new Response(
      JSON.stringify({ success: true, scanId: scan.id }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("[record-qr-scan] Error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
