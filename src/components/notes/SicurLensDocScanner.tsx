import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import {
  Camera, Upload, X, Plus, GripVertical,
  ScanLine, FileText, Image as ImageIcon, Download,
  Share2, RotateCw, Sun, Contrast, Wand2, Palette,
  Trash2, ChevronLeft, ChevronRight, CopyCheck,
} from "lucide-react";
import jsPDF from "jspdf";

interface DocScannerProps {
  onInsertText: (html: string) => void;
  onClose: () => void;
}

interface ScannedPage {
  original: string;
  enhanced: string | null;
  brightness: number;
  contrast: number;
  rotation: number;
  grayscale: boolean;
}

const SicurLensDocScanner = ({ onInsertText, onClose }: DocScannerProps) => {
  const [pages, setPages] = useState<ScannedPage[]>([]);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const currentPage = pages[currentPageIndex] || null;

  const handleImageCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const newPage: ScannedPage = {
        original: reader.result as string,
        enhanced: null,
        brightness: 100,
        contrast: 100,
        rotation: 0,
        grayscale: false,
      };
      setPages((prev) => [...prev, newPage]);
      setCurrentPageIndex(pages.length); // go to the new page
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  // Apply enhancements via canvas for current page
  const applyEnhancements = useCallback(() => {
    if (!currentPage || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { original, brightness, contrast, rotation, grayscale } = currentPage;

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

      const enhanced = canvas.toDataURL("image/jpeg", 0.92);
      setPages((prev) =>
        prev.map((p, i) => (i === currentPageIndex ? { ...p, enhanced } : p))
      );
    };
    img.src = original;
  }, [currentPage, currentPageIndex]);

  useEffect(() => {
    if (currentPage) applyEnhancements();
  }, [
    currentPage?.brightness,
    currentPage?.contrast,
    currentPage?.rotation,
    currentPage?.grayscale,
    currentPage?.original,
    applyEnhancements,
  ]);

  // Update current page property
  const updateCurrentPage = (updates: Partial<ScannedPage>) => {
    setPages((prev) =>
      prev.map((p, i) => (i === currentPageIndex ? { ...p, ...updates } : p))
    );
  };

  // Presets
  const autoEnhance = () => {
    updateCurrentPage({ brightness: 110, contrast: 130, grayscale: false });
    toast.success("Miglioramento automatico applicato");
  };

  const scanToGrayscale = () => {
    updateCurrentPage({ brightness: 105, contrast: 150, grayscale: true });
    toast.success("Modalità scanner B/N applicata");
  };

  const colorDocPreset = () => {
    updateCurrentPage({ brightness: 108, contrast: 120, grayscale: false });
    toast.success("Preset documento a colori applicato");
  };

  const rotatePage = () => {
    if (!currentPage) return;
    updateCurrentPage({ rotation: (currentPage.rotation + 90) % 360 });
  };

  const removePage = () => {
    setPages((prev) => prev.filter((_, i) => i !== currentPageIndex));
    setCurrentPageIndex((prev) => Math.max(0, prev - 1));
  };

  // Drag-and-drop reorder
  const handleDragStart = (idx: number) => {
    setDragIndex(idx);
  };

  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    setDragOverIndex(idx);
  };

  const handleDrop = (idx: number) => {
    if (dragIndex === null || dragIndex === idx) {
      setDragIndex(null);
      setDragOverIndex(null);
      return;
    }
    setPages((prev) => {
      const updated = [...prev];
      const [moved] = updated.splice(dragIndex, 1);
      updated.splice(idx, 0, moved);
      return updated;
    });
    // Update currentPageIndex to follow the dragged page
    if (currentPageIndex === dragIndex) {
      setCurrentPageIndex(idx);
    } else if (dragIndex < currentPageIndex && idx >= currentPageIndex) {
      setCurrentPageIndex((prev) => prev - 1);
    } else if (dragIndex > currentPageIndex && idx <= currentPageIndex) {
      setCurrentPageIndex((prev) => prev + 1);
    }
    setDragIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDragIndex(null);
    setDragOverIndex(null);
  };

  // Apply preset to ALL pages
  const applyPresetToAll = (updates: Partial<ScannedPage>) => {
    setPages((prev) => prev.map((p) => ({ ...p, ...updates })));
  };

  const autoEnhanceAll = () => {
    applyPresetToAll({ brightness: 110, contrast: 130, grayscale: false });
    toast.success("Miglioramento applicato a tutte le pagine");
  };

  const scanToGrayscaleAll = () => {
    applyPresetToAll({ brightness: 105, contrast: 150, grayscale: true });
    toast.success("Scanner B/N applicato a tutte le pagine");
  };

  const colorDocPresetAll = () => {
    applyPresetToAll({ brightness: 108, contrast: 120, grayscale: false });
    toast.success("Documento a colori applicato a tutte le pagine");
  };

  // Generate multi-page PDF
  const generatePDF = () => {
    if (pages.length === 0) return;

    let processed = 0;
    const imageElements: { img: HTMLImageElement; data: string }[] = [];

    // Load all images first, then generate PDF
    pages.forEach((page, idx) => {
      const imgData = page.enhanced || page.original;
      const img = new window.Image();
      img.onload = () => {
        imageElements[idx] = { img, data: imgData };
        processed++;
        if (processed === pages.length) {
          buildPDF(imageElements);
        }
      };
      img.src = imgData;
    });
  };

  const buildPDF = (imageElements: { img: HTMLImageElement; data: string }[]) => {
    const first = imageElements[0];
    const orientation = first.img.width > first.img.height ? "landscape" : "portrait";
    const pdf = new jsPDF({ orientation, unit: "mm", format: "a4" });

    imageElements.forEach(({ img, data }, idx) => {
      if (idx > 0) {
        const orient = img.width > img.height ? "landscape" : "portrait";
        pdf.addPage("a4", orient);
      }

      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const margin = 8;
      const effW = pageW - margin * 2;
      const effH = pageH - margin * 2;
      const imgRatio = img.width / img.height;

      let drawW: number;
      let drawH: number;

      if (imgRatio > effW / effH) {
        drawW = effW;
        drawH = effW / imgRatio;
      } else {
        drawH = effH;
        drawW = effH * imgRatio;
      }

      const x = (pageW - drawW) / 2;
      const y = (pageH - drawH) / 2;

      pdf.addImage(data, "JPEG", x, y, drawW, drawH);
    });

    pdf.save(`scansione_${new Date().toISOString().slice(0, 10)}_${Date.now()}.pdf`);
    toast.success(`PDF generato con ${pages.length} pagin${pages.length === 1 ? "a" : "e"}`);
  };

  // Share current page
  const shareDocument = async () => {
    const imageToUse = currentPage?.enhanced || currentPage?.original;
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
    if (pages.length === 0) return;
    const images = pages
      .map((p) => {
        const src = p.enhanced || p.original;
        return `<img src="${src}" alt="Documento scansionato" style="max-width:100%; margin-bottom:8px" />`;
      })
      .join("");
    onInsertText(images);
    toast.success("Immagini inserite nella nota");
    onClose();
  };

  const displayImage = currentPage?.enhanced || currentPage?.original;

  return (
    <div className="flex flex-col gap-3">
      {pages.length === 0 ? (
        /* Empty state */
        <div className="flex flex-col items-center gap-3 py-6">
          <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-2">
            <ScanLine className="h-8 w-8 text-primary" />
          </div>
          <p className="text-sm text-muted-foreground text-center max-w-xs">
            Scatta una foto al documento o carica un'immagine. Puoi aggiungere più pagine per creare un unico PDF.
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
          {/* Page navigator */}
          <div className="flex items-center justify-between bg-muted/50 rounded-lg px-3 py-1.5">
            <div className="flex items-center gap-1">
              <Button
                variant="ghost" size="icon" className="h-6 w-6"
                onClick={() => setCurrentPageIndex((i) => Math.max(0, i - 1))}
                disabled={currentPageIndex === 0}
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </Button>
              <span className="text-xs font-medium min-w-[60px] text-center">
                Pag. {currentPageIndex + 1} / {pages.length}
              </span>
              <Button
                variant="ghost" size="icon" className="h-6 w-6"
                onClick={() => setCurrentPageIndex((i) => Math.min(pages.length - 1, i + 1))}
                disabled={currentPageIndex === pages.length - 1}
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={() => cameraInputRef.current?.click()}>
                <Plus className="h-3 w-3" /> Aggiungi
              </Button>
              <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={removePage} title="Rimuovi pagina">
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          {/* Thumbnails */}
          {pages.length > 1 && (
            <ScrollArea className="w-full">
              <div className="flex gap-1.5 pb-1">
                {pages.map((p, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentPageIndex(idx)}
                    className={`shrink-0 rounded border-2 overflow-hidden transition-colors ${
                      idx === currentPageIndex ? "border-primary" : "border-transparent hover:border-muted-foreground/30"
                    }`}
                  >
                    <img
                      src={p.enhanced || p.original}
                      alt={`Pagina ${idx + 1}`}
                      className="h-12 w-9 object-cover"
                    />
                  </button>
                ))}
              </div>
            </ScrollArea>
          )}

          {/* Enhancement controls */}
          <div className="space-y-2 p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-foreground">Regolazioni</span>
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={autoEnhance} title="Miglioramento auto">
                  <Wand2 className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={colorDocPreset} title="Documento a colori">
                  <Palette className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={scanToGrayscale} title="Scanner B/N">
                  <FileText className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={rotatePage} title="Ruota 90°">
                  <RotateCw className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Sun className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <Slider
                value={[currentPage?.brightness ?? 100]}
                onValueChange={([v]) => updateCurrentPage({ brightness: v })}
                min={50} max={200} step={5}
                className="flex-1"
              />
              <span className="text-[10px] text-muted-foreground w-8 text-right">{currentPage?.brightness ?? 100}%</span>
            </div>
            <div className="flex items-center gap-2">
              <Contrast className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <Slider
                value={[currentPage?.contrast ?? 100]}
                onValueChange={([v]) => updateCurrentPage({ contrast: v })}
                min={50} max={250} step={5}
                className="flex-1"
              />
              <span className="text-[10px] text-muted-foreground w-8 text-right">{currentPage?.contrast ?? 100}%</span>
            </div>
          </div>

          {/* Image preview */}
          <div className="relative">
            <img
              src={displayImage!}
              alt={`Pagina ${currentPageIndex + 1}`}
              className="w-full max-h-48 object-contain rounded-lg bg-muted"
            />
          </div>

          {/* Primary action */}
          <Button onClick={generatePDF} className="w-full">
            <Download className="h-4 w-4 mr-2" />
            Genera PDF {pages.length > 1 ? `(${pages.length} pagine)` : ""}
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
