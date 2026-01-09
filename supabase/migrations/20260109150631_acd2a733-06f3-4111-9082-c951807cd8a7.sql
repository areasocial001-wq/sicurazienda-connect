-- Rimuovere la policy ricorsiva problematica
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;

-- Creare nuova policy usando la funzione security definer (evita ricorsione)
CREATE POLICY "Admins can view all roles (safe)" 
ON public.user_roles 
FOR SELECT 
TO authenticated
USING (
  auth.uid() = user_id 
  OR 
  public.has_role(auth.uid(), 'admin')
);