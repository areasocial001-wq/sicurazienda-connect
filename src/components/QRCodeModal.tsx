import { useState, useRef, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, Copy, Check, Loader2, Clock, Share2, FileText } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

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
  const qrRef = useRef<SVGSVGElement>(null);
  const { user } = useAuth();

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
      setTrackingUrl(`${getBaseUrl()}/qr/${data.id}`);
      setExpiresAt(expiry);
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
    }
  }, [open, url]);

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

  const getFullMessage = () => {
    const expiryDate = expiresAt?.toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' });
    return `📄 ${fileName}\n\nScarica il documento:\n${trackingUrl}\n\nScade il ${expiryDate}`;
  };

  const handleCopyMessage = async () => {
    try {
      await navigator.clipboard.writeText(getFullMessage());
      setCopiedMessage(true);
      toast.success('Messaggio copiato negli appunti');
      setTimeout(() => setCopiedMessage(false), 2000);
    } catch (error) {
      toast.error('Errore durante la copia');
    }
  };

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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center">QR Code per Download</DialogTitle>
        </DialogHeader>
        
        <div className="flex flex-col items-center space-y-4 py-4">
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
              {/* Copy full message button */}
              <Button
                onClick={handleCopyMessage}
                variant="secondary"
                className="w-full"
              >
                {copiedMessage ? (
                  <Check className="h-4 w-4 mr-2" />
                ) : (
                  <FileText className="h-4 w-4 mr-2" />
                )}
                {copiedMessage ? 'Messaggio copiato!' : 'Copia messaggio completo'}
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default QRCodeModal;
