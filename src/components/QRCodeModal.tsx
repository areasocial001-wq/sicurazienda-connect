import { useState, useRef, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, Copy, Check, Loader2, Clock, Share2, FileText, Mail, Save, Trash2, Pencil, X, Send, AlertCircle, History } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface SavedTemplate {
  id: string;
  name: string;
  content: string;
}

interface QRCodeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  url: string;
  fileName: string;
  documentId?: string;
  onQRGenerated?: () => void;
}

const QRCodeModal = ({ open, onOpenChange, url, fileName, documentId, onQRGenerated }: QRCodeModalProps) => {
  const [copied, setCopied] = useState(false);
  const [copiedMessage, setCopiedMessage] = useState(false);
  const [qrCodeId, setQrCodeId] = useState<string | null>(null);
  const [trackingUrl, setTrackingUrl] = useState<string>(url);
  const [initializing, setInitializing] = useState(false);
  const [expiryDays, setExpiryDays] = useState<string>("7");
  const [expiresAt, setExpiresAt] = useState<Date | null>(null);
  const [step, setStep] = useState<'config' | 'generated'>('config');
  const [customMessage, setCustomMessage] = useState<string>('');
  const [selectedTemplate, setSelectedTemplate] = useState<string>('standard');
  const [savedTemplates, setSavedTemplates] = useState<SavedTemplate[]>([]);
  const [showSaveInput, setShowSaveInput] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState('');
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [editingTemplateName, setEditingTemplateName] = useState('');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailSentHistory, setEmailSentHistory] = useState<Array<{email: string; sent_at: string}>>([]);
  const [showMailtoFallback, setShowMailtoFallback] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const qrRef = useRef<SVGSVGElement>(null);
  const { user } = useAuth();

  // Load saved templates
  useEffect(() => {
    if (user) {
      loadSavedTemplates();
    }
  }, [user]);

  const loadSavedTemplates = async () => {
    if (!user) return;
    
    const { data, error } = await supabase
      .from('message_templates')
      .select('id, name, content')
      .eq('user_id', user.id)
      .order('name');
    
    if (!error && data) {
      setSavedTemplates(data);
    }
  };

  const handleSaveTemplate = async () => {
    if (!user || !newTemplateName.trim() || !customMessage.trim()) {
      toast.error('Inserisci un nome per il template');
      return;
    }

    setSavingTemplate(true);
    try {
      const { error } = await supabase
        .from('message_templates')
        .insert({
          user_id: user.id,
          name: newTemplateName.trim(),
          content: customMessage
        });

      if (error) throw error;

      toast.success('Template salvato');
      setNewTemplateName('');
      setShowSaveInput(false);
      loadSavedTemplates();
    } catch (error) {
      console.error('Error saving template:', error);
      toast.error('Errore nel salvataggio del template');
    } finally {
      setSavingTemplate(false);
    }
  };

  const handleDeleteTemplate = async (templateId: string) => {
    try {
      const { error } = await supabase
        .from('message_templates')
        .delete()
        .eq('id', templateId);

      if (error) throw error;

      toast.success('Template eliminato');
      loadSavedTemplates();
      
      // Reset selection if deleted template was selected
      if (selectedTemplate === `saved_${templateId}`) {
        setSelectedTemplate('standard');
      }
    } catch (error) {
      console.error('Error deleting template:', error);
      toast.error('Errore nell\'eliminazione del template');
    }
  };

  const handleStartEditTemplate = (template: SavedTemplate) => {
    setEditingTemplateId(template.id);
    setEditingTemplateName(template.name);
    setCustomMessage(template.content);
    setSelectedTemplate(`saved_${template.id}`);
  };

  const handleUpdateTemplate = async () => {
    if (!editingTemplateId || !editingTemplateName.trim() || !customMessage.trim()) {
      toast.error('Inserisci un nome per il template');
      return;
    }

    setSavingTemplate(true);
    try {
      const { error } = await supabase
        .from('message_templates')
        .update({
          name: editingTemplateName.trim(),
          content: customMessage
        })
        .eq('id', editingTemplateId);

      if (error) throw error;

      toast.success('Template aggiornato');
      setEditingTemplateId(null);
      setEditingTemplateName('');
      loadSavedTemplates();
    } catch (error) {
      console.error('Error updating template:', error);
      toast.error('Errore nell\'aggiornamento del template');
    } finally {
      setSavingTemplate(false);
    }
  };

  const handleCancelEdit = () => {
    setEditingTemplateId(null);
    setEditingTemplateName('');
    setSelectedTemplate('standard');
    if (expiresAt) {
      const expiryDate = expiresAt.toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' });
      const templates = getMessageTemplates(fileName, trackingUrl, expiryDate);
      setCustomMessage(templates.standard);
    }
  };

  // Message templates
  const getMessageTemplates = (docName: string, docUrl: string, expiry: string) => ({
    standard: `Scarica il documento "${docName}" usando questo link:\n\n${docUrl}\n\nIl link scadrà il ${expiry}`,
    formale: `Gentile Cliente,\n\nLe inviamo il documento "${docName}" richiesto.\n\nPuò scaricarlo al seguente link:\n${docUrl}\n\nAttenzione: il link sarà valido fino al ${expiry}.\n\nCordiali saluti`,
    breve: `📄 ${docName}\n${docUrl}\n\nScade: ${expiry}`,
    promemoria: `PROMEMORIA DOCUMENTO\n\nDocumento: ${docName}\nLink download: ${docUrl}\n\n⚠️ Scadenza link: ${expiry}\n\nScarica il documento prima della scadenza.`
  });

  // Get the base URL for tracking
  const getBaseUrl = () => {
    return window.location.origin;
  };

  const generateQRCode = async () => {
    if (!user || !documentId) return;

    setInitializing(true);
    try {
      const days = parseInt(expiryDays);
      const expiry = new Date();
      expiry.setDate(expiry.getDate() + days);

      const { data, error } = await supabase
        .from('qr_codes')
        .insert({
          document_id: documentId,
          document_name: fileName,
          public_url: url,
          created_by: user.id,
          expires_at: expiry.toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      setQrCodeId(data.id);
      const newTrackingUrl = `${getBaseUrl()}/qr/${data.id}`;
      setTrackingUrl(newTrackingUrl);
      setExpiresAt(expiry);
      
      // Set default message with the new URL
      const expiryDate = expiry.toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' });
      const templates = getMessageTemplates(fileName, newTrackingUrl, expiryDate);
      setCustomMessage(templates.standard);
      setSelectedTemplate('standard');
      
      setStep('generated');
      
      if (onQRGenerated) {
        onQRGenerated();
      }
    } catch (error) {
      console.error('Error creating QR code record:', error);
      toast.error('Errore nella generazione del QR Code');
    } finally {
      setInitializing(false);
    }
  };

  // Reset state when modal closes
  useEffect(() => {
    if (!open) {
      setQrCodeId(null);
      setTrackingUrl(url);
      setExpiryDays("7");
      setExpiresAt(null);
      setStep('config');
      setCustomMessage('');
      setSelectedTemplate('standard');
    }
  }, [open, url]);

  const handleTemplateChange = (templateKey: string) => {
    setSelectedTemplate(templateKey);
    
    if (templateKey.startsWith('saved_')) {
      const templateId = templateKey.replace('saved_', '');
      const savedTemplate = savedTemplates.find(t => t.id === templateId);
      if (savedTemplate && expiresAt) {
        // Replace placeholders in saved template
        const expiryDate = expiresAt.toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' });
        const content = savedTemplate.content
          .replace(/\{fileName\}/g, fileName)
          .replace(/\{link\}/g, trackingUrl)
          .replace(/\{expiry\}/g, expiryDate);
        setCustomMessage(content);
      }
    } else if (templateKey !== 'personalizzato' && expiresAt) {
      const expiryDate = expiresAt.toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' });
      const templates = getMessageTemplates(fileName, trackingUrl, expiryDate);
      setCustomMessage(templates[templateKey as keyof typeof templates] || '');
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(trackingUrl);
      setCopied(true);
      toast.success('Link copiato negli appunti');
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error('Errore durante la copia del link');
    }
  };

  const handleCopyMessage = async () => {
    try {
      await navigator.clipboard.writeText(customMessage);
      setCopiedMessage(true);
      toast.success('Messaggio copiato negli appunti');
      setTimeout(() => setCopiedMessage(false), 2000);
    } catch (error) {
      toast.error('Errore durante la copia');
    }
  };

  const handleOpenEmailClient = () => {
    const subject = encodeURIComponent(`Documento: ${fileName}`);
    const body = encodeURIComponent(customMessage);
    const mailtoUrl = `mailto:?subject=${subject}&body=${body}`;

    // In preview/iframes some navigation methods can be blocked: try an <a> click first.
    try {
      const a = document.createElement('a');
      a.href = mailtoUrl;
      a.target = '_top';
      a.rel = 'noreferrer';
      document.body.appendChild(a);
      a.click();
      a.remove();
      
      // Show fallback after a short delay (user might not have email client)
      setTimeout(() => {
        setShowMailtoFallback(true);
      }, 1500);
    } catch {
      setShowMailtoFallback(true);
    }
  };

  const loadEmailHistory = async () => {
    if (!qrCodeId) return;
    
    const { data, error } = await supabase
      .from('qr_codes')
      .select('sent_to_email, sent_at')
      .eq('id', qrCodeId)
      .single();
    
    if (!error && data && data.sent_to_email) {
      // For now we only have one email per QR, but structure allows for future expansion
      setEmailSentHistory([{ email: data.sent_to_email, sent_at: data.sent_at || '' }]);
    }
  };

  const handleSendDirectEmail = async () => {
    if (!recipientEmail.trim() || !qrCodeId) {
      toast.error('Inserisci un indirizzo email valido');
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(recipientEmail.trim())) {
      toast.error('Formato email non valido');
      return;
    }

    setSendingEmail(true);
    try {
      const qrCodeBase64 = getQRCodeBase64();
      
      const { data, error } = await supabase.functions.invoke('send-qr-email', {
        body: {
          recipientEmail: recipientEmail.trim(),
          documentName: fileName,
          downloadUrl: trackingUrl,
          qrCodeBase64
        }
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error || 'Errore invio email');

      // Update qr_codes record with sent info
      await supabase
        .from('qr_codes')
        .update({
          sent_to_email: recipientEmail.trim(),
          sent_at: new Date().toISOString()
        })
        .eq('id', qrCodeId);

      toast.success(`Email inviata a ${recipientEmail}`);
      setEmailSentHistory(prev => [...prev, { email: recipientEmail.trim(), sent_at: new Date().toISOString() }]);
      setRecipientEmail('');
    } catch (error: any) {
      console.error('Error sending email:', error);
      toast.error(error.message || 'Errore nell\'invio dell\'email');
    } finally {
      setSendingEmail(false);
    }
  };

  // Load email history when QR is generated
  useEffect(() => {
    if (qrCodeId) {
      loadEmailHistory();
    }
  }, [qrCodeId]);

  const getQRCodeBase64 = (): string => {
    const svg = document.getElementById('qr-code-svg');
    if (!svg) return '';

    const svgData = new XMLSerializer().serializeToString(svg);
    return 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
  };

  const handleDownloadQR = () => {
    const svg = document.getElementById('qr-code-svg');
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx?.drawImage(img, 0, 0);
      const pngFile = canvas.toDataURL('image/png');
      
      const downloadLink = document.createElement('a');
      downloadLink.download = `qr-${fileName}.png`;
      downloadLink.href = pngFile;
      downloadLink.click();
      
      toast.success('QR Code scaricato');
    };
    
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
  };

  const canNativeShare = typeof navigator !== 'undefined' && !!navigator.share;

  const handleNativeShare = async () => {
    const expiryDate = expiresAt?.toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' });
    const shareData = {
      title: fileName,
      text: `📄 ${fileName} - Scarica il documento (scade il ${expiryDate})`,
      url: trackingUrl
    };

    try {
      await navigator.share(shareData);
      toast.success('Link condiviso');
    } catch (error: any) {
      // User cancelled or share failed
      if (error.name !== 'AbortError') {
        toast.error('Impossibile condividere');
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-center">QR Code per Download</DialogTitle>
        </DialogHeader>
        
        <div className="flex flex-col items-center space-y-3 py-2">
          {initializing ? (
            <div className="flex flex-col items-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
              <p className="text-sm text-muted-foreground">Generazione QR Code...</p>
            </div>
          ) : step === 'config' ? (
            <div className="w-full space-y-4">
              <p className="text-sm text-muted-foreground text-center">
                Configura il QR Code per: <strong>{fileName}</strong>
              </p>
              
              <div className="space-y-2">
                <Label>Durata validità link</Label>
                <Select value={expiryDays} onValueChange={setExpiryDays}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleziona durata" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 giorno</SelectItem>
                    <SelectItem value="7">7 giorni</SelectItem>
                    <SelectItem value="14">14 giorni</SelectItem>
                    <SelectItem value="30">30 giorni</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Il link scadrà automaticamente dopo il periodo selezionato
                </p>
              </div>
              
              <Button onClick={generateQRCode} className="w-full" disabled={initializing}>
                Genera QR Code
              </Button>
            </div>
          ) : (
            <>
              <div className="bg-white p-4 rounded-lg shadow-inner">
                <QRCodeSVG
                  id="qr-code-svg"
                  ref={qrRef}
                  value={trackingUrl}
                  size={200}
                  level="H"
                  includeMargin={true}
                />
              </div>
              
              <p className="text-sm text-muted-foreground text-center max-w-xs">
                Scansiona questo QR code per scaricare: <strong>{fileName}</strong>
              </p>

              {qrCodeId && (
                <div className="flex flex-col items-center gap-1">
                  <p className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded">
                    ✓ Tracciamento scansioni attivo
                  </p>
                  {expiresAt && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Scade il {expiresAt.toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </p>
                  )}
                </div>
              )}
              
              <div className="flex gap-2 w-full">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={handleCopyLink}
                >
                  {copied ? (
                    <Check className="h-4 w-4 mr-2" />
                  ) : (
                    <Copy className="h-4 w-4 mr-2" />
                  )}
                  {copied ? 'Copiato!' : 'Copia Link'}
                </Button>
                
                <Button
                  className="flex-1"
                  onClick={handleDownloadQR}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Scarica QR
                </Button>
              </div>

              {/* Native share or link display */}
              {canNativeShare ? (
                <Button
                  onClick={handleNativeShare}
                  variant="outline"
                  className="w-full"
                >
                  <Share2 className="h-4 w-4 mr-2" />
                  Condividi link
                </Button>
              ) : (
                <div className="w-full p-3 bg-muted rounded-lg">
                  <Label className="text-xs text-muted-foreground">Link diretto (copialo e incollalo ovunque)</Label>
                  <p className="text-xs font-mono break-all mt-1 select-all">{trackingUrl}</p>
                </div>
              )}
              {/* Customizable message */}
              <div className="w-full space-y-3 border-t pt-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Modello messaggio</Label>
                  <Select value={selectedTemplate} onValueChange={handleTemplateChange}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Seleziona modello" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="standard">Standard</SelectItem>
                      <SelectItem value="formale">Formale</SelectItem>
                      <SelectItem value="breve">Breve</SelectItem>
                      <SelectItem value="promemoria">Promemoria</SelectItem>
                      {savedTemplates.length > 0 && (
                        <>
                          <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground border-t mt-1">
                            I tuoi template
                          </div>
                          {savedTemplates.map((template) => (
                            <div key={template.id} className="flex items-center justify-between pr-2">
                              <SelectItem value={`saved_${template.id}`} className="flex-1">
                                {template.name}
                              </SelectItem>
                              <div className="flex gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6 text-muted-foreground hover:text-primary"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleStartEditTemplate(template);
                                  }}
                                >
                                  <Pencil className="h-3 w-3" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6 text-destructive hover:text-destructive"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteTemplate(template.id);
                                  }}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </>
                      )}
                      <SelectItem value="personalizzato">Personalizzato</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Textarea
                  value={customMessage}
                  onChange={(e) => {
                    setCustomMessage(e.target.value);
                    setSelectedTemplate('personalizzato');
                  }}
                  rows={4}
                  className="text-sm resize-none"
                  placeholder="Personalizza il messaggio..."
                />
                
                {/* Edit template section */}
                {editingTemplateId ? (
                  <div className="space-y-2 p-3 bg-muted/50 rounded-lg border">
                    <Label className="text-xs font-medium">Modifica template</Label>
                    <div className="flex gap-2">
                      <Input
                        value={editingTemplateName}
                        onChange={(e) => setEditingTemplateName(e.target.value)}
                        placeholder="Nome template..."
                        className="flex-1 text-sm"
                      />
                      <Button
                        onClick={handleUpdateTemplate}
                        size="sm"
                        disabled={savingTemplate || !editingTemplateName.trim()}
                      >
                        {savingTemplate ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                      </Button>
                      <Button
                        onClick={handleCancelEdit}
                        size="sm"
                        variant="ghost"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">Modifica il contenuto sopra e salva</p>
                  </div>
                ) : showSaveInput ? (
                  <div className="flex gap-2">
                    <Input
                      value={newTemplateName}
                      onChange={(e) => setNewTemplateName(e.target.value)}
                      placeholder="Nome template..."
                      className="flex-1 text-sm"
                    />
                    <Button
                      onClick={handleSaveTemplate}
                      size="sm"
                      disabled={savingTemplate || !newTemplateName.trim()}
                    >
                      {savingTemplate ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                    </Button>
                    <Button
                      onClick={() => {
                        setShowSaveInput(false);
                        setNewTemplateName('');
                      }}
                      size="sm"
                      variant="ghost"
                    >
                      ✕
                    </Button>
                  </div>
                ) : (
                  <Button
                    onClick={() => setShowSaveInput(true)}
                    variant="ghost"
                    size="sm"
                    className="w-full text-xs"
                  >
                    <Save className="h-3 w-3 mr-1" />
                    Salva come template
                  </Button>
                )}
                
                <div className="flex gap-2 w-full">
                  <Button
                    onClick={handleCopyMessage}
                    variant="secondary"
                    className="flex-1"
                  >
                    {copiedMessage ? (
                      <Check className="h-4 w-4 mr-2" />
                    ) : (
                      <FileText className="h-4 w-4 mr-2" />
                    )}
                    {copiedMessage ? 'Copiato!' : 'Copia'}
                  </Button>
                  <Button
                    onClick={handleOpenEmailClient}
                    variant="outline"
                    className="flex-1"
                  >
                    <Mail className="h-4 w-4 mr-2" />
                    Apri Email
                  </Button>
                </div>
                
                {/* Mailto fallback */}
                {showMailtoFallback && (
                  <Alert className="bg-amber-50 border-amber-200">
                    <AlertCircle className="h-4 w-4 text-amber-600" />
                    <AlertDescription className="text-xs text-amber-800">
                      <strong>Non si è aperto il client email?</strong>
                      <br />
                      Copia il messaggio con il pulsante sopra e incollalo manualmente nella tua email.
                      <br />
                      <span className="text-amber-600">Oppure usa l'invio diretto qui sotto.</span>
                    </AlertDescription>
                  </Alert>
                )}
                
                {/* Direct email send */}
                <div className="w-full space-y-2 border-t pt-3">
                  <Label className="text-sm font-medium flex items-center gap-2">
                    <Send className="h-4 w-4" />
                    Invia email direttamente
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      type="email"
                      value={recipientEmail}
                      onChange={(e) => setRecipientEmail(e.target.value)}
                      placeholder="email@destinatario.com"
                      className="flex-1 text-sm"
                    />
                    <Button
                      onClick={handleSendDirectEmail}
                      disabled={sendingEmail || !recipientEmail.trim()}
                      size="sm"
                    >
                      {sendingEmail ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    L'email verrà inviata con QR code e link di download
                  </p>
                  
                  {/* Email history */}
                  {emailSentHistory.length > 0 && (
                    <div className="mt-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full text-xs"
                        onClick={() => setShowHistory(!showHistory)}
                      >
                        <History className="h-3 w-3 mr-1" />
                        Storico invii ({emailSentHistory.length})
                      </Button>
                      {showHistory && (
                        <div className="mt-2 p-2 bg-muted/50 rounded text-xs space-y-1">
                          {emailSentHistory.map((item, idx) => (
                            <div key={idx} className="flex justify-between items-center">
                              <span className="font-medium">{item.email}</span>
                              <span className="text-muted-foreground">
                                {item.sent_at ? new Date(item.sent_at).toLocaleDateString('it-IT', { 
                                  day: '2-digit', 
                                  month: 'short', 
                                  hour: '2-digit', 
                                  minute: '2-digit' 
                                }) : '-'}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
                
                <p className="text-xs text-muted-foreground text-center">
                  Usa {'{fileName}'}, {'{link}'}, {'{expiry}'} nei template salvati
                </p>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default QRCodeModal;
