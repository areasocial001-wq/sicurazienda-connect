import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface ClassificationResult {
  category: string;
  area_competenza: string;
  confidence: number;
  extracted_data: {
    tipo?: string;
    date_rilevanti?: string[];
    importi?: string[];
    soggetti?: string[];
    codici?: string[];
  };
  suggerimento?: string;
}

interface ExtractionResult {
  date?: string[];
  importi?: string[];
  persone?: string[];
  aziende?: string[];
  codici?: string[];
  indirizzi?: string[];
  contatti?: {
    email?: string[];
    telefoni?: string[];
  };
  summary?: string;
}

interface SearchCriteria {
  keywords: string[];
  categories: string[];
  areas: string[];
  date_range?: {
    from?: string;
    to?: string;
  };
  intent: string;
}

export function useDocumentAgent() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const classifyDocument = useCallback(async (filename: string, content?: string): Promise<ClassificationResult | null> => {
    setIsProcessing(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('document-agent', {
        body: { action: 'classify', filename, content }
      });

      if (fnError) throw fnError;
      if (!data.success) throw new Error(data.error);

      return data.result as ClassificationResult;
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : 'Errore nella classificazione';
      setError(errorMsg);
      console.error('Classification error:', e);
      return null;
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const extractData = useCallback(async (filename: string, content: string): Promise<ExtractionResult | null> => {
    setIsProcessing(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('document-agent', {
        body: { action: 'extract', filename, content }
      });

      if (fnError) throw fnError;
      if (!data.success) throw new Error(data.error);

      return data.result as ExtractionResult;
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : 'Errore nell\'estrazione';
      setError(errorMsg);
      console.error('Extraction error:', e);
      return null;
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const semanticSearch = useCallback(async (query: string): Promise<SearchCriteria | null> => {
    setIsProcessing(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('document-agent', {
        body: { action: 'search', query }
      });

      if (fnError) throw fnError;
      if (!data.success) throw new Error(data.error);

      return data.result as SearchCriteria;
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : 'Errore nella ricerca';
      setError(errorMsg);
      console.error('Search error:', e);
      return null;
    } finally {
      setIsProcessing(false);
    }
  }, []);

  return {
    isProcessing,
    error,
    classifyDocument,
    extractData,
    semanticSearch,
  };
}
