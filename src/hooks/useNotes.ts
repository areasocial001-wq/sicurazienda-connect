import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export interface Note {
  id: string;
  user_id: string;
  notebook_id: string | null;
  contact_id: string | null;
  title: string;
  content: string;
  tags: string[];
  is_pinned: boolean;
  is_archived: boolean;
  color: string | null;
  created_at: string;
  updated_at: string;
  contact?: { name: string; company: string | null } | null;
}

export interface Notebook {
  id: string;
  user_id: string;
  name: string;
  color: string;
  icon: string;
  created_at: string;
  updated_at: string;
}

export interface NoteAttachment {
  id: string;
  note_id: string;
  user_id: string;
  file_name: string;
  file_path: string;
  file_type: string | null;
  file_size: number | null;
  created_at: string;
}

export function useNotes() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedNotebook, setSelectedNotebook] = useState<string | null>(null);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);

  // Fetch notebooks
  const { data: notebooks = [], isLoading: notebooksLoading } = useQuery({
    queryKey: ['notebooks', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notebooks')
        .select('*')
        .order('name');
      if (error) throw error;
      return data as Notebook[];
    },
    enabled: !!user,
  });

  // Fetch notes
  const { data: notes = [], isLoading: notesLoading } = useQuery({
    queryKey: ['notes', user?.id, showArchived],
    queryFn: async () => {
      let query = supabase
        .from('notes')
        .select('*, crm_contacts(name, company)')
        .eq('is_archived', showArchived)
        .order('is_pinned', { ascending: false })
        .order('updated_at', { ascending: false });

      const { data, error } = await query;
      if (error) throw error;
      return (data || []).map((n: any) => ({
        ...n,
        tags: n.tags || [],
        contact: n.crm_contacts || null,
      })) as Note[];
    },
    enabled: !!user,
  });

  // Fetch attachments for a note
  const fetchAttachments = useCallback(async (noteId: string) => {
    const { data, error } = await supabase
      .from('note_attachments')
      .select('*')
      .eq('note_id', noteId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data as NoteAttachment[];
  }, []);

  // Create notebook
  const createNotebook = useMutation({
    mutationFn: async (data: { name: string; color?: string; icon?: string }) => {
      const { data: result, error } = await supabase
        .from('notebooks')
        .insert({ ...data, user_id: user!.id })
        .select()
        .single();
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notebooks'] });
      toast.success('Quaderno creato');
    },
    onError: () => toast.error('Errore nella creazione del quaderno'),
  });

  // Delete notebook
  const deleteNotebook = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('notebooks').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notebooks'] });
      queryClient.invalidateQueries({ queryKey: ['notes'] });
      toast.success('Quaderno eliminato');
    },
    onError: () => toast.error('Errore nell\'eliminazione'),
  });

  // Create note
  const createNote = useMutation({
    mutationFn: async (data: Partial<Note>) => {
      const { data: result, error } = await supabase
        .from('notes')
        .insert({
          title: data.title || 'Nota senza titolo',
          content: data.content || '',
          notebook_id: data.notebook_id || null,
          contact_id: data.contact_id || null,
          tags: data.tags || [],
          color: data.color || null,
          user_id: user!.id,
        })
        .select()
        .single();
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes'] });
    },
    onError: () => toast.error('Errore nella creazione della nota'),
  });

  // Update note
  const updateNote = useMutation({
    mutationFn: async ({ id, ...data }: Partial<Note> & { id: string }) => {
      const { error } = await supabase
        .from('notes')
        .update(data)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes'] });
    },
    onError: () => toast.error('Errore nel salvataggio'),
  });

  // Delete note
  const deleteNote = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('notes').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes'] });
      toast.success('Nota eliminata');
    },
    onError: () => toast.error('Errore nell\'eliminazione'),
  });

  // Upload attachment
  const uploadAttachment = useCallback(async (noteId: string, file: File) => {
    if (!user) return null;
    const filePath = `${user.id}/${noteId}/${Date.now()}_${file.name}`;
    
    const { error: uploadError } = await supabase.storage
      .from('note-attachments')
      .upload(filePath, file);
    if (uploadError) throw uploadError;

    const { data, error } = await supabase
      .from('note_attachments')
      .insert({
        note_id: noteId,
        user_id: user.id,
        file_name: file.name,
        file_path: filePath,
        file_type: file.type,
        file_size: file.size,
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  }, [user]);

  // Delete attachment
  const deleteAttachment = useCallback(async (attachment: NoteAttachment) => {
    await supabase.storage.from('note-attachments').remove([attachment.file_path]);
    const { error } = await supabase.from('note_attachments').delete().eq('id', attachment.id);
    if (error) throw error;
  }, []);

  // Get signed URL for attachment
  const getAttachmentUrl = useCallback(async (filePath: string) => {
    const { data, error } = await supabase.storage
      .from('note-attachments')
      .createSignedUrl(filePath, 3600);
    if (error) throw error;
    return data.signedUrl;
  }, []);

  // Filtered notes
  const filteredNotes = notes.filter(note => {
    if (selectedNotebook && note.notebook_id !== selectedNotebook) return false;
    if (selectedTag && !note.tags.includes(selectedTag)) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return note.title.toLowerCase().includes(q) || note.content.toLowerCase().includes(q);
    }
    return true;
  });

  // All tags
  const allTags = [...new Set(notes.flatMap(n => n.tags))].sort();

  return {
    notes: filteredNotes,
    allNotes: notes,
    notebooks,
    allTags,
    isLoading: notesLoading || notebooksLoading,
    searchQuery, setSearchQuery,
    selectedNotebook, setSelectedNotebook,
    selectedTag, setSelectedTag,
    showArchived, setShowArchived,
    createNotebook, deleteNotebook,
    createNote, updateNote, deleteNote,
    fetchAttachments, uploadAttachment, deleteAttachment, getAttachmentUrl,
  };
}
