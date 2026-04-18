import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { 
  ArrowLeft, Building, Mail, Phone, User, Calendar, 
  Tag, Loader2, Edit, MessageSquare, Brain, Sparkles,
  MapPin, Globe, FileText, Clock, TrendingUp, ListTodo, Briefcase, NotebookPen, Stethoscope
} from 'lucide-react';
import Header from '@/components/Header';
import BottomNav from '@/components/BottomNav';
import CRMClientDocuments from '@/components/CRMClientDocuments';
import { ClientUserLinker } from '@/components/ClientUserLinker';
import { ContactActivities } from '@/components/ContactActivities';
import { ContactContracts } from '@/components/ContactContracts';
import { ContactLocationsEmployees } from '@/components/ContactLocationsEmployees';
import { AIContactPanel } from '@/components/AIContactPanel';
import ContactNotes from '@/components/notes/ContactNotes';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ContactMedicalSurveillance } from '@/components/medicina/ContactMedicalSurveillance';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useCRM, CRMContact, CRMInteraction } from '@/hooks/useCRM';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const statusColors: Record<string, string> = {
  lead: 'bg-blue-500/20 text-blue-700 border-blue-500/30',
  prospect: 'bg-yellow-500/20 text-yellow-700 border-yellow-500/30',
  client: 'bg-green-500/20 text-green-700 border-green-500/30',
  inactive: 'bg-gray-500/20 text-gray-700 border-gray-500/30',
};

const statusLabels: Record<string, string> = {
  lead: 'Lead',
  prospect: 'Prospect',
  client: 'Cliente',
  inactive: 'Inattivo',
};

const interactionTypeLabels: Record<string, string> = {
  call: 'Chiamata',
  email: 'Email',
  meeting: 'Meeting',
  note: 'Nota',
  task: 'Task',
};

const interactionTypeColors: Record<string, string> = {
  call: 'bg-green-500/20 text-green-700',
  email: 'bg-blue-500/20 text-blue-700',
  meeting: 'bg-purple-500/20 text-purple-700',
  note: 'bg-yellow-500/20 text-yellow-700',
  task: 'bg-orange-500/20 text-orange-700',
};

export default function CRMContactDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, isAreaAziendale } = useUserRole();
  const { updateContact, addInteraction, getInteractions, analyzeContact, aiProcessing } = useCRM();
  
  const [contact, setContact] = useState<CRMContact | null>(null);
  const [interactions, setInteractions] = useState<CRMInteraction[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showInteractionDialog, setShowInteractionDialog] = useState(false);
  const [aiInsights, setAiInsights] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('info');
  
  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    role: '',
    status: 'lead' as 'lead' | 'prospect' | 'client' | 'inactive',
    source: '',
    notes: '',
    address: '',
    website: '',
    vat_number: '',
    fiscal_code: '',
    pec: '',
    sdi_code: '',
  });

  const [newInteraction, setNewInteraction] = useState({
    type: 'note' as 'call' | 'email' | 'meeting' | 'note' | 'task',
    subject: '',
    description: '',
  });

  useEffect(() => {
    if (!id) return;
    fetchContact();
    fetchInteractions();
  }, [id]);

  const fetchContact = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('crm_contacts')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      setContact(data as CRMContact);
      const validStatus = ['lead', 'prospect', 'client', 'inactive'].includes(data.status) 
        ? data.status as 'lead' | 'prospect' | 'client' | 'inactive'
        : 'lead';
      setEditForm({
        name: data.name || '',
        email: data.email || '',
        phone: data.phone || '',
        company: data.company || '',
        role: data.role || '',
        status: validStatus,
        source: data.source || '',
        notes: data.notes || '',
        address: (data as any).address || '',
        website: (data as any).website || '',
        vat_number: (data as any).vat_number || '',
        fiscal_code: (data as any).fiscal_code || '',
        pec: (data as any).pec || '',
        sdi_code: (data as any).sdi_code || '',
      });
    } catch (error) {
      console.error('Error fetching contact:', error);
      toast.error('Errore nel caricamento del contatto');
    } finally {
      setLoading(false);
    }
  };

  const fetchInteractions = async () => {
    if (!id) return;
    const data = await getInteractions(id);
    setInteractions(data);
  };

  const handleUpdateContact = async () => {
    if (!id) return;
    const success = await updateContact(id, editForm);
    if (success) {
      setShowEditDialog(false);
      fetchContact();
    }
  };

  const handleAddInteraction = async () => {
    if (!id || !newInteraction.subject) return;
    const result = await addInteraction({
      contact_id: id,
      ...newInteraction
    });
    if (result) {
      setNewInteraction({ type: 'note', subject: '', description: '' });
      setShowInteractionDialog(false);
      fetchInteractions();
      fetchContact(); // Refresh last_contact_at
    }
  };

  const handleAnalyze = async () => {
    if (!id) return;
    const insights = await analyzeContact(id);
    if (insights) {
      setAiInsights(typeof insights === 'object' ? JSON.stringify(insights, null, 2) : insights);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!user) {
    navigate('/');
    return null;
  }

  if (!contact) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto p-4">
          <Button variant="ghost" onClick={() => navigate('/crm')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Torna al CRM
          </Button>
          <div className="text-center py-12">
            <p className="text-muted-foreground">Contatto non trovato</p>
          </div>
        </main>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto p-4 pb-24">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate('/crm')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">{contact.name}</h1>
              <Badge className={cn(statusColors[contact.status])}>
                {statusLabels[contact.status]}
              </Badge>
            </div>
            {contact.company && (
              <p className="text-muted-foreground flex items-center gap-1">
                <Building className="h-4 w-4" />
                {contact.company}
              </p>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleAnalyze} disabled={aiProcessing}>
              {aiProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Brain className="h-4 w-4 mr-2" />}
              Analizza
            </Button>
            <Button onClick={() => setShowEditDialog(true)}>
              <Edit className="h-4 w-4 mr-2" />
              Modifica
            </Button>
          </div>
        </div>

        {/* AI Insights */}
        {aiInsights && (
          <Card className="mb-6 border-primary/20 bg-primary/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                Analisi AI
                <Button variant="ghost" size="sm" className="ml-auto" onClick={() => setAiInsights(null)}>
                  Chiudi
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="max-h-[200px]">
                <pre className="text-sm whitespace-pre-wrap">{aiInsights}</pre>
              </ScrollArea>
            </CardContent>
          </Card>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="flex-wrap h-auto">
            <TabsTrigger value="info">Informazioni</TabsTrigger>
            <TabsTrigger value="locations" className="flex items-center gap-1">
              <MapPin className="h-4 w-4" />
              Sedi
            </TabsTrigger>
            <TabsTrigger value="activities" className="flex items-center gap-1">
              <ListTodo className="h-4 w-4" />
              Attività
            </TabsTrigger>
            <TabsTrigger value="contracts" className="flex items-center gap-1">
              <Briefcase className="h-4 w-4" />
              Commesse
            </TabsTrigger>
            <TabsTrigger value="documents">Documenti</TabsTrigger>
            <TabsTrigger value="notes" className="flex items-center gap-1">
              <NotebookPen className="h-4 w-4" />
              Note
            </TabsTrigger>
            <TabsTrigger value="medicina" className="flex items-center gap-1">
              <Stethoscope className="h-4 w-4" />
              Sorveglianza
            </TabsTrigger>
            <TabsTrigger value="interactions">Interazioni</TabsTrigger>
          </TabsList>

          {/* Info Tab */}
          <TabsContent value="info" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              {/* Contact Info */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <User className="h-5 w-5 text-primary" />
                    Dati Contatto
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {contact.email && (
                    <div className="flex items-center gap-3">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <a href={`mailto:${contact.email}`} className="hover:underline">
                        {contact.email}
                      </a>
                    </div>
                  )}
                  {contact.phone && (
                    <div className="flex items-center gap-3">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <a href={`tel:${contact.phone}`} className="hover:underline">
                        {contact.phone}
                      </a>
                    </div>
                  )}
                  {contact.role && (
                    <div className="flex items-center gap-3">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span>{contact.role}</span>
                    </div>
                  )}
                  {(contact as any).address && (
                    <div className="flex items-center gap-3">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span>{(contact as any).address}</span>
                    </div>
                  )}
                  {(contact as any).website && (
                    <div className="flex items-center gap-3">
                      <Globe className="h-4 w-4 text-muted-foreground" />
                      <a href={(contact as any).website} target="_blank" rel="noopener noreferrer" className="hover:underline">
                        {(contact as any).website}
                      </a>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Business Info */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Building className="h-5 w-5 text-primary" />
                    Dati Aziendali
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {contact.company && (
                    <div>
                      <span className="text-sm text-muted-foreground">Azienda</span>
                      <p className="font-medium">{contact.company}</p>
                    </div>
                  )}
                  {(contact as any).vat_number && (
                    <div>
                      <span className="text-sm text-muted-foreground">P.IVA</span>
                      <p className="font-medium">{(contact as any).vat_number}</p>
                    </div>
                  )}
                  {(contact as any).fiscal_code && (
                    <div>
                      <span className="text-sm text-muted-foreground">Codice Fiscale</span>
                      <p className="font-medium">{(contact as any).fiscal_code}</p>
                    </div>
                  )}
                  {(contact as any).pec && (
                    <div>
                      <span className="text-sm text-muted-foreground">PEC</span>
                      <p className="font-medium">{(contact as any).pec}</p>
                    </div>
                  )}
                  {(contact as any).sdi_code && (
                    <div>
                      <span className="text-sm text-muted-foreground">Codice SDI</span>
                      <p className="font-medium">{(contact as any).sdi_code}</p>
                    </div>
                  )}
                  {contact.source && (
                    <div>
                      <span className="text-sm text-muted-foreground">Fonte</span>
                      <p className="font-medium">{contact.source}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Timeline */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Clock className="h-5 w-5 text-primary" />
                    Timeline
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <span className="text-sm text-muted-foreground">Creato il</span>
                    <p className="font-medium">
                      {format(new Date(contact.created_at), "dd MMMM yyyy 'alle' HH:mm", { locale: it })}
                    </p>
                  </div>
                  {contact.last_contact_at && (
                    <div>
                      <span className="text-sm text-muted-foreground">Ultimo contatto</span>
                      <p className="font-medium">
                        {format(new Date(contact.last_contact_at), "dd MMMM yyyy 'alle' HH:mm", { locale: it })}
                      </p>
                    </div>
                  )}
                  {contact.next_followup_at && (
                    <div>
                      <span className="text-sm text-muted-foreground">Prossimo follow-up</span>
                      <p className="font-medium text-primary">
                        {format(new Date(contact.next_followup_at), "dd MMMM yyyy 'alle' HH:mm", { locale: it })}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Tags & Notes */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Tag className="h-5 w-5 text-primary" />
                    Tag e Note
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {contact.tags && contact.tags.length > 0 && (
                    <div>
                      <span className="text-sm text-muted-foreground block mb-2">Tag</span>
                      <div className="flex flex-wrap gap-1">
                        {contact.tags.map((tag, i) => (
                          <Badge key={i} variant="secondary">{tag}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  {contact.notes && (
                    <div>
                      <span className="text-sm text-muted-foreground">Note</span>
                      <p className="text-sm whitespace-pre-wrap">{contact.notes}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Client User Linker - For Admins and Business Areas */}
              {(isAdmin || isAreaAziendale) && (
                <ClientUserLinker 
                  contactId={contact.id}
                  currentClientUserId={(contact as any).client_user_id}
                  contactName={contact.name}
                  contactEmail={contact.email}
                  contactCompany={contact.company}
                  onLinked={fetchContact}
                />
              )}

              {/* AI Panel */}
              <AIContactPanel contact={contact} />
            </div>
          </TabsContent>

          {/* Locations & Employees Tab */}
          <TabsContent value="locations">
            <ContactLocationsEmployees contactId={contact.id} />
          </TabsContent>

          {/* Activities Tab */}
          <TabsContent value="activities">
            <ContactActivities contactId={contact.id} />
          </TabsContent>

          {/* Contracts Tab */}
          <TabsContent value="contracts">
            <ContactContracts contactId={contact.id} />
          </TabsContent>

          {/* Documents Tab */}
          <TabsContent value="documents">
            <CRMClientDocuments 
              contactId={contact.id} 
              contactName={contact.name}
              contactEmail={contact.email}
              contactCompany={contact.company}
              clientUserId={(contact as any).client_user_id}
              onLinkClient={(isAdmin || isAreaAziendale) ? () => { setActiveTab('info'); fetchContact(); } : undefined}
            />
          </TabsContent>

          {/* Notes Tab */}
          <TabsContent value="notes" className="space-y-4">
            <ContactNotes contactId={contact.id} />
          </TabsContent>

          {/* Medicina del Lavoro Tab */}
          <TabsContent value="medicina">
            <ContactMedicalSurveillance contactId={contact.id} />
          </TabsContent>

          {/* Interactions Tab */}
          <TabsContent value="interactions" className="space-y-4">
            <div className="flex justify-end">
              <Button onClick={() => setShowInteractionDialog(true)}>
                <MessageSquare className="h-4 w-4 mr-2" />
                Nuova Interazione
              </Button>
            </div>
            
            {interactions.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <MessageSquare className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-30" />
                  <p className="text-muted-foreground">Nessuna interazione registrata</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {interactions.map((interaction) => (
                  <Card key={interaction.id}>
                    <CardContent className="py-4">
                      <div className="flex items-start gap-3">
                        <Badge className={cn(interactionTypeColors[interaction.type], 'mt-0.5')}>
                          {interactionTypeLabels[interaction.type]}
                        </Badge>
                        <div className="flex-1">
                          <h4 className="font-medium">{interaction.subject}</h4>
                          {interaction.description && (
                            <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">
                              {interaction.description}
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground mt-2">
                            {format(new Date(interaction.created_at), "dd/MM/yyyy 'alle' HH:mm", { locale: it })}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Edit Dialog */}
        <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Modifica Contatto</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Nome *</Label>
                  <Input 
                    value={editForm.name} 
                    onChange={(e) => setEditForm({...editForm, name: e.target.value})}
                  />
                </div>
                <div>
                  <Label>Status</Label>
                  <Select 
                    value={editForm.status} 
                    onValueChange={(v) => setEditForm({...editForm, status: v as any})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="lead">Lead</SelectItem>
                      <SelectItem value="prospect">Prospect</SelectItem>
                      <SelectItem value="client">Cliente</SelectItem>
                      <SelectItem value="inactive">Inattivo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Email</Label>
                  <Input 
                    type="email"
                    value={editForm.email} 
                    onChange={(e) => setEditForm({...editForm, email: e.target.value})}
                  />
                </div>
                <div>
                  <Label>Telefono</Label>
                  <Input 
                    value={editForm.phone} 
                    onChange={(e) => setEditForm({...editForm, phone: e.target.value})}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Azienda</Label>
                  <Input 
                    value={editForm.company} 
                    onChange={(e) => setEditForm({...editForm, company: e.target.value})}
                  />
                </div>
                <div>
                  <Label>Ruolo</Label>
                  <Input 
                    value={editForm.role} 
                    onChange={(e) => setEditForm({...editForm, role: e.target.value})}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>P.IVA</Label>
                  <Input 
                    value={editForm.vat_number} 
                    onChange={(e) => setEditForm({...editForm, vat_number: e.target.value})}
                  />
                </div>
                <div>
                  <Label>Codice Fiscale</Label>
                  <Input 
                    value={editForm.fiscal_code} 
                    onChange={(e) => setEditForm({...editForm, fiscal_code: e.target.value})}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>PEC</Label>
                  <Input 
                    type="email"
                    value={editForm.pec} 
                    onChange={(e) => setEditForm({...editForm, pec: e.target.value})}
                    placeholder="pec@esempio.it"
                  />
                </div>
                <div>
                  <Label>Codice SDI</Label>
                  <Input 
                    value={editForm.sdi_code} 
                    onChange={(e) => setEditForm({...editForm, sdi_code: e.target.value})}
                    placeholder="7 caratteri"
                    maxLength={7}
                  />
                </div>
              </div>
              <div>
                <Label>Indirizzo</Label>
                <Input 
                  value={editForm.address} 
                  onChange={(e) => setEditForm({...editForm, address: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Sito Web</Label>
                  <Input 
                    value={editForm.website} 
                    onChange={(e) => setEditForm({...editForm, website: e.target.value})}
                    placeholder="https://..."
                  />
                </div>
                <div>
                  <Label>Fonte</Label>
                  <Input 
                    value={editForm.source} 
                    onChange={(e) => setEditForm({...editForm, source: e.target.value})}
                  />
                </div>
              </div>
              <div>
                <Label>Note</Label>
                <Textarea 
                  value={editForm.notes} 
                  onChange={(e) => setEditForm({...editForm, notes: e.target.value})}
                  rows={4}
                />
              </div>
              <Button onClick={handleUpdateContact} className="w-full">
                Salva Modifiche
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Add Interaction Dialog */}
        <Dialog open={showInteractionDialog} onOpenChange={setShowInteractionDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nuova Interazione</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Tipo</Label>
                <Select 
                  value={newInteraction.type} 
                  onValueChange={(v) => setNewInteraction({...newInteraction, type: v as any})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="call">Chiamata</SelectItem>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="meeting">Meeting</SelectItem>
                    <SelectItem value="note">Nota</SelectItem>
                    <SelectItem value="task">Task</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Oggetto *</Label>
                <Input 
                  value={newInteraction.subject} 
                  onChange={(e) => setNewInteraction({...newInteraction, subject: e.target.value})}
                />
              </div>
              <div>
                <Label>Descrizione</Label>
                <Textarea 
                  value={newInteraction.description} 
                  onChange={(e) => setNewInteraction({...newInteraction, description: e.target.value})}
                  rows={4}
                />
              </div>
              <Button onClick={handleAddInteraction} className="w-full" disabled={!newInteraction.subject}>
                Salva Interazione
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </main>

      <BottomNav />
    </div>
  );
}
