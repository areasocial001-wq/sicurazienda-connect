
-- Add comment_notifications table
CREATE TABLE public.note_comment_notifications (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  note_id uuid NOT NULL REFERENCES public.notes(id) ON DELETE CASCADE,
  comment_id uuid NOT NULL REFERENCES public.note_comments(id) ON DELETE CASCADE,
  commenter_name text,
  note_title text,
  comment_preview text,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.note_comment_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own comment notifications"
  ON public.note_comment_notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own comment notifications"
  ON public.note_comment_notifications FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own comment notifications"
  ON public.note_comment_notifications FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert comment notifications"
  ON public.note_comment_notifications FOR INSERT
  WITH CHECK (true);

CREATE INDEX idx_note_comment_notifications_user ON public.note_comment_notifications(user_id);

-- Trigger: notify all collaborators when a comment is added
CREATE OR REPLACE FUNCTION public.notify_note_comment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_note_title text;
  v_note_owner_id uuid;
  v_commenter_name text;
  v_preview text;
  v_target_id uuid;
BEGIN
  SELECT title, user_id INTO v_note_title, v_note_owner_id FROM notes WHERE id = NEW.note_id;
  SELECT full_name INTO v_commenter_name FROM profiles WHERE id = NEW.user_id;
  v_preview := LEFT(NEW.content, 100);

  -- Notify note owner if commenter is not the owner
  IF v_note_owner_id IS NOT NULL AND v_note_owner_id != NEW.user_id THEN
    INSERT INTO note_comment_notifications (user_id, note_id, comment_id, commenter_name, note_title, comment_preview)
    VALUES (v_note_owner_id, NEW.note_id, NEW.id, COALESCE(v_commenter_name, 'Un utente'), v_note_title, v_preview);
  END IF;

  -- Notify all shared users except the commenter
  FOR v_target_id IN
    SELECT shared_with_user_id FROM note_shares 
    WHERE note_id = NEW.note_id 
    AND shared_with_user_id IS NOT NULL 
    AND shared_with_user_id != NEW.user_id
  LOOP
    INSERT INTO note_comment_notifications (user_id, note_id, comment_id, commenter_name, note_title, comment_preview)
    VALUES (v_target_id, NEW.note_id, NEW.id, COALESCE(v_commenter_name, 'Un utente'), v_note_title, v_preview);
  END LOOP;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_note_comment_added
  AFTER INSERT ON public.note_comments
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_note_comment();

-- Enable realtime on the new table
ALTER PUBLICATION supabase_realtime ADD TABLE public.note_comment_notifications;
