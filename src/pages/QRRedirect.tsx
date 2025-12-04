import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { QrCode, Loader2, AlertCircle, Ban } from "lucide-react";

const QRRedirect = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [error, setError] = useState<'not_found' | 'disabled' | null>(null);

  useEffect(() => {
    const trackAndRedirect = async () => {
      if (!id) {
        setError('not_found');
        return;
      }

      try {
        // Get QR code info
        const { data: qrCode, error: qrError } = await supabase
          .from('qr_codes')
          .select('public_url, is_active')
          .eq('id', id)
          .maybeSingle();

        if (qrError || !qrCode) {
          console.error('QR code not found:', qrError);
          setError('not_found');
          return;
        }

        // Check if QR code is active
        if (!qrCode.is_active) {
          setError('disabled');
          return;
        }

        // Track the scan (fire and forget)
        supabase
          .from('qr_scans')
          .insert({
            qr_code_id: id,
            user_agent: navigator.userAgent
          })
          .then(() => console.log('Scan tracked'));

        // Redirect to the actual document
        window.location.href = qrCode.public_url;
      } catch (err) {
        console.error('Error tracking QR scan:', err);
        setError('not_found');
      }
    };

    trackAndRedirect();
  }, [id]);

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
