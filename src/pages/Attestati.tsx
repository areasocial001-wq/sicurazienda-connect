import { useState, useEffect } from "react";
import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";
import AuthModal from "@/components/AuthModal";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { 
  Lock,
  Award,
  Download,
  FileText,
  AlertTriangle,
  User
} from "lucide-react";

const Attestati = () => {
  const { user, loading } = useAuth();
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [attestati, setAttestati] = useState<any[]>([]);
  const [loadingAttestati, setLoadingAttestati] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      fetchAttestati();
    }
  }, [user]);

  const fetchAttestati = async () => {
    try {
      setLoadingAttestati(true);
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('category', 'attestato')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAttestati(data || []);
    } catch (error) {
      console.error('Error fetching attestati:', error);
    } finally {
      setLoadingAttestati(false);
    }
  };

  const handleDownload = async (filePath: string, fileName: string) => {
    try {
      const { data, error } = await supabase.storage
        .from('documents')
        .download(filePath);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "Download completato",
        description: `${fileName} scaricato con successo.`,
      });
    } catch (error: any) {
      toast({
        title: "Errore download",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Caricamento...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        
        <main className="container mx-auto p-4 pb-20">
          <div className="text-center mb-6">
            <Lock className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
            <h2 className="text-2xl font-bold mb-2">Area Attestati Riservata</h2>
            <p className="text-muted-foreground">
              Scarica i tuoi attestati di formazione
            </p>
          </div>

          <Alert className="mb-6">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Per accedere all'area attestati è necessario effettuare l'accesso.
            </AlertDescription>
          </Alert>

          <div className="text-center">
            <Button onClick={() => setAuthModalOpen(true)} size="lg">
              <User className="h-5 w-5 mr-2" />
              Accedi / Registrati
            </Button>
          </div>

          <AuthModal 
            open={authModalOpen} 
            onOpenChange={setAuthModalOpen} 
          />
        </main>
        
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto p-4 pb-20">
        <div className="text-center mb-6">
          <Award className="h-12 w-12 mx-auto mb-3 text-primary" />
          <h2 className="text-2xl font-bold mb-2">I Tuoi Attestati</h2>
          <p className="text-muted-foreground">
            Scarica gli attestati dei corsi completati
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5" />
              Attestati Disponibili
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingAttestati ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-muted-foreground">Caricamento attestati...</p>
              </div>
            ) : attestati.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p className="font-medium">Nessun attestato disponibile</p>
                <p className="text-sm mt-1">
                  Gli attestati dei corsi completati appariranno qui
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {attestati.map((attestato) => (
                  <div 
                    key={attestato.id} 
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-primary/10 rounded-full">
                        <Award className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <span className="font-medium block">{attestato.name}</span>
                        <span className="text-sm text-muted-foreground">
                          {new Date(attestato.created_at).toLocaleDateString('it-IT', {
                            day: '2-digit',
                            month: 'long',
                            year: 'numeric'
                          })}
                        </span>
                      </div>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleDownload(attestato.file_path, attestato.name)}
                    >
                      <Download className="h-4 w-4 mr-1" />
                      Scarica
                    </Button>
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

export default Attestati;
