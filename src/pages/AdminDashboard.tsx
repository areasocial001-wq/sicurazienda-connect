import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useUserRole } from '@/hooks/useUserRole'
import { supabase } from '@/integrations/supabase/client'
import BottomNav from '@/components/BottomNav'
import AuthModal from '@/components/AuthModal'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { FileText, Download, User, Calendar, Building, Shield } from 'lucide-react'
import { toast } from 'sonner'

interface DocumentWithUser {
  id: string
  name: string
  file_path: string
  file_type: string | null
  category: string | null
  created_at: string
  updated_at: string
  user_id: string
  profiles?: {
    full_name: string | null
    company_name: string | null
  }
}

export default function AdminDashboard() {
  const { user, signOut } = useAuth()
  const { isAdmin, loading: roleLoading } = useUserRole()
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [documents, setDocuments] = useState<DocumentWithUser[]>([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    totalDocuments: 0,
    totalUsers: 0,
    documentsThisMonth: 0
  })

  useEffect(() => {
    if (!roleLoading && user && isAdmin) {
      fetchDocuments()
      fetchStats()
    } else if (!roleLoading && !isAdmin) {
      setLoading(false)
    }
  }, [user, isAdmin, roleLoading])

  const fetchDocuments = async () => {
    try {
      const { data: documentsData, error: docsError } = await supabase
        .from('documents')
        .select('*')
        .order('created_at', { ascending: false })

      if (docsError) throw docsError

      // Get user profiles for each document
      const documentsWithProfiles = await Promise.all(
        (documentsData || []).map(async (doc) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, company_name')
            .eq('user_id', doc.user_id)
            .single()

          return {
            ...doc,
            profiles: profile || { full_name: null, company_name: null }
          }
        })
      )

      setDocuments(documentsWithProfiles)
    } catch (error) {
      console.error('Error fetching documents:', error)
      toast.error('Errore nel caricamento dei documenti')
    } finally {
      setLoading(false)
    }
  }

  const fetchStats = async () => {
    try {
      // Total documents
      const { count: totalDocs } = await supabase
        .from('documents')
        .select('*', { count: 'exact', head: true })

      // Total users
      const { count: totalUsersCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })

      // Documents this month
      const startOfMonth = new Date()
      startOfMonth.setDate(1)
      startOfMonth.setHours(0, 0, 0, 0)

      const { count: monthlyDocs } = await supabase
        .from('documents')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', startOfMonth.toISOString())

      setStats({
        totalDocuments: totalDocs || 0,
        totalUsers: totalUsersCount || 0,
        documentsThisMonth: monthlyDocs || 0
      })
    } catch (error) {
      console.error('Error fetching stats:', error)
    }
  }

  const handleDownload = async (filePath: string, fileName: string) => {
    try {
      const { data, error } = await supabase.storage
        .from('documents')
        .download(filePath)

      if (error) throw error

      const url = URL.createObjectURL(data)
      const a = document.createElement('a')
      a.href = url
      a.download = fileName
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      toast.success('Download completato')
    } catch (error) {
      console.error('Error downloading file:', error)
      toast.error('Errore durante il download')
    }
  }

  const handleSignOut = async () => {
    await signOut()
    setShowAuthModal(true)
  }

  if (roleLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/20 via-background to-secondary/20 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Caricamento...</p>
        </div>
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
                Devi effettuare l'accesso per vedere la dashboard amministrativa.
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
                Non hai i permessi necessari per accedere a questa area. 
                Solo gli amministratori possono visualizzare questa dashboard.
              </p>
              <Button 
                onClick={() => window.location.href = '/documents'}
                className="w-full"
              >
                Torna ai Documenti
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
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">Dashboard Amministrativa</h1>
            <p className="text-muted-foreground">Gestisci tutti i documenti e gli utenti della piattaforma</p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Documenti Totali</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalDocuments}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Utenti Registrati</CardTitle>
                <User className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalUsers}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Documenti Questo Mese</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.documentsThisMonth}</div>
              </CardContent>
            </Card>
          </div>

          {/* Documents List */}
          <Card>
            <CardHeader>
              <CardTitle>Tutti i Documenti</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : documents.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">Nessun documento caricato</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {documents.map((doc) => (
                    <div key={doc.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <FileText className="h-5 w-5 text-primary" />
                          <h3 className="font-medium">{doc.name}</h3>
                          {doc.category && (
                            <Badge variant="secondary">{doc.category}</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <User className="h-4 w-4" />
                            <span>{doc.profiles?.full_name || 'Nome non disponibile'}</span>
                          </div>
                          {doc.profiles?.company_name && (
                            <div className="flex items-center gap-1">
                              <Building className="h-4 w-4" />
                              <span>{doc.profiles.company_name}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            <span>{new Date(doc.created_at).toLocaleDateString('it-IT')}</span>
                          </div>
                        </div>
                      </div>
                      <Button
                        onClick={() => handleDownload(doc.file_path, doc.name)}
                        size="sm"
                        variant="outline"
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Scarica
                      </Button>
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