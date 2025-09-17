import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useUserRole } from '@/hooks/useUserRole'
import { supabase } from '@/integrations/supabase/client'
import BottomNav from '@/components/BottomNav'
import AuthModal from '@/components/AuthModal'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Shield, User, Building2 } from 'lucide-react'
import { toast } from 'sonner'

interface UserWithProfile {
  id: string
  email: string
  role: any // Usare any per evitare problemi di tipo con i nuovi ruoli
  full_name?: string
  company_name?: string
}

export default function UserRoleManager() {
  const { user, signOut } = useAuth()
  const { isAdmin, loading: roleLoading } = useUserRole()
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [users, setUsers] = useState<UserWithProfile[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!roleLoading && user && isAdmin) {
      fetchUsers()
    } else if (!roleLoading && !isAdmin) {
      setLoading(false)
    }
  }, [user, isAdmin, roleLoading])

  const fetchUsers = async () => {
    try {
      // Ottieni tutti gli utenti con i loro ruoli e profili
      const { data: userRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select(`
          user_id,
          role,
          profiles:user_id (
            full_name,
            company_name
          )
        `)

      if (rolesError) throw rolesError

      // Ottieni gli utenti auth per ottenere email
      const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers()
      
      if (authError) throw authError

      // Combina i dati
      const usersWithProfiles = authUsers.users.map(authUser => {
        const userRole = userRoles.find(ur => ur.user_id === authUser.id)
        const profile = userRole?.profiles as any
        
        return {
          id: authUser.id,
          email: authUser.email || '',
          role: (userRole?.role || 'user') as any,
          full_name: profile?.full_name,
          company_name: profile?.company_name
        }
      })

      setUsers(usersWithProfiles)
    } catch (error) {
      console.error('Error fetching users:', error)
      toast.error('Errore nel caricamento degli utenti')
    } finally {
      setLoading(false)
    }
  }

  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      const { error } = await supabase
        .from('user_roles')
        .update({ role: newRole as any })
        .eq('user_id', userId)

      if (error) throw error

      toast.success('Ruolo aggiornato con successo')
      fetchUsers() // Ricarica i dati
    } catch (error) {
      console.error('Error updating role:', error)
      toast.error('Errore nell\'aggiornamento del ruolo')
    }
  }

  const handleSignOut = async () => {
    await signOut()
    window.location.href = '/'
  }

  const getRoleDisplayName = (role: string) => {
    switch (role) {
      case 'admin': return 'Amministratore'
      case 'contabilita': return 'Contabilità'
      case 'area_tecnica': return 'Area Tecnica'
      case 'gestione_corsi': return 'Gestione Corsi'
      case 'consulenti_tecnici': return 'Consulenti Tecnici'
      case 'user': return 'Utente'
      default: return 'Non definito'
    }
  }

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-red-100 text-red-800'
      case 'contabilita': return 'bg-blue-100 text-blue-800'
      case 'area_tecnica': return 'bg-green-100 text-green-800'
      case 'gestione_corsi': return 'bg-purple-100 text-purple-800'
      case 'consulenti_tecnici': return 'bg-orange-100 text-orange-800'
      case 'user': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  if (roleLoading || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/20 via-background to-secondary/20 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!user) {
    return (
      <>
        <header className="bg-primary text-primary-foreground shadow-lg">
          <div className="container mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Shield className="h-8 w-8" />
              <div className="text-center">
                <h1 className="text-2xl font-bold">SicurAzienda</h1>
                <p className="text-sm opacity-90">l'azione di tanti per la sicurezza di tutti</p>
              </div>
            </div>
            <Button 
              onClick={handleSignOut}
              variant="secondary"
              size="sm"
            >
              Esci
            </Button>
          </div>
        </header>
        <div className="min-h-screen bg-gradient-to-br from-primary/20 via-background to-secondary/20 flex items-center justify-center px-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="text-center">Accesso Richiesto</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-center text-muted-foreground">
                Devi effettuare l'accesso per gestire i ruoli utente.
              </p>
              <Button 
                onClick={() => setShowAuthModal(true)}
                className="w-full"
              >
                Accedi
              </Button>
            </CardContent>
          </Card>
        </div>
        <BottomNav />
        <AuthModal 
          open={showAuthModal} 
          onOpenChange={setShowAuthModal}
        />
      </>
    )
  }

  if (!isAdmin) {
    return (
      <>
        <header className="bg-primary text-primary-foreground shadow-lg">
          <div className="container mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Shield className="h-8 w-8" />
              <div className="text-center">
                <h1 className="text-2xl font-bold">SicurAzienda</h1>
                <p className="text-sm opacity-90">l'azione di tanti per la sicurezza di tutti</p>
              </div>
            </div>
            <Button 
              onClick={handleSignOut}
              variant="secondary"
              size="sm"
            >
              Esci
            </Button>
          </div>
        </header>
        <div className="min-h-screen bg-gradient-to-br from-primary/20 via-background to-secondary/20 flex items-center justify-center px-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="text-center text-destructive">Accesso Negato</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-center text-muted-foreground">
                Solo gli amministratori possono gestire i ruoli utente.
              </p>
              <Button 
                onClick={() => window.location.href = '/admin'}
                className="w-full"
              >
                Torna alla Dashboard
              </Button>
            </CardContent>
          </Card>
        </div>
        <BottomNav />
      </>
    )
  }

  return (
    <>
      <header className="bg-primary text-primary-foreground shadow-lg">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Shield className="h-8 w-8" />
            <div className="text-center">
              <h1 className="text-2xl font-bold">SicurAzienda</h1>
              <p className="text-sm opacity-90">l'azione di tanti per la sicurezza di tutti</p>
            </div>
          </div>
          <Button 
            onClick={handleSignOut}
            variant="secondary"
            size="sm"
          >
            Esci
          </Button>
        </div>
      </header>
      <div className="min-h-screen bg-gradient-to-br from-primary/20 via-background to-secondary/20 py-8 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">Gestione Ruoli Utente</h1>
            <p className="text-muted-foreground">Assegna ruoli aziendali agli utenti registrati</p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Utenti e Ruoli</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : users.length === 0 ? (
                <div className="text-center py-8">
                  <User className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">Nessun utente registrato</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {users.map((userItem) => (
                    <div key={userItem.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <User className="h-5 w-5 text-primary" />
                          <div>
                            <h3 className="font-medium">{userItem.full_name || userItem.email}</h3>
                            <p className="text-sm text-muted-foreground">{userItem.email}</p>
                          </div>
                        </div>
                        {userItem.company_name && (
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Building2 className="h-4 w-4" />
                            <span>{userItem.company_name}</span>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-4">
                        <Badge className={getRoleColor(userItem.role)}>
                          {getRoleDisplayName(userItem.role)}
                        </Badge>
                        <Select
                          value={userItem.role}
                          onValueChange={(newRole) => handleRoleChange(userItem.id, newRole)}
                        >
                          <SelectTrigger className="w-48">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="user">Utente</SelectItem>
                            <SelectItem value="contabilita">Contabilità</SelectItem>
                            <SelectItem value="area_tecnica">Area Tecnica</SelectItem>
                            <SelectItem value="gestione_corsi">Gestione Corsi</SelectItem>
                            <SelectItem value="consulenti_tecnici">Consulenti Tecnici</SelectItem>
                            <SelectItem value="admin">Amministratore</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
      <BottomNav />
    </>
  )
}