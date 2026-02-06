import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Loader2, Sparkles, CheckCircle, AlertTriangle, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { CRMContact } from '@/hooks/useCRM';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';

interface CRMDataCleanupProps {
  contacts: CRMContact[];
  onApplyFix?: (contactId: string, updates: Partial<CRMContact>) => Promise<void>;
}

interface CleanupResult {
  duplicates?: Array<{
    group: string[];
    names: string[];
    reason: string;
  }>;
  normalizations?: Array<{
    contact_id: string;
    contact_name: string;
    field: string;
    current_value: string;
    suggested_value: string;
    reason: string;
  }>;
  missing_data?: Array<{
    contact_id: string;
    contact_name: string;
    missing_fields: string[];
  }>;
  summary?: string;
}

export function CRMDataCleanup({ contacts, onApplyFix }: CRMDataCleanupProps) {
  const { user } = useAuth();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<CleanupResult | null>(null);
  const [rawResult, setRawResult] = useState<string | null>(null);

  const runCleanup = async () => {
    if (!user || contacts.length === 0) {
      toast.error('Nessun contatto da analizzare');
      return;
    }

    setIsAnalyzing(true);
    setResult(null);
    setRawResult(null);

    try {
      // Send a subset of contacts (max 100) to avoid token limits
      const contactsSubset = contacts.slice(0, 100).map(c => ({
        id: c.id,
        name: c.name,
        email: c.email,
        phone: c.phone,
        company: c.company,
        address: c.address,
        vat_number: c.vat_number,
        fiscal_code: c.fiscal_code,
        pec: c.pec,
        status: c.status,
      }));

      const { data, error } = await supabase.functions.invoke('crm-agent', {
        body: {
          action: 'cleanup_data',
          data: { contacts: contactsSubset },
          userId: user.id,
        },
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Errore analisi');

      const aiResult = data.result;
      
      if (typeof aiResult === 'string' || aiResult?.raw) {
        setRawResult(typeof aiResult === 'string' ? aiResult : aiResult.raw);
      } else {
        setResult(aiResult);
        if (aiResult?.summary) {
          setRawResult(aiResult.summary);
        }
      }

      toast.success('Analisi pulizia dati completata');
    } catch (e: any) {
      console.error('Cleanup error:', e);
      toast.error(e.message || 'Errore nell\'analisi');
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          Pulizia Dati AI
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Analizza i contatti CRM per trovare duplicati, normalizzare campi e suggerire correzioni.
          {contacts.length > 100 && (
            <span className="block mt-1 text-xs">
              Nota: verranno analizzati i primi 100 contatti su {contacts.length} totali.
            </span>
          )}
        </p>

        <Button onClick={runCleanup} disabled={isAnalyzing} className="w-full">
          {isAnalyzing ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Analisi in corso...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4 mr-2" />
              Avvia Pulizia Dati ({contacts.length} contatti)
            </>
          )}
        </Button>

        {/* Structured results */}
        {result && (
          <div className="space-y-4">
            {/* Duplicates */}
            {result.duplicates && result.duplicates.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold flex items-center gap-2 mb-2">
                  <AlertTriangle className="h-4 w-4 text-yellow-500" />
                  Possibili duplicati ({result.duplicates.length})
                </h4>
                {result.duplicates.map((dup, i) => (
                  <div key={i} className="bg-yellow-500/10 p-3 rounded-lg mb-2 text-sm">
                    <p className="font-medium">{dup.names?.join(' ↔ ')}</p>
                    <p className="text-muted-foreground text-xs">{dup.reason}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Normalizations */}
            {result.normalizations && result.normalizations.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold flex items-center gap-2 mb-2">
                  <CheckCircle className="h-4 w-4 text-blue-500" />
                  Suggerimenti di normalizzazione ({result.normalizations.length})
                </h4>
                {result.normalizations.map((norm, i) => (
                  <div key={i} className="bg-blue-500/10 p-3 rounded-lg mb-2 text-sm">
                    <p className="font-medium">{norm.contact_name}</p>
                    <p className="text-xs">
                      <span className="text-muted-foreground">{norm.field}:</span>{' '}
                      <span className="line-through text-destructive">{norm.current_value}</span>
                      {' → '}
                      <span className="text-green-600 font-medium">{norm.suggested_value}</span>
                    </p>
                    <p className="text-muted-foreground text-xs">{norm.reason}</p>
                    {onApplyFix && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="mt-1 h-6 text-xs"
                        onClick={() => onApplyFix(norm.contact_id, { [norm.field]: norm.suggested_value } as any)}
                      >
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Applica
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Missing data */}
            {result.missing_data && result.missing_data.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold flex items-center gap-2 mb-2">
                  <AlertTriangle className="h-4 w-4 text-orange-500" />
                  Dati mancanti ({result.missing_data.length})
                </h4>
                {result.missing_data.slice(0, 10).map((item, i) => (
                  <div key={i} className="bg-orange-500/10 p-2 rounded-lg mb-1 text-sm">
                    <span className="font-medium">{item.contact_name}</span>
                    <span className="text-muted-foreground text-xs ml-2">
                      manca: {item.missing_fields?.join(', ')}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Raw/markdown result */}
        {rawResult && !result?.duplicates && !result?.normalizations && (
          <ScrollArea className="max-h-[400px]">
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <ReactMarkdown>{rawResult}</ReactMarkdown>
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
