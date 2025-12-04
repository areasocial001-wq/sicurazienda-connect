import { useState, useEffect } from "react";
import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";
import AuthModal from "@/components/AuthModal";
import QRCodeModal from "@/components/QRCodeModal";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  Lock,
  Database,
  Upload,
  Download,
  FileText,
  AlertTriangle,
  LogOut,
  User,
  Settings,
  QrCode
} from "lucide-react";

const Documents = () => {
  const { user, loading, signOut } = useAuth();
  const { isAdmin, loading: roleLoading } = useUserRole();
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [documents, setDocuments] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const [selectedArea, setSelectedArea] = useState<string>('generale');
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [selectedDocForQR, setSelectedDocForQR] = useState<{ url: string; name: string } | null>(null);
  const { toast } = useToast();

  const areaCompetenza = [
    { value: 'generale', label: 'Generale' },
    { value: 'contabilita', label: 'Contabilità' },
    { value: 'area_tecnica', label: 'Area Tecnica' },
    { value: 'gestione_corsi', label: 'Gestione Corsi' },
    { value: 'consulenti_tecnici', label: 'Consulenti Tecnici' }
  ];

  useEffect(() => {
    if (user) {
      fetchDocuments();
    }
  }, [user]);

  const fetchDocuments = async () => {
    try {
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDocuments(data || []);
    } catch (error) {
      console.error('Error fetching documents:', error);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true);
      
      if (!event.target.files || event.target.files.length === 0) {
        throw new Error('Devi selezionare un file da caricare.');
      }

      const file = event.target.files[0];
      const fileExt = file.name.split('.').pop();
      const filePath = `${user!.id}/${Math.random()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, file);

      if (uploadError) {
        throw uploadError;
      }

      const { error: dbError } = await supabase
        .from('documents')
        .insert({
          user_id: user!.id,
          name: file.name,
          file_path: filePath,
          file_type: file.type,
          category: 'Upload Utente',
          area_competenza: selectedArea
        });

      if (dbError) throw dbError;

      toast({
        title: "Upload completato",
        description: "Il documento è stato caricato con successo.",
      });

      fetchDocuments();
    } catch (error: any) {
      toast({
        title: "Errore upload",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
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
    } catch (error: any) {
      toast({
        title: "Errore download",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleShowQR = (filePath: string, fileName: string) => {
    const { data } = supabase.storage
      .from('documents')
      .getPublicUrl(filePath);
    
    setSelectedDocForQR({ url: data.publicUrl, name: fileName });
    setQrModalOpen(true);
  };

  const handleSignOut = async () => {
    const { error } = await signOut();
    if (!error) {
      toast({
        title: "Disconnessione effettuata",
        description: "A presto!",
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
            <h2 className="text-2xl font-bold mb-2">Area Documenti Riservata</h2>
            <p className="text-muted-foreground">
              Accesso sicuro ai documenti aziendali
            </p>
          </div>

          <Alert className="mb-6">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Per accedere all'area documenti è necessario effettuare l'accesso.
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
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold">Area Documenti</h2>
            <p className="text-muted-foreground">
              Benvenuto, {user.email}
            </p>
          </div>
          <div className="flex gap-2">
            {!roleLoading && isAdmin && (
              <Button 
                variant="default" 
                onClick={() => window.location.href = '/admin'}
              >
                <Settings className="h-4 w-4 mr-2" />
                Dashboard Admin
              </Button>
            )}
            <Button variant="outline" onClick={handleSignOut}>
              <LogOut className="h-4 w-4 mr-2" />
              Esci
            </Button>
          </div>
        </div>

        <Card className="mb-4">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              I Tuoi Documenti
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {documents.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>Nessun documento disponibile</p>
                  <p className="text-sm">Carica il tuo primo documento qui sotto</p>
                </div>
              ) : (
                documents.map((doc) => (
                  <div key={doc.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <FileText className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <span className="font-medium block">{doc.name}</span>
                        <span className="text-sm text-muted-foreground">{doc.category}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleShowQR(doc.file_path, doc.name)}
                        title="Genera QR Code"
                      >
                        <QrCode className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleDownload(doc.file_path, doc.name)}
                      >
                        <Download className="h-4 w-4 mr-1" />
                        Download
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Upload Documenti
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Area di Competenza</label>
                <Select value={selectedArea} onValueChange={setSelectedArea}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleziona area di competenza" />
                  </SelectTrigger>
                  <SelectContent>
                    {areaCompetenza.map((area) => (
                      <SelectItem key={area.value} value={area.value}>
                        {area.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center">
                <Upload className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
                <p className="text-muted-foreground mb-3">
                  Carica i tuoi documenti aziendali
                </p>
                <input
                  type="file"
                  onChange={handleFileUpload}
                  style={{ display: 'none' }}
                  id="file-upload"
                  accept=".pdf,.doc,.docx,.xlsx,.xls,.jpg,.jpeg,.png"
                />
                <Button 
                  variant="outline" 
                  onClick={() => document.getElementById('file-upload')?.click()}
                  disabled={uploading}
                >
                  {uploading ? 'Caricamento...' : 'Seleziona File'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
      
      <BottomNav />
      
      {selectedDocForQR && (
        <QRCodeModal
          open={qrModalOpen}
          onOpenChange={setQrModalOpen}
          url={selectedDocForQR.url}
          fileName={selectedDocForQR.name}
        />
      )}
    </div>
  );
};

export default Documents;