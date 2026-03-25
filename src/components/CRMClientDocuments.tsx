import { useState, useEffect, useRef, useCallback } from 'react';
import { format, differenceInDays, isPast } from 'date-fns';
import { it } from 'date-fns/locale';
import { 
  FolderOpen, Upload, Download, Trash2, FileText, 
  File, Image, FileSpreadsheet, Loader2, Plus, Search,
  Calendar, AlertTriangle, Clock, X, Link2, UserPlus, Eye
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
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
import { CreateClientAccount } from './CreateClientAccount';
import { cn } from '@/lib/utils';

const areaColors: Record<string, string> = {
  contabilita: 'bg-blue-500/20 text-blue-700 border-blue-500/30',
  area_tecnica: 'bg-green-500/20 text-green-700 border-green-500/30',
  gestione_corsi: 'bg-purple-500/20 text-purple-700 border-purple-500/30',
  medicina: 'bg-rose-500/20 text-rose-700 border-rose-500/30',
  admin: 'bg-orange-500/20 text-orange-700 border-orange-500/30',
  cliente: 'bg-yellow-500/20 text-yellow-700 border-yellow-500/30',
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

const getExpiryStatus = (expiryDate?: string | null) => {
  if (!expiryDate) return null;
  const expiry = new Date(expiryDate);
  const today = new Date();
  const daysUntil = differenceInDays(expiry, today);
  
  if (isPast(expiry)) {
    return { label: 'Scaduto', color: 'bg-red-500/20 text-red-700', icon: AlertTriangle, urgent: true };
  }
  if (daysUntil <= 7) {
    return { label: `${daysUntil}g`, color: 'bg-red-500/20 text-red-700', icon: AlertTriangle, urgent: true };
  }
  if (daysUntil <= 30) {
    return { label: `${daysUntil}g`, color: 'bg-yellow-500/20 text-yellow-700', icon: Clock, urgent: false };
  }
  return { label: format(expiry, 'dd/MM/yy'), color: 'bg-gray-500/10 text-gray-600', icon: Calendar, urgent: false };
};

interface CRMClientDocumentsProps {
  contactId: string;
  contactName: string;
  contactEmail?: string | null;
  contactCompany?: string | null;
  clientUserId?: string | null;
  onLinkClient?: () => void;
}

export default function CRMClientDocuments({ contactId, contactName, contactEmail, contactCompany, clientUserId, onLinkClient }: CRMClientDocumentsProps) {
  const {
    documents,
    loading,
    uploading,
    canUpload,
    userArea,
    areaLabels,
    searchQuery,
    setSearchQuery,
    fetchDocuments,
    uploadDocument,
    updateDocumentExpiry,
    deleteDocument,
    downloadDocument,
    getDocumentsByArea,
    getExpiringDocuments,
  } = useCRMDocuments(contactId);

  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [description, setDescription] = useState('');
  const [expiryDate, setExpiryDate] = useState<Date | undefined>();
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
    
    const result = await uploadDocument(
      selectedFile, 
      description || undefined,
      expiryDate ? format(expiryDate, 'yyyy-MM-dd') : undefined
    );
    if (result) {
      setShowUploadDialog(false);
      setSelectedFile(null);
      setDescription('');
      setExpiryDate(undefined);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const documentsByArea = getDocumentsByArea();
  const expiringDocs = getExpiringDocuments(30);

  return (
    <div className="space-y-4">
      {/* Expiring Documents Alert */}
      {expiringDocs.length > 0 && (
        <Card className="border-yellow-500/30 bg-yellow-500/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2 text-yellow-700">
              <AlertTriangle className="h-4 w-4" />
              Documenti in scadenza ({expiringDocs.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-3">
            <div className="flex flex-wrap gap-2">
              {expiringDocs.slice(0, 5).map(doc => {
                const status = getExpiryStatus(doc.expiry_date);
                return (
                  <Badge 
                    key={doc.id} 
                    variant="outline" 
                    className={cn("text-xs", status?.color)}
                  >
                    {doc.name.length > 20 ? doc.name.substring(0, 20) + '...' : doc.name}
                    {' - '}
                    {status?.label}
                  </Badge>
                );
              })}
              {expiringDocs.length > 5 && (
                <Badge variant="outline" className="text-xs">
                  +{expiringDocs.length - 5} altri
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Documents Card */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <FolderOpen className="h-5 w-5 text-primary" />
              Cassetto Documenti
              {documents.length > 0 && (
                <Badge variant="secondary" className="ml-1">{documents.length}</Badge>
              )}
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
                        accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.gif,.txt,.zip,.rar,.7z,.tar,.gz"
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
                        rows={2}
                      />
                    </div>
                    <div>
                      <Label>Data di scadenza (opzionale)</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full justify-start text-left font-normal",
                              !expiryDate && "text-muted-foreground"
                            )}
                          >
                            <Calendar className="mr-2 h-4 w-4" />
                            {expiryDate ? format(expiryDate, 'PPP', { locale: it }) : 'Seleziona data scadenza'}
                            {expiryDate && (
                              <X 
                                className="ml-auto h-4 w-4 hover:text-destructive" 
                                onClick={(e) => { e.stopPropagation(); setExpiryDate(undefined); }}
                              />
                            )}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <CalendarComponent
                            mode="single"
                            selected={expiryDate}
                            onSelect={setExpiryDate}
                            disabled={(date) => date < new Date()}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                    {userArea && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span>Sarà caricato da:</span>
                        <Badge className={areaColors[userArea]}>
                          {areaLabels[userArea]}
                        </Badge>
                      </div>
                    )}
                    {!clientUserId && onLinkClient && (
                      <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/5 p-3 space-y-2">
                        <div className="flex items-center gap-2 text-sm font-medium text-yellow-700">
                          <AlertTriangle className="h-4 w-4" />
                          Account cliente non collegato
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Il cliente non potrà visualizzare i documenti nella sezione "I miei documenti" finché non viene collegato un account utente.
                        </p>
                        <CreateClientAccount
                          contactId={contactId}
                          contactName={contactName}
                          contactEmail={contactEmail}
                          contactCompany={contactCompany}
                          onAccountCreated={() => { setShowUploadDialog(false); onLinkClient(); }}
                        />
                        <Button 
                          type="button"
                          variant="outline" 
                          size="sm"
                          className="w-full"
                          onClick={() => { setShowUploadDialog(false); onLinkClient(); }}
                        >
                          <Link2 className="h-4 w-4 mr-2" />
                          Collega Account Esistente
                        </Button>
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
          
          {/* Search Bar */}
          {documents.length > 0 && (
            <div className="relative mt-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cerca documenti..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-9"
              />
              {searchQuery && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                  onClick={() => setSearchQuery('')}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          )}
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
          ) : Object.keys(documentsByArea).length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Search className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>Nessun risultato per "{searchQuery}"</p>
              <Button variant="link" onClick={() => setSearchQuery('')}>
                Cancella ricerca
              </Button>
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
                            onUpdateExpiry={(date) => updateDocumentExpiry(doc.id, date)}
                            canDelete={userArea === doc.area || userArea === 'admin'}
                            canEdit={userArea === doc.area || userArea === 'admin'}
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
    </div>
  );
}

interface DocumentItemProps {
  document: CRMDocument;
  onDownload: () => void;
  onDelete: () => void;
  onUpdateExpiry: (date: string | null) => void;
  canDelete: boolean;
  canEdit: boolean;
}

function DocumentItem({ document, onDownload, onDelete, onUpdateExpiry, canDelete, canEdit }: DocumentItemProps) {
  const [showExpiryPicker, setShowExpiryPicker] = useState(false);
  const expiryStatus = getExpiryStatus(document.expiry_date);

  return (
    <div className={cn(
      "flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors",
      expiryStatus?.urgent && "border-red-500/30 bg-red-500/5"
    )}>
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className="text-muted-foreground">
          {getFileIcon(document.file_type)}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm truncate">{document.name}</p>
          <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
            <span>{format(new Date(document.created_at), 'dd/MM/yyyy', { locale: it })}</span>
            {document.file_size && (
              <>
                <span>•</span>
                <span>{formatFileSize(document.file_size)}</span>
              </>
            )}
            {expiryStatus && (
              <>
                <span>•</span>
                <Badge variant="outline" className={cn("text-xs py-0 h-5", expiryStatus.color)}>
                  <expiryStatus.icon className="h-3 w-3 mr-1" />
                  {expiryStatus.label}
                </Badge>
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
        {canEdit && (
          <Popover open={showExpiryPicker} onOpenChange={setShowExpiryPicker}>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8" title="Imposta scadenza">
                <Calendar className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <div className="p-2 border-b">
                <p className="text-sm font-medium">Data di scadenza</p>
                {document.expiry_date && (
                  <Button 
                    variant="link" 
                    size="sm" 
                    className="p-0 h-auto text-destructive"
                    onClick={() => { onUpdateExpiry(null); setShowExpiryPicker(false); }}
                  >
                    Rimuovi scadenza
                  </Button>
                )}
              </div>
              <CalendarComponent
                mode="single"
                selected={document.expiry_date ? new Date(document.expiry_date) : undefined}
                onSelect={(date) => {
                  if (date) {
                    onUpdateExpiry(format(date, 'yyyy-MM-dd'));
                    setShowExpiryPicker(false);
                  }
                }}
                disabled={(date) => date < new Date()}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        )}
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
