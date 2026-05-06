import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  QrCode, ScanLine, FileText, Eye, Languages, Search,
  Camera, Upload, Loader2, Copy, Check, X, ImagePlus,
  ScanText, Contact, UserPlus,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import SicurLensDocScanner from "./SicurLensDocScanner";

interface SicurLensProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onInsertText: (text: string) => void;
}

type LensMode = "ocr" | "recognize" | "translate" | "search" | "document" | "business_card";

interface BusinessCardData {
  name?: string;
  company?: string;
  role?: string;
  email?: string;
  phone?: string;
  website?: string;
  address?: string;
  pec?: string;
  vat_number?: string;
  fiscal_code?: string;
  notes?: string;
}

const MODE_CONFIG: Record<LensMode, { label: string; icon: React.ReactNode; description: string }> = {
  ocr: { label: "Testo", icon: <FileText className="h-4 w-4" />, description: "OCR — estrai testo da foto/documenti" },
  document: { label: "Documento", icon: <ScanText className="h-4 w-4" />, description: "Scansiona documento e ottieni testo pulito" },
  business_card: { label: "Biglietto", icon: <Contact className="h-4 w-4" />, description: "Scansiona biglietto da visita ed estrai contatti" },
  recognize: { label: "Riconosci", icon: <Eye className="h-4 w-4" />, description: "Identifica oggetti e attrezzature" },
  translate: { label: "Traduci", icon: <Languages className="h-4 w-4" />, description: "Estrai e traduci testo in italiano" },
  search: { label: "Info", icon: <Search className="h-4 w-4" />, description: "Cerca informazioni su ciò che vedi" },
};

const SicurLens = ({ open, onOpenChange, onInsertText }: SicurLensProps) => {
  const [activeTab, setActiveTab] = useState<"qr" | "lens">("qr");
  const [lensMode, setLensMode] = useState<LensMode>("ocr");
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [businessCard, setBusinessCard] = useState<BusinessCardData | null>(null);
  const [copied, setCopied] = useState(false);
  const [qrResult, setQrResult] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const scannerRef = useRef<any>(null);
  const qrReaderRef = useRef<HTMLDivElement>(null);
  const qrReaderIdRef = useRef(`qr-reader-${Math.random().toString(36).slice(2, 9)}`);

  // Cleanup scanner safely before React unmounts
  const cleanupScanner = useCallback(async () => {
    if (scannerRef.current) {
      try {
        const state = scannerRef.current.getState?.();
        // State 2 = SCANNING, State 3 = PAUSED
        if (state === 2 || state === 3) {
          await scannerRef.current.stop();
        }
      } catch {
        // ignore stop errors
      }
      try {
        scannerRef.current.clear();
      } catch {
        // ignore clear errors
      }
      scannerRef.current = null;
    }
    // Manually clear any leftover DOM nodes html5-qrcode injected
    if (qrReaderRef.current) {
      while (qrReaderRef.current.firstChild) {
        qrReaderRef.current.removeChild(qrReaderRef.current.firstChild);
      }
    }
    setIsScanning(false);
  }, []);

  useEffect(() => {
    if (!open) {
      cleanupScanner();
      setCapturedImage(null);
      setResult(null);
      setQrResult(null);
      setBusinessCard(null);
    }
    return () => {
      // Also cleanup on unmount
      cleanupScanner();
    };
  }, [open, cleanupScanner]);

  // ── QR Scanner ──────────────────────────────────
  const startQrScanner = useCallback(async () => {
    try {
      // Ensure previous scanner is fully cleaned up
      await cleanupScanner();

      const { Html5Qrcode } = await import("html5-qrcode");
      setIsScanning(true);
      setQrResult(null);

      const scanner = new Html5Qrcode(qrReaderIdRef.current);
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText) => {
          setQrResult(decodedText);
          cleanupScanner();
        },
        () => {}
      );
    } catch (err) {
      console.error("QR scanner error:", err);
      toast.error("Impossibile avviare la fotocamera");
      setIsScanning(false);
    }
  }, [cleanupScanner]);

  // ── Image capture ──────────────────────────────
  const handleImageCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setCapturedImage(reader.result as string);
      setResult(null);
      setBusinessCard(null);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  // ── AI Analysis ────────────────────────────────
  const analyzeImage = async () => {
    if (!capturedImage) return;
    setIsAnalyzing(true);
    setResult(null);
    setBusinessCard(null);

    try {
      const { data, error } = await supabase.functions.invoke("vision-ai", {
        body: { image_base64: capturedImage, mode: lensMode },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const rawResult = data.result;

      if (lensMode === "business_card") {
        try {
          const jsonStr = rawResult.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
          const parsed: BusinessCardData = JSON.parse(jsonStr);
          setBusinessCard(parsed);
          setResult(null);
        } catch {
          setResult(rawResult);
        }
      } else {
        setResult(rawResult);
      }
    } catch (err: any) {
      console.error("Vision AI error:", err);
      toast.error(err.message || "Errore nell'analisi dell'immagine");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleCopyResult = () => {
    const text = businessCard ? JSON.stringify(businessCard, null, 2) : result;
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleInsertResult = () => {
    if (businessCard) {
      const lines = [];
      if (businessCard.name) lines.push(`<strong>${businessCard.name}</strong>`);
      if (businessCard.role) lines.push(businessCard.role);
      if (businessCard.company) lines.push(`🏢 ${businessCard.company}`);
      if (businessCard.email) lines.push(`✉️ <a href="mailto:${businessCard.email}">${businessCard.email}</a>`);
      if (businessCard.pec) lines.push(`📧 PEC: ${businessCard.pec}`);
      if (businessCard.phone) lines.push(`📞 ${businessCard.phone}`);
      if (businessCard.website) lines.push(`🌐 <a href="${businessCard.website}" target="_blank">${businessCard.website}</a>`);
      if (businessCard.address) lines.push(`📍 ${businessCard.address}`);
      if (businessCard.vat_number) lines.push(`P.IVA: ${businessCard.vat_number}`);
      if (businessCard.fiscal_code) lines.push(`CF: ${businessCard.fiscal_code}`);
      if (businessCard.notes) lines.push(`📝 ${businessCard.notes}`);
      onInsertText(lines.join("<br/>"));
    } else if (result) {
      const html = result
        .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
        .replace(/\n/g, "<br/>");
      onInsertText(html);
    }
    toast.success("Testo inserito nella nota");
    onOpenChange(false);
  };

  const handleInsertQrResult = () => {
    if (!qrResult) return;
    const isUrl = /^https?:\/\//i.test(qrResult);
    const html = isUrl
      ? `<p>🔗 QR Code: <a href="${qrResult}" target="_blank">${qrResult}</a></p>`
      : `<p>📱 QR Code: ${qrResult}</p>`;
    onInsertText(html);
    toast.success("Risultato QR inserito nella nota");
    onOpenChange(false);
  };

  // ── Business Card Result ──────────────────────
  const renderBusinessCardResult = () => {
    if (!businessCard) return null;
    const fields: { key: keyof BusinessCardData; label: string; icon: string }[] = [
      { key: "name", label: "Nome", icon: "👤" },
      { key: "company", label: "Azienda", icon: "🏢" },
      { key: "role", label: "Ruolo", icon: "💼" },
      { key: "email", label: "Email", icon: "✉️" },
      { key: "pec", label: "PEC", icon: "📧" },
      { key: "phone", label: "Telefono", icon: "📞" },
      { key: "website", label: "Sito web", icon: "🌐" },
      { key: "address", label: "Indirizzo", icon: "📍" },
      { key: "vat_number", label: "P.IVA", icon: "🏛️" },
      { key: "fiscal_code", label: "Cod. Fiscale", icon: "🆔" },
      { key: "notes", label: "Note", icon: "📝" },
    ];

    return (
      <div className="space-y-1.5">
        {fields.map(({ key, label, icon }) =>
          businessCard[key] ? (
            <div key={key} className="flex items-start gap-2 text-sm">
              <span className="shrink-0">{icon}</span>
              <div>
                <span className="text-muted-foreground text-xs">{label}</span>
                <p className="font-medium break-all">{businessCard[key]}</p>
              </div>
            </div>
          ) : null
        )}
      </div>
    );
  };

  const hasResult = !!result || !!businessCard;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg w-[95vw] max-h-[90vh] sm:max-h-[85vh] flex flex-col p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-4 pt-4 pb-2">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <ScanLine className="h-5 w-5 text-primary" />
            SicurLens
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v as any); if (v !== "qr") cleanupScanner(); }} className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="mx-4 grid grid-cols-2">
            <TabsTrigger value="qr" className="gap-1.5">
              <QrCode className="h-3.5 w-3.5" /> QR Scanner
            </TabsTrigger>
            <TabsTrigger value="lens" className="gap-1.5">
              <Eye className="h-3.5 w-3.5" /> Lens AI
            </TabsTrigger>
          </TabsList>

          {/* ── QR Tab ───────────────────────────── */}
          <TabsContent value="qr" className="flex-1 flex flex-col overflow-y-auto px-4 pb-4">
            <div className="flex flex-col items-center gap-3">
              <div className="w-full max-w-[300px] aspect-square bg-muted rounded-lg overflow-hidden relative">
                {/* QR scanner host — kept empty so html5-qrcode owns the DOM */}
                <div
                  id={qrReaderIdRef.current}
                  ref={qrReaderRef}
                  className="absolute inset-0"
                />
                {!isScanning && !qrResult && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground pointer-events-none">
                    <QrCode className="h-12 w-12 mb-2 opacity-30" />
                    <p className="text-sm">Premi "Scansiona" per iniziare</p>
                  </div>
                )}
              </div>

              {qrResult ? (
                <div className="w-full space-y-2">
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-xs text-muted-foreground mb-1">Risultato:</p>
                    <p className="text-sm font-medium break-all">{qrResult}</p>
                  </div>
                  <div className="flex gap-2">
                    {/^https?:\/\//i.test(qrResult) && (
                      <Button size="sm" variant="outline" className="flex-1" onClick={() => window.open(qrResult, "_blank")}>
                        Apri link
                      </Button>
                    )}
                    <Button size="sm" className="flex-1" onClick={handleInsertQrResult}>
                      Inserisci nella nota
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => { setQrResult(null); startQrScanner(); }}>
                      Nuova scansione
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex gap-2">
                  {isScanning ? (
                    <Button variant="destructive" size="sm" onClick={cleanupScanner}>
                      <X className="h-3.5 w-3.5 mr-1" /> Ferma
                    </Button>
                  ) : (
                    <Button size="sm" onClick={startQrScanner}>
                      <Camera className="h-3.5 w-3.5 mr-1" /> Scansiona
                    </Button>
                  )}
                </div>
              )}
            </div>
          </TabsContent>

          {/* ── Lens Tab ──────────────────────────── */}
          <TabsContent value="lens" className="flex-1 flex flex-col overflow-y-auto px-4 pb-4 gap-3">
            {/* Mode selector — 2 rows of 3 */}
            <div className="grid grid-cols-3 gap-1.5">
              {(Object.entries(MODE_CONFIG) as [LensMode, typeof MODE_CONFIG["ocr"]][]).map(([key, cfg]) => (
                <button
                  key={key}
                  onClick={() => { setLensMode(key); setResult(null); setBusinessCard(null); }}
                  className={`flex flex-col items-center gap-1 p-2 rounded-lg text-xs transition-colors ${
                    lensMode === key
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted hover:bg-muted/80 text-muted-foreground"
                  }`}
                >
                  {cfg.icon}
                  <span className="font-medium">{cfg.label}</span>
                </button>
              ))}
            </div>

            <p className="text-xs text-muted-foreground text-center">
              {MODE_CONFIG[lensMode].description}
            </p>

            {/* Document Scanner mode — dedicated component */}
            {lensMode === "document" ? (
              <SicurLensDocScanner
                onInsertText={onInsertText}
                onClose={() => onOpenChange(false)}
              />
            ) : (
              <>
                {/* Image area */}
                {capturedImage ? (
                  <div className="relative w-full">
                    <img
                      src={capturedImage}
                      alt="Cattura"
                      className="w-full max-h-48 object-contain rounded-lg bg-muted"
                    />
                    <Button
                      variant="secondary"
                      size="icon"
                      className="absolute top-1 right-1 h-6 w-6"
                      onClick={() => { setCapturedImage(null); setResult(null); setBusinessCard(null); }}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex gap-2 justify-center">
                    <Button variant="outline" size="sm" onClick={() => cameraInputRef.current?.click()}>
                      <Camera className="h-3.5 w-3.5 mr-1" /> Scatta foto
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                      <Upload className="h-3.5 w-3.5 mr-1" /> Carica immagine
                    </Button>
                  </div>
                )}

                {/* Analyze button */}
                {capturedImage && !hasResult && (
                  <Button onClick={analyzeImage} disabled={isAnalyzing} className="w-full">
                    {isAnalyzing ? (
                      <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Analisi in corso...</>
                    ) : (
                      <><ScanLine className="h-4 w-4 mr-2" /> Analizza</>
                    )}
                  </Button>
                )}

                {/* Result */}
                {hasResult && (
                  <div className="flex flex-col gap-2">
                    <ScrollArea className="flex-1 max-h-48 border rounded-lg p-3">
                      {businessCard ? (
                        renderBusinessCardResult()
                      ) : (
                        <div className="prose prose-sm max-w-none dark:prose-invert text-sm">
                          <ReactMarkdown>{result!}</ReactMarkdown>
                        </div>
                      )}
                    </ScrollArea>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" className="flex-1" onClick={handleCopyResult}>
                        {copied ? <Check className="h-3.5 w-3.5 mr-1" /> : <Copy className="h-3.5 w-3.5 mr-1" />}
                        {copied ? "Copiato" : "Copia"}
                      </Button>
                      <Button size="sm" className="flex-1" onClick={handleInsertResult}>
                        <ImagePlus className="h-3.5 w-3.5 mr-1" /> Inserisci nella nota
                      </Button>
                    </div>
                  </div>
                )}

                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageCapture} />
                <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleImageCapture} />
              </>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default SicurLens;
