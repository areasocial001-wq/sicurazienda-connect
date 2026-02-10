import { useState } from 'react';
import { UserPlus, Loader2, Eye, EyeOff, Mail, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface CreateClientAccountProps {
  contactId: string;
  contactName: string;
  contactEmail?: string | null;
  contactCompany?: string | null;
  onAccountCreated?: () => void;
}

export function CreateClientAccount({
  contactId,
  contactName,
  contactEmail,
  contactCompany,
  onAccountCreated,
}: CreateClientAccountProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [success, setSuccess] = useState(false);

  const [email, setEmail] = useState(contactEmail || '');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState(contactName || '');
  const [companyName, setCompanyName] = useState(contactCompany || '');
  const [sendEmail, setSendEmail] = useState(true);

  const generatePassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%';
    let result = '';
    for (let i = 0; i < 12; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setPassword(result);
    setShowPassword(true);
  };

  const handleOpen = () => {
    setEmail(contactEmail || '');
    setFullName(contactName || '');
    setCompanyName(contactCompany || '');
    setPassword('');
    setSendEmail(true);
    setShowPassword(false);
    setSuccess(false);
    generatePassword();
    setOpen(true);
  };

  const handleCreate = async () => {
    if (!email || !password) {
      toast.error('Email e password sono obbligatorie');
      return;
    }
    if (password.length < 6) {
      toast.error('La password deve essere di almeno 6 caratteri');
      return;
    }

    setLoading(true);
    try {
      // 1. Create the user account
      const { data: createData, error: createError } = await supabase.functions.invoke('admin-create-user', {
        body: { email, password, fullName, companyName, role: 'user' },
      });

      if (createError) throw createError;
      if (createData?.error) throw new Error(createData.error);

      const newUserId = createData?.user?.id;
      if (!newUserId) throw new Error('ID utente non ricevuto');

      // 2. Link the user to the CRM contact
      const { error: linkError } = await supabase
        .from('crm_contacts')
        .update({ client_user_id: newUserId })
        .eq('id', contactId);

      if (linkError) {
        console.error('Error linking user:', linkError);
        toast.warning('Account creato ma non collegato automaticamente. Collega manualmente.');
      }

      // 3. Send credentials email
      if (sendEmail) {
        const { error: emailError } = await supabase.functions.invoke('send-credentials-email', {
          body: { email, password, fullName, companyName },
        });

        if (emailError) {
          console.error('Error sending email:', emailError);
          toast.warning('Account creato e collegato, ma errore nell\'invio email. Comunica le credenziali manualmente.');
        }
      }

      setSuccess(true);
      toast.success('Account cliente creato, collegato e credenziali inviate!');
      onAccountCreated?.();
    } catch (error: any) {
      console.error('Error creating client account:', error);
      toast.error(error.message || 'Errore nella creazione dell\'account');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button variant="outline" className="w-full" onClick={handleOpen}>
        <UserPlus className="h-4 w-4 mr-2" />
        Crea Account Cliente
      </Button>

      <Dialog open={open} onOpenChange={(v) => !loading && setOpen(v)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Crea Account Cliente</DialogTitle>
            <DialogDescription>
              Crea un account per "{contactName}" e invia le credenziali via email.
            </DialogDescription>
          </DialogHeader>

          {success ? (
            <div className="py-6 text-center space-y-4">
              <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto" />
              <div>
                <p className="font-semibold text-lg">Account creato con successo!</p>
                <p className="text-sm text-muted-foreground mt-1">
                  L'account è stato creato, collegato al contatto
                  {sendEmail && ' e le credenziali sono state inviate via email'}.
                </p>
              </div>
              <Button onClick={() => setOpen(false)} className="w-full">Chiudi</Button>
            </div>
          ) : (
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="client-email">Email *</Label>
                <Input
                  id="client-email"
                  type="email"
                  placeholder="cliente@azienda.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="client-password">Password *</Label>
                  <Button type="button" variant="ghost" size="sm" onClick={generatePassword} disabled={loading}>
                    Rigenera
                  </Button>
                </div>
                <div className="relative">
                  <Input
                    id="client-password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="client-fullname">Nome Completo</Label>
                <Input
                  id="client-fullname"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="client-company">Azienda</Label>
                <Input
                  id="client-company"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  disabled={loading}
                />
              </div>

              <div className="flex items-center space-x-2 pt-2">
                <Checkbox
                  id="send-email"
                  checked={sendEmail}
                  onCheckedChange={(checked) => setSendEmail(checked === true)}
                  disabled={loading}
                />
                <Label htmlFor="send-email" className="text-sm cursor-pointer flex items-center gap-1">
                  <Mail className="h-4 w-4" />
                  Invia credenziali via email al cliente
                </Label>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
                  Annulla
                </Button>
                <Button onClick={handleCreate} disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Creazione...
                    </>
                  ) : (
                    <>
                      <UserPlus className="h-4 w-4 mr-2" />
                      Crea e Collega
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
