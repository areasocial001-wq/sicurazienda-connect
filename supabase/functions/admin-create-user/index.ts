import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CreateUserRequest {
  email: string;
  password: string;
  fullName?: string;
  companyName?: string;
  role?: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get the authorization header to verify admin status
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      console.error("Missing authorization header");
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create Supabase client with service role for admin operations
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // First verify the requester is authenticated and is an admin
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user: requestingUser }, error: authError } = await userClient.auth.getUser();
    if (authError || !requestingUser) {
      console.error("Auth error:", authError);
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if requesting user is admin
    const { data: roleData, error: roleError } = await userClient
      .from("user_roles")
      .select("role")
      .eq("user_id", requestingUser.id)
      .single();

    if (roleError || roleData?.role !== "admin") {
      console.error("Role check failed:", roleError, roleData);
      return new Response(
        JSON.stringify({ error: "Only admins can create users" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse request body
    const { email, password, fullName, companyName, role }: CreateUserRequest = await req.json();

    if (!email || !password) {
      return new Response(
        JSON.stringify({ error: "Email and password are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (typeof email !== 'string' || !emailRegex.test(email) || email.length > 255) {
      return new Response(
        JSON.stringify({ error: "Invalid email format" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate password length
    if (typeof password !== 'string' || password.length < 6 || password.length > 128) {
      return new Response(
        JSON.stringify({ error: "Password must be between 6 and 128 characters" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate and sanitize optional fields
    const sanitizedFullName = typeof fullName === 'string' ? fullName.slice(0, 200).trim() : '';
    const sanitizedCompanyName = typeof companyName === 'string' ? companyName.slice(0, 200).trim() : '';

    // Create admin client with service role
    const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Create user with email confirmation already set
    const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm email since admin is creating
      user_metadata: {
        full_name: sanitizedFullName,
        company_name: sanitizedCompanyName
      }
    });

    if (createError) {
      console.error("Error creating user:", createError);
      return new Response(
        JSON.stringify({ error: createError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("User created successfully:", newUser.user.id);

    // Create profile for the new user
    const { error: profileError } = await adminClient
      .from("profiles")
      .insert({
        id: newUser.user.id,
        user_id: newUser.user.id,
        full_name: sanitizedFullName || null,
        company_name: sanitizedCompanyName || null,
      });

    if (profileError) {
      console.error("Error creating profile:", profileError);
      // Don't fail the whole operation, just log
    }

    // Assign role if specified (default to 'user')
    const userRole = role || 'user';
    const validRoles = ['admin', 'user', 'contabilita', 'area_tecnica', 'gestione_corsi', 'consulenti_tecnici'];
    
    if (validRoles.includes(userRole)) {
      const { error: roleInsertError } = await adminClient
        .from("user_roles")
        .insert({
          user_id: newUser.user.id,
          role: userRole
        });

      if (roleInsertError) {
        console.error("Error assigning role:", roleInsertError);
        // Don't fail the whole operation, just log
      }
    }

    // Log the action to audit_logs
    await adminClient.rpc('log_audit_event', {
      p_user_id: requestingUser.id,
      p_action: 'user_created',
      p_target_user_id: newUser.user.id,
      p_details: { 
        created_email: email,
        full_name: fullName || null,
        company_name: companyName || null,
        role: userRole
      }
    });

    console.log("User creation completed successfully");

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "User created successfully",
        user: { 
          id: newUser.user.id, 
          email: newUser.user.email,
          fullName: fullName || null,
          companyName: companyName || null,
          role: userRole
        }
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in admin-create-user function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
