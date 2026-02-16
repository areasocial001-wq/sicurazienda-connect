
-- Create note_shares table for sharing notes with other users
CREATE TABLE public.note_shares (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  note_id uuid NOT NULL REFERENCES public.notes(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL,
  shared_with_email text NOT NULL,
  shared_with_user_id uuid,
  permission text NOT NULL DEFAULT 'read' CHECK (permission IN ('read', 'write')),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.note_shares ENABLE ROW LEVEL SECURITY;

-- Owner can manage shares
CREATE POLICY "Note owners can view shares"
  ON public.note_shares FOR SELECT
  USING (auth.uid() = owner_id);

CREATE POLICY "Note owners can create shares"
  ON public.note_shares FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Note owners can delete shares"
  ON public.note_shares FOR DELETE
  USING (auth.uid() = owner_id);

CREATE POLICY "Note owners can update shares"
  ON public.note_shares FOR UPDATE
  USING (auth.uid() = owner_id);

-- Shared users can see their shares
CREATE POLICY "Shared users can view their shares"
  ON public.note_shares FOR SELECT
  USING (auth.uid() = shared_with_user_id);

-- Update notes RLS: allow shared users to read
CREATE POLICY "Shared users can view shared notes"
  ON public.notes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.note_shares
      WHERE note_shares.note_id = notes.id
        AND note_shares.shared_with_user_id = auth.uid()
    )
  );

-- Update notes RLS: allow shared users with write permission to update
CREATE POLICY "Shared users with write can update shared notes"
  ON public.notes FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.note_shares
      WHERE note_shares.note_id = notes.id
        AND note_shares.shared_with_user_id = auth.uid()
        AND note_shares.permission = 'write'
    )
  );

-- Allow shared users to view attachments of shared notes
CREATE POLICY "Shared users can view shared note attachments"
  ON public.note_attachments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.note_shares
      WHERE note_shares.note_id = note_attachments.note_id
        AND note_shares.shared_with_user_id = auth.uid()
    )
  );
