import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  Camera, Upload, Loader2, Copy, Check, X,
  ScanLine, FileText, Image as ImageIcon, Download,
  Share2, RotateCw, Sun, Contrast, Wand2,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import jsPDF from "jspdf";

interface DocScannerProps {
  onInsertText: (html: string) => void;
  onClose: () => void;
}

const SicurLensDocScanner = ({ onInsertText, onClose }: DocScannerProps) => {
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [enhancedImage, setEnhancedImage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [extractedText, setExtractedText] = useState<string | null>(null);
  const [docType, setDocType] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [resultTab, setResultTab] = useState<"original" | "text">("original");

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
      setExtractedText(null);
      setDocType(null);
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
      // Handle rotation dimensions
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

  // AI analysis
  const analyzeDocument = async () => {
    const imageToSend = enhancedImage || capturedImage;
    if (!imageToSend) return;
    setIsAnalyzing(true);

    try {
      const { data, error } = await supabase.functions.invoke("vision-ai", {
        body: { image_base64: imageToSend, mode: "document" },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const raw = data.result as string;
      // Extract doc type from "**Tipo documento:** ..."
      const typeMatch = raw.match(/\*\*Tipo documento:\*\*\s*(.+)/i);
      if (typeMatch) setDocType(typeMatch[1].trim());
      setExtractedText(raw);
      setResultTab("text");
    } catch (err: any) {
      console.error("Doc scan error:", err);
      toast.error(err.message || "Errore nell'analisi del documento");
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Export PDF
  const exportPDF = () => {
    const imageToUse = enhancedImage || capturedImage;
    if (!imageToUse) return;

    const img = new window.Image();
    img.onload = () => {
      const pdf = new jsPDF({
        orientation: img.width > img.height ? "landscape" : "portrait",
        unit: "px",
        format: [img.width, img.height],
      });
      pdf.addImage(imageToUse, "JPEG", 0, 0, img.width, img.height);

      // If we have extracted text, add a second page with OCR text
      if (extractedText) {
        pdf.addPage();
        pdf.setFontSize(11);
        const lines = pdf.splitTextToSize(
          extractedText.replace(/\*\*/g, "").replace(/\n/g, "\n"),
          pdf.internal.pageSize.getWidth() - 40
        );
        pdf.text(lines, 20, 30);
      }

      pdf.save(`documento_scansionato_${Date.now()}.pdf`);
      toast.success("PDF scaricato");
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
          text: docType ? `Tipo: ${docType}` : "Documento scansionato con SicurLens",
          files: [file],
        });
      } else {
        // Fallback: copy image to clipboard
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

  const handleCopyText = () => {
    if (!extractedText) return;
    navigator.clipboard.writeText(extractedText.replace(/\*\*/g, ""));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleInsertText = () => {
    if (!extractedText) return;
    const html = extractedText
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      .replace(/\n/g, "<br/>");
    onInsertText(html);
    toast.success("Testo inserito nella nota");
    onClose();
  };

  const handleInsertImage = () => {
    const imageToUse = enhancedImage || capturedImage;
    if (!imageToUse) return;
    onInsertText(`<img src="${imageToUse}" alt="Documento scansionato" style="max-width:100%" />`);
    toast.success("Immagine inserita nella nota");
    onClose();
  };

  const displayImage = enhancedImage || capturedImage;
  const hasResult = !!extractedText;

  return (
    <div className="flex flex-col gap-3">
      {/* Capture area */}
      {!capturedImage ? (
        <div className="flex flex-col items-center gap-3 py-6">
          <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-2">
            <ScanLine className="h-8 w-8 text-primary" />
          </div>
          <p className="text-sm text-muted-foreground text-center max-w-xs">
            Scatta una foto al documento o carica un'immagine per ottenere una scansione digitale di alta qualità
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
                    setExtractedText(null);
                    setDocType(null);
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

          {/* Results area */}
          {hasResult ? (
            <Tabs value={resultTab} onValueChange={(v) => setResultTab(v as any)} className="flex flex-col min-h-0">
              <TabsList className="grid grid-cols-2 mb-2">
                <TabsTrigger value="original" className="gap-1.5 text-xs">
                  <ImageIcon className="h-3.5 w-3.5" /> Originale
                </TabsTrigger>
                <TabsTrigger value="text" className="gap-1.5 text-xs">
                  <FileText className="h-3.5 w-3.5" /> Testo estratto
                </TabsTrigger>
              </TabsList>

              <TabsContent value="original" className="mt-0">
                <div className="relative">
                  <img
                    src={displayImage!}
                    alt="Documento scansionato"
                    className="w-full max-h-52 object-contain rounded-lg bg-muted"
                  />
                  {docType && (
                    <div className="absolute top-2 left-2 bg-background/90 backdrop-blur-sm px-2 py-0.5 rounded text-[10px] font-medium text-primary border">
                      {docType}
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="text" className="mt-0">
                <ScrollArea className="max-h-52 border rounded-lg p-3">
                  <div className="prose prose-sm max-w-none dark:prose-invert text-sm">
                    <ReactMarkdown>{extractedText!}</ReactMarkdown>
                  </div>
                </ScrollArea>
              </TabsContent>
            </Tabs>
          ) : (
            <div className="relative">
              <img
                src={displayImage!}
                alt="Documento"
                className="w-full max-h-52 object-contain rounded-lg bg-muted"
              />
            </div>
          )}

          {/* Actions */}
          {!hasResult ? (
            <Button onClick={analyzeDocument} disabled={isAnalyzing} className="w-full">
              {isAnalyzing ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Scansione in corso...</>
              ) : (
                <><ScanLine className="h-4 w-4 mr-2" /> Scansiona documento</>
              )}
            </Button>
          ) : (
            <div className="space-y-2">
              {/* Primary actions */}
              <div className="grid grid-cols-2 gap-2">
                <Button size="sm" variant="outline" onClick={handleInsertImage}>
                  <ImageIcon className="h-3.5 w-3.5 mr-1" /> Inserisci immagine
                </Button>
                <Button size="sm" onClick={handleInsertText}>
                  <FileText className="h-3.5 w-3.5 mr-1" /> Inserisci testo
                </Button>
              </div>
              {/* Secondary actions */}
              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="flex-1" onClick={handleCopyText}>
                  {copied ? <Check className="h-3.5 w-3.5 mr-1" /> : <Copy className="h-3.5 w-3.5 mr-1" />}
                  {copied ? "Copiato" : "Copia testo"}
                </Button>
                <Button size="sm" variant="outline" className="flex-1" onClick={exportPDF}>
                  <Download className="h-3.5 w-3.5 mr-1" /> PDF
                </Button>
                <Button size="sm" variant="outline" onClick={shareDocument}>
                  <Share2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      <canvas ref={canvasRef} className="hidden" />
      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageCapture} />
      <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleImageCapture} />
    </div>
  );
};

export default SicurLensDocScanner;
