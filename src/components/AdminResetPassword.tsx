import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { KeyRound, Loader2, ExternalLink, Copy, Check } from 'lucide-react';

interface AdminResetPasswordProps {
  triggerClassName?: string;
}

const AdminResetPassword = ({ triggerClassName }: AdminResetPasswordProps) => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetLink, setResetLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [open, setOpen] = useState(false);
  const { toast } = useToast();

  const handleResetPassword = async () => {
    if (!email) {
      toast({
        title: 'Email richiesta',
        description: 'Inserisci l\'email dell\'utente.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    setResetLink(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast({
          title: 'Non autorizzato',
          description: 'Devi essere autenticato come admin.',
          variant: 'destructive',
        });
        setLoading(false);
        return;
      }

      const response = await supabase.functions.invoke('admin-reset-password', {
        body: { email },
      });

      if (response.error) {
        throw new Error(response.error.message || 'Errore durante il reset');
      }

      const link = response.data?.resetLink || response.data?.action_link;
      
      if (link) {
        setResetLink(link);
        toast({
          title: 'Link generato',
          description: 'Il link di reset password è stato generato con successo.',
        });
      } else {
        throw new Error('Link non ricevuto dal server');
      }
    } catch (error: any) {
      console.error('Reset password error:', error);
      toast({
        title: 'Errore',
        description: error.message || 'Impossibile generare il link di reset.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = async () => {
    if (resetLink) {
      await navigator.clipboard.writeText(resetLink);
      setCopied(true);
      toast({
        title: 'Copiato!',
        description: 'Link copiato negli appunti.',
      });
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleOpenLink = () => {
    if (resetLink) {
      window.open(resetLink, '_blank');
    }
  };

  const handleClose = () => {
    setOpen(false);
    setEmail('');
    setResetLink(null);
    setCopied(false);
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen) handleClose();
      else setOpen(true);
    }}>
      <DialogTrigger asChild>
        <Button variant="outline" className={triggerClassName}>
          <KeyRound className="h-4 w-4 mr-2" />
          Reset Password Utente
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Reset Password Utente</DialogTitle>
          <DialogDescription>
            Inserisci l'email dell'utente per generare un link di reset password.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="reset-email">Email utente</Label>
            <Input
              id="reset-email"
              type="email"
              placeholder="utente@esempio.it"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading || !!resetLink}
            />
          </div>

          {resetLink && (
            <div className="space-y-2">
              <Label>Link di reset generato</Label>
              <div className="flex gap-2">
                <Input
                  value={resetLink}
                  readOnly
                  className="text-xs"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleCopyLink}
                  title="Copia link"
                >
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleOpenLink}
                  title="Apri link"
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Puoi copiare questo link e inviarlo all'utente, oppure aprirlo direttamente.
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="flex gap-2 sm:gap-0">
          {!resetLink ? (
            <Button onClick={handleResetPassword} disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Genera Link Reset
            </Button>
          ) : (
            <Button variant="secondary" onClick={handleClose}>
              Chiudi
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AdminResetPassword;
