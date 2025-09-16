-- Remove the existing insecure policy for user_roles
DROP POLICY IF EXISTS "Users can insert their own role" ON public.user_roles;

-- Create secure policies for user_roles table
-- Only allow admin users to insert roles for any user
CREATE POLICY "Only admins can assign roles" 
ON public.user_roles 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
  )
);

-- Allow admins to update any role, users can only view their own
CREATE POLICY "Admins can update roles, users can view own" 
ON public.user_roles 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
  )
);

-- Allow admins to delete any role
CREATE POLICY "Only admins can delete roles" 
ON public.user_roles 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
  )
);

-- Ensure there's at least one admin user (insert your admin user)
-- Replace 'your-admin-email@domain.com' with your actual admin email
INSERT INTO public.user_roles (user_id, role) 
SELECT auth.uid(), 'admin'
WHERE auth.email() = 'maxferro66@gmail.com' 
AND NOT EXISTS (
  SELECT 1 FROM public.user_roles 
  WHERE user_id = auth.uid() AND role = 'admin'
);