
-- Comments/threads on shared notes
CREATE TABLE public.note_comments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  note_id uuid NOT NULL REFERENCES public.notes(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  parent_id uuid REFERENCES public.note_comments(id) ON DELETE CASCADE,
  content text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.note_comments ENABLE ROW LEVEL SECURITY;

-- Users can comment on own notes or shared notes
CREATE POLICY "Users can view comments on own notes"
  ON public.note_comments FOR SELECT
  USING (EXISTS (SELECT 1 FROM notes WHERE notes.id = note_comments.note_id AND notes.user_id = auth.uid()));

CREATE POLICY "Users can view comments on shared notes"
  ON public.note_comments FOR SELECT
  USING (EXISTS (SELECT 1 FROM note_shares WHERE note_shares.note_id = note_comments.note_id AND note_shares.shared_with_user_id = auth.uid()));

CREATE POLICY "Users can insert comments on own notes"
  ON public.note_comments FOR INSERT
  WITH CHECK (auth.uid() = user_id AND (
    EXISTS (SELECT 1 FROM notes WHERE notes.id = note_comments.note_id AND notes.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM note_shares WHERE note_shares.note_id = note_comments.note_id AND note_shares.shared_with_user_id = auth.uid())
  ));

CREATE POLICY "Users can update own comments"
  ON public.note_comments FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own comments"
  ON public.note_comments FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Note owners can delete any comment"
  ON public.note_comments FOR DELETE
  USING (EXISTS (SELECT 1 FROM notes WHERE notes.id = note_comments.note_id AND notes.user_id = auth.uid()));

-- Note version history
CREATE TABLE public.note_versions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  note_id uuid NOT NULL REFERENCES public.notes(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  title text NOT NULL,
  content text,
  version_number integer NOT NULL DEFAULT 1,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.note_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view versions of own notes"
  ON public.note_versions FOR SELECT
  USING (EXISTS (SELECT 1 FROM notes WHERE notes.id = note_versions.note_id AND notes.user_id = auth.uid()));

CREATE POLICY "Users can view versions of shared notes"
  ON public.note_versions FOR SELECT
  USING (EXISTS (SELECT 1 FROM note_shares WHERE note_shares.note_id = note_versions.note_id AND note_shares.shared_with_user_id = auth.uid()));

CREATE POLICY "Users can insert versions of own notes"
  ON public.note_versions FOR INSERT
  WITH CHECK (auth.uid() = user_id AND EXISTS (SELECT 1 FROM notes WHERE notes.id = note_versions.note_id AND notes.user_id = auth.uid()));

CREATE POLICY "System can insert versions"
  ON public.note_versions FOR INSERT
  WITH CHECK (true);

-- Trigger to auto-save version on note update
CREATE OR REPLACE FUNCTION public.save_note_version()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_version integer;
BEGIN
  -- Only save version if content or title actually changed
  IF OLD.content IS DISTINCT FROM NEW.content OR OLD.title IS DISTINCT FROM NEW.title THEN
    SELECT COALESCE(MAX(version_number), 0) + 1 INTO v_version
    FROM note_versions WHERE note_id = OLD.id;
    
    INSERT INTO note_versions (note_id, user_id, title, content, version_number)
    VALUES (OLD.id, OLD.user_id, OLD.title, OLD.content, v_version);
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER save_note_version_trigger
  BEFORE UPDATE ON public.notes
  FOR EACH ROW
  EXECUTE FUNCTION public.save_note_version();

-- Indexes
CREATE INDEX idx_note_comments_note_id ON public.note_comments(note_id);
CREATE INDEX idx_note_comments_parent_id ON public.note_comments(parent_id);
CREATE INDEX idx_note_versions_note_id ON public.note_versions(note_id);
