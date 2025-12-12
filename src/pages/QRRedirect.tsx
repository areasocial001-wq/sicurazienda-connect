import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { QrCode, Loader2, AlertCircle, Ban, Clock } from "lucide-react";

const QRRedirect = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [error, setError] = useState<'not_found' | 'disabled' | 'expired' | null>(null);

  useEffect(() => {
    const trackAndRedirect = async () => {
      console.log('[QRRedirect] Starting redirect flow for QR ID:', id);
      
      if (!id) {
        console.error('[QRRedirect] No QR ID provided in URL');
        setError('not_found');
        return;
      }

      try {
        console.log('[QRRedirect] Fetching QR code from database...');
        
        // Get QR code info including file path for signed URL generation
        const { data: qrCode, error: qrError } = await supabase
          .from('qr_codes')
          .select('public_url, is_active, expires_at, document_id')
          .eq('id', id)
          .maybeSingle();

        console.log('[QRRedirect] QR code query result:', { qrCode, qrError });

        if (qrError) {
          console.error('[QRRedirect] Database error fetching QR code:', qrError);
          setError('not_found');
          return;
        }
        
        if (!qrCode) {
          console.error('[QRRedirect] QR code not found in database for ID:', id);
          setError('not_found');
          return;
        }

        console.log('[QRRedirect] QR code found:', {
          document_id: qrCode.document_id,
          is_active: qrCode.is_active,
          expires_at: qrCode.expires_at
        });

        // Check if QR code is active
        if (!qrCode.is_active) {
          console.log('[QRRedirect] QR code is disabled');
          setError('disabled');
          return;
        }

        // Check if QR code is expired
        if (qrCode.expires_at && new Date(qrCode.expires_at) < new Date()) {
          console.log('[QRRedirect] QR code is expired. Expires at:', qrCode.expires_at);
          setError('expired');
          return;
        }

        // Track the scan (fire and forget)
        console.log('[QRRedirect] Tracking scan...');
        supabase
          .from('qr_scans')
          .insert({
            qr_code_id: id,
            user_agent: navigator.userAgent
          })
          .then(({ error }) => {
            if (error) {
              console.error('[QRRedirect] Error tracking scan:', error);
            } else {
              console.log('[QRRedirect] Scan tracked successfully');
            }
          });

        // Get document file path to generate a fresh signed URL
        console.log('[QRRedirect] Fetching document for file_path...');
        const { data: document, error: docError } = await supabase
          .from('documents')
          .select('file_path')
          .eq('id', qrCode.document_id)
          .maybeSingle();

        console.log('[QRRedirect] Document query result:', { document, docError });

        if (document?.file_path) {
          console.log('[QRRedirect] Generating fresh signed URL for:', document.file_path);
          
          // Generate fresh signed URL via edge function (valid for 1 hour for this redirect)
          // Use direct fetch to avoid Supabase client auth issues for public access
          const edgeFunctionUrl = `https://obzflzotzvwlmgyjxfpv.supabase.co/functions/v1/generate-signed-url`;
          
          try {
            const response = await fetch(edgeFunctionUrl, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9iemZsem90enZ3bG1neWp4ZnB2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgwMjY3OTQsImV4cCI6MjA3MzYwMjc5NH0.ajn-6isd6JoZQDVLz4ZIz8u1kWMVcBfy990iDE6Pr5g'
              },
              body: JSON.stringify({ filePath: document.file_path, expiresIn: 3600 })
            });
            
            const signedData = await response.json();
            console.log('[QRRedirect] Signed URL generation result:', signedData);

            if (response.ok && signedData?.signedUrl) {
              console.log('[QRRedirect] Redirecting to fresh signed URL');
              window.location.href = signedData.signedUrl;
              return;
            } else {
              console.warn('[QRRedirect] Failed to generate signed URL, falling back to stored URL');
            }
          } catch (fetchError) {
            console.error('[QRRedirect] Error calling edge function:', fetchError);
          }
        } else {
          console.warn('[QRRedirect] No file_path found, falling back to stored URL');
        }

        // Fallback to stored URL if signed URL generation fails
        console.log('[QRRedirect] Redirecting to stored public URL:', qrCode.public_url);
        window.location.href = qrCode.public_url;
      } catch (err) {
        console.error('[QRRedirect] Unexpected error during redirect:', err);
        setError('not_found');
      }
    };

    trackAndRedirect();
  }, [id]);

  if (error === 'expired') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center">
          <Clock className="h-16 w-16 text-amber-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Link Scaduto</h1>
          <p className="text-muted-foreground mb-4">
            Questo link di download è scaduto. Contatta chi ti ha inviato il documento per ottenere un nuovo link.
          </p>
          <button 
            onClick={() => navigate('/')}
            className="text-primary hover:underline"
          >
            Torna alla home
          </button>
        </div>
      </div>
    );
  }

  if (error === 'disabled') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center">
          <Ban className="h-16 w-16 text-destructive mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">QR Code Disabilitato</h1>
          <p className="text-muted-foreground mb-4">
            Questo QR code è stato disabilitato e non è più possibile accedere al documento.
          </p>
          <button 
            onClick={() => navigate('/')}
            className="text-primary hover:underline"
          >
            Torna alla home
          </button>
        </div>
      </div>
    );
  }

  if (error === 'not_found') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center">
          <AlertCircle className="h-16 w-16 text-destructive mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">QR Code non trovato</h1>
          <p className="text-muted-foreground mb-4">
            Il QR code richiesto non esiste o è stato eliminato.
          </p>
          <button 
            onClick={() => navigate('/')}
            className="text-primary hover:underline"
          >
            Torna alla home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        <QrCode className="h-16 w-16 text-primary mx-auto mb-4 animate-pulse" />
        <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
        <p className="text-muted-foreground">Reindirizzamento in corso...</p>
      </div>
    </div>
  );
};

export default QRRedirect;
