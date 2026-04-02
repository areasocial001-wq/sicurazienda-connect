import { useState, useMemo, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { 
  Users, Plus, Search, Phone, Mail, Building, 
  MoreVertical, Sparkles, Loader2, UserPlus, 
  Calendar as CalendarIcon, MessageSquare, FileText, ArrowLeft,
  Brain, TrendingUp, BarChart3, Download, Filter, X, Tag,
  ArrowUpDown, ArrowUp, ArrowDown, Clock, HelpCircle, Info, Link2Off
} from 'lucide-react';
import { toast } from 'sonner';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts';
import Header from '@/components/Header';
import BottomNav from '@/components/BottomNav';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
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
import { CRMDataImport } from '@/components/CRMDataImport';
import { CRMLocationsImport } from '@/components/CRMLocationsImport';
import { AIContactAutoFill } from '@/components/AIContactAutoFill';
import { CRMDataCleanup } from '@/components/CRMDataCleanup';

const statusColors: Record<string, string> = {
  lead: 'bg-blue-500/20 text-blue-700 border-blue-500/30',
  prospect: 'bg-yellow-500/20 text-yellow-700 border-yellow-500/30',
  client: 'bg-green-500/20 text-green-700 border-green-500/30',
  inactive: 'bg-gray-500/20 text-gray-700 border-gray-500/30',
};

const statusLabels: Record<string, string> = {
  lead: 'Primo contatto',
  prospect: 'Potenziale cliente',
  client: 'Cliente',
  inactive: 'Inattivo',
};

export default function CRM() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { 
    contacts, loading, aiProcessing, fetchContacts, searchContacts,
    addContact, updateContact, deleteContact,
    addInteraction, analyzeContact, suggestFollowups, generateEmail
  } = useCRM();

  const [searchQuery, setSearchQuery] = useState('');
  const [serverSearchResults, setServerSearchResults] = useState<CRMContact[] | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined);
  const [dateTo, setDateTo] = useState<Date | undefined>(undefined);
  const [tagFilter, setTagFilter] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [sortByName, setSortByName] = useState<'asc' | 'desc' | null>('asc');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showFollowupDialog, setShowFollowupDialog] = useState(false);
  const [followupDate, setFollowupDate] = useState<Date | undefined>(undefined);
  const [followupTime, setFollowupTime] = useState<string>('09:00');
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
    tags: [] as string[],
  });

  // Interaction form state
  const [newInteraction, setNewInteraction] = useState({
    type: 'note' as const,
    subject: '',
    description: '',
  });

  // Extract all unique tags from contacts
  const allTags = useMemo(() => {
    const tags = new Set<string>();
    contacts.forEach(contact => {
      contact.tags?.forEach(tag => tags.add(tag));
    });
    return Array.from(tags).sort();
  }, [contacts]);

  // Debounced server-side search
  useEffect(() => {
    const debounceTimer = setTimeout(async () => {
      if (searchQuery.length >= 2) {
        setIsSearching(true);
        const results = await searchContacts(searchQuery);
        setServerSearchResults(results);
        setIsSearching(false);
      } else {
        setServerSearchResults(null);
      }
    }, 300);

    return () => clearTimeout(debounceTimer);
  }, [searchQuery, searchContacts]);

  // Use server search results if available, otherwise use local contacts
  const baseContacts = serverSearchResults !== null ? serverSearchResults : contacts;

  // Status counts for legend
  const statusCounts = useMemo(() => {
    return {
      lead: contacts.filter(c => c.status === 'lead').length,
      prospect: contacts.filter(c => c.status === 'prospect').length,
      client: contacts.filter(c => c.status === 'client').length,
      inactive: contacts.filter(c => c.status === 'inactive').length,
    };
  }, [contacts]);

  const filteredContacts = useMemo(() => {
    let result = baseContacts.filter(contact => {
      // Skip client-side text search if using server search
      const matchesSearch = serverSearchResults !== null ? true : 
        contact.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        contact.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        contact.company?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'all' || contact.status === statusFilter;
      
      // Date filter
      let matchesDate = true;
      if (dateFrom || dateTo) {
        const contactDate = new Date(contact.created_at);
        if (dateFrom && contactDate < dateFrom) matchesDate = false;
        if (dateTo) {
          const endOfDay = new Date(dateTo);
          endOfDay.setHours(23, 59, 59, 999);
          if (contactDate > endOfDay) matchesDate = false;
        }
      }
      
      // Tag filter
      const matchesTag = tagFilter === 'all' || contact.tags?.includes(tagFilter);
      
      return matchesSearch && matchesStatus && matchesDate && matchesTag;
    });

    // Sort by company/name alphabetically
    if (sortByName) {
      result = [...result].sort((a, b) => {
        const nameA = (a.company || a.name).toLowerCase();
        const nameB = (b.company || b.name).toLowerCase();
        const compare = nameA.localeCompare(nameB, 'it');
        return sortByName === 'asc' ? compare : -compare;
      });
    }

    return result;
  }, [baseContacts, serverSearchResults, searchQuery, statusFilter, dateFrom, dateTo, tagFilter, sortByName]);

  const hasActiveFilters = statusFilter !== 'all' || dateFrom || dateTo || tagFilter !== 'all';

  const clearFilters = () => {
    setStatusFilter('all');
    setDateFrom(undefined);
    setDateTo(undefined);
    setTagFilter('all');
  };

  const handleAddContact = async () => {
    await addContact(newContact);
    setNewContact({
      name: '', email: '', phone: '', company: '', 
      role: '', status: 'lead', source: '', notes: '', tags: []
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

  const handleSetFollowup = async () => {
    if (!selectedContact || !followupDate) return;
    
    // Combine date with selected time
    const [hours, minutes] = followupTime.split(':').map(Number);
    const followupDateTime = new Date(followupDate);
    followupDateTime.setHours(hours, minutes, 0, 0);
    
    await updateContact(selectedContact.id, { 
      next_followup_at: followupDateTime.toISOString() 
    });
    toast.success(`Follow-up impostato per ${format(followupDateTime, "dd/MM/yyyy 'alle' HH:mm", { locale: it })}`);
    setShowFollowupDialog(false);
    setFollowupDate(undefined);
    setFollowupTime('09:00');
    setSelectedContact(null);
  };

  const handleRemoveFollowup = async (contact: CRMContact) => {
    await updateContact(contact.id, { next_followup_at: null });
    toast.success('Follow-up rimosso');
  };

  const exportContactsCSV = () => {
    if (contacts.length === 0) {
      toast.error('Nessun contatto da esportare');
      return;
    }

    const headers = ['Nome', 'Email', 'Telefono', 'Azienda', 'Ruolo', 'Status', 'Fonte', 'Note', 'Creato il'];
    const rows = contacts.map(c => [
      c.name,
      c.email || '',
      c.phone || '',
      c.company || '',
      c.role || '',
      c.status,
      c.source || '',
      (c.notes || '').replace(/"/g, '""'),
      new Date(c.created_at).toLocaleDateString('it-IT')
    ]);

    const csvContent = [
      headers.join(';'),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(';'))
    ].join('\n');

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `contatti_crm_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    toast.success('Export contatti completato');
  };

  const exportPhoneListCSV = async () => {
    if (contacts.length === 0) {
      toast.error('Nessun contatto da esportare');
      return;
    }

    // Fetch location phones for contacts missing phone
    const contactIds = contacts.filter(c => !c.phone).map(c => c.id);
    let locationPhones: Record<string, string> = {};
    
    if (contactIds.length > 0) {
      const { data: locations } = await supabase
        .from('crm_locations')
        .select('contact_id, phone')
        .in('contact_id', contactIds)
        .not('phone', 'is', null);
      
      if (locations) {
        for (const loc of locations) {
          if (loc.contact_id && loc.phone && !locationPhones[loc.contact_id]) {
            locationPhones[loc.contact_id] = loc.phone;
          }
        }
      }
    }

    const headers = ['Azienda', 'Telefono'];
    const rows = contacts
      .map(c => {
        const phone = c.phone || locationPhones[c.id] || '';
        const company = (c.company || c.name || '').replace(/"/g, '""');
        return [company, phone.replace(/"/g, '""')];
      })
      .filter(([company, phone]) => company && phone);

    if (rows.length === 0) {
      toast.error('Nessun contatto con azienda e telefono');
      return;
    }

    const csvContent = [
      headers.join(';'),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(';'))
    ].join('\n');

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `rubrica_telefonica_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    toast.success(`Esportati ${rows.length} contatti (Azienda + Telefono)`);
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
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" onClick={() => navigate('/crm/dashboard')}>
              <TrendingUp className="h-4 w-4 mr-2" />
              Dashboard
            </Button>
            <Button variant="outline" onClick={() => navigate('/crm/analytics')}>
              <BarChart3 className="h-4 w-4 mr-2" />
              Analytics
            </Button>
            <Button variant="outline" onClick={() => navigate('/crm/calendar')}>
              <CalendarIcon className="h-4 w-4 mr-2" />
              Calendario
            </Button>
            <Button variant="outline" onClick={() => navigate('/crm/document-stats')}>
              <FileText className="h-4 w-4 mr-2" />
              Documenti
            </Button>
            <Button variant="outline" onClick={() => navigate('/crm/employee-deadlines')}>
              <Clock className="h-4 w-4 mr-2" />
              Scadenze
            </Button>
            <Button variant="outline" onClick={() => navigate('/crm/orphaned')}>
              <Link2Off className="h-4 w-4 mr-2" />
              Orfani
            </Button>
            <Button variant="outline" onClick={() => navigate('/crm/departments')}>
              <Building className="h-4 w-4 mr-2" />
              Dipartimenti
            </Button>
            <CRMDataImport onImportComplete={fetchContacts} />
            <CRMLocationsImport onImportComplete={fetchContacts} />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={exportPhoneListCSV}>
                  <Phone className="h-4 w-4 mr-2" />
                  Azienda + Telefono
                </DropdownMenuItem>
                <DropdownMenuItem onClick={exportContactsCSV}>
                  <FileText className="h-4 w-4 mr-2" />
                  Export completo
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button variant="outline" onClick={handleSuggestFollowups} disabled={aiProcessing}>
              {aiProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Brain className="h-4 w-4 mr-2" />}
              AI
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
                  {/* AI Auto-fill */}
                  <AIContactAutoFill onExtracted={(data) => {
                    setNewContact(prev => ({
                      ...prev,
                      name: data.name || prev.name,
                      email: data.email || prev.email,
                      phone: data.phone || prev.phone,
                      company: data.company || prev.company,
                      role: data.role || prev.role,
                      notes: data.notes || prev.notes,
                      source: prev.source,
                      status: prev.status,
                      tags: prev.tags,
                    }));
                  }} />
                  
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
                      <Label>Stato</Label>
                      <TooltipProvider delayDuration={300}>
                        <Select 
                          value={newContact.status} 
                          onValueChange={(v) => setNewContact({...newContact, status: v as any})}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <SelectItem value="lead">Primo contatto</SelectItem>
                              </TooltipTrigger>
                              <TooltipContent side="left" className="max-w-[200px]">
                                <p className="text-xs">Nuovo contatto acquisito, ancora da qualificare</p>
                              </TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <SelectItem value="prospect">Potenziale cliente</SelectItem>
                              </TooltipTrigger>
                              <TooltipContent side="left" className="max-w-[200px]">
                                <p className="text-xs">Contatto interessato, in fase di trattativa</p>
                              </TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <SelectItem value="client">Cliente</SelectItem>
                              </TooltipTrigger>
                              <TooltipContent side="left" className="max-w-[200px]">
                                <p className="text-xs">Cliente attivo con contratto in essere</p>
                              </TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <SelectItem value="inactive">Inattivo</SelectItem>
                              </TooltipTrigger>
                              <TooltipContent side="left" className="max-w-[200px]">
                                <p className="text-xs">Contatto non più attivo o interessato</p>
                              </TooltipContent>
                            </Tooltip>
                          </SelectContent>
                        </Select>
                      </TooltipProvider>
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
            <div className="flex gap-4 flex-wrap items-center">
              <div className="relative flex-1 min-w-[200px]">
                {isSearching ? (
                  <Loader2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground animate-spin" />
                ) : (
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                )}
                <Input
                  placeholder="Cerca per nome, email, azienda... (min. 2 caratteri)"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-10"
                />
                {searchQuery && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6"
                    onClick={() => setSearchQuery('')}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                )}
                {serverSearchResults !== null && (
                  <span className="absolute right-10 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                    {serverSearchResults.length} risultati
                  </span>
                )}
              </div>
              <TooltipProvider delayDuration={300}>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Stato" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tutti gli stati</SelectItem>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <SelectItem value="lead">Primo contatto</SelectItem>
                      </TooltipTrigger>
                      <TooltipContent side="left" className="max-w-[200px]">
                        <p className="text-xs">Nuovo contatto acquisito, ancora da qualificare</p>
                      </TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <SelectItem value="prospect">Potenziale cliente</SelectItem>
                      </TooltipTrigger>
                      <TooltipContent side="left" className="max-w-[200px]">
                        <p className="text-xs">Contatto interessato, in fase di trattativa</p>
                      </TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <SelectItem value="client">Cliente</SelectItem>
                      </TooltipTrigger>
                      <TooltipContent side="left" className="max-w-[200px]">
                        <p className="text-xs">Cliente attivo con contratto in essere</p>
                      </TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <SelectItem value="inactive">Inattivo</SelectItem>
                      </TooltipTrigger>
                      <TooltipContent side="left" className="max-w-[200px]">
                        <p className="text-xs">Contatto non più attivo o interessato</p>
                      </TooltipContent>
                    </Tooltip>
                  </SelectContent>
                </Select>
              </TooltipProvider>
              <Button 
                variant={sortByName ? "secondary" : "outline"}
                onClick={() => {
                  if (sortByName === null) setSortByName('asc');
                  else if (sortByName === 'asc') setSortByName('desc');
                  else setSortByName(null);
                }}
              >
                {sortByName === 'asc' ? (
                  <ArrowUp className="h-4 w-4 mr-2" />
                ) : sortByName === 'desc' ? (
                  <ArrowDown className="h-4 w-4 mr-2" />
                ) : (
                  <ArrowUpDown className="h-4 w-4 mr-2" />
                )}
                A-Z
              </Button>
              <Button 
                variant={showFilters ? "secondary" : "outline"} 
                onClick={() => setShowFilters(!showFilters)}
              >
                <Filter className="h-4 w-4 mr-2" />
                Filtri Avanzati
                {hasActiveFilters && (
                  <Badge variant="secondary" className="ml-2 h-5 w-5 p-0 justify-center">
                    !
                  </Badge>
                )}
              </Button>
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  <X className="h-4 w-4 mr-1" />
                  Pulisci
                </Button>
              )}
            </div>

            {/* Advanced Filters */}
            {showFilters && (
              <div className="mt-4 pt-4 border-t flex gap-4 flex-wrap">
                {/* Date From */}
                <div className="space-y-2">
                  <Label className="text-sm">Da data</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-[150px] justify-start text-left font-normal",
                          !dateFrom && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {dateFrom ? format(dateFrom, "dd/MM/yyyy") : "Seleziona"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={dateFrom}
                        onSelect={setDateFrom}
                        locale={it}
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Date To */}
                <div className="space-y-2">
                  <Label className="text-sm">A data</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-[150px] justify-start text-left font-normal",
                          !dateTo && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {dateTo ? format(dateTo, "dd/MM/yyyy") : "Seleziona"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={dateTo}
                        onSelect={setDateTo}
                        locale={it}
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Tag Filter */}
                {allTags.length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-sm">Tag</Label>
                    <Select value={tagFilter} onValueChange={setTagFilter}>
                      <SelectTrigger className="w-[150px]">
                        <Tag className="h-4 w-4 mr-2" />
                        <SelectValue placeholder="Tag" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Tutti i tag</SelectItem>
                        {allTags.map(tag => (
                          <SelectItem key={tag} value={tag}>{tag}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Status Legend & Pie Chart */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
          {/* Status Legend - Clickable */}
          <Card className="lg:col-span-2 border-muted">
            <CardContent className="py-3">
              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex items-center gap-1 text-sm text-muted-foreground mr-2">
                  <Info className="h-4 w-4" />
                  <span className="font-medium">Filtra per stato:</span>
                </div>
                <div className="flex items-center gap-1">
                  <Badge 
                    className={`cursor-pointer transition-all ${statusFilter === 'lead' ? 'ring-2 ring-blue-500 ring-offset-2' : ''} bg-blue-500/20 text-blue-700 border-blue-500/30 hover:bg-blue-500/40`}
                    onClick={() => setStatusFilter(statusFilter === 'lead' ? 'all' : 'lead')}
                  >
                    Primo contatto ({statusCounts.lead})
                  </Badge>
                  <span className="text-xs text-muted-foreground hidden sm:inline">Nuovo, da qualificare</span>
                </div>
                <span className="text-muted-foreground">•</span>
                <div className="flex items-center gap-1">
                  <Badge 
                    className={`cursor-pointer transition-all ${statusFilter === 'prospect' ? 'ring-2 ring-yellow-500 ring-offset-2' : ''} bg-yellow-500/20 text-yellow-700 border-yellow-500/30 hover:bg-yellow-500/40`}
                    onClick={() => setStatusFilter(statusFilter === 'prospect' ? 'all' : 'prospect')}
                  >
                    Potenziale cliente ({statusCounts.prospect})
                  </Badge>
                  <span className="text-xs text-muted-foreground hidden sm:inline">In trattativa</span>
                </div>
                <span className="text-muted-foreground">•</span>
                <div className="flex items-center gap-1">
                  <Badge 
                    className={`cursor-pointer transition-all ${statusFilter === 'client' ? 'ring-2 ring-green-500 ring-offset-2' : ''} bg-green-500/20 text-green-700 border-green-500/30 hover:bg-green-500/40`}
                    onClick={() => setStatusFilter(statusFilter === 'client' ? 'all' : 'client')}
                  >
                    Cliente ({statusCounts.client})
                  </Badge>
                  <span className="text-xs text-muted-foreground hidden sm:inline">Contratto attivo</span>
                </div>
                <span className="text-muted-foreground">•</span>
                <div className="flex items-center gap-1">
                  <Badge 
                    className={`cursor-pointer transition-all ${statusFilter === 'inactive' ? 'ring-2 ring-gray-500 ring-offset-2' : ''} bg-gray-500/20 text-gray-700 border-gray-500/30 hover:bg-gray-500/40`}
                    onClick={() => setStatusFilter(statusFilter === 'inactive' ? 'all' : 'inactive')}
                  >
                    Inattivo ({statusCounts.inactive})
                  </Badge>
                  <span className="text-xs text-muted-foreground hidden sm:inline">Non più attivo</span>
                </div>
                {statusFilter !== 'all' && (
                  <>
                    <span className="text-muted-foreground">•</span>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-6 px-2 text-xs"
                      onClick={() => setStatusFilter('all')}
                    >
                      Mostra tutti
                    </Button>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Pie Chart */}
          <Card className="border-muted">
            <CardContent className="py-3">
              <div className="flex items-center justify-center h-full">
                {contacts.length > 0 ? (
                  <div className="w-full h-32">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={[
                            { name: 'Primo contatto', value: statusCounts.lead, fill: '#3b82f6' },
                            { name: 'Potenziale', value: statusCounts.prospect, fill: '#eab308' },
                            { name: 'Cliente', value: statusCounts.client, fill: '#22c55e' },
                            { name: 'Inattivo', value: statusCounts.inactive, fill: '#6b7280' },
                          ].filter(d => d.value > 0)}
                          cx="50%"
                          cy="50%"
                          innerRadius={25}
                          outerRadius={50}
                          paddingAngle={2}
                          dataKey="value"
                        >
                          {[
                            { name: 'Primo contatto', value: statusCounts.lead, fill: '#3b82f6' },
                            { name: 'Potenziale', value: statusCounts.prospect, fill: '#eab308' },
                            { name: 'Cliente', value: statusCounts.client, fill: '#22c55e' },
                            { name: 'Inattivo', value: statusCounts.inactive, fill: '#6b7280' },
                          ].filter(d => d.value > 0).map((entry, index) => (
                            <Cell 
                              key={`cell-${index}`} 
                              fill={entry.fill}
                              className="cursor-pointer hover:opacity-80 transition-opacity"
                              onClick={() => {
                                const statusMap: Record<string, string> = {
                                  'Primo contatto': 'lead',
                                  'Potenziale': 'prospect',
                                  'Cliente': 'client',
                                  'Inattivo': 'inactive'
                                };
                                const status = statusMap[entry.name];
                                setStatusFilter(statusFilter === status ? 'all' : status);
                              }}
                            />
                          ))}
                        </Pie>
                        <RechartsTooltip 
                          formatter={(value: number, name: string) => [`${value} contatti`, name]}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <span className="text-sm text-muted-foreground">Nessun dato</span>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

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

        {/* Data Cleanup Section */}
        <div className="mb-4">
          <CRMDataCleanup 
            contacts={contacts} 
            onApplyFix={async (contactId, updates) => {
              await updateContact(contactId, updates);
            }}
          />
        </div>

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
              <Card 
                key={contact.id} 
                className="hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => navigate(`/crm/contact/${contact.id}`)}
              >
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
                    <div onClick={(e) => e.stopPropagation()}>
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
                        <DropdownMenuItem onClick={() => {
                          setSelectedContact(contact);
                          if (contact.next_followup_at) {
                            const existingDate = new Date(contact.next_followup_at);
                            setFollowupDate(existingDate);
                            setFollowupTime(format(existingDate, 'HH:mm'));
                          } else {
                            setFollowupDate(undefined);
                            setFollowupTime('09:00');
                          }
                          setShowFollowupDialog(true);
                        }}>
                          <CalendarIcon className="h-4 w-4 mr-2" />
                          Imposta follow-up
                        </DropdownMenuItem>
                        {contact.next_followup_at && (
                          <DropdownMenuItem onClick={() => handleRemoveFollowup(contact)}>
                            <X className="h-4 w-4 mr-2" />
                            Rimuovi follow-up
                          </DropdownMenuItem>
                        )}
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
                  </div>

                  <div className="flex items-center gap-2 mb-3 flex-wrap">
                    <Badge className={cn(statusColors[contact.status])}>
                      {statusLabels[contact.status]}
                    </Badge>
                    {contact.next_followup_at && (
                      <Badge variant="outline" className="text-xs bg-blue-500/10 text-blue-700 border-blue-500/30">
                        <CalendarIcon className="h-3 w-3 mr-1" />
                        {format(new Date(contact.next_followup_at), 'dd/MM', { locale: it })}
                      </Badge>
                    )}
                  </div>

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

        {/* Set Follow-up Dialog */}
        <Dialog open={showFollowupDialog} onOpenChange={setShowFollowupDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Imposta Follow-up - {selectedContact?.name}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Data Follow-up</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !followupDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {followupDate ? format(followupDate, "PPP", { locale: it }) : "Seleziona data"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={followupDate}
                      onSelect={setFollowupDate}
                      locale={it}
                      disabled={(date) => date < new Date()}
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div>
                <Label>Ora Follow-up</Label>
                <Select value={followupTime} onValueChange={setFollowupTime}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="max-h-[200px]">
                    {Array.from({ length: 24 }, (_, hour) => 
                      ['00', '30'].map(min => {
                        const time = `${hour.toString().padStart(2, '0')}:${min}`;
                        return (
                          <SelectItem key={time} value={time}>
                            {time}
                          </SelectItem>
                        );
                      })
                    ).flat()}
                  </SelectContent>
                </Select>
              </div>
              <p className="text-sm text-muted-foreground">
                Il follow-up sarà visibile nel calendario CRM, sincronizzato con Google Calendar (se connesso) e riceverai un promemoria.
              </p>
              <Button onClick={handleSetFollowup} className="w-full" disabled={!followupDate}>
                <CalendarIcon className="h-4 w-4 mr-2" />
                Salva Follow-up
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </main>

      <BottomNav />
    </div>
  );
}
