import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useUserRole } from '@/hooks/useUserRole'
import { supabase } from '@/integrations/supabase/client'
import BottomNav from '@/components/BottomNav'
import AuthModal from '@/components/AuthModal'
import QRCodeModal from '@/components/QRCodeModal'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { FileText, Download, User, Calendar, Building, Shield, Settings, Upload, Award, Trash2, QrCode, Mail, ExternalLink } from 'lucide-react'
import { toast } from 'sonner'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

interface DocumentWithUser {
  id: string
  name: string
  file_path: string
  file_type: string | null
  category: string | null
  area_competenza?: string | null
  created_at: string
  updated_at: string
  user_id: string
  profiles?: {
    full_name: string | null
    company_name: string | null
  }
}

interface UserProfile {
  user_id: string
  full_name: string | null
  company_name: string | null
}

interface QRCodeRecord {
  id: string
  document_name: string
  public_url: string
  created_at: string
  sent_to_email: string | null
  sent_at: string | null
}

interface ChartDataPoint {
  date: string
  count: number
}

export default function AdminDashboard() {
  const { user, signOut } = useAuth()
  const { isAdmin, isAreaAziendale, role, getRoleDisplayName, loading: roleLoading } = useUserRole()
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [documents, setDocuments] = useState<DocumentWithUser[]>([])
  const [loading, setLoading] = useState(true)
  const [users, setUsers] = useState<UserProfile[]>([])
  const [selectedUserId, setSelectedUserId] = useState<string>('')
  const [uploading, setUploading] = useState(false)
  const [qrModalOpen, setQrModalOpen] = useState(false)
  const [selectedDocForQR, setSelectedDocForQR] = useState<{ url: string; name: string; id: string } | null>(null)
  const [recentQRCodes, setRecentQRCodes] = useState<QRCodeRecord[]>([])
  const [qrChartData, setQrChartData] = useState<ChartDataPoint[]>([])
  const [stats, setStats] = useState({
    totalDocuments: 0,
    totalUsers: 0,
    documentsThisMonth: 0,
    totalQRCodes: 0,
    qrCodesThisMonth: 0,
    qrCodesSentByEmail: 0
  })

  useEffect(() => {
    // Calcolare hasAccess solo dopo che i ruoli sono caricati
    const hasAccess = isAdmin || isAreaAziendale
    
    if (!roleLoading && user && hasAccess) {
      fetchDocuments()
      fetchStats()
      fetchRecentQRCodes()
      fetchQRChartData()
      if (isAdmin) {
        fetchUsers()
      }
    } else if (!roleLoading && user && !hasAccess) {
      setLoading(false)
    }
  }, [user, isAdmin, isAreaAziendale, roleLoading])

  const fetchDocuments = async () => {
    try {
      if (!role) return
      
      // Usare la funzione RPC per ottenere documenti filtrati per ruolo
      const { data: documentsData, error: docsError } = await supabase
        .rpc('get_documents_for_role', { user_role: role })

      if (docsError) throw docsError

      // Trasformare i dati nel formato corretto
      const documentsWithProfiles = (documentsData || []).map((doc: any) => ({
        id: doc.id,
        name: doc.name,
        file_path: doc.file_path,
        file_type: doc.file_type,
        category: doc.category,
        area_competenza: doc.area_competenza,
        created_at: doc.created_at,
        updated_at: doc.updated_at,
        user_id: doc.user_id,
        profiles: {
          full_name: doc.full_name,
          company_name: doc.company_name
        }
      }))

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

      // QR Code stats
      const { count: totalQR } = await supabase
        .from('qr_codes')
        .select('*', { count: 'exact', head: true })

      const { count: monthlyQR } = await supabase
        .from('qr_codes')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', startOfMonth.toISOString())

      const { count: emailedQR } = await supabase
        .from('qr_codes')
        .select('*', { count: 'exact', head: true })
        .not('sent_to_email', 'is', null)

      setStats({
        totalDocuments: totalDocs || 0,
        totalUsers: totalUsersCount || 0,
        documentsThisMonth: monthlyDocs || 0,
        totalQRCodes: totalQR || 0,
        qrCodesThisMonth: monthlyQR || 0,
        qrCodesSentByEmail: emailedQR || 0
      })
    } catch (error) {
      console.error('Error fetching stats:', error)
    }
  }

  const fetchRecentQRCodes = async () => {
    try {
      const { data, error } = await supabase
        .from('qr_codes')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5)

      if (error) throw error
      setRecentQRCodes(data || [])
    } catch (error) {
      console.error('Error fetching recent QR codes:', error)
    }
  }

  const fetchQRChartData = async () => {
    try {
      // Get QR codes from last 30 days
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

      const { data, error } = await supabase
        .from('qr_codes')
        .select('created_at')
        .gte('created_at', thirtyDaysAgo.toISOString())
        .order('created_at', { ascending: true })

      if (error) throw error

      // Group by date
      const grouped: Record<string, number> = {}
      data?.forEach(qr => {
        const date = new Date(qr.created_at).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' })
        grouped[date] = (grouped[date] || 0) + 1
      })

      const chartData = Object.entries(grouped).map(([date, count]) => ({ date, count }))
      setQrChartData(chartData)
    } catch (error) {
      console.error('Error fetching QR chart data:', error)
    }
  }

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, full_name, company_name')
        .not('user_id', 'is', null)
        .order('full_name')

      if (error) throw error
      setUsers(data || [])
    } catch (error) {
      console.error('Error fetching users:', error)
    }
  }

  const handleUploadAttestato = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      if (!selectedUserId) {
        toast.error('Seleziona un utente prima di caricare')
        return
      }

      if (!event.target.files || event.target.files.length === 0) {
        return
      }

      setUploading(true)
      const file = event.target.files[0]
      const fileExt = file.name.split('.').pop()
      const filePath = `${selectedUserId}/attestati/${Date.now()}.${fileExt}`

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, file)

      if (uploadError) throw uploadError

      // Insert record in documents table
      const { error: dbError } = await supabase
        .from('documents')
        .insert({
          user_id: selectedUserId,
          name: file.name,
          file_path: filePath,
          file_type: file.type,
          category: 'attestato',
          area_competenza: 'gestione_corsi'
        })

      if (dbError) throw dbError

      toast.success('Attestato caricato con successo')
      fetchDocuments()
      fetchStats()
      
      // Reset file input
      event.target.value = ''
    } catch (error: any) {
      console.error('Error uploading attestato:', error)
      toast.error(error.message || 'Errore durante il caricamento')
    } finally {
      setUploading(false)
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

  const handleDeleteDocument = async (docId: string, filePath: string) => {
    if (!confirm('Sei sicuro di voler eliminare questo documento?')) {
      return
    }

    try {
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('documents')
        .remove([filePath])

      if (storageError) {
        console.error('Storage error:', storageError)
        // Continue anyway to delete db record
      }

      // Delete from database
      const { error: dbError } = await supabase
        .from('documents')
        .delete()
        .eq('id', docId)

      if (dbError) throw dbError

      toast.success('Documento eliminato con successo')
      fetchDocuments()
      fetchStats()
    } catch (error: any) {
      console.error('Error deleting document:', error)
      toast.error(error.message || 'Errore durante l\'eliminazione')
    }
  }

  const handleShowQR = (docId: string, filePath: string, fileName: string) => {
    const { data } = supabase.storage
      .from('documents')
      .getPublicUrl(filePath)
    
    setSelectedDocForQR({ url: data.publicUrl, name: fileName, id: docId })
    setQrModalOpen(true)
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

  // Controllare accesso solo dopo che i ruoli sono caricati
  if (!isAdmin && !isAreaAziendale) {
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
                Solo gli amministratori e le aree aziendali possono visualizzare questa dashboard.
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
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-foreground mb-2">
                  Dashboard {getRoleDisplayName()}
                </h1>
                <p className="text-muted-foreground">
                  {isAdmin 
                    ? 'Gestisci tutti i documenti e gli utenti della piattaforma'
                    : `Visualizza e gestisci i documenti di competenza dell'${getRoleDisplayName()}`
                  }
                </p>
              </div>
              {isAdmin && (
                <Button 
                  onClick={() => window.location.href = '/user-roles'}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <Settings className="h-4 w-4" />
                  Gestione Ruoli
                </Button>
              )}
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
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
                <CardTitle className="text-sm font-medium">Doc. Questo Mese</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.documentsThisMonth}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">QR Code Totali</CardTitle>
                <QrCode className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalQRCodes}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">QR Questo Mese</CardTitle>
                <QrCode className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.qrCodesThisMonth}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">QR Inviati Email</CardTitle>
                <Award className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.qrCodesSentByEmail}</div>
              </CardContent>
            </Card>
          </div>

          {/* QR Code Chart and Recent */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <QrCode className="h-5 w-5" />
                  Andamento QR Code (ultimi 30 giorni)
                </CardTitle>
              </CardHeader>
              <CardContent>
                {qrChartData.length === 0 ? (
                  <div className="flex items-center justify-center h-[200px] text-muted-foreground">
                    Nessun dato disponibile
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={qrChartData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="date" className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                      <YAxis className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--background))', 
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px'
                        }} 
                      />
                      <Line 
                        type="monotone" 
                        dataKey="count" 
                        stroke="hsl(var(--primary))" 
                        strokeWidth={2}
                        dot={{ fill: 'hsl(var(--primary))' }}
                        name="QR Generati"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Recent QR Codes */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <QrCode className="h-5 w-5" />
                  QR Code Recenti
                </CardTitle>
              </CardHeader>
              <CardContent>
                {recentQRCodes.length === 0 ? (
                  <div className="flex items-center justify-center h-[200px] text-muted-foreground">
                    Nessun QR code generato
                  </div>
                ) : (
                  <div className="space-y-3">
                    {recentQRCodes.map((qr) => (
                      <div key={qr.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{qr.document_name}</p>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            <span>{new Date(qr.created_at).toLocaleDateString('it-IT')}</span>
                            {qr.sent_to_email && (
                              <>
                                <Mail className="h-3 w-3 ml-2" />
                                <span className="truncate">{qr.sent_to_email}</span>
                              </>
                            )}
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => window.open(qr.public_url, '_blank')}
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Upload Attestati - Solo Admin */}
          {isAdmin && (
            <Card className="mb-8">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="h-5 w-5" />
                  Carica Attestato per Utente
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-end">
                  <div className="flex-1 w-full">
                    <label className="text-sm font-medium mb-2 block">Seleziona Utente</label>
                    <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleziona un utente..." />
                      </SelectTrigger>
                      <SelectContent>
                        {users.map((u) => (
                          <SelectItem key={u.user_id} value={u.user_id}>
                            {u.full_name || 'Nome non disponibile'} 
                            {u.company_name && ` - ${u.company_name}`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <input
                      type="file"
                      onChange={handleUploadAttestato}
                      style={{ display: 'none' }}
                      id="attestato-upload"
                      accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                      disabled={!selectedUserId || uploading}
                    />
                    <Button 
                      onClick={() => document.getElementById('attestato-upload')?.click()}
                      disabled={!selectedUserId || uploading}
                      className="w-full sm:w-auto"
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      {uploading ? 'Caricamento...' : 'Carica Attestato'}
                    </Button>
                  </div>
                </div>
                {!selectedUserId && (
                  <p className="text-sm text-muted-foreground mt-2">
                    Seleziona un utente per poter caricare un attestato
                  </p>
                )}
              </CardContent>
            </Card>
          )}

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
                           {doc.area_competenza && (
                             <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                               {doc.area_competenza.charAt(0).toUpperCase() + doc.area_competenza.slice(1).replace('_', ' ')}
                             </Badge>
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
                      <div className="flex items-center gap-2">
                        <Button
                          onClick={() => handleShowQR(doc.id, doc.file_path, doc.name)}
                          size="sm"
                          variant="outline"
                          title="Genera QR Code"
                        >
                          <QrCode className="h-4 w-4" />
                        </Button>
                        <Button
                          onClick={() => handleDownload(doc.file_path, doc.name)}
                          size="sm"
                          variant="outline"
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Scarica
                        </Button>
                        {isAdmin && (
                          <Button
                            onClick={() => handleDeleteDocument(doc.id, doc.file_path)}
                            size="sm"
                            variant="destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
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
      
      {selectedDocForQR && (
        <QRCodeModal
          open={qrModalOpen}
          onOpenChange={setQrModalOpen}
          url={selectedDocForQR.url}
          fileName={selectedDocForQR.name}
          documentId={selectedDocForQR.id}
        />
      )}
    </>
  )
}