import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";
import {
  Camera, Upload, X,
  ScanLine, FileText, Image as ImageIcon, Download,
  Share2, RotateCw, Sun, Contrast, Wand2,
} from "lucide-react";
import jsPDF from "jspdf";

interface DocScannerProps {
  onInsertText: (html: string) => void;
  onClose: () => void;
}

const SicurLensDocScanner = ({ onInsertText, onClose }: DocScannerProps) => {
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [enhancedImage, setEnhancedImage] = useState<string | null>(null);
  const [pdfGenerated, setPdfGenerated] = useState(false);

  // Enhancement controls
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [rotation, setRotation] = useState(0);
  const [grayscale, setGrayscale] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const handleImageCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setCapturedImage(reader.result as string);
      setEnhancedImage(null);
      setPdfGenerated(false);
      setBrightness(100);
      setContrast(100);
      setRotation(0);
      setGrayscale(false);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  // Apply enhancements via canvas
  const applyEnhancements = useCallback(() => {
    if (!capturedImage || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const img = new window.Image();
    img.onload = () => {
      const isRotated = rotation === 90 || rotation === 270;
      canvas.width = isRotated ? img.height : img.width;
      canvas.height = isRotated ? img.width : img.height;

      ctx.save();
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate((rotation * Math.PI) / 180);
      ctx.filter = `brightness(${brightness}%) contrast(${contrast}%)${grayscale ? " grayscale(100%)" : ""}`;
      ctx.drawImage(img, -img.width / 2, -img.height / 2);
      ctx.restore();

      setEnhancedImage(canvas.toDataURL("image/jpeg", 0.92));
    };
    img.src = capturedImage;
  }, [capturedImage, brightness, contrast, rotation, grayscale]);

  useEffect(() => {
    if (capturedImage) applyEnhancements();
  }, [capturedImage, brightness, contrast, rotation, grayscale, applyEnhancements]);

  const autoEnhance = () => {
    setBrightness(110);
    setContrast(130);
    setGrayscale(false);
    toast.success("Miglioramento automatico applicato");
  };

  const scanToGrayscale = () => {
    setBrightness(105);
    setContrast(150);
    setGrayscale(true);
    toast.success("Modalità scanner B/N applicata");
  };

  // Generate and download clean PDF from enhanced image
  const generatePDF = () => {
    const imageToUse = enhancedImage || capturedImage;
    if (!imageToUse) return;

    const img = new window.Image();
    img.onload = () => {
      // A4 dimensions in mm
      const a4Width = 210;
      const a4Height = 297;
      const margin = 10;
      const usableWidth = a4Width - margin * 2;
      const usableHeight = a4Height - margin * 2;

      const imgRatio = img.width / img.height;
      const usableRatio = usableWidth / usableHeight;

      let drawWidth: number;
      let drawHeight: number;

      if (imgRatio > usableRatio) {
        // Image wider than usable area
        drawWidth = usableWidth;
        drawHeight = usableWidth / imgRatio;
      } else {
        // Image taller than usable area
        drawHeight = usableHeight;
        drawWidth = usableHeight * imgRatio;
      }

      const orientation = img.width > img.height ? "landscape" : "portrait";
      const pdf = new jsPDF({ orientation, unit: "mm", format: "a4" });

      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();

      // Recalculate for actual page orientation
      const effUsableW = pageW - margin * 2;
      const effUsableH = pageH - margin * 2;

      if (imgRatio > effUsableW / effUsableH) {
        drawWidth = effUsableW;
        drawHeight = effUsableW / imgRatio;
      } else {
        drawHeight = effUsableH;
        drawWidth = effUsableH * imgRatio;
      }

      // Center the image
      const x = (pageW - drawWidth) / 2;
      const y = (pageH - drawHeight) / 2;

      pdf.addImage(imageToUse, "JPEG", x, y, drawWidth, drawHeight);
      pdf.save(`scansione_${new Date().toISOString().slice(0, 10)}_${Date.now()}.pdf`);

      setPdfGenerated(true);
      toast.success("PDF generato e scaricato");
    };
    img.src = imageToUse;
  };

  // Share via Web Share API
  const shareDocument = async () => {
    const imageToUse = enhancedImage || capturedImage;
    if (!imageToUse) return;

    try {
      const blob = await (await fetch(imageToUse)).blob();
      const file = new File([blob], "documento_scansionato.jpg", { type: "image/jpeg" });

      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          title: "Documento scansionato",
          text: "Documento scansionato con SicurLens",
          files: [file],
        });
      } else {
        await navigator.clipboard.write([
          new ClipboardItem({ "image/jpeg": blob }),
        ]);
        toast.success("Immagine copiata negli appunti");
      }
    } catch (err) {
      console.error("Share error:", err);
      toast.error("Condivisione non disponibile");
    }
  };

  const handleInsertImage = () => {
    const imageToUse = enhancedImage || capturedImage;
    if (!imageToUse) return;
    onInsertText(`<img src="${imageToUse}" alt="Documento scansionato" style="max-width:100%" />`);
    toast.success("Immagine inserita nella nota");
    onClose();
  };

  const displayImage = enhancedImage || capturedImage;

  return (
    <div className="flex flex-col gap-3">
      {/* Capture area */}
      {!capturedImage ? (
        <div className="flex flex-col items-center gap-3 py-6">
          <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-2">
            <ScanLine className="h-8 w-8 text-primary" />
          </div>
          <p className="text-sm text-muted-foreground text-center max-w-xs">
            Scatta una foto al documento o carica un'immagine per generare un PDF pulito e migliorato digitalmente
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => cameraInputRef.current?.click()}>
              <Camera className="h-3.5 w-3.5 mr-1.5" /> Scatta foto
            </Button>
            <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
              <Upload className="h-3.5 w-3.5 mr-1.5" /> Carica immagine
            </Button>
          </div>
        </div>
      ) : (
        <>
          {/* Enhancement controls */}
          <div className="space-y-2 p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-foreground">Regolazioni immagine</span>
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={autoEnhance} title="Miglioramento automatico">
                  <Wand2 className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={scanToGrayscale} title="Scanner B/N">
                  <FileText className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost" size="icon" className="h-6 w-6"
                  onClick={() => setRotation((r) => (r + 90) % 360)}
                  title="Ruota 90°"
                >
                  <RotateCw className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost" size="icon" className="h-6 w-6"
                  onClick={() => {
                    setCapturedImage(null);
                    setEnhancedImage(null);
                    setPdfGenerated(false);
                  }}
                  title="Rimuovi"
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Sun className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <Slider
                value={[brightness]}
                onValueChange={([v]) => setBrightness(v)}
                min={50} max={200} step={5}
                className="flex-1"
              />
              <span className="text-[10px] text-muted-foreground w-8 text-right">{brightness}%</span>
            </div>
            <div className="flex items-center gap-2">
              <Contrast className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <Slider
                value={[contrast]}
                onValueChange={([v]) => setContrast(v)}
                min={50} max={250} step={5}
                className="flex-1"
              />
              <span className="text-[10px] text-muted-foreground w-8 text-right">{contrast}%</span>
            </div>
          </div>

          {/* Image preview */}
          <div className="relative">
            <img
              src={displayImage!}
              alt="Documento"
              className="w-full max-h-52 object-contain rounded-lg bg-muted"
            />
          </div>

          {/* Actions */}
          <Button onClick={generatePDF} className="w-full">
            <Download className="h-4 w-4 mr-2" /> Genera PDF
          </Button>

          {/* Secondary actions */}
          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="flex-1" onClick={handleInsertImage}>
              <ImageIcon className="h-3.5 w-3.5 mr-1" /> Inserisci nella nota
            </Button>
            <Button size="sm" variant="outline" onClick={shareDocument}>
              <Share2 className="h-3.5 w-3.5 mr-1" /> Condividi
            </Button>
          </div>
        </>
      )}

      <canvas ref={canvasRef} className="hidden" />
      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageCapture} />
      <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleImageCapture} />
    </div>
  );
};

export default SicurLensDocScanner;
