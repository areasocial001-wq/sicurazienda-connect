import { useState } from 'react';
import { 
  Users, Plus, Search, Phone, Mail, Building, 
  MoreVertical, Sparkles, Loader2, UserPlus, 
  Calendar, MessageSquare, FileText, ArrowLeft,
  Brain, TrendingUp, BarChart3
} from 'lucide-react';
import Header from '@/components/Header';
import BottomNav from '@/components/BottomNav';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useNavigate } from 'react-router-dom';
import { useCRM, CRMContact } from '@/hooks/useCRM';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';

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

export default function CRM() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { 
    contacts, loading, aiProcessing, 
    addContact, updateContact, deleteContact,
    addInteraction, analyzeContact, suggestFollowups, generateEmail
  } = useCRM();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [selectedContact, setSelectedContact] = useState<CRMContact | null>(null);
  const [showInteractionDialog, setShowInteractionDialog] = useState(false);
  const [aiInsights, setAiInsights] = useState<any>(null);

  // New contact form state
  const [newContact, setNewContact] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    role: '',
    status: 'lead' as const,
    source: '',
    notes: '',
  });

  // Interaction form state
  const [newInteraction, setNewInteraction] = useState({
    type: 'note' as const,
    subject: '',
    description: '',
  });

  const filteredContacts = contacts.filter(contact => {
    const matchesSearch = contact.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contact.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contact.company?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || contact.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleAddContact = async () => {
    await addContact(newContact);
    setNewContact({
      name: '', email: '', phone: '', company: '', 
      role: '', status: 'lead', source: '', notes: ''
    });
    setShowAddDialog(false);
  };

  const handleAddInteraction = async () => {
    if (!selectedContact) return;
    await addInteraction({
      contact_id: selectedContact.id,
      ...newInteraction
    });
    setNewInteraction({ type: 'note', subject: '', description: '' });
    setShowInteractionDialog(false);
  };

  const handleAnalyzeContact = async (contact: CRMContact) => {
    setSelectedContact(contact);
    const insights = await analyzeContact(contact.id);
    setAiInsights(insights);
  };

  const handleSuggestFollowups = async () => {
    const suggestions = await suggestFollowups();
    setAiInsights(suggestions);
  };

  if (authLoading) {
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

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto p-4 pb-24">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Users className="h-6 w-6 text-primary" />
                CRM - Gestione Contatti
              </h1>
              <p className="text-muted-foreground text-sm">
                {contacts.length} contatti totali
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate('/crm/analytics')}>
              <BarChart3 className="h-4 w-4 mr-2" />
              Analytics
            </Button>
            <Button variant="outline" onClick={handleSuggestFollowups} disabled={aiProcessing}>
              {aiProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Brain className="h-4 w-4 mr-2" />}
              Suggerimenti AI
            </Button>
            <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Nuovo Contatto
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Aggiungi Contatto</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Nome *</Label>
                    <Input 
                      value={newContact.name} 
                      onChange={(e) => setNewContact({...newContact, name: e.target.value})}
                      placeholder="Nome e Cognome"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Email</Label>
                      <Input 
                        type="email"
                        value={newContact.email} 
                        onChange={(e) => setNewContact({...newContact, email: e.target.value})}
                      />
                    </div>
                    <div>
                      <Label>Telefono</Label>
                      <Input 
                        value={newContact.phone} 
                        onChange={(e) => setNewContact({...newContact, phone: e.target.value})}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Azienda</Label>
                      <Input 
                        value={newContact.company} 
                        onChange={(e) => setNewContact({...newContact, company: e.target.value})}
                      />
                    </div>
                    <div>
                      <Label>Ruolo</Label>
                      <Input 
                        value={newContact.role} 
                        onChange={(e) => setNewContact({...newContact, role: e.target.value})}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Status</Label>
                      <Select 
                        value={newContact.status} 
                        onValueChange={(v) => setNewContact({...newContact, status: v as any})}
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
                    <div>
                      <Label>Fonte</Label>
                      <Input 
                        value={newContact.source} 
                        onChange={(e) => setNewContact({...newContact, source: e.target.value})}
                        placeholder="es. Sito web, Referral"
                      />
                    </div>
                  </div>
                  <div>
                    <Label>Note</Label>
                    <Textarea 
                      value={newContact.notes} 
                      onChange={(e) => setNewContact({...newContact, notes: e.target.value})}
                      rows={3}
                    />
                  </div>
                  <Button onClick={handleAddContact} className="w-full" disabled={!newContact.name}>
                    <UserPlus className="h-4 w-4 mr-2" />
                    Aggiungi Contatto
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Filters */}
        <Card className="mb-4">
          <CardContent className="pt-4">
            <div className="flex gap-4 flex-wrap">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Cerca per nome, email, azienda..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tutti</SelectItem>
                  <SelectItem value="lead">Lead</SelectItem>
                  <SelectItem value="prospect">Prospect</SelectItem>
                  <SelectItem value="client">Cliente</SelectItem>
                  <SelectItem value="inactive">Inattivo</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* AI Insights Panel */}
        {aiInsights && (
          <Card className="mb-4 border-primary/20 bg-primary/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                Insights AI
                <Button variant="ghost" size="sm" className="ml-auto" onClick={() => setAiInsights(null)}>
                  Chiudi
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="max-h-[200px]">
                <pre className="text-sm whitespace-pre-wrap">
                  {typeof aiInsights === 'object' ? JSON.stringify(aiInsights, null, 2) : aiInsights}
                </pre>
              </ScrollArea>
            </CardContent>
          </Card>
        )}

        {/* Contacts Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : filteredContacts.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground">Nessun contatto trovato</p>
              <Button className="mt-4" onClick={() => setShowAddDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Aggiungi il primo contatto
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredContacts.map((contact) => (
              <Card key={contact.id} className="hover:shadow-md transition-shadow">
                <CardContent className="pt-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold">{contact.name}</h3>
                      {contact.company && (
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                          <Building className="h-3 w-3" />
                          {contact.company}
                        </p>
                      )}
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleAnalyzeContact(contact)}>
                          <Brain className="h-4 w-4 mr-2" />
                          Analizza con AI
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => {
                          setSelectedContact(contact);
                          setShowInteractionDialog(true);
                        }}>
                          <MessageSquare className="h-4 w-4 mr-2" />
                          Aggiungi interazione
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => updateContact(contact.id, { 
                            status: contact.status === 'client' ? 'inactive' : 'client' 
                          })}
                        >
                          <TrendingUp className="h-4 w-4 mr-2" />
                          Cambia status
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          className="text-destructive"
                          onClick={() => deleteContact(contact.id)}
                        >
                          Elimina
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <Badge className={cn("mb-3", statusColors[contact.status])}>
                    {statusLabels[contact.status]}
                  </Badge>

                  <div className="space-y-1 text-sm">
                    {contact.email && (
                      <p className="flex items-center gap-2 text-muted-foreground">
                        <Mail className="h-3 w-3" />
                        <a href={`mailto:${contact.email}`} className="hover:underline truncate">
                          {contact.email}
                        </a>
                      </p>
                    )}
                    {contact.phone && (
                      <p className="flex items-center gap-2 text-muted-foreground">
                        <Phone className="h-3 w-3" />
                        <a href={`tel:${contact.phone}`} className="hover:underline">
                          {contact.phone}
                        </a>
                      </p>
                    )}
                  </div>

                  {contact.notes && (
                    <p className="mt-3 text-xs text-muted-foreground line-clamp-2 border-t pt-2">
                      {contact.notes}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Add Interaction Dialog */}
        <Dialog open={showInteractionDialog} onOpenChange={setShowInteractionDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nuova Interazione - {selectedContact?.name}</DialogTitle>
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
