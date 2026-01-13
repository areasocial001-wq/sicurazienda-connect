import { useState, useEffect, useRef } from 'react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { 
  FolderOpen, Upload, Download, Trash2, FileText, 
  File, Image, FileSpreadsheet, Loader2, Plus
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
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
} from '@/components/ui/alert-dialog';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { useCRMDocuments, CRMDocument } from '@/hooks/useCRMDocuments';

const areaColors: Record<string, string> = {
  contabilita: 'bg-blue-500/20 text-blue-700 border-blue-500/30',
  area_tecnica: 'bg-green-500/20 text-green-700 border-green-500/30',
  gestione_corsi: 'bg-purple-500/20 text-purple-700 border-purple-500/30',
  admin: 'bg-orange-500/20 text-orange-700 border-orange-500/30',
};

const getFileIcon = (fileType?: string) => {
  if (!fileType) return <File className="h-4 w-4" />;
  if (fileType.includes('image')) return <Image className="h-4 w-4" />;
  if (fileType.includes('spreadsheet') || fileType.includes('excel')) return <FileSpreadsheet className="h-4 w-4" />;
  if (fileType.includes('pdf') || fileType.includes('word') || fileType.includes('document')) return <FileText className="h-4 w-4" />;
  return <File className="h-4 w-4" />;
};

const formatFileSize = (bytes?: number) => {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

interface CRMClientDocumentsProps {
  contactId: string;
  contactName: string;
}

export default function CRMClientDocuments({ contactId, contactName }: CRMClientDocumentsProps) {
  const {
    documents,
    loading,
    uploading,
    canUpload,
    userArea,
    areaLabels,
    fetchDocuments,
    uploadDocument,
    deleteDocument,
    downloadDocument,
    getDocumentsByArea,
  } = useCRMDocuments(contactId);

  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [description, setDescription] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    
    const result = await uploadDocument(selectedFile, description || undefined);
    if (result) {
      setShowUploadDialog(false);
      setSelectedFile(null);
      setDescription('');
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const documentsByArea = getDocumentsByArea();

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <FolderOpen className="h-5 w-5 text-primary" />
            Cassetto Documenti
          </CardTitle>
          {canUpload && (
            <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-1" />
                  Carica
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Carica documento per {contactName}</DialogTitle>
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
                      placeholder="Breve descrizione del documento..."
                      rows={3}
                    />
                  </div>
                  {userArea && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span>Sarà caricato da:</span>
                      <Badge className={areaColors[userArea]}>
                        {areaLabels[userArea]}
                      </Badge>
                    </div>
                  )}
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
                        <Upload className="h-4 w-4 mr-2" />
                        Carica documento
                      </>
                    )}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : documents.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <FolderOpen className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>Nessun documento presente</p>
            {canUpload && (
              <p className="text-sm mt-1">
                Clicca su "Carica" per aggiungere il primo documento
              </p>
            )}
          </div>
        ) : (
          <Accordion type="multiple" defaultValue={Object.keys(documentsByArea)} className="w-full">
            {Object.entries(documentsByArea).map(([area, docs]) => (
              <AccordionItem key={area} value={area}>
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-2">
                    <Badge className={areaColors[area]}>
                      {areaLabels[area]}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      ({docs.length} {docs.length === 1 ? 'documento' : 'documenti'})
                    </span>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <ScrollArea className="max-h-[300px]">
                    <div className="space-y-2">
                      {docs.map((doc) => (
                        <DocumentItem
                          key={doc.id}
                          document={doc}
                          onDownload={() => downloadDocument(doc)}
                          onDelete={() => deleteDocument(doc)}
                          canDelete={userArea === doc.area || userArea === 'admin'}
                        />
                      ))}
                    </div>
                  </ScrollArea>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        )}
      </CardContent>
    </Card>
  );
}

interface DocumentItemProps {
  document: CRMDocument;
  onDownload: () => void;
  onDelete: () => void;
  canDelete: boolean;
}

function DocumentItem({ document, onDownload, onDelete, canDelete }: DocumentItemProps) {
  return (
    <div className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className="text-muted-foreground">
          {getFileIcon(document.file_type)}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm truncate">{document.name}</p>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>{format(new Date(document.created_at), 'dd/MM/yyyy', { locale: it })}</span>
            {document.file_size && (
              <>
                <span>•</span>
                <span>{formatFileSize(document.file_size)}</span>
              </>
            )}
          </div>
          {document.description && (
            <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
              {document.description}
            </p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-1 ml-2">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onDownload}>
          <Download className="h-4 w-4" />
        </Button>
        {canDelete && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive">
                <Trash2 className="h-4 w-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Eliminare il documento?</AlertDialogTitle>
                <AlertDialogDescription>
                  Stai per eliminare "{document.name}". Questa azione non può essere annullata.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Annulla</AlertDialogCancel>
                <AlertDialogAction onClick={onDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                  Elimina
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>
    </div>
  );
}
