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
  ScanText, Contact, UserPlus, SwitchCamera, AlertTriangle,
  Zap, ZapOff, Play, RotateCw, History, Trash2, ExternalLink,
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

const FACING_STORAGE_KEY = "sicurlens.facingMode";
const QR_RESULT_STORAGE_KEY = "sicurlens.lastQrResult";
const QR_HISTORY_STORAGE_KEY = "sicurlens.qrHistory";
const MAX_HISTORY = 20;

interface QrHistoryEntry {
  text: string;
  timestamp: number;
}

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
  const [facingMode, setFacingMode] = useState<"environment" | "user">(() => {
    if (typeof window === "undefined") return "environment";
    const saved = window.localStorage.getItem(FACING_STORAGE_KEY);
    return saved === "user" || saved === "environment" ? saved : "environment";
  });
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [torchOn, setTorchOn] = useState(false);
  const [torchSupported, setTorchSupported] = useState(false);
  const [torchUnavailableNotice, setTorchUnavailableNotice] = useState<string | null>(null);
  const [qrHistory, setQrHistory] = useState<QrHistoryEntry[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const raw = window.localStorage.getItem(QR_HISTORY_STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });
  const [showHistory, setShowHistory] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const scannerRef = useRef<any>(null);
  const qrReaderRef = useRef<HTMLDivElement>(null);
  const qrReaderIdRef = useRef(`qr-reader-${Math.random().toString(36).slice(2, 9)}`);
  const watchdogRef = useRef<number | null>(null);
  const restartAttemptsRef = useRef(0);
  const MAX_RESTART_ATTEMPTS = 3;

  // Persist facing mode preference
  useEffect(() => {
    try {
      window.localStorage.setItem(FACING_STORAGE_KEY, facingMode);
    } catch {
      // ignore storage errors
    }
  }, [facingMode]);

  // Restore last QR result on mount
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(QR_RESULT_STORAGE_KEY);
      if (saved) setQrResult(saved);
    } catch {
      // ignore
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist QR result
  useEffect(() => {
    try {
      if (qrResult) window.localStorage.setItem(QR_RESULT_STORAGE_KEY, qrResult);
      else window.localStorage.removeItem(QR_RESULT_STORAGE_KEY);
    } catch {
      // ignore
    }
  }, [qrResult]);

  // Persist history
  useEffect(() => {
    try {
      window.localStorage.setItem(QR_HISTORY_STORAGE_KEY, JSON.stringify(qrHistory));
    } catch {
      // ignore
    }
  }, [qrHistory]);

  const addToHistory = useCallback((text: string) => {
    setQrHistory((prev) => {
      const filtered = prev.filter((e) => e.text !== text);
      return [{ text, timestamp: Date.now() }, ...filtered].slice(0, MAX_HISTORY);
    });
  }, []);

  const clearHistory = useCallback(() => {
    setQrHistory([]);
    toast.success("Cronologia cancellata");
  }, []);

  const clearWatchdog = useCallback(() => {
    if (watchdogRef.current !== null) {
      window.clearInterval(watchdogRef.current);
      watchdogRef.current = null;
    }
  }, []);

  // Cleanup scanner safely before React unmounts
  const cleanupScanner = useCallback(async () => {
    clearWatchdog();
    setTorchOn(false);
    setTorchSupported(false);
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
    try {
      if (qrReaderRef.current) {
        qrReaderRef.current.innerHTML = "";
      }
    } catch {
      // ignore — React may have already removed the node
    }
    setIsScanning(false);
  }, [clearWatchdog]);

  useEffect(() => {
    if (!open) {
      cleanupScanner();
      setCapturedImage(null);
      setResult(null);
      setQrResult(null);
      setBusinessCard(null);
      setPermissionDenied(false);
      setCameraError(null);
    }
    return () => {
      // Also cleanup on unmount
      cleanupScanner();
    };
  }, [open, cleanupScanner]);

  // ── QR Scanner ──────────────────────────────────
  const startQrScanner = useCallback(async (isRestart = false) => {
    try {
      // Ensure previous scanner is fully cleaned up
      await cleanupScanner();
      setPermissionDenied(false);
      setCameraError(null);

      // Pre-flight: check camera permission via getUserMedia so we can give
      // a clear guided message instead of a silent failure.
      try {
        const probe = await navigator.mediaDevices.getUserMedia({
          video: { facingMode },
        });
        // Release the probe stream immediately — html5-qrcode will reopen it
        probe.getTracks().forEach((t) => t.stop());
      } catch (permErr: any) {
        const name = permErr?.name || "";
        if (name === "NotAllowedError" || name === "PermissionDeniedError") {
          setPermissionDenied(true);
          setIsScanning(false);
          return;
        }
        if (name === "NotFoundError" || name === "OverconstrainedError") {
          setCameraError(
            facingMode === "environment"
              ? "Fotocamera posteriore non disponibile. Prova quella anteriore."
              : "Fotocamera anteriore non disponibile. Prova quella posteriore."
          );
          setIsScanning(false);
          return;
        }
        // Other errors fall through to html5-qrcode attempt
      }

      const { Html5Qrcode } = await import("html5-qrcode");
      setIsScanning(true);
      setQrResult(null);

      const scanner = new Html5Qrcode(qrReaderIdRef.current);
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText) => {
          restartAttemptsRef.current = 0;
          setQrResult(decodedText);
          addToHistory(decodedText);
          cleanupScanner();
        },
        () => {}
      );

      // Successful start — reset retry counter and arm the watchdog
      restartAttemptsRef.current = 0;
      if (isRestart) toast.success("Scanner riavviato");

      // Detect torch capability on the active video track
      try {
        const video = qrReaderRef.current?.querySelector("video") as HTMLVideoElement | null;
        const stream = (video?.srcObject as MediaStream | null) ?? null;
        const track = stream?.getVideoTracks?.()[0];
        const caps: any = track?.getCapabilities?.() ?? {};
        const supported = !!caps.torch;
        setTorchSupported(supported);
        if (!supported) {
          setTorchUnavailableNotice(
            "Torcia non disponibile su questo dispositivo o browser. Suggerimento: usa Chrome su Android o un dispositivo con flash."
          );
        } else {
          setTorchUnavailableNotice(null);
        }
      } catch {
        setTorchSupported(false);
        setTorchUnavailableNotice("Impossibile rilevare la torcia. Verifica le impostazioni del browser.");
      }

      // Watchdog: if the underlying <video> stops producing frames, auto-restart
      let lastTime = 0;
      let stallCount = 0;
      clearWatchdog();
      watchdogRef.current = window.setInterval(() => {
        const video = qrReaderRef.current?.querySelector("video") as HTMLVideoElement | null;
        if (!video) return;
        const t = video.currentTime;
        const frozen =
          video.readyState < 2 ||
          video.paused ||
          video.ended ||
          (t === lastTime && t > 0);
        if (frozen) {
          stallCount++;
          if (stallCount >= 3) {
            // ~3s of stall → restart
            stallCount = 0;
            attemptAutoRestart("Telecamera bloccata, riavvio in corso...");
          }
        } else {
          stallCount = 0;
        }
        lastTime = t;
      }, 1000);
    } catch (err: any) {
      console.error("QR scanner error:", err);
      const name = err?.name || "";
      if (name === "NotAllowedError" || name === "PermissionDeniedError") {
        setPermissionDenied(true);
        setIsScanning(false);
        return;
      }
      const msg =
        name === "NotReadableError"
          ? "Fotocamera occupata da un'altra applicazione. Chiudi le altre app che la usano."
          : name === "OverconstrainedError"
          ? "La fotocamera selezionata non supporta i parametri richiesti. Prova a cambiare camera."
          : err?.message || "Errore sconosciuto della fotocamera.";
      setCameraError(msg);
      attemptAutoRestart("Errore fotocamera, nuovo tentativo...");
    }
  }, [cleanupScanner, clearWatchdog, facingMode]);

  // Toggle torch (flash) on the active video track
  const toggleTorch = useCallback(async () => {
    try {
      const video = qrReaderRef.current?.querySelector("video") as HTMLVideoElement | null;
      const stream = (video?.srcObject as MediaStream | null) ?? null;
      const track = stream?.getVideoTracks?.()[0];
      if (!track) return;
      const next = !torchOn;
      await track.applyConstraints({ advanced: [{ torch: next } as any] });
      setTorchOn(next);
    } catch (err) {
      console.error("Torch error:", err);
      setTorchSupported(false);
      setTorchUnavailableNotice(
        "Torcia disattivata per incompatibilità. Suggerimento: usa Chrome su Android o cambia dispositivo."
      );
      toast.error("Torcia non disponibile su questo dispositivo");
    }
  }, [torchOn]);

  const switchCamera = useCallback(async () => {
    const next = facingMode === "environment" ? "user" : "environment";
    setFacingMode(next);
    restartAttemptsRef.current = 0;
    setCameraError(null);
    await cleanupScanner();
    // Defer until state has applied
    window.setTimeout(() => startQrScanner(), 100);
  }, [facingMode, cleanupScanner, startQrScanner]);

  const attemptAutoRestart = useCallback((message: string) => {
    restartAttemptsRef.current += 1;
    if (restartAttemptsRef.current > MAX_RESTART_ATTEMPTS) {
      restartAttemptsRef.current = 0;
      toast.error("Impossibile avviare la fotocamera. Riprova manualmente.");
      cleanupScanner();
      return;
    }
    // Exponential backoff: 500ms, 1s, 2s, 4s...
    const delay = 500 * Math.pow(2, restartAttemptsRef.current - 1);
    toast.info(`${message} (${restartAttemptsRef.current}/${MAX_RESTART_ATTEMPTS})`);
    cleanupScanner();
    window.setTimeout(() => {
      startQrScanner(true);
    }, delay);
  }, [cleanupScanner, startQrScanner]);

  // Immediate single retry, bypassing backoff and the attempt counter
  const retryNow = useCallback(async () => {
    restartAttemptsRef.current = 0;
    setCameraError(null);
    await cleanupScanner();
    startQrScanner(true);
  }, [cleanupScanner, startQrScanner]);

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

              {permissionDenied ? (
                <div className="w-full p-3 bg-destructive/10 border border-destructive/30 rounded-lg space-y-2">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                    <div className="text-xs space-y-1">
                      <p className="font-semibold text-destructive">Accesso alla fotocamera negato</p>
                      <p className="text-muted-foreground">
                        Per usare lo scanner devi consentire l'accesso alla fotocamera.
                      </p>
                      <ul className="list-disc list-inside text-muted-foreground space-y-0.5">
                        <li>Tocca l'icona del lucchetto 🔒 nella barra dell'indirizzo</li>
                        <li>Imposta "Fotocamera" su <strong>Consenti</strong></li>
                        <li>Ricarica la pagina e riprova</li>
                      </ul>
                    </div>
                  </div>
                  <Button size="sm" variant="outline" className="w-full" onClick={() => { setPermissionDenied(false); startQrScanner(); }}>
                    Riprova
                  </Button>
                </div>
              ) : cameraError ? (
                <div className="w-full p-3 bg-muted rounded-lg space-y-2">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                    <div className="text-xs text-muted-foreground space-y-1">
                      <p className="font-semibold text-foreground">Errore fotocamera</p>
                      <p>{cameraError}</p>
                      <p className="text-[10px]">Suggerimento: prova un'altra fotocamera o riprova subito.</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="default" className="flex-1" onClick={retryNow}>
                      <RotateCw className="h-3.5 w-3.5 mr-1" />
                      Riprova ora
                    </Button>
                    <Button size="sm" variant="outline" className="flex-1" onClick={switchCamera}>
                      <SwitchCamera className="h-3.5 w-3.5 mr-1" />
                      Cambia camera
                    </Button>
                  </div>
                </div>
              ) : qrResult ? (
                <div className="w-full space-y-2">
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-xs text-muted-foreground mb-1">
                      Risultato (scanner in pausa):
                    </p>
                    <p className="text-sm font-medium break-all">{qrResult}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {/^https?:\/\//i.test(qrResult) && (
                      <Button size="sm" variant="outline" className="flex-1 min-w-[110px]" onClick={() => window.open(qrResult, "_blank")}>
                        Apri link
                      </Button>
                    )}
                    <Button size="sm" className="flex-1 min-w-[140px]" onClick={handleInsertQrResult}>
                      Inserisci nella nota
                    </Button>
                  </div>
                  <Button
                    size="sm"
                    variant="default"
                    className="w-full"
                    onClick={() => { setQrResult(null); startQrScanner(); }}
                  >
                    <Play className="h-3.5 w-3.5 mr-1" /> Riprendi scansione
                  </Button>
                </div>
              ) : (
                <div className="flex gap-2">
                  {isScanning ? (
                    <>
                      <Button variant="destructive" size="sm" onClick={cleanupScanner}>
                        <X className="h-3.5 w-3.5 mr-1" /> Ferma
                      </Button>
                      <Button variant="outline" size="sm" onClick={switchCamera} title="Cambia fotocamera">
                        <SwitchCamera className="h-3.5 w-3.5 mr-1" />
                        {facingMode === "environment" ? "Anteriore" : "Posteriore"}
                      </Button>
                      {torchSupported && (
                        <Button
                          variant={torchOn ? "default" : "outline"}
                          size="sm"
                          onClick={toggleTorch}
                          title={torchOn ? "Spegni torcia" : "Accendi torcia"}
                        >
                          {torchOn ? <ZapOff className="h-3.5 w-3.5 mr-1" /> : <Zap className="h-3.5 w-3.5 mr-1" />}
                          {torchOn ? "Off" : "Flash"}
                        </Button>
                      )}
                    </>
                  ) : (
                    <>
                      <Button size="sm" onClick={() => startQrScanner()}>
                        <Camera className="h-3.5 w-3.5 mr-1" /> Scansiona
                      </Button>
                      <Button variant="outline" size="sm" onClick={switchCamera} title="Cambia fotocamera">
                        <SwitchCamera className="h-3.5 w-3.5 mr-1" />
                        {facingMode === "environment" ? "Anteriore" : "Posteriore"}
                      </Button>
                    </>
                  )}
                </div>
              )}

              {/* Torch unavailable notice */}
              {isScanning && torchUnavailableNotice && (
                <div className="w-full p-2 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                  <div className="flex items-start gap-2">
                    <ZapOff className="h-3.5 w-3.5 text-amber-600 shrink-0 mt-0.5" />
                    <p className="text-[11px] text-muted-foreground">{torchUnavailableNotice}</p>
                  </div>
                </div>
              )}

              {/* History toggle + panel */}
              <div className="w-full">
                <button
                  type="button"
                  onClick={() => setShowHistory((v) => !v)}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  <History className="h-3.5 w-3.5" />
                  Cronologia scansioni ({qrHistory.length})
                </button>
                {showHistory && (
                  <div className="mt-2 border rounded-lg p-2 space-y-1.5 max-h-48 overflow-y-auto">
                    {qrHistory.length === 0 ? (
                      <p className="text-xs text-muted-foreground text-center py-2">Nessuna scansione</p>
                    ) : (
                      <>
                        {qrHistory.map((entry, idx) => {
                          const isUrl = /^https?:\/\//i.test(entry.text);
                          return (
                            <div key={`${entry.timestamp}-${idx}`} className="flex items-start gap-1.5 text-xs p-1.5 bg-muted/50 rounded">
                              <div className="flex-1 min-w-0">
                                <p className="break-all font-medium">{entry.text}</p>
                                <p className="text-[10px] text-muted-foreground">
                                  {new Date(entry.timestamp).toLocaleString("it-IT")}
                                </p>
                              </div>
                              <div className="flex gap-1 shrink-0">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6"
                                  title="Copia"
                                  onClick={() => {
                                    navigator.clipboard.writeText(entry.text);
                                    toast.success("Copiato");
                                  }}
                                >
                                  <Copy className="h-3 w-3" />
                                </Button>
                                {isUrl && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6"
                                    title="Apri link"
                                    onClick={() => window.open(entry.text, "_blank")}
                                  >
                                    <ExternalLink className="h-3 w-3" />
                                  </Button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full text-destructive hover:text-destructive"
                          onClick={clearHistory}
                        >
                          <Trash2 className="h-3.5 w-3.5 mr-1" />
                          Cancella cronologia
                        </Button>
                      </>
                    )}
                  </div>
                )}
              </div>
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
