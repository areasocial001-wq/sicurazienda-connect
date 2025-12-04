import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { QrCode } from "lucide-react";

const ScanNotifications = () => {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('qr-scan-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'qr_scans'
        },
        async (payload) => {
          // Get the QR code info to check if it belongs to this user
          const { data: qrCode } = await supabase
            .from('qr_codes')
            .select('document_name, created_by')
            .eq('id', payload.new.qr_code_id)
            .maybeSingle();

          if (qrCode && qrCode.created_by === user.id) {
            toast.success(
              `QR Code scansionato!`,
              {
                description: `Il documento "${qrCode.document_name}" è stato visualizzato`,
                icon: <QrCode className="h-5 w-5" />,
                duration: 5000
              }
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  return null;
};

export default ScanNotifications;
