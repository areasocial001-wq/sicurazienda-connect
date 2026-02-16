import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { NotebookPen, Plus, Pin, ExternalLink } from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";

interface ContactNote {
  id: string;
  title: string;
  content: string;
  tags: string[];
  is_pinned: boolean;
  color: string | null;
  updated_at: string;
  created_at: string;
}

interface ContactNotesProps {
  contactId: string;
}

const stripHtml = (html: string) => {
  const tmp = document.createElement("div");
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || "";
};

const ContactNotes = ({ contactId }: ContactNotesProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [notes, setNotes] = useState<ContactNote[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!contactId || !user) return;
    const fetchNotes = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("notes")
        .select("id, title, content, tags, is_pinned, color, updated_at, created_at")
        .eq("contact_id", contactId)
        .eq("user_id", user.id)
        .order("is_pinned", { ascending: false })
        .order("updated_at", { ascending: false });
      if (!error) setNotes(data || []);
      setLoading(false);
    };
    fetchNotes();
  }, [contactId, user]);

  const handleCreateNote = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from("notes")
      .insert({ title: "Nota senza titolo", content: "", user_id: user.id, contact_id: contactId })
      .select()
      .single();
    if (!error && data) {
      navigate(`/notes?noteId=${data.id}`);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <NotebookPen className="h-5 w-5 text-primary" />
            SicurNote ({notes.length})
          </CardTitle>
          <div className="flex gap-1">
            <Button variant="outline" size="sm" onClick={handleCreateNote}>
              <Plus className="h-3.5 w-3.5 mr-1" /> Nuova nota
            </Button>
            <Button variant="ghost" size="sm" onClick={() => navigate("/notes")}>
              <ExternalLink className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-muted-foreground py-3 text-center">Caricamento...</p>
        ) : notes.length === 0 ? (
          <p className="text-sm text-muted-foreground py-3 text-center">
            Nessuna nota collegata a questo contatto
          </p>
        ) : (
          <ScrollArea className="max-h-[300px]">
            <div className="space-y-2">
              {notes.map(note => (
                <button
                  key={note.id}
                  onClick={() => navigate(`/notes?noteId=${note.id}`)}
                  className="w-full text-left p-2.5 rounded-md border border-border hover:bg-muted/50 transition-colors"
                  style={note.color ? { borderLeftColor: note.color, borderLeftWidth: 3 } : {}}
                >
                  <div className="flex items-center gap-1.5 mb-0.5">
                    {note.is_pinned && <Pin className="h-3 w-3 text-primary" />}
                    <span className="text-sm font-medium truncate">{note.title}</span>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {stripHtml(note.content) || "Nota vuota"}
                  </p>
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className="text-[10px] text-muted-foreground">
                      {format(new Date(note.updated_at), "dd MMM yyyy", { locale: it })}
                    </span>
                    {note.tags?.slice(0, 2).map(tag => (
                      <Badge key={tag} variant="outline" className="text-[9px] px-1 py-0 h-3.5">{tag}</Badge>
                    ))}
                  </div>
                </button>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
};

export default ContactNotes;
