import { useState, useEffect, useMemo } from 'react';
import { ArrowLeft, Link2, Loader2, Search, ListTodo, Briefcase, CheckCircle2, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

interface OrphanedActivity {
  id: string;
  name: string;
  project_name?: string;
  owner_name?: string;
  type: string;
  status: string;
}

interface OrphanedContract {
  id: string;
  name: string;
  group_name?: string;
  responsible?: string;
  status: string;
  contract_type?: string;
}

interface Contact {
  id: string;
  name: string;
  company?: string;
}

// Simple fuzzy matching function
function fuzzyMatch(str1: string, str2: string): number {
  const s1 = str1.toLowerCase().trim();
  const s2 = str2.toLowerCase().trim();
  
  if (s1 === s2) return 1;
  if (s1.includes(s2) || s2.includes(s1)) return 0.8;
  
  // Calculate Levenshtein distance ratio
  const len1 = s1.length;
  const len2 = s2.length;
  const matrix: number[][] = [];
  
  for (let i = 0; i <= len1; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }
  
  const maxLen = Math.max(len1, len2);
  return maxLen === 0 ? 1 : 1 - matrix[len1][len2] / maxLen;
}

function findBestMatches(searchTerm: string, contacts: Contact[], limit = 5): Array<Contact & { score: number }> {
  if (!searchTerm) return [];
  
  const scored = contacts.map(contact => {
    const nameScore = fuzzyMatch(searchTerm, contact.name);
    const companyScore = contact.company ? fuzzyMatch(searchTerm, contact.company) : 0;
    return {
      ...contact,
      score: Math.max(nameScore, companyScore)
    };
  });
  
  return scored
    .filter(c => c.score > 0.3)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

export default function CRMOrphanedItems() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [orphanedActivities, setOrphanedActivities] = useState<OrphanedActivity[]>([]);
  const [orphanedContracts, setOrphanedContracts] = useState<OrphanedContract[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [linking, setLinking] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTab, setSelectedTab] = useState('activities');

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch orphaned activities (no contact_id)
      const { data: activities, error: actError } = await supabase
        .from('crm_activities')
        .select('id, name, project_name, owner_name, type, status')
        .is('contact_id', null)
        .order('name');
      
      if (actError) throw actError;
      
      // Fetch orphaned contracts (no contact_id)
      const { data: contracts, error: contError } = await supabase
        .from('crm_contracts')
        .select('id, name, group_name, responsible, status, contract_type')
        .is('contact_id', null)
        .order('name');
      
      if (contError) throw contError;
      
      // Fetch all contacts for matching
      const { data: contactsData, error: contactsError } = await supabase
        .from('crm_contacts')
        .select('id, name, company')
        .eq('user_id', user!.id)
        .order('name');
      
      if (contactsError) throw contactsError;
      
      setOrphanedActivities(activities || []);
      setOrphanedContracts(contracts || []);
      setContacts(contactsData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({ title: 'Errore', description: 'Impossibile caricare i dati', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const linkActivityToContact = async (activityId: string, contactId: string) => {
    setLinking(activityId);
    try {
      const { error } = await supabase
        .from('crm_activities')
        .update({ contact_id: contactId })
        .eq('id', activityId);
      
      if (error) throw error;
      
      toast({ title: 'Attività collegata', description: 'L\'attività è stata collegata al contatto.' });
      setOrphanedActivities(prev => prev.filter(a => a.id !== activityId));
    } catch (error: any) {
      toast({ title: 'Errore', description: error.message, variant: 'destructive' });
    } finally {
      setLinking(null);
    }
  };

  const linkContractToContact = async (contractId: string, contactId: string) => {
    setLinking(contractId);
    try {
      const { error } = await supabase
        .from('crm_contracts')
        .update({ contact_id: contactId })
        .eq('id', contractId);
      
      if (error) throw error;
      
      toast({ title: 'Commessa collegata', description: 'La commessa è stata collegata al contatto.' });
      setOrphanedContracts(prev => prev.filter(c => c.id !== contractId));
    } catch (error: any) {
      toast({ title: 'Errore', description: error.message, variant: 'destructive' });
    } finally {
      setLinking(null);
    }
  };

  const filteredActivities = useMemo(() => {
    if (!searchTerm) return orphanedActivities;
    const term = searchTerm.toLowerCase();
    return orphanedActivities.filter(a => 
      a.name.toLowerCase().includes(term) ||
      a.project_name?.toLowerCase().includes(term) ||
      a.owner_name?.toLowerCase().includes(term)
    );
  }, [orphanedActivities, searchTerm]);

  const filteredContracts = useMemo(() => {
    if (!searchTerm) return orphanedContracts;
    const term = searchTerm.toLowerCase();
    return orphanedContracts.filter(c => 
      c.name.toLowerCase().includes(term) ||
      c.group_name?.toLowerCase().includes(term) ||
      c.responsible?.toLowerCase().includes(term)
    );
  }, [orphanedContracts, searchTerm]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 max-w-6xl">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="icon" onClick={() => navigate('/crm')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Elementi Orfani</h1>
          <p className="text-muted-foreground">
            Ricollega attività e commesse non associate a nessun contatto
          </p>
        </div>
      </div>

      <div className="flex items-center gap-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Cerca per nome, progetto..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <AlertTriangle className="h-4 w-4 text-yellow-500" />
          <span>{orphanedActivities.length} attività orfane</span>
          <span>•</span>
          <span>{orphanedContracts.length} commesse orfane</span>
        </div>
      </div>

      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="activities" className="gap-2">
            <ListTodo className="h-4 w-4" />
            Attività ({filteredActivities.length})
          </TabsTrigger>
          <TabsTrigger value="contracts" className="gap-2">
            <Briefcase className="h-4 w-4" />
            Commesse ({filteredContracts.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="activities">
          {filteredActivities.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <CheckCircle2 className="h-12 w-12 text-green-500 mb-4" />
                <p className="text-lg font-medium">Nessuna attività orfana</p>
                <p className="text-muted-foreground">Tutte le attività sono collegate a un contatto</p>
              </CardContent>
            </Card>
          ) : (
            <ScrollArea className="h-[600px]">
              <div className="space-y-3">
                {filteredActivities.map((activity) => (
                  <OrphanedItemCard
                    key={activity.id}
                    id={activity.id}
                    name={activity.name}
                    subtitle={activity.project_name || activity.owner_name}
                    type="activity"
                    status={activity.status}
                    contacts={contacts}
                    onLink={(contactId) => linkActivityToContact(activity.id, contactId)}
                    linking={linking === activity.id}
                  />
                ))}
              </div>
            </ScrollArea>
          )}
        </TabsContent>

        <TabsContent value="contracts">
          {filteredContracts.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <CheckCircle2 className="h-12 w-12 text-green-500 mb-4" />
                <p className="text-lg font-medium">Nessuna commessa orfana</p>
                <p className="text-muted-foreground">Tutte le commesse sono collegate a un contatto</p>
              </CardContent>
            </Card>
          ) : (
            <ScrollArea className="h-[600px]">
              <div className="space-y-3">
                {filteredContracts.map((contract) => (
                  <OrphanedItemCard
                    key={contract.id}
                    id={contract.id}
                    name={contract.name}
                    subtitle={contract.group_name || contract.responsible}
                    type="contract"
                    status={contract.status}
                    contacts={contacts}
                    onLink={(contactId) => linkContractToContact(contract.id, contactId)}
                    linking={linking === contract.id}
                  />
                ))}
              </div>
            </ScrollArea>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

interface OrphanedItemCardProps {
  id: string;
  name: string;
  subtitle?: string;
  type: 'activity' | 'contract';
  status: string;
  contacts: Contact[];
  onLink: (contactId: string) => void;
  linking: boolean;
}

function OrphanedItemCard({ id, name, subtitle, type, status, contacts, onLink, linking }: OrphanedItemCardProps) {
  const [searchContact, setSearchContact] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  
  const suggestions = useMemo(() => {
    // Auto-suggest based on item name or subtitle
    const searchTerm = searchContact || name;
    return findBestMatches(searchTerm, contacts, 5);
  }, [searchContact, name, contacts]);

  const autoSuggestions = useMemo(() => {
    return findBestMatches(name, contacts, 3);
  }, [name, contacts]);

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              {type === 'activity' ? (
                <ListTodo className="h-4 w-4 text-primary flex-shrink-0" />
              ) : (
                <Briefcase className="h-4 w-4 text-primary flex-shrink-0" />
              )}
              <h4 className="font-medium truncate">{name}</h4>
              <Badge variant="outline" className="text-xs">{status}</Badge>
            </div>
            {subtitle && (
              <p className="text-sm text-muted-foreground mt-1 ml-6">{subtitle}</p>
            )}
            
            {autoSuggestions.length > 0 && (
              <div className="mt-2 ml-6">
                <p className="text-xs text-muted-foreground mb-1">Suggerimenti basati sul nome:</p>
                <div className="flex flex-wrap gap-1">
                  {autoSuggestions.map((contact) => (
                    <Button
                      key={contact.id}
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs gap-1"
                      onClick={() => onLink(contact.id)}
                      disabled={linking}
                    >
                      {linking ? <Loader2 className="h-3 w-3 animate-spin" /> : <Link2 className="h-3 w-3" />}
                      {contact.name}
                      <span className="text-muted-foreground">({Math.round(contact.score * 100)}%)</span>
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <Input
                placeholder="Cerca contatto..."
                value={searchContact}
                onChange={(e) => {
                  setSearchContact(e.target.value);
                  setShowSuggestions(true);
                }}
                onFocus={() => setShowSuggestions(true)}
                className="w-48 h-9"
              />
              {showSuggestions && searchContact && suggestions.length > 0 && (
                <div className="absolute z-10 top-full mt-1 w-64 bg-popover border rounded-md shadow-lg">
                  {suggestions.map((contact) => (
                    <button
                      key={contact.id}
                      className="w-full text-left px-3 py-2 hover:bg-muted text-sm flex items-center justify-between"
                      onClick={() => {
                        onLink(contact.id);
                        setSearchContact('');
                        setShowSuggestions(false);
                      }}
                      disabled={linking}
                    >
                      <span className="truncate">{contact.name}</span>
                      <span className="text-xs text-muted-foreground ml-2">
                        {Math.round(contact.score * 100)}% match
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
