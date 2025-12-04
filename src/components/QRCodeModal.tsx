import { QRCodeSVG } from 'qrcode.react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, Copy, Check } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface QRCodeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  url: string;
  fileName: string;
}

const QRCodeModal = ({ open, onOpenChange, url, fileName }: QRCodeModalProps) => {
  const [copied, setCopied] = useState(false);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success('Link copiato negli appunti');
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error('Errore durante la copia del link');
    }
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center">QR Code per Download</DialogTitle>
        </DialogHeader>
        
        <div className="flex flex-col items-center space-y-4 py-4">
          <div className="bg-white p-4 rounded-lg shadow-inner">
            <QRCodeSVG
              id="qr-code-svg"
              value={url}
              size={200}
              level="H"
              includeMargin={true}
            />
          </div>
          
          <p className="text-sm text-muted-foreground text-center max-w-xs">
            Scansiona questo QR code per scaricare direttamente: <strong>{fileName}</strong>
          </p>
          
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
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default QRCodeModal;
