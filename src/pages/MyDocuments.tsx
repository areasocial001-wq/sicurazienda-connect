import { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { 
  FileText, Download, Folder, Loader2, Lock, User, LogOut,
  File, FileSpreadsheet, FileImage, AlertTriangle
} from 'lucide-react';
import Header from '@/components/Header';
import BottomNav from '@/components/BottomNav';
import AuthModal from '@/components/AuthModal';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ClientDocument {
  id: string;
  name: string;
  file_path: string;
  file_type?: string;
  file_size?: number;
  area: string;
  description?: string;
  created_at: string;
}

const areaLabels: Record<string, string> = {
  contabilita: 'Contabilità',
  area_tecnica: 'Area Tecnica',
  gestione_corsi: 'Gestione Corsi',
  admin: 'Amministrazione',
};

const areaColors: Record<string, string> = {
  contabilita: 'bg-emerald-500/20 text-emerald-700 border-emerald-500/30',
  area_tecnica: 'bg-blue-500/20 text-blue-700 border-blue-500/30',
  gestione_corsi: 'bg-purple-500/20 text-purple-700 border-purple-500/30',
  admin: 'bg-red-500/20 text-red-700 border-red-500/30',
};

const getFileIcon = (fileType?: string) => {
  if (!fileType) return File;
  if (fileType.includes('pdf')) return FileText;
  if (fileType.includes('spreadsheet') || fileType.includes('excel')) return FileSpreadsheet;
  if (fileType.includes('image')) return FileImage;
  return File;
};

const formatFileSize = (bytes?: number) => {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export default function MyDocuments() {
  const { user, loading: authLoading, signOut } = useAuth();
  const { toast } = useToast();
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [documents, setDocuments] = useState<ClientDocument[]>([]);
  const [contactInfo, setContactInfo] = useState<{ name: string; company?: string } | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchDocuments = useCallback(async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      // First, find the contact linked to this user
      const { data: contactData, error: contactError } = await supabase
        .from('crm_contacts')
        .select('id, name, company')
        .eq('client_user_id', user.id)
        .maybeSingle();

      if (contactError) throw contactError;

      if (!contactData) {
        setContactInfo(null);
        setDocuments([]);
        setLoading(false);
        return;
      }

      setContactInfo({ name: contactData.name, company: contactData.company || undefined });

      // Fetch documents for this contact
      const { data: docsData, error: docsError } = await supabase
        .from('crm_client_documents')
        .select('id, name, file_path, file_type, file_size, area, description, created_at')
        .eq('contact_id', contactData.id)
        .order('created_at', { ascending: false });

      if (docsError) throw docsError;
      setDocuments(docsData || []);
    } catch (error: any) {
      console.error('Error fetching documents:', error);
      toast({ title: "Errore", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [user, toast]);

  useEffect(() => {
    if (user) {
      fetchDocuments();
    } else {
      setLoading(false);
    }
  }, [user, fetchDocuments]);

  const handleDownload = async (document: ClientDocument) => {
    try {
      const { data, error } = await supabase.storage
        .from('crm-documents')
        .download(document.file_path);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = window.document.createElement('a');
      a.href = url;
      a.download = document.name;
      window.document.body.appendChild(a);
      a.click();
      window.document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error: any) {
      toast({ title: "Errore download", description: error.message, variant: "destructive" });
    }
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

  const getDocumentsByArea = () => {
    const byArea: Record<string, ClientDocument[]> = {};
    documents.forEach(doc => {
      if (!byArea[doc.area]) byArea[doc.area] = [];
      byArea[doc.area].push(doc);
    });
    return byArea;
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
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
            <h2 className="text-2xl font-bold mb-2">I Miei Documenti</h2>
            <p className="text-muted-foreground">
              Accedi per visualizzare i documenti a te riservati
            </p>
          </div>

          <Alert className="mb-6">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Per accedere ai tuoi documenti è necessario effettuare l'accesso con l'account collegato.
            </AlertDescription>
          </Alert>

          <div className="text-center">
            <Button onClick={() => setAuthModalOpen(true)} size="lg">
              <User className="h-5 w-5 mr-2" />
              Accedi
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

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto p-4 pb-20 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin" />
        </main>
        <BottomNav />
      </div>
    );
  }

  if (!contactInfo) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto p-4 pb-20">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-2xl font-bold">I Miei Documenti</h2>
              <p className="text-muted-foreground">{user.email}</p>
            </div>
            <Button variant="outline" onClick={handleSignOut}>
              <LogOut className="h-4 w-4 mr-2" />
              Esci
            </Button>
          </div>

          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Il tuo account non è ancora stato collegato a un cliente. 
              Contatta l'amministratore per abilitare l'accesso ai tuoi documenti.
            </AlertDescription>
          </Alert>
        </main>
        <BottomNav />
      </div>
    );
  }

  const documentsByArea = getDocumentsByArea();
  const areaKeys = Object.keys(documentsByArea);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto p-4 pb-20">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold">I Miei Documenti</h2>
            <p className="text-muted-foreground">
              {contactInfo.name}
              {contactInfo.company && ` - ${contactInfo.company}`}
            </p>
          </div>
          <Button variant="outline" onClick={handleSignOut}>
            <LogOut className="h-4 w-4 mr-2" />
            Esci
          </Button>
        </div>

        {documents.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Folder className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-30" />
              <p className="text-muted-foreground">Nessun documento disponibile</p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                Documenti disponibili
                <Badge variant="secondary" className="ml-2">{documents.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Accordion type="multiple" defaultValue={areaKeys} className="space-y-2">
                {areaKeys.map((area) => (
                  <AccordionItem key={area} value={area} className="border rounded-lg px-4">
                    <AccordionTrigger className="hover:no-underline">
                      <div className="flex items-center gap-3">
                        <Badge className={areaColors[area] || 'bg-gray-500/20 text-gray-700'}>
                          {areaLabels[area] || area}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          {documentsByArea[area].length} documenti
                        </span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-2 pt-2">
                        {documentsByArea[area].map((doc) => {
                          const FileIcon = getFileIcon(doc.file_type);
                          return (
                            <div 
                              key={doc.id}
                              className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                            >
                              <div className="flex items-center gap-3 min-w-0 flex-1">
                                <FileIcon className="h-5 w-5 text-muted-foreground shrink-0" />
                                <div className="min-w-0 flex-1">
                                  <p className="font-medium truncate">{doc.name}</p>
                                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    {doc.file_size && <span>{formatFileSize(doc.file_size)}</span>}
                                    <span>•</span>
                                    <span>{format(new Date(doc.created_at), 'dd MMM yyyy', { locale: it })}</span>
                                  </div>
                                  {doc.description && (
                                    <p className="text-xs text-muted-foreground mt-1 truncate">
                                      {doc.description}
                                    </p>
                                  )}
                                </div>
                              </div>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDownload(doc)}
                                title="Scarica"
                              >
                                <Download className="h-4 w-4" />
                              </Button>
                            </div>
                          );
                        })}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </CardContent>
          </Card>
        )}
      </main>
      
      <BottomNav />
    </div>
  );
}
