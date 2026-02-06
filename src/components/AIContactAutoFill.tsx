import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Sparkles, Loader2, Wand2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ExtractedContact {
  name?: string;
  email?: string;
  phone?: string;
  company?: string;
  role?: string;
  address?: string;
  website?: string;
  vat_number?: string;
  fiscal_code?: string;
  pec?: string;
  sdi_code?: string;
  notes?: string;
}

interface AIContactAutoFillProps {
  onExtracted: (data: ExtractedContact) => void;
}

export function AIContactAutoFill({ onExtracted }: AIContactAutoFillProps) {
  const [rawText, setRawText] = useState('');
  const [isExtracting, setIsExtracting] = useState(false);

  const handleExtract = async () => {
    if (!rawText.trim()) {
      toast.error('Incolla del testo da analizzare');
      return;
    }

    setIsExtracting(true);
    try {
      const { data, error } = await supabase.functions.invoke('crm-agent', {
        body: {
          action: 'extract_contact',
          data: { text: rawText },
          userId: null,
        },
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Errore estrazione');

      const result = data.result as ExtractedContact;
      onExtracted(result);
      setRawText('');
      toast.success('Dati estratti e compilati automaticamente');
    } catch (e: any) {
      console.error('AI extract error:', e);
      toast.error(e.message || 'Errore nell\'estrazione AI');
    } finally {
      setIsExtracting(false);
    }
  };

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
            Incolla un'email, un biglietto da visita, una nota o qualsiasi testo contenente dati di contatto
          </Label>
          <Textarea
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
            placeholder="Es: Mario Rossi, CEO di TechCorp Srl, P.IVA 01234567890, mario.rossi@techcorp.it, tel. 02 1234567, Via Roma 10, 20100 Milano..."
            rows={4}
            className="mt-1"
          />
        </div>
        <Button
          onClick={handleExtract}
          disabled={isExtracting || !rawText.trim()}
          size="sm"
          className="w-full"
        >
          {isExtracting ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <Sparkles className="h-4 w-4 mr-2" />
          )}
          Estrai dati e compila campi
        </Button>
      </CardContent>
    </Card>
  );
}
