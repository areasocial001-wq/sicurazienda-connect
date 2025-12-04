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
import { Download, Copy, Check, Mail, Loader2 } from "lucide-react";
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
  const [email, setEmail] = useState('');
  const [sendingEmail, setSendingEmail] = useState(false);
  const [qrCodeId, setQrCodeId] = useState<string | null>(null);
  const [trackingUrl, setTrackingUrl] = useState<string>(url);
  const [initializing, setInitializing] = useState(false);
  const qrRef = useRef<SVGSVGElement>(null);
  const { user } = useAuth();

  // Get the base URL for tracking
  const getBaseUrl = () => {
    return window.location.origin;
  };

  // Create QR code record when modal opens
  useEffect(() => {
    const initializeQRCode = async () => {
      if (!open || !user || !documentId || qrCodeId) return;

      setInitializing(true);
      try {
        const { data, error } = await supabase
          .from('qr_codes')
          .insert({
            document_id: documentId,
            document_name: fileName,
            public_url: url,
            created_by: user.id
          })
          .select()
          .single();

        if (error) throw error;

        setQrCodeId(data.id);
        setTrackingUrl(`${getBaseUrl()}/qr/${data.id}`);
        
        if (onQRGenerated) {
          onQRGenerated();
        }
      } catch (error) {
        console.error('Error creating QR code record:', error);
        // Fallback to direct URL
        setTrackingUrl(url);
      } finally {
        setInitializing(false);
      }
    };

    initializeQRCode();
  }, [open, user, documentId, fileName, url]);

  // Reset state when modal closes
  useEffect(() => {
    if (!open) {
      setQrCodeId(null);
      setTrackingUrl(url);
      setEmail('');
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

  const handleSendEmail = async () => {
    if (!email) {
      toast.error('Inserisci un indirizzo email');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error('Inserisci un indirizzo email valido');
      return;
    }

    setSendingEmail(true);

    try {
      const qrCodeBase64 = getQRCodeBase64();

      const { data, error } = await supabase.functions.invoke('send-qr-email', {
        body: {
          recipientEmail: email,
          documentName: fileName,
          downloadUrl: trackingUrl,
          qrCodeBase64
        }
      });

      if (error) throw error;

      // Update QR code record with email info
      if (qrCodeId) {
        await supabase
          .from('qr_codes')
          .update({
            sent_to_email: email,
            sent_at: new Date().toISOString()
          })
          .eq('id', qrCodeId);
      }

      toast.success(`Email inviata a ${email}`);
      setEmail('');
    } catch (error: any) {
      console.error('Error sending email:', error);
      toast.error(error.message || 'Errore nell\'invio dell\'email');
    } finally {
      setSendingEmail(false);
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
                <p className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded">
                  ✓ Tracciamento scansioni attivo
                </p>
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

              <div className="w-full border-t pt-4">
                <Label htmlFor="email" className="text-sm font-medium">
                  Invia QR Code via Email
                </Label>
                <div className="flex gap-2 mt-2">
                  <Input
                    id="email"
                    type="email"
                    placeholder="cliente@esempio.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="flex-1"
                  />
                  <Button
                    onClick={handleSendEmail}
                    disabled={sendingEmail || !email}
                  >
                    {sendingEmail ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Mail className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default QRCodeModal;
