import { useState, useEffect } from "react";
import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";
import AuthModal from "@/components/AuthModal";
import QRCodeModal from "@/components/QRCodeModal";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { useDocumentAgent } from "@/hooks/useDocumentAgent";
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
  QrCode,
  Search,
  Sparkles,
  Loader2,
  Brain,
  Trash2,
  Filter
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const Documents = () => {
  const { user, loading, signOut } = useAuth();
  const { isAdmin, isGestioneCorsi, loading: roleLoading } = useUserRole();
  const { classifyDocument, semanticSearch, isProcessing } = useDocumentAgent();
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [documents, setDocuments] = useState<any[]>([]);
  const [filteredDocuments, setFilteredDocuments] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const [selectedArea, setSelectedArea] = useState<string>('generale');
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [selectedDocForQR, setSelectedDocForQR] = useState<{ url: string; name: string; id: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [ownerFilter, setOwnerFilter] = useState<'all' | 'mine'>('all');
  const [aiSuggestion, setAiSuggestion] = useState<{
    category: string;
    area_competenza: string;
    confidence: number;
    suggerimento?: string;
  } | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
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

  useEffect(() => {
    // Apply owner filter
    if (ownerFilter === 'mine' && user) {
      setFilteredDocuments(documents.filter(doc => doc.user_id === user.id));
    } else {
      setFilteredDocuments(documents);
    }
  }, [documents, ownerFilter, user]);

  const fetchDocuments = async () => {
    try {
      // Join with profiles to get owner email
      const { data, error } = await supabase
        .from('documents')
        .select(`
          *,
          profiles:user_id (
            user_id,
            full_name,
            company_name
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Fetch emails from auth.users via profiles user_id
      // Since we can't directly access auth.users, we'll get email from the profile's user_id
      // We need to match with the user session or use a function
      // For now, show profile info; email requires edge function or storing it in profiles
      
      setDocuments(data || []);
    } catch (error) {
      console.error('Error fetching documents:', error);
    }
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files || event.target.files.length === 0) return;
    
    const file = event.target.files[0];
    setPendingFile(file);
    setAiSuggestion(null);

    // AI Classification
    toast({
      title: "Analisi AI in corso...",
      description: "Sto classificando il documento automaticamente",
    });

    const result = await classifyDocument(file.name);
    
    if (result) {
      setAiSuggestion(result);
      setSelectedArea(result.area_competenza);
      
      toast({
        title: "Classificazione completata",
        description: `Suggerimento: ${result.suggerimento || result.category}`,
      });
    }
  };

  const handleUploadConfirm = async () => {
    if (!pendingFile || !user) return;

    try {
      setUploading(true);
      
      const fileExt = pendingFile.name.split('.').pop();
      const filePath = `${user.id}/${Math.random()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, pendingFile);

      if (uploadError) throw uploadError;

      const { error: dbError } = await supabase
        .from('documents')
        .insert({
          user_id: user.id,
          name: pendingFile.name,
          file_path: filePath,
          file_type: pendingFile.type,
          category: aiSuggestion?.category || 'Upload Utente',
          area_competenza: selectedArea
        });

      if (dbError) throw dbError;

      toast({
        title: "Upload completato",
        description: "Il documento è stato caricato con successo.",
      });

      setPendingFile(null);
      setAiSuggestion(null);
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

  const handleAISearch = async () => {
    if (!searchQuery.trim()) {
      setFilteredDocuments(documents);
      return;
    }

    const searchCriteria = await semanticSearch(searchQuery);
    
    if (searchCriteria) {
      let filtered = [...documents];

      // Filter by keywords
      if (searchCriteria.keywords.length > 0) {
        filtered = filtered.filter(doc => 
          searchCriteria.keywords.some(kw => 
            doc.name.toLowerCase().includes(kw.toLowerCase()) ||
            doc.category?.toLowerCase().includes(kw.toLowerCase())
          )
        );
      }

      // Filter by categories
      if (searchCriteria.categories.length > 0) {
        filtered = filtered.filter(doc =>
          searchCriteria.categories.some(cat => 
            doc.category?.toLowerCase().includes(cat.toLowerCase())
          )
        );
      }

      // Filter by areas
      if (searchCriteria.areas.length > 0) {
        filtered = filtered.filter(doc =>
          searchCriteria.areas.includes(doc.area_competenza)
        );
      }

      setFilteredDocuments(filtered);
      
      toast({
        title: "Ricerca AI completata",
        description: `Trovati ${filtered.length} documenti - ${searchCriteria.intent}`,
      });
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

  const handleShowQR = async (docId: string, filePath: string, fileName: string) => {
    // Generate signed URL with 7 days expiration (604800 seconds)
    const { data, error } = await supabase.storage
      .from('documents')
      .createSignedUrl(filePath, 604800);
    
    if (error || !data?.signedUrl) {
      toast({
        title: "Errore generazione link",
        description: error?.message || "Impossibile generare il link",
        variant: "destructive",
      });
      return;
    }
    
    setSelectedDocForQR({ url: data.signedUrl, name: fileName, id: docId });
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

  const handleDelete = async (
    docId: string,
    filePath: string,
    fileName: string,
    docUserId?: string | null
  ) => {
    try {
      // If the document belongs to another user, only privileged roles can delete it.
      const isOtherUsersDoc = !!docUserId && !!user?.id && docUserId !== user.id;

      if (isOtherUsersDoc && !(isAdmin || isGestioneCorsi)) {
        throw new Error("Non hai i permessi per eliminare documenti di altri utenti.");
      }

      if (isAdmin || isGestioneCorsi) {
        const { error } = await supabase.functions.invoke('admin-delete-document', {
          body: { documentId: docId },
        });

        if (error) throw error;
      } else {
        // Delete from storage (best-effort)
        const { error: storageError } = await supabase.storage
          .from('documents')
          .remove([filePath]);

        if (storageError) {
          console.error('Storage delete error:', storageError);
        }

        // Delete from database (and verify at least one row was deleted)
        const { data: deletedRows, error: dbError } = await supabase
          .from('documents')
          .delete()
          .eq('id', docId)
          .select('id');

        if (dbError) throw dbError;
        if (!deletedRows || deletedRows.length === 0) {
          throw new Error('Eliminazione non consentita (permessi insufficienti).');
        }
      }

      await fetchDocuments();

      toast({
        title: "Documento eliminato",
        description: `"${fileName}" è stato eliminato con successo.`,
      });
    } catch (error: any) {
      toast({
        title: "Errore eliminazione",
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

        {/* AI Search */}
        <Card className="mb-4">
          <CardContent className="pt-4">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Cerca documenti con AI (es: 'fatture dell'ultimo mese', 'attestati formazione')..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAISearch()}
                  className="pl-10"
                />
              </div>
              <Button onClick={handleAISearch} disabled={isProcessing}>
                {isProcessing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Brain className="h-4 w-4 mr-2" />
                )}
                Cerca
              </Button>
              {searchQuery && (
                <Button variant="outline" onClick={() => {
                  setSearchQuery('');
                  setFilteredDocuments(documents);
                }}>
                  Reset
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="mb-4">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Documenti
                {filteredDocuments.length !== documents.length && (
                  <Badge variant="secondary">{filteredDocuments.length} di {documents.length}</Badge>
                )}
              </CardTitle>
              {(isAdmin || isGestioneCorsi) && (
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-muted-foreground" />
                  <Select value={ownerFilter} onValueChange={(v) => setOwnerFilter(v as 'all' | 'mine')}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tutti i documenti</SelectItem>
                      <SelectItem value="mine">Solo i miei</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {filteredDocuments.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>Nessun documento disponibile</p>
                  <p className="text-sm">Carica il tuo primo documento qui sotto</p>
                </div>
              ) : (
                filteredDocuments.map((doc) => (
                  <div key={doc.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <FileText className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <span className="font-medium block">{doc.name}</span>
                        <div className="flex flex-wrap gap-2 mt-1">
                          <Badge variant="outline" className="text-xs">{doc.category}</Badge>
                          {doc.area_competenza && (
                            <Badge variant="secondary" className="text-xs">{doc.area_competenza}</Badge>
                          )}
                          {(isAdmin || isGestioneCorsi) && doc.profiles && (
                            <Badge variant="default" className="text-xs">
                              <User className="h-3 w-3 mr-1" />
                              {doc.profiles.full_name || doc.profiles.company_name || 'Utente'}
                            </Badge>
                          )}
                          {(isAdmin || isGestioneCorsi) && doc.user_id === user?.id && (
                            <Badge variant="outline" className="text-xs bg-primary/10">Mio</Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleShowQR(doc.id, doc.file_path, doc.name)}
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
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button 
                            variant="outline" 
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            title="Elimina documento"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Conferma eliminazione</AlertDialogTitle>
                            <AlertDialogDescription>
                              Sei sicuro di voler eliminare "{doc.name}"? Questa azione non può essere annullata.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Annulla</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDelete(doc.id, doc.file_path, doc.name, doc.user_id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Elimina
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
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
              <Badge variant="outline" className="ml-2">
                <Sparkles className="h-3 w-3 mr-1" />
                AI Auto-classificazione
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* AI Suggestion Card */}
              {aiSuggestion && pendingFile && (
                <Alert className="bg-primary/5 border-primary/20">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <AlertDescription>
                    <div className="space-y-2">
                      <p className="font-medium">Suggerimento AI per "{pendingFile.name}":</p>
                      <div className="flex flex-wrap gap-2">
                        <Badge>Categoria: {aiSuggestion.category}</Badge>
                        <Badge variant="secondary">Area: {aiSuggestion.area_competenza}</Badge>
                        <Badge variant="outline">Confidenza: {Math.round(aiSuggestion.confidence * 100)}%</Badge>
                      </div>
                      {aiSuggestion.suggerimento && (
                        <p className="text-sm text-muted-foreground">{aiSuggestion.suggerimento}</p>
                      )}
                    </div>
                  </AlertDescription>
                </Alert>
              )}

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

              {!pendingFile ? (
                <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center">
                  <Upload className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
                  <p className="text-muted-foreground mb-3">
                    Carica i tuoi documenti aziendali
                  </p>
                  <input
                    type="file"
                    onChange={handleFileSelect}
                    style={{ display: 'none' }}
                    id="file-upload"
                    accept=".pdf,.doc,.docx,.xlsx,.xls,.jpg,.jpeg,.png"
                  />
                  <Button 
                    variant="outline" 
                    onClick={() => document.getElementById('file-upload')?.click()}
                    disabled={isProcessing}
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Analisi AI...
                      </>
                    ) : (
                      'Seleziona File'
                    )}
                  </Button>
                </div>
              ) : (
                <div className="border rounded-lg p-4 space-y-4">
                  <div className="flex items-center gap-3">
                    <FileText className="h-8 w-8 text-primary" />
                    <div>
                      <p className="font-medium">{pendingFile.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {(pendingFile.size / 1024).toFixed(1)} KB
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={handleUploadConfirm} disabled={uploading}>
                      {uploading ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Caricamento...
                        </>
                      ) : (
                        <>
                          <Upload className="h-4 w-4 mr-2" />
                          Carica Documento
                        </>
                      )}
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        setPendingFile(null);
                        setAiSuggestion(null);
                      }}
                    >
                      Annulla
                    </Button>
                  </div>
                </div>
              )}
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
          documentId={selectedDocForQR.id}
        />
      )}
    </div>
  );
};

export default Documents;
