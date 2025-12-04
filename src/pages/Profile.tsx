import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { 
  User, 
  FileText, 
  Calendar, 
  Trash2, 
  Edit, 
  LogOut,
  ArrowLeft 
} from "lucide-react";

interface FormDraft {
  id: string;
  service_type: string;
  client_type: string;
  form_data: any;
  created_at: string;
  updated_at: string;
}

const Profile = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [drafts, setDrafts] = useState<FormDraft[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate("/");
      return;
    }
    fetchDrafts();
  }, [user, navigate]);

  const fetchDrafts = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('form_drafts')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setDrafts(data || []);
    } catch (error) {
      console.error('Errore caricamento bozze:', error);
      toast({
        title: "Errore",
        description: "Impossibile caricare le bozze.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const deleteDraft = async (draftId: string) => {
    try {
      const { error } = await supabase
        .from('form_drafts')
        .delete()
        .eq('id', draftId);

      if (error) throw error;

      setDrafts(drafts.filter(d => d.id !== draftId));
      toast({
        title: "Bozza eliminata",
        description: "La bozza è stata eliminata con successo.",
      });
    } catch (error) {
      console.error('Errore eliminazione bozza:', error);
      toast({
        title: "Errore",
        description: "Impossibile eliminare la bozza.",
        variant: "destructive",
      });
    }
  };

  const openDraft = (draft: FormDraft) => {
    const title = draft.client_type === "new" 
      ? "Richiesta Contatto - Nuovo Cliente" 
      : "Richiesta Contatto - Già Cliente";
    
    navigate("/contact-request", {
      state: {
        title,
        serviceType: draft.service_type,
        clientType: draft.client_type
      }
    });
  };

  const getServiceLabel = (serviceType: string) => {
    const labels: Record<string, string> = {
      "Per Neo Inserimento": "Neo Inserimento",
      "Rapporto di Fine Lavoro": "Fine Lavoro",
      "Per Ispezione": "Ispezione",
      "Per Assistenza": "Assistenza",
      "Assistenza": "Assistenza",
      "Per Corsi": "Corsi",
      "Per Fondi": "Fondi",
      "Per Documenti": "Documenti",
      "Check-up Gratuito": "Check-up",
      "Altro": "Altro"
    };
    return labels[serviceType] || serviceType;
  };

  const getClientTypeLabel = (clientType: string) => {
    return clientType === "new" ? "Nuovo Cliente" : "Già Cliente";
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto p-4 pb-20">
        <Button 
          variant="ghost" 
          onClick={() => navigate(-1)}
          className="mb-4 flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Indietro
        </Button>

        {/* Info Utente */}
        <Card className="mb-6">
          <CardHeader className="gradient-sicur text-white">
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Il Mio Profilo
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Email</p>
                <p className="font-medium">{user.email}</p>
              </div>
              <Button variant="outline" onClick={handleSignOut} className="flex items-center gap-2">
                <LogOut className="h-4 w-4" />
                Esci
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Lista Bozze */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Le Mie Bozze
              {drafts.length > 0 && (
                <Badge variant="secondary" className="ml-2">{drafts.length}</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">
                Caricamento...
              </div>
            ) : drafts.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Nessuna bozza salvata</p>
                <p className="text-sm mt-1">Le bozze appariranno qui quando salverai un form</p>
              </div>
            ) : (
              <div className="space-y-3">
                {drafts.map((draft) => (
                  <div 
                    key={draft.id} 
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium">{getServiceLabel(draft.service_type)}</span>
                        <Badge variant="outline" className="text-xs">
                          {getClientTypeLabel(draft.client_type)}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                        <Calendar className="h-3 w-3" />
                        <span>
                          Modificata il {new Date(draft.updated_at).toLocaleDateString('it-IT', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      </div>
                      {draft.form_data?.name && (
                        <p className="text-sm text-muted-foreground mt-1 truncate">
                          {draft.form_data.name}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => openDraft(draft)}
                        className="flex items-center gap-1"
                      >
                        <Edit className="h-4 w-4" />
                        <span className="hidden sm:inline">Continua</span>
                      </Button>
                      <Button 
                        size="sm" 
                        variant="ghost"
                        onClick={() => deleteDraft(draft.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
      
      <BottomNav />
    </div>
  );
};

export default Profile;