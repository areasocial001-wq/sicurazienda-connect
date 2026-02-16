
-- Create notebooks table
CREATE TABLE public.notebooks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#3b82f6',
  icon TEXT DEFAULT '📓',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.notebooks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notebooks" ON public.notebooks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own notebooks" ON public.notebooks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own notebooks" ON public.notebooks FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own notebooks" ON public.notebooks FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_notebooks_updated_at BEFORE UPDATE ON public.notebooks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create notes table
CREATE TABLE public.notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  notebook_id UUID REFERENCES public.notebooks(id) ON DELETE SET NULL,
  contact_id UUID REFERENCES public.crm_contacts(id) ON DELETE SET NULL,
  title TEXT NOT NULL DEFAULT 'Nota senza titolo',
  content TEXT DEFAULT '',
  tags TEXT[] DEFAULT '{}',
  is_pinned BOOLEAN NOT NULL DEFAULT false,
  is_archived BOOLEAN NOT NULL DEFAULT false,
  color TEXT DEFAULT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notes" ON public.notes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own notes" ON public.notes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own notes" ON public.notes FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own notes" ON public.notes FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_notes_updated_at BEFORE UPDATE ON public.notes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create note_attachments table for multimedia files
CREATE TABLE public.note_attachments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  note_id UUID NOT NULL REFERENCES public.notes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_type TEXT,
  file_size BIGINT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.note_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own attachments" ON public.note_attachments FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own attachments" ON public.note_attachments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own attachments" ON public.note_attachments FOR DELETE USING (auth.uid() = user_id);

-- Create storage bucket for note attachments
INSERT INTO storage.buckets (id, name, public) VALUES ('note-attachments', 'note-attachments', false);

CREATE POLICY "Users can upload own note attachments" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'note-attachments' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can view own note attachments" ON storage.objects FOR SELECT USING (bucket_id = 'note-attachments' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can delete own note attachments" ON storage.objects FOR DELETE USING (bucket_id = 'note-attachments' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Create indexes
CREATE INDEX idx_notes_user_id ON public.notes(user_id);
CREATE INDEX idx_notes_notebook_id ON public.notes(notebook_id);
CREATE INDEX idx_notes_contact_id ON public.notes(contact_id);
CREATE INDEX idx_notes_tags ON public.notes USING GIN(tags);
CREATE INDEX idx_notes_is_pinned ON public.notes(is_pinned) WHERE is_pinned = true;
CREATE INDEX idx_note_attachments_note_id ON public.note_attachments(note_id);
