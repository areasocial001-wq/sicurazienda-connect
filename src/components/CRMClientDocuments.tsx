import { useState, useEffect, useRef, useCallback } from 'react';
import { format, differenceInDays, isPast } from 'date-fns';
import { it } from 'date-fns/locale';
import { 
  FolderOpen, Upload, Download, Trash2, FileText, 
  File, Image, FileSpreadsheet, Loader2, Plus, Search,
  Calendar, AlertTriangle, Clock, X, Link2, UserPlus, Eye, FolderUp, ChevronLeft, ChevronRight,
  History, GitBranch
} from 'lucide-react';
import { Progress } from '@/components/ui/progress';
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
import { useCRMDocuments, CRMDocument, CATEGORY_LABELS, DocumentCategory, CRMDocumentHistoryEntry } from '@/hooks/useCRMDocuments';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CreateClientAccount } from './CreateClientAccount';
import { cn } from '@/lib/utils';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import pdfjsWorker from 'pdfjs-dist/legacy/build/pdf.worker.min.mjs?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

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
    fetchHistory,
    fetchVersions,
  } = useCRMDocuments(contactId);

  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [description, setDescription] = useState('');
  const [expiryDate, setExpiryDate] = useState<Date | undefined>();
  const [category, setCategory] = useState<DocumentCategory>('altro');
  const [parentDocId, setParentDocId] = useState<string | undefined>();
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = useState<{ done: number; total: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      setSelectedFiles(prev => [...prev, ...files]);
    }
  };

  const removeSelectedFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  // Recursively read directory entries from DataTransferItem
  const readDirectory = async (entry: FileSystemDirectoryEntry): Promise<File[]> => {
    const files: File[] = [];
    const reader = entry.createReader();
    const readEntries = (): Promise<FileSystemEntry[]> =>
      new Promise((resolve, reject) => reader.readEntries(resolve, reject));
    
    let entries: FileSystemEntry[];
    do {
      entries = await readEntries();
      for (const e of entries) {
        if (e.isFile) {
          const file = await new Promise<File>((resolve, reject) =>
            (e as FileSystemFileEntry).file(resolve, reject)
          );
          files.push(file);
        } else if (e.isDirectory) {
          const subFiles = await readDirectory(e as FileSystemDirectoryEntry);
          files.push(...subFiles);
        }
      }
    } while (entries.length > 0);
    return files;
  };

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const items = e.dataTransfer.items;
    const droppedFiles: File[] = [];

    if (items) {
      const entries: FileSystemEntry[] = [];
      for (let i = 0; i < items.length; i++) {
        const entry = items[i].webkitGetAsEntry?.();
        if (entry) entries.push(entry);
      }
      for (const entry of entries) {
        if (entry.isFile) {
          const file = await new Promise<File>((resolve, reject) =>
            (entry as FileSystemFileEntry).file(resolve, reject)
          );
          droppedFiles.push(file);
        } else if (entry.isDirectory) {
          const files = await readDirectory(entry as FileSystemDirectoryEntry);
          droppedFiles.push(...files);
        }
      }
    } else {
      droppedFiles.push(...Array.from(e.dataTransfer.files));
    }

    if (droppedFiles.length > 0) {
      setSelectedFiles(prev => [...prev, ...droppedFiles]);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (dropZoneRef.current && !dropZoneRef.current.contains(e.relatedTarget as Node)) {
      setIsDragging(false);
    }
  }, []);

  const handleUpload = async () => {
    if (selectedFiles.length === 0) return;
    
    setUploadProgress({ done: 0, total: selectedFiles.length });
    let successCount = 0;
    
    for (const file of selectedFiles) {
      const result = await uploadDocument(
        file, 
        description || undefined,
        expiryDate ? format(expiryDate, 'yyyy-MM-dd') : undefined,
        category,
        parentDocId,
      );
      if (result) successCount++;
      setUploadProgress(prev => prev ? { ...prev, done: (prev.done || 0) + 1 } : null);
    }
    
    if (successCount > 0) {
      setShowUploadDialog(false);
      setSelectedFiles([]);
      setDescription('');
      setExpiryDate(undefined);
      setCategory('altro');
      setParentDocId(undefined);
      setUploadProgress(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const totalSelectedSize = selectedFiles.reduce((sum, f) => sum + f.size, 0);

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
                    {/* Drop Zone */}
                    <div
                      ref={dropZoneRef}
                      onDrop={handleDrop}
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      className={cn(
                        "border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer",
                        isDragging
                          ? "border-primary bg-primary/5"
                          : "border-muted-foreground/25 hover:border-primary/50"
                      )}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <input
                        ref={fileInputRef}
                        type="file"
                        multiple
                        className="hidden"
                        onChange={handleFileSelect}
                        accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.gif,.txt,.zip,.rar,.7z,.tar,.gz"
                      />
                      <FolderUp className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                      <p className="text-sm font-medium">
                        {isDragging ? 'Rilascia qui i file' : 'Trascina file o cartelle qui'}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        oppure clicca per selezionare • File multipli supportati
                      </p>
                    </div>

                    {/* Selected Files List */}
                    {selectedFiles.length > 0 && (
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs">{selectedFiles.length} file selezionat{selectedFiles.length === 1 ? 'o' : 'i'} ({formatFileSize(totalSelectedSize)})</Label>
                          <Button variant="ghost" size="sm" className="h-6 text-xs text-destructive" onClick={() => setSelectedFiles([])}>
                            Rimuovi tutti
                          </Button>
                        </div>
                        <ScrollArea className="max-h-[120px]">
                          <div className="space-y-1">
                            {selectedFiles.map((file, i) => (
                              <div key={i} className="flex items-center gap-2 text-xs bg-muted/50 rounded px-2 py-1.5">
                                {getFileIcon(file.type)}
                                <span className="flex-1 truncate">{file.name}</span>
                                <span className="text-muted-foreground shrink-0">{formatFileSize(file.size)}</span>
                                <Button variant="ghost" size="icon" className="h-5 w-5 shrink-0" onClick={() => removeSelectedFile(i)}>
                                  <X className="h-3 w-3" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        </ScrollArea>
                      </div>
                    )}

                    <div>
                      <Label>Descrizione (opzionale, applicata a tutti)</Label>
                      <Textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Breve descrizione del documento..."
                        rows={2}
                      />
                    </div>
                    <div>
                      <Label>Categoria</Label>
                      <Select value={category} onValueChange={(v) => setCategory(v as DocumentCategory)} disabled={!!parentDocId}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                            <SelectItem key={k} value={k}>{v}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {parentDocId && (
                        <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                          <GitBranch className="h-3 w-3" /> Caricamento come nuova versione del documento esistente
                          <Button variant="link" size="sm" className="h-auto p-0 text-xs" onClick={() => setParentDocId(undefined)}>Annulla</Button>
                        </p>
                      )}
                    </div>
                    <div>
                      <Label>Data di scadenza (opzionale, applicata a tutti)</Label>
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
                      <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 space-y-2">
                        <div className="flex items-center gap-2 text-sm font-medium text-destructive">
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

                    {/* Upload Progress */}
                    {uploadProgress && (
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>Caricamento {uploadProgress.done}/{uploadProgress.total}</span>
                          <span>{Math.round((uploadProgress.done / uploadProgress.total) * 100)}%</span>
                        </div>
                        <Progress value={(uploadProgress.done / uploadProgress.total) * 100} className="h-2" />
                      </div>
                    )}

                    <Button 
                      onClick={handleUpload} 
                      className="w-full" 
                      disabled={selectedFiles.length === 0 || uploading}
                    >
                      {uploading ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Caricamento {uploadProgress ? `${uploadProgress.done}/${uploadProgress.total}` : '...'}
                        </>
                      ) : (
                        <>
                          <Upload className="h-4 w-4 mr-2" />
                          Carica {selectedFiles.length > 1 ? `${selectedFiles.length} documenti` : 'documento'}
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
                            onNewVersion={(d) => {
                              setParentDocId(d.parent_document_id || d.id);
                              setCategory((d.category as DocumentCategory) || 'altro');
                              setShowUploadDialog(true);
                            }}
                            fetchHistory={fetchHistory}
                            fetchVersions={fetchVersions}
                            onDownloadAny={downloadDocument}
                          />
                        ))}
                    </div>
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
  onNewVersion?: (doc: CRMDocument) => void;
  fetchHistory?: (id: string) => Promise<CRMDocumentHistoryEntry[]>;
  fetchVersions?: (doc: CRMDocument) => Promise<CRMDocument[]>;
  onDownloadAny?: (doc: CRMDocument) => Promise<boolean | void> | void;
}

function DocumentItem({ document, onDownload, onDelete, onUpdateExpiry, canDelete, canEdit, onNewVersion, fetchHistory, fetchVersions, onDownloadAny }: DocumentItemProps) {
  const [showExpiryPicker, setShowExpiryPicker] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showHistoryDialog, setShowHistoryDialog] = useState(false);
  const [history, setHistory] = useState<CRMDocumentHistoryEntry[]>([]);
  const [versions, setVersions] = useState<CRMDocument[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [pdfPreviewImage, setPdfPreviewImage] = useState<string | null>(null);
  const [pdfPages, setPdfPages] = useState<number | null>(null);
  const [pdfCurrentPage, setPdfCurrentPage] = useState(1);
  const [pdfPageLoading, setPdfPageLoading] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const pdfDocumentRef = useRef<any>(null);
  const expiryStatus = getExpiryStatus(document.expiry_date);

  const openHistory = async () => {
    setShowHistoryDialog(true);
    if (!fetchHistory || !fetchVersions) return;
    setHistoryLoading(true);
    try {
      const [h, v] = await Promise.all([fetchHistory(document.id), fetchVersions(document)]);
      setHistory(h);
      setVersions(v);
    } finally {
      setHistoryLoading(false);
    }
  };

  const isImage = document.file_type?.startsWith('image/');
  const isPdf = document.file_type === 'application/pdf';
  const canPreview = isImage || isPdf;

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      if (pdfDocumentRef.current) {
        pdfDocumentRef.current.destroy?.();
        pdfDocumentRef.current = null;
      }
    };
  }, [previewUrl]);

  const renderPdfPage = useCallback(async (pdfDocument: any, pageNumber: number) => {
    const page = await pdfDocument.getPage(pageNumber);
    const viewport = page.getViewport({ scale: 1.35 });
    const canvas = window.document.createElement('canvas');
    const context = canvas.getContext('2d');

    if (!context) throw new Error('Canvas context non disponibile');

    canvas.width = viewport.width;
    canvas.height = viewport.height;

    await page.render({
      canvasContext: context,
      viewport,
      canvas,
      annotationMode: pdfjsLib.AnnotationMode.DISABLE,
    }).promise;

    setPdfPreviewImage(canvas.toDataURL('image/png'));
  }, []);

  const loadPreview = useCallback(async () => {
    if (previewUrl) return;
    setPreviewLoading(true);
    try {
      // Download as blob to avoid cross-origin blocking and render PDF natively (no iframe)
      const { data, error } = await supabase.storage
        .from('crm-documents')
        .download(document.file_path);
      if (error) throw error;

      const blobUrl = URL.createObjectURL(data);
      setPreviewUrl(blobUrl);

      if (isPdf) {
        try {
          const pdfBuffer = await data.arrayBuffer();
          const pdf = await pdfjsLib.getDocument({
            data: pdfBuffer,
            stopAtErrors: false,
            isEvalSupported: false,
          }).promise;
          pdfDocumentRef.current = pdf;
          setPdfPages(pdf.numPages);
          setPdfCurrentPage(1);
          await renderPdfPage(pdf, 1);
        } catch (pdfRenderError) {
          console.error('PDF preview render error:', pdfRenderError);
          setPdfPreviewImage(null);
        }
      }
    } catch (err) {
      console.error('Preview error:', err);
    } finally {
      setPreviewLoading(false);
    }
  }, [document.file_path, isPdf, previewUrl, renderPdfPage]);

  const handlePreview = async () => {
    setShowPreview(true);
    await loadPreview();
  };

  const handleOpenPdf = () => {
    if (!previewUrl) return;

    const link = window.document.createElement('a');
    link.href = previewUrl;
    link.target = '_blank';
    link.rel = 'noopener';
    window.document.body.appendChild(link);
    link.click();
    window.document.body.removeChild(link);
  };

  const handlePdfPageChange = async (direction: 'prev' | 'next') => {
    if (!pdfDocumentRef.current || !pdfPages) return;

    const nextPage = direction === 'prev' ? pdfCurrentPage - 1 : pdfCurrentPage + 1;
    if (nextPage < 1 || nextPage > pdfPages) return;

    setPdfPageLoading(true);
    try {
      await renderPdfPage(pdfDocumentRef.current, nextPage);
      setPdfCurrentPage(nextPage);
    } catch (error) {
      console.error('PDF page navigation error:', error);
    } finally {
      setPdfPageLoading(false);
    }
  };

  const handlePreviewDialogChange = (open: boolean) => {
    setShowPreview(open);
    if (!open) {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      if (pdfDocumentRef.current) {
        pdfDocumentRef.current.destroy?.();
        pdfDocumentRef.current = null;
      }
      setPreviewUrl(null);
      setPdfPreviewImage(null);
      setPdfPages(null);
      setPdfCurrentPage(1);
      setPdfPageLoading(false);
    }
  };

  return (
    <>
      <div className={cn(
        "flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors",
        expiryStatus?.urgent && "border-destructive/30 bg-destructive/5"
      )}>
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="text-muted-foreground">
            {getFileIcon(document.file_type)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm truncate">{document.name}</p>
            <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
              {document.category && (
                <Badge variant="secondary" className="text-xs py-0 h-5">
                  {CATEGORY_LABELS[document.category as DocumentCategory] || document.category}
                </Badge>
              )}
              {document.version && document.version > 1 && (
                <Badge variant="outline" className="text-xs py-0 h-5">
                  <GitBranch className="h-3 w-3 mr-1" /> v{document.version}
                </Badge>
              )}
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
          {canPreview && (
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handlePreview} title="Anteprima">
              <Eye className="h-4 w-4" />
            </Button>
          )}
          {fetchHistory && (
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={openHistory} title="Storico e versioni">
              <History className="h-4 w-4" />
            </Button>
          )}
          {canEdit && onNewVersion && (
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onNewVersion(document)} title="Carica nuova versione">
              <GitBranch className="h-4 w-4" />
            </Button>
          )}
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

      {/* Preview Dialog */}
      <Dialog open={showPreview} onOpenChange={handlePreviewDialogChange}>
        <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-sm">
              {getFileIcon(document.file_type)}
              {document.name}
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 min-h-0 flex items-center justify-center bg-muted/30 rounded-lg overflow-hidden">
            {previewLoading ? (
              <div className="flex flex-col items-center gap-2 py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Caricamento anteprima...</p>
              </div>
            ) : previewUrl ? (
              isImage ? (
                <img
                  src={previewUrl}
                  alt={document.name}
                  className="max-w-full max-h-[65vh] object-contain"
                />
              ) : isPdf ? (
                <div className="w-full h-full flex flex-col items-center justify-center gap-3 p-3">
                  {pdfPreviewImage ? (
                    <img
                      src={pdfPreviewImage}
                      alt={`Anteprima PDF ${document.name}`}
                      className={cn(
                        'max-w-full max-h-[55vh] object-contain border rounded transition-opacity',
                        pdfPageLoading && 'opacity-60'
                      )}
                    />
                  ) : (
                    <p className="text-sm text-muted-foreground text-center">
                      Anteprima PDF non disponibile nel viewer interno di Brave.
                    </p>
                  )}
                  <div className="flex flex-wrap items-center justify-center gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handlePdfPageChange('prev')}
                      disabled={!pdfPages || pdfCurrentPage <= 1 || pdfPageLoading}
                      title="Pagina precedente"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Badge variant="secondary">
                      Pagina {pdfCurrentPage}{pdfPages ? `/${pdfPages}` : ''}
                    </Badge>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handlePdfPageChange('next')}
                      disabled={!pdfPages || pdfCurrentPage >= pdfPages || pdfPageLoading}
                      title="Pagina successiva"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleOpenPdf}>
                      Apri PDF in nuova scheda
                    </Button>
                    {pdfPageLoading && (
                      <Badge variant="outline" className="gap-1">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        Caricamento pagina
                      </Badge>
                    )}
                  </div>
                </div>
              ) : null
            ) : (
              <p className="text-sm text-muted-foreground py-12">Anteprima non disponibile</p>
            )}
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={onDownload}>
              <Download className="h-4 w-4 mr-1" /> Scarica
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
