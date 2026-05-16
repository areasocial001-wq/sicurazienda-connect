import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Sparkles, Loader2, Wand2, FileUp } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ExtractedContact {
  name?: string;
  email?: string;
  phone?: string;
  mobile?: string;
  referente_email?: string;
  referente_phone?: string;
  referente_mobile?: string;
  company?: string;
  role?: string;
  address?: string;
  postal_code?: string;
  city?: string;
  province?: string;
  website?: string;
  vat_number?: string;
  fiscal_code?: string;
  pec?: string;
  sdi_code?: string;
  ateco_code?: string;
  legal_form?: string;
  rea_number?: string;
  partners_count?: number;
  activity_start_date?: string;
  cdl_reference?: string;
  fondo_appartenenza?: string;
  segnalatore_name?: string;
  technical_consultant?: string;
  payment_method?: string;
  payment_terms?: string;
  exemption_number?: string;
  exemption_issue_date?: string;
  exemption_valid_until?: string;
  exemption_amount?: number;
  notes?: string;
}

interface AIContactAutoFillProps {
  onExtracted: (data: ExtractedContact) => void;
}

export function AIContactAutoFill({ onExtracted }: AIContactAutoFillProps) {
  const [rawText, setRawText] = useState('');
  const [isExtracting, setIsExtracting] = useState(false);
  const [isParsingPdf, setIsParsingPdf] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const callExtract = async (text: string) => {
    setIsExtracting(true);
    try {
      const { data, error } = await supabase.functions.invoke('crm-agent', {
        body: { action: 'extract_contact', data: { text }, userId: null },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Errore estrazione');
      onExtracted(data.result as ExtractedContact);
      setRawText('');
      toast.success('Dati estratti e compilati automaticamente');
    } catch (e: any) {
      console.error('AI extract error:', e);
      toast.error(e.message || "Errore nell'estrazione AI");
    } finally {
      setIsExtracting(false);
    }
  };

  const handleExtract = async () => {
    if (!rawText.trim()) {
      toast.error('Incolla del testo da analizzare');
      return;
    }
    await callExtract(rawText);
  };

  const handlePdfUpload = async (file: File) => {
    if (file.size > 20 * 1024 * 1024) {
      toast.error('File troppo grande (max 20MB)');
      return;
    }
    setIsParsingPdf(true);
    try {
      const pdfjsLib: any = await import('pdfjs-dist/legacy/build/pdf.mjs');
      pdfjsLib.GlobalWorkerOptions.workerSrc = (
        await import('pdfjs-dist/legacy/build/pdf.worker.mjs?url')
      ).default;
      const buf = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
      let fullText = '';
      const maxPages = Math.min(pdf.numPages, 20);
      for (let i = 1; i <= maxPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        const pageText = content.items.map((it: any) => it.str).join(' ');
        fullText += `\n\n--- Pagina ${i} ---\n${pageText}`;
      }
      if (!fullText.trim()) {
        toast.error('Nessun testo trovato nel PDF (potrebbe essere scansionato)');
        return;
      }
      toast.info('PDF letto, estrazione AI in corso...');
      await callExtract(fullText);
    } catch (e: any) {
      console.error('PDF parse error:', e);
      toast.error('Errore nella lettura del PDF: ' + (e.message || 'sconosciuto'));
    } finally {
      setIsParsingPdf(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const busy = isExtracting || isParsingPdf;

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Wand2 className="h-4 w-4 text-primary" />
          Auto-fill AI
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <Label className="text-xs text-muted-foreground">
            Carica una Visura camerale (PDF) oppure incolla email, biglietto da visita o note
          </Label>
          <div className="flex gap-2 mt-1">
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handlePdfUpload(f);
              }}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={busy}
              onClick={() => fileInputRef.current?.click()}
              className="w-full"
            >
              {isParsingPdf ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <FileUp className="h-4 w-4 mr-2" />
              )}
              Carica Visura (PDF)
            </Button>
          </div>
          <Textarea
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
            placeholder="Oppure incolla qui: Mario Rossi, CEO TechCorp Srl, P.IVA 01234567890..."
            rows={3}
            className="mt-2"
            disabled={busy}
          />
        </div>
        <Button
          onClick={handleExtract}
          disabled={busy || !rawText.trim()}
          size="sm"
          className="w-full"
        >
          {isExtracting ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <Sparkles className="h-4 w-4 mr-2" />
          )}
          Estrai dati dal testo
        </Button>
      </CardContent>
    </Card>
  );
}
