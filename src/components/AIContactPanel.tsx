import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Loader2, Brain, Mail, Phone, CalendarCheck, TrendingUp, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { CRMContact } from '@/hooks/useCRM';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';

interface AIContactPanelProps {
  contact: CRMContact;
}

export function AIContactPanel({ contact }: AIContactPanelProps) {
  const { user } = useAuth();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<any>(null);
  const [activeAction, setActiveAction] = useState<string | null>(null);

  const runAction = async (action: string, label: string) => {
    if (!user) return;
    setActiveAction(action);
    setIsAnalyzing(true);

    try {
      const { data, error } = await supabase.functions.invoke('crm-agent', {
        body: {
          action,
          data: { contactId: contact.id, contact },
          userId: user.id,
        },
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Errore AI');

      setAnalysis({ action: label, result: data.result });
    } catch (e: any) {
      toast.error(e.message || 'Errore nell\'analisi AI');
    } finally {
      setIsAnalyzing(false);
      setActiveAction(null);
    }
  };

  const formatResult = (result: any): string => {
    if (typeof result === 'string') return result;
    if (result?.raw) return result.raw;
    
    // Format structured result as markdown
    const parts: string[] = [];
    
    if (result?.suggestions?.length) {
      parts.push('### 💡 Suggerimenti');
      result.suggestions.forEach((s: string) => parts.push(`- ${s}`));
    }
    if (result?.next_steps?.length) {
      parts.push('\n### 📋 Prossimi passi');
      result.next_steps.forEach((s: string) => parts.push(`- ${s}`));
    }
    if (result?.result) {
      if (typeof result.result === 'string') {
        parts.push(result.result);
      } else {
        // Format nested result object
        const r = result.result;
        if (r.priorita) parts.push(`**Priorità:** ${r.priorita}`);
        if (r.probabilita_conversione) parts.push(`**Probabilità conversione:** ${r.probabilita_conversione}`);
        if (r.status_suggerito) parts.push(`**Status suggerito:** ${r.status_suggerito}`);
        if (r.valore_stimato) parts.push(`**Valore stimato:** ${r.valore_stimato}`);
        if (r.riassunto) parts.push(`\n${r.riassunto}`);
        if (r.email_subject) parts.push(`\n**Oggetto:** ${r.email_subject}`);
        if (r.email_body) parts.push(`\n${r.email_body}`);
        // Fallback for unknown structure
        if (parts.length === 0) {
          parts.push('```json\n' + JSON.stringify(r, null, 2) + '\n```');
        }
      }
    }

    return parts.length > 0 ? parts.join('\n') : JSON.stringify(result, null, 2);
  };

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Brain className="h-5 w-5 text-primary" />
          Assistente AI
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => runAction('analyze_contact', 'Analisi contatto')}
            disabled={isAnalyzing}
          >
            {activeAction === 'analyze_contact' ? (
              <Loader2 className="h-3 w-3 animate-spin mr-1" />
            ) : (
              <TrendingUp className="h-3 w-3 mr-1" />
            )}
            Analizza
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => runAction('categorize_lead', 'Categorizzazione')}
            disabled={isAnalyzing}
          >
            {activeAction === 'categorize_lead' ? (
              <Loader2 className="h-3 w-3 animate-spin mr-1" />
            ) : (
              <Sparkles className="h-3 w-3 mr-1" />
            )}
            Categorizza
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => runAction('generate_email', 'Email generata')}
            disabled={isAnalyzing}
          >
            {activeAction === 'generate_email' ? (
              <Loader2 className="h-3 w-3 animate-spin mr-1" />
            ) : (
              <Mail className="h-3 w-3 mr-1" />
            )}
            Genera Email
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => runAction('summarize_interactions', 'Riepilogo interazioni')}
            disabled={isAnalyzing}
          >
            {activeAction === 'summarize_interactions' ? (
              <Loader2 className="h-3 w-3 animate-spin mr-1" />
            ) : (
              <CalendarCheck className="h-3 w-3 mr-1" />
            )}
            Riepilogo
          </Button>
        </div>

        {analysis && (
          <div className="bg-primary/5 rounded-lg p-3 relative">
            <div className="flex items-center justify-between mb-2">
              <Badge variant="secondary" className="text-xs">
                {analysis.action}
              </Badge>
              <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => setAnalysis(null)}>
                <X className="h-3 w-3" />
              </Button>
            </div>
            <ScrollArea className="max-h-[300px]">
              <div className="prose prose-sm dark:prose-invert max-w-none text-sm">
                <ReactMarkdown>{formatResult(analysis.result)}</ReactMarkdown>
              </div>
            </ScrollArea>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
