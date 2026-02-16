
-- Auto-resolve shared_with_user_id: when a user logs in, match their email to pending shares
-- We create a function that can be called to resolve unlinked shares for a given user
CREATE OR REPLACE FUNCTION public.resolve_note_shares_for_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- When a new profile is created (user signs up), resolve any pending shares
  UPDATE note_shares
  SET shared_with_user_id = NEW.id
  WHERE shared_with_email = (
    SELECT email FROM auth.users WHERE id = NEW.id
  )
  AND shared_with_user_id IS NULL;
  
  RETURN NEW;
END;
$$;

-- Trigger on profiles insert (new user signup)
CREATE TRIGGER resolve_shares_on_signup
AFTER INSERT ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.resolve_note_shares_for_user();

-- Also create a function to resolve on-demand (callable from client after login)
CREATE OR REPLACE FUNCTION public.resolve_my_note_shares()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  user_email text;
BEGIN
  SELECT email INTO user_email FROM auth.users WHERE id = auth.uid();
  
  IF user_email IS NOT NULL THEN
    UPDATE note_shares
    SET shared_with_user_id = auth.uid()
    WHERE shared_with_email = user_email
    AND shared_with_user_id IS NULL;
  END IF;
END;
$$;

-- Create notifications table for share events
CREATE TABLE public.note_share_notifications (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  note_id uuid NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
  shared_by_user_id uuid NOT NULL,
  shared_by_name text,
  note_title text,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.note_share_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications"
ON public.note_share_notifications FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications"
ON public.note_share_notifications FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own notifications"
ON public.note_share_notifications FOR DELETE
USING (auth.uid() = user_id);

CREATE POLICY "System can insert notifications"
ON public.note_share_notifications FOR INSERT
WITH CHECK (true);

-- Trigger: when a note_share is created, generate a notification for the recipient
CREATE OR REPLACE FUNCTION public.notify_note_share()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_note_title text;
  v_sharer_name text;
  v_target_user_id uuid;
BEGIN
  -- Get note title
  SELECT title INTO v_note_title FROM notes WHERE id = NEW.note_id;
  
  -- Get sharer name
  SELECT full_name INTO v_sharer_name FROM profiles WHERE id = NEW.owner_id;
  
  -- Find target user by email if shared_with_user_id is null
  IF NEW.shared_with_user_id IS NOT NULL THEN
    v_target_user_id := NEW.shared_with_user_id;
  ELSE
    SELECT id INTO v_target_user_id FROM auth.users WHERE email = NEW.shared_with_email;
  END IF;
  
  -- Only create notification if we found the user
  IF v_target_user_id IS NOT NULL THEN
    -- Also resolve the user_id on the share itself
    IF NEW.shared_with_user_id IS NULL THEN
      UPDATE note_shares SET shared_with_user_id = v_target_user_id WHERE id = NEW.id;
    END IF;
    
    INSERT INTO note_share_notifications (user_id, note_id, shared_by_user_id, shared_by_name, note_title)
    VALUES (v_target_user_id, NEW.note_id, NEW.owner_id, COALESCE(v_sharer_name, 'Un utente'), v_note_title);
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_note_shared
AFTER INSERT ON public.note_shares
FOR EACH ROW
EXECUTE FUNCTION public.notify_note_share();
