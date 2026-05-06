import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Trash2, Send, MessageSquare } from 'lucide-react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { toast } from 'sonner';

interface Comment {
  id: string;
  user_id: string;
  author_name: string | null;
  content: string;
  created_at: string;
}

export function CalendarEventComments({ eventId }: { eventId: string }) {
  const { user } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);

  const load = async () => {
    const { data, error } = await supabase
      .from('calendar_event_comments')
      .select('*')
      .eq('event_id', eventId)
      .order('created_at', { ascending: true });
    if (!error) setComments((data as Comment[]) || []);
  };

  useEffect(() => {
    if (!eventId) return;
    load();
    const channel = supabase
      .channel(`event_comments_${eventId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'calendar_event_comments', filter: `event_id=eq.${eventId}` },
        () => load()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]);

  const send = async () => {
    if (!text.trim() || !user) return;
    setLoading(true);
    const { data: profile } = await supabase
      .from('profiles').select('full_name').eq('id', user.id).single();
    const { error } = await supabase.from('calendar_event_comments').insert({
      event_id: eventId,
      user_id: user.id,
      author_name: profile?.full_name || null,
      content: text.trim(),
    });
    setLoading(false);
    if (error) {
      toast.error('Errore invio commento');
    } else {
      setText('');
    }
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from('calendar_event_comments').delete().eq('id', id);
    if (error) toast.error('Errore eliminazione');
  };

  return (
    <div className="space-y-3 border-t pt-4 mt-2">
      <div className="flex items-center gap-2 text-sm font-medium">
        <MessageSquare className="h-4 w-4" /> Commenti staff ({comments.length})
      </div>
      <div className="max-h-[200px] overflow-y-auto space-y-2">
        {comments.length === 0 && (
          <p className="text-xs text-muted-foreground">Nessun commento</p>
        )}
        {comments.map((c) => (
          <div key={c.id} className="bg-muted/50 rounded-md p-2 text-sm">
            <div className="flex items-center justify-between mb-1">
              <span className="font-medium text-xs">{c.author_name || 'Utente'}</span>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-muted-foreground">
                  {format(new Date(c.created_at), 'd MMM HH:mm', { locale: it })}
                </span>
                {c.user_id === user?.id && (
                  <button onClick={() => remove(c.id)} className="text-muted-foreground hover:text-destructive">
                    <Trash2 className="h-3 w-3" />
                  </button>
                )}
              </div>
            </div>
            <p className="whitespace-pre-wrap text-xs">{c.content}</p>
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Scrivi un commento per lo staff..."
          rows={2}
          className="text-sm"
        />
        <Button size="icon" onClick={send} disabled={loading || !text.trim()}>
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}