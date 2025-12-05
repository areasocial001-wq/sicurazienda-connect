-- Fix the handle_new_user_profile function to use auth.users id for the foreign key
CREATE OR REPLACE FUNCTION public.handle_new_user_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, user_id, full_name, company_name, created_at, updated_at)
  VALUES (
    new.id,  -- Use auth.users id for the foreign key constraint
    new.id,
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'company_name',
    now(),
    now()
  );
  RETURN new;
END;
$$;