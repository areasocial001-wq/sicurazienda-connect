-- Remove ALL existing policies for user_roles table
DROP POLICY IF EXISTS "Users can insert own role" ON public.user_roles;
DROP POLICY IF EXISTS "Only admins can assign roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can update roles, users can view own" ON public.user_roles;
DROP POLICY IF EXISTS "Only admins can delete roles" ON public.user_roles;

-- Create new secure policies for user_roles table
-- Users can only view their own role
CREATE POLICY "Users can view own role" 
ON public.user_roles 
FOR SELECT 
USING (auth.uid() = user_id);

-- Only admins can insert new roles for any user
CREATE POLICY "Only admins can assign roles" 
ON public.user_roles 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
  )
);

-- Allow admins to update any role
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