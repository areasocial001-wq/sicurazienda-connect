import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface GenerateSignedUrlRequest {
  filePath: string;
  expiresIn?: number; // seconds, default 7 days
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

    const { filePath, expiresIn = 604800 }: GenerateSignedUrlRequest = await req.json();

    if (!filePath) {
      return new Response(
        JSON.stringify({ error: "filePath is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Generating signed URL for: ${filePath}, expires in: ${expiresIn}s`);

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

    console.log("Signed URL generated successfully");

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
