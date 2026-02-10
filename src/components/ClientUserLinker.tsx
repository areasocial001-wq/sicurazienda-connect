import { useState, useEffect } from 'react';
import { Link2, Link2Off, Search, Loader2, UserCheck } from 'lucide-react';
import { CreateClientAccount } from './CreateClientAccount';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ClientUserLinkerProps {
  contactId: string;
  currentClientUserId?: string | null;
  contactName: string;
  contactEmail?: string | null;
  contactCompany?: string | null;
  onLinked?: () => void;
}

interface UserInfo {
  id: string;
  email: string;
  full_name?: string;
}

export function ClientUserLinker({ 
  contactId, 
  currentClientUserId, 
  contactName,
  contactEmail,
  contactCompany,
  onLinked 
}: ClientUserLinkerProps) {
  const { toast } = useToast();
  const [showDialog, setShowDialog] = useState(false);
  const [showUnlinkConfirm, setShowUnlinkConfirm] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState<UserInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [linking, setLinking] = useState(false);
  const [linkedUser, setLinkedUser] = useState<UserInfo | null>(null);

  // Fetch current linked user info
  useEffect(() => {
    if (currentClientUserId) {
      fetchLinkedUser();
    } else {
      setLinkedUser(null);
    }
  }, [currentClientUserId]);

  const fetchLinkedUser = async () => {
    if (!currentClientUserId) return;
    
    try {
      const { data, error } = await supabase.functions.invoke('admin-list-users');
      
      if (error) throw error;
      
      const foundUser = data?.users?.find((u: any) => u.id === currentClientUserId);
      if (foundUser) {
        setLinkedUser({
          id: foundUser.id,
          email: foundUser.email,
          full_name: foundUser.user_metadata?.full_name
        });
      }
    } catch (error) {
      console.error('Error fetching linked user:', error);
    }
  };

  const searchUsers = async () => {
    if (!searchQuery.trim()) {
      toast({ title: "Inserisci un termine di ricerca", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('admin-list-users');
      
      if (error) throw error;

      const filtered = (data?.users || [])
        .filter((u: any) => 
          u.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          u.user_metadata?.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
        )
        .map((u: any) => ({
          id: u.id,
          email: u.email,
          full_name: u.user_metadata?.full_name
        }));

      setUsers(filtered);
      
      if (filtered.length === 0) {
        toast({ 
          title: "Nessun utente trovato", 
          description: "Prova con un altro termine di ricerca" 
        });
      }
    } catch (error: any) {
      toast({ title: "Errore", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const linkUser = async (userId: string) => {
    setLinking(true);
    try {
      const { error } = await supabase
        .from('crm_contacts')
        .update({ client_user_id: userId })
        .eq('id', contactId);

      if (error) throw error;

      toast({ title: "Account collegato", description: "L'utente può ora accedere ai suoi documenti" });
      setShowDialog(false);
      setSearchQuery('');
      setUsers([]);
      onLinked?.();
    } catch (error: any) {
      toast({ title: "Errore", description: error.message, variant: "destructive" });
    } finally {
      setLinking(false);
    }
  };

  const unlinkUser = async () => {
    setLinking(true);
    try {
      const { error } = await supabase
        .from('crm_contacts')
        .update({ client_user_id: null })
        .eq('id', contactId);

      if (error) throw error;

      toast({ title: "Account scollegato" });
      setShowUnlinkConfirm(false);
      setLinkedUser(null);
      onLinked?.();
    } catch (error: any) {
      toast({ title: "Errore", description: error.message, variant: "destructive" });
    } finally {
      setLinking(false);
    }
  };

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <UserCheck className="h-5 w-5 text-primary" />
            Accesso Cliente
          </CardTitle>
        </CardHeader>
        <CardContent>
          {linkedUser ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                <div>
                  <p className="font-medium text-green-700">{linkedUser.email}</p>
                  {linkedUser.full_name && (
                    <p className="text-sm text-muted-foreground">{linkedUser.full_name}</p>
                  )}
                </div>
                <Badge className="bg-green-500/20 text-green-700">Collegato</Badge>
              </div>
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => setShowUnlinkConfirm(true)}
              >
                <Link2Off className="h-4 w-4 mr-2" />
                Scollega Account
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Collega un account utente per permettere al cliente di accedere ai propri documenti.
              </p>
              <CreateClientAccount
                contactId={contactId}
                contactName={contactName}
                contactEmail={contactEmail}
                contactCompany={contactCompany}
                onAccountCreated={onLinked}
              />
              <Button 
                variant="outline"
                className="w-full"
                onClick={() => setShowDialog(true)}
              >
                <Link2 className="h-4 w-4 mr-2" />
                Collega Account Esistente
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Link Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Collega Account Utente</DialogTitle>
            <DialogDescription>
              Cerca l'utente da collegare a "{contactName}"
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="Cerca per email o nome..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && searchUsers()}
              />
              <Button onClick={searchUsers} disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              </Button>
            </div>

            {users.length > 0 && (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {users.map((user) => (
                  <div 
                    key={user.id}
                    className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                  >
                    <div>
                      <p className="font-medium">{user.email}</p>
                      {user.full_name && (
                        <p className="text-sm text-muted-foreground">{user.full_name}</p>
                      )}
                    </div>
                    <Button
                      size="sm"
                      onClick={() => linkUser(user.id)}
                      disabled={linking}
                    >
                      {linking ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Collega'}
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Unlink Confirmation */}
      <AlertDialog open={showUnlinkConfirm} onOpenChange={setShowUnlinkConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Scollega Account</AlertDialogTitle>
            <AlertDialogDescription>
              Sei sicuro di voler scollegare l'account da "{contactName}"? 
              L'utente non potrà più accedere ai documenti del cassetto.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction onClick={unlinkUser} disabled={linking}>
              {linking ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Scollega
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
