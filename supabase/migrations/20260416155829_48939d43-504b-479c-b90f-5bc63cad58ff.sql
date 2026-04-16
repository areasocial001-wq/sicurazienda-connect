
-- =============================================
-- 1. FIX QR CODES: restrict public SELECT
-- =============================================
DROP POLICY IF EXISTS "Public can view specific QR code by ID for redirect" ON public.qr_codes;

CREATE POLICY "Public can view active QR codes for redirect"
ON public.qr_codes
FOR SELECT
TO public
USING (
  is_active = true
  AND (expires_at IS NULL OR expires_at > now())
);

-- =============================================
-- 2. FIX USER_ROLES: use has_role() function
-- =============================================

-- Drop old public SELECT policy
DROP POLICY IF EXISTS "Users can view own role" ON public.user_roles;

-- Drop self-referential INSERT/UPDATE/DELETE policies
DROP POLICY IF EXISTS "Only admins can assign roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can update roles, users can view own" ON public.user_roles;
DROP POLICY IF EXISTS "Only admins can delete roles" ON public.user_roles;

-- Recreate INSERT: admins via has_role() + service_role for signup triggers
CREATE POLICY "Only admins can assign roles"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::app_role)
);

-- Allow service_role to insert (needed for signup trigger)
CREATE POLICY "Service role can insert roles"
ON public.user_roles
FOR INSERT
TO service_role
WITH CHECK (true);

-- Recreate UPDATE with has_role()
CREATE POLICY "Only admins can update roles"
ON public.user_roles
FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
);

-- Recreate DELETE with has_role()
CREATE POLICY "Only admins can delete roles"
ON public.user_roles
FOR DELETE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
);
