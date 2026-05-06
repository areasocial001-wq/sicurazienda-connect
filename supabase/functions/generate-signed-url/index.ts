import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface GenerateSignedUrlRequest {
  filePath: string;
  qrCodeId?: string; // Required for public access - validates against active QR code
  expiresIn?: number; // seconds, default 1 hour for QR access
}

serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { filePath, qrCodeId, expiresIn = 3600 }: GenerateSignedUrlRequest = await req.json();

    // Capture client metadata for audit log
    const forwardedFor = req.headers.get("x-forwarded-for");
    const realIp = req.headers.get("x-real-ip");
    const cfConnectingIp = req.headers.get("cf-connecting-ip");
    const clientIp = cfConnectingIp || (forwardedFor?.split(',')[0]?.trim()) || realIp || null;
    const userAgent = req.headers.get("user-agent")?.slice(0, 500) || null;

    const logAccess = async (params: {
      documentId?: string | null;
      accessType: string;
      userId?: string | null;
      qrId?: string | null;
      details?: Record<string, unknown>;
    }) => {
      try {
        await supabase.from("document_access_logs").insert({
          document_id: params.documentId ?? null,
          file_path: filePath,
          qr_code_id: params.qrId ?? null,
          user_id: params.userId ?? null,
          access_type: params.accessType,
          ip_address: clientIp,
          user_agent: userAgent,
          details: params.details ?? {},
        });
      } catch (e) {
        console.error("Failed to log document access:", e);
      }
    };

    if (!filePath) {
      return new Response(
        JSON.stringify({ error: "filePath is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check for authenticated user via Authorization header
    const authHeader = req.headers.get("authorization");
    let isAuthenticated = false;
    let userId: string | null = null;

    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.replace("Bearer ", "");
      // Use anon key to validate the JWT token
      const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || supabaseServiceKey;
      const userClient = createClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: `Bearer ${token}` } }
      });
      
      const { data: { user }, error: userError } = await userClient.auth.getUser();
      if (user && !userError) {
        isAuthenticated = true;
        userId = user.id;
      }
    }

    // If authenticated, check if user owns the document
    if (isAuthenticated && userId) {
      const { data: document, error: docError } = await supabase
        .from("documents")
        .select("id, user_id")
        .eq("file_path", filePath)
        .maybeSingle();

      if (document) {
        // User owns the document OR is admin
        const { data: userRole } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", userId)
          .single();

        const isAdmin = userRole?.role === "admin";
        const isOwner = document.user_id === userId;

        if (isOwner || isAdmin) {
          console.log(`Authenticated access granted for: ${filePath}`);
          const { data, error } = await supabase.storage
            .from("documents")
            .createSignedUrl(filePath, expiresIn);

          if (error) {
            console.error("Error creating signed URL:", error);
            return new Response(
              JSON.stringify({ error: error.message }),
              { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }

          await logAccess({
            documentId: document.id,
            accessType: "authenticated",
            userId,
            details: { isAdmin, isOwner, expiresIn },
          });

          return new Response(
            JSON.stringify({ 
              signedUrl: data.signedUrl,
              expiresAt: new Date(Date.now() + expiresIn * 1000).toISOString()
            }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }
    }

    // For unauthenticated access, REQUIRE a valid QR code ID
    if (!qrCodeId) {
      console.log("Unauthenticated request without qrCodeId - access denied");
      return new Response(
        JSON.stringify({ error: "Unauthorized: qrCodeId required for public access" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate that the QR code exists, is active, not expired, and matches the file path
    console.log(`Validating QR code: ${qrCodeId} for file: ${filePath}`);
    
    const { data: qrCode, error: qrError } = await supabase
      .from("qr_codes")
      .select("id, document_id, is_active, expires_at")
      .eq("id", qrCodeId)
      .maybeSingle();

    if (qrError || !qrCode) {
      console.error("QR code not found:", qrCodeId);
      return new Response(
        JSON.stringify({ error: "Invalid QR code" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if QR code is active
    if (!qrCode.is_active) {
      console.log("QR code is disabled:", qrCodeId);
      return new Response(
        JSON.stringify({ error: "QR code is disabled" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if QR code is expired
    if (qrCode.expires_at && new Date(qrCode.expires_at) < new Date()) {
      console.log("QR code is expired:", qrCodeId);
      return new Response(
        JSON.stringify({ error: "QR code is expired" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify the file path matches the document associated with the QR code
    const { data: document, error: docError } = await supabase
      .from("documents")
      .select("id, file_path")
      .eq("id", qrCode.document_id)
      .maybeSingle();

    if (docError || !document) {
      console.error("Document not found for QR code:", qrCode.document_id);
      return new Response(
        JSON.stringify({ error: "Document not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate that the requested file path matches the document's file path
    if (document.file_path !== filePath) {
      console.error("File path mismatch. Requested:", filePath, "Expected:", document.file_path);
      return new Response(
        JSON.stringify({ error: "Unauthorized: file path does not match QR code document" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`QR code validated. Generating signed URL for: ${filePath}`);

    const { data, error } = await supabase.storage
      .from("documents")
      .createSignedUrl(filePath, expiresIn);

    if (error) {
      console.error("Error creating signed URL:", error);
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Signed URL generated successfully via QR code validation");

    await logAccess({
      documentId: document.id,
      accessType: "qr_signed_url",
      qrId: qrCodeId,
      details: { expiresIn },
    });

    return new Response(
      JSON.stringify({ 
        signedUrl: data.signedUrl,
        expiresAt: new Date(Date.now() + expiresIn * 1000).toISOString()
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in generate-signed-url:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
