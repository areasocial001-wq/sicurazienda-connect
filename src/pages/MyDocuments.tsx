import { useState, useEffect, useCallback, useRef } from 'react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { 
  FileText, Download, Folder, Loader2, Lock, User, LogOut,
  File, FileSpreadsheet, FileImage, AlertTriangle, Upload, Plus, Eye,
  ChevronLeft, ChevronRight
} from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;
import Header from '@/components/Header';
import BottomNav from '@/components/BottomNav';
import AuthModal from '@/components/AuthModal';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
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
  cliente: 'Caricati da te',
};

const areaColors: Record<string, string> = {
  contabilita: 'bg-emerald-500/20 text-emerald-700 border-emerald-500/30',
  area_tecnica: 'bg-blue-500/20 text-blue-700 border-blue-500/30',
  gestione_corsi: 'bg-purple-500/20 text-purple-700 border-purple-500/30',
  admin: 'bg-red-500/20 text-red-700 border-red-500/30',
  cliente: 'bg-orange-500/20 text-orange-700 border-orange-500/30',
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
  const [contactInfo, setContactInfo] = useState<{ id: string; name: string; company?: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [description, setDescription] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewDoc, setPreviewDoc] = useState<ClientDocument | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [pdfPreviewImage, setPdfPreviewImage] = useState<string | null>(null);
  const [pdfPages, setPdfPages] = useState<number>(0);
  const [pdfCurrentPage, setPdfCurrentPage] = useState(1);
  const pdfDocRef = useRef<any>(null);

  const renderPdfPage = useCallback(async (pdf: any, pageNum: number) => {
    const page = await pdf.getPage(pageNum);
    const scale = 2;
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    await page.render({
      canvasContext: canvas.getContext('2d')!,
      viewport,
      annotationMode: pdfjsLib.AnnotationMode.DISABLE,
    }).promise;
    setPdfPreviewImage(canvas.toDataURL('image/png'));
    setPdfCurrentPage(pageNum);
  }, []);

  const handlePreview = async (doc: ClientDocument) => {
    setPreviewDoc(doc);
    setPreviewLoading(true);
    setPdfPreviewImage(null);
    setPdfPages(0);
    setPdfCurrentPage(1);
    pdfDocRef.current = null;

    try {
      const { data, error } = await supabase.storage
        .from('crm-documents')
        .download(doc.file_path);
      if (error) throw error;

      const url = URL.createObjectURL(data);
      setPreviewUrl(url);

      const isPdf = doc.file_type === 'application/pdf';
      if (isPdf) {
        const buffer = await data.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: buffer, stopAtErrors: false }).promise;
        pdfDocRef.current = pdf;
        setPdfPages(pdf.numPages);
        await renderPdfPage(pdf, 1);
      }
    } catch (err: any) {
      console.error('Preview error:', err);
      toast({ title: 'Errore anteprima', description: err.message, variant: 'destructive' });
    } finally {
      setPreviewLoading(false);
    }
  };

  const changePdfPage = async (delta: number) => {
    const next = pdfCurrentPage + delta;
    if (pdfDocRef.current && next >= 1 && next <= pdfPages) {
      await renderPdfPage(pdfDocRef.current, next);
    }
  };

  const fetchDocuments = useCallback(async () => {
    if (!user) return;
    
    setLoading(true);
    try {
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

      setContactInfo({ id: contactData.id, name: contactData.name, company: contactData.company || undefined });

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

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !contactInfo || !user) return;

    setUploading(true);
    try {
      const timestamp = Date.now();
      const sanitizedName = selectedFile.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const filePath = `${contactInfo.id}/cliente/${timestamp}_${sanitizedName}`;

      const { error: uploadError } = await supabase.storage
        .from('crm-documents')
        .upload(filePath, selectedFile);

      if (uploadError) throw uploadError;

      const { error: dbError } = await supabase
        .from('crm_client_documents')
        .insert({
          contact_id: contactInfo.id,
          uploaded_by: user.id,
          name: selectedFile.name,
          file_path: filePath,
          file_type: selectedFile.type,
          file_size: selectedFile.size,
          area: 'cliente',
          description: description || null
        });

      if (dbError) throw dbError;

      toast({ title: "Documento caricato", description: "Il documento è stato inviato con successo" });
      setShowUploadDialog(false);
      setSelectedFile(null);
      setDescription('');
      if (fileInputRef.current) fileInputRef.current.value = '';
      await fetchDocuments();
    } catch (error: any) {
      toast({ title: "Errore upload", description: error.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

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
      toast({ title: "Disconnessione effettuata", description: "A presto!" });
    }
  };

  const getDocumentsByArea = () => {
    const byArea: Record<string, ClientDocument[]> = {};
    // Put 'cliente' area first
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
          <AuthModal open={authModalOpen} onOpenChange={setAuthModalOpen} />
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
          <div className="flex gap-2">
            <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
              <DialogTrigger asChild>
                <Button>
                  <Upload className="h-4 w-4 mr-2" />
                  Carica
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Carica un documento</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>File</Label>
                    <Input
                      ref={fileInputRef}
                      type="file"
                      onChange={handleFileSelect}
                      accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.gif,.txt,.zip"
                    />
                    {selectedFile && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {selectedFile.name} ({formatFileSize(selectedFile.size)})
                      </p>
                    )}
                  </div>
                  <div>
                    <Label>Descrizione (opzionale)</Label>
                    <Textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Descrivi brevemente il documento..."
                      rows={3}
                    />
                  </div>
                  <Button 
                    onClick={handleUpload} 
                    className="w-full" 
                    disabled={!selectedFile || uploading}
                  >
                    {uploading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Caricamento...
                      </>
                    ) : (
                      <>
                        <Plus className="h-4 w-4 mr-2" />
                        Carica documento
                      </>
                    )}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
            <Button variant="outline" onClick={handleSignOut}>
              <LogOut className="h-4 w-4 mr-2" />
              Esci
            </Button>
          </div>
        </div>

        {documents.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Folder className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-30" />
              <p className="text-muted-foreground mb-4">Nessun documento disponibile</p>
              <Button onClick={() => setShowUploadDialog(true)}>
                <Upload className="h-4 w-4 mr-2" />
                Carica il tuo primo documento
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                Documenti
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
                              <div className="flex items-center gap-1 shrink-0">
                                {(doc.file_type?.startsWith('image/') || doc.file_type === 'application/pdf') && (
                                  <Button variant="ghost" size="icon" onClick={() => handlePreview(doc)} title="Anteprima">
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                )}
                                <Button variant="ghost" size="icon" onClick={() => handleDownload(doc)} title="Scarica">
                                  <Download className="h-4 w-4" />
                                </Button>
                              </div>
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
