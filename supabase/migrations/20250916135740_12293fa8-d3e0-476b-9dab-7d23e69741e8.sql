-- Create enum for user roles  
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- Create user_roles table
CREATE TABLE public.user_roles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL DEFAULT 'user',
    created_at timestamp with time zone DEFAULT now(),
    UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check user role
CREATE OR REPLACE FUNCTION public.get_user_role(user_uuid uuid)
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.user_roles WHERE user_id = user_uuid LIMIT 1;
$$;

-- Create function to check if user has specific role
CREATE OR REPLACE FUNCTION public.has_role(user_uuid uuid, role_name app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = user_uuid AND role = role_name
  );
$$;

-- RLS policies for user_roles table
CREATE POLICY "Users can view own role" ON public.user_roles
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own role" ON public.user_roles
FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create trigger to assign default user role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_roles (user_id, role)
  VALUES (new.id, 'user');
  RETURN new;
END;
$$;

CREATE TRIGGER on_auth_user_created_role
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user_role();

-- Update documents table policies to allow admins to see all documents
CREATE POLICY "Admins can view all documents" ON public.documents
FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update all documents" ON public.documents  
FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete all documents" ON public.documents
FOR DELETE USING (public.has_role(auth.uid(), 'admin'));