import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import GoogleDriveSync from "@/components/GoogleDriveSync";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { 
  User, 
  FileText, 
  Calendar, 
  Trash2, 
  Edit, 
  LogOut,
  ArrowLeft,
  Save,
  X,
  Building2,
  Shield,
  Palette
} from "lucide-react";

interface FormDraft {
  id: string;
  service_type: string;
  client_type: string;
  form_data: any;
  created_at: string;
  updated_at: string;
}

interface ProfileData {
  full_name: string | null;
  company_name: string | null;
  calendar_color?: string | null;
}

const Profile = () => {
  const { user, signOut, loading: authLoading } = useAuth();
  const { role, getRoleDisplayName, loading: roleLoading } = useUserRole();

  const getRoleBadgeStyles = () => {
    switch (role) {
      case 'admin':
        return 'bg-red-500/20 text-red-700 dark:text-red-400 border-red-500/30';
      case 'contabilita':
        return 'bg-blue-500/20 text-blue-700 dark:text-blue-400 border-blue-500/30';
      case 'area_tecnica':
        return 'bg-green-500/20 text-green-700 dark:text-green-400 border-green-500/30';
      case 'gestione_corsi':
        return 'bg-purple-500/20 text-purple-700 dark:text-purple-400 border-purple-500/30';
      case 'consulenti_tecnici':
        return 'bg-orange-500/20 text-orange-700 dark:text-orange-400 border-orange-500/30';
      default:
        return 'bg-secondary text-secondary-foreground';
    }
  };
  const navigate = useNavigate();
  const { toast } = useToast();
  const [drafts, setDrafts] = useState<FormDraft[]>([]);
  const [draftsLoading, setDraftsLoading] = useState(true);
  const [profile, setProfile] = useState<ProfileData>({ full_name: null, company_name: null });
  const [profileLoading, setProfileLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editFullName, setEditFullName] = useState("");
  const [editCompanyName, setEditCompanyName] = useState("");
  const [saving, setSaving] = useState(false);
  const [calendarColor, setCalendarColor] = useState<string>('#3B82F6');
  const [savingColor, setSavingColor] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    
    if (!user) {
      navigate("/");
      return;
    }
    fetchDrafts();
    fetchProfile();
  }, [user, authLoading, navigate]);

  const fetchProfile = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('full_name, company_name, calendar_color')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;
      
      if (data) {
        setProfile(data as ProfileData);
        setEditFullName(data.full_name || "");
        setEditCompanyName(data.company_name || "");
        setCalendarColor((data as any).calendar_color || '#3B82F6');
      }
    } catch (error) {
      console.error('Errore caricamento profilo:', error);
    } finally {
      setProfileLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    setSaving(true);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: editFullName.trim() || null,
          company_name: editCompanyName.trim() || null,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id);

      if (error) throw error;

      setProfile({
        full_name: editFullName.trim() || null,
        company_name: editCompanyName.trim() || null
      });
      setIsEditing(false);
      toast({
        title: "Profilo aggiornato",
        description: "Le modifiche sono state salvate con successo.",
      });
    } catch (error) {
      console.error('Errore salvataggio profilo:', error);
      toast({
        title: "Errore",
        description: "Impossibile salvare le modifiche.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setEditFullName(profile.full_name || "");
    setEditCompanyName(profile.company_name || "");
    setIsEditing(false);
  };

  const CALENDAR_COLOR_PALETTE = [
    '#3B82F6', '#EF4444', '#10B981', '#F59E0B',
    '#8B5CF6', '#EC4899', '#06B6D4', '#F97316',
    '#14B8A6', '#84CC16', '#A855F7', '#0EA5E9',
  ];

  const handleSaveColor = async (color: string) => {
    if (!user) return;
    setCalendarColor(color);
    setSavingColor(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ calendar_color: color, updated_at: new Date().toISOString() })
        .eq('user_id', user.id);
      if (error) throw error;
      toast({ title: 'Colore aggiornato', description: 'I tuoi eventi useranno questo colore nel calendario.' });
    } catch (e) {
      console.error(e);
      toast({ title: 'Errore', description: 'Impossibile salvare il colore.', variant: 'destructive' });
    } finally {
      setSavingColor(false);
    }
  };

  const fetchDrafts = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('form_drafts')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setDrafts(data || []);
    } catch (error) {
      console.error('Errore caricamento bozze:', error);
      toast({
        title: "Errore",
        description: "Impossibile caricare le bozze.",
        variant: "destructive",
      });
    } finally {
      setDraftsLoading(false);
    }
  };

  const deleteDraft = async (draftId: string) => {
    try {
      const { error } = await supabase
        .from('form_drafts')
        .delete()
        .eq('id', draftId);

      if (error) throw error;

      setDrafts(drafts.filter(d => d.id !== draftId));
      toast({
        title: "Bozza eliminata",
        description: "La bozza è stata eliminata con successo.",
      });
    } catch (error) {
      console.error('Errore eliminazione bozza:', error);
      toast({
        title: "Errore",
        description: "Impossibile eliminare la bozza.",
        variant: "destructive",
      });
    }
  };

  const openDraft = (draft: FormDraft) => {
    const title = draft.client_type === "new" 
      ? "Richiesta Contatto - Nuovo Cliente" 
      : "Richiesta Contatto - Già Cliente";
    
    navigate("/contact-request", {
      state: {
        title,
        serviceType: draft.service_type,
        clientType: draft.client_type
      }
    });
  };

  const getServiceLabel = (serviceType: string) => {
    const labels: Record<string, string> = {
      "Per Neo Inserimento": "Neo Inserimento",
      "Rapporto di Fine Lavoro": "Fine Lavoro",
      "Per Ispezione": "Ispezione",
      "Per Assistenza": "Assistenza",
      "Assistenza": "Assistenza",
      "Per Corsi": "Corsi",
      "Per Fondi": "Fondi",
      "Per Documenti": "Documenti",
      "Check-up Gratuito": "Check-up",
      "Altro": "Altro"
    };
    return labels[serviceType] || serviceType;
  };

  const getClientTypeLabel = (clientType: string) => {
    return clientType === "new" ? "Nuovo Cliente" : "Già Cliente";
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">Caricamento...</div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto p-4 pb-20">
        <Button 
          variant="ghost" 
          onClick={() => navigate(-1)}
          className="mb-4 flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Indietro
        </Button>

        {/* Info Utente */}
        <Card className="mb-6">
          <CardHeader className="gradient-sicur text-white">
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Il Mio Profilo
              </span>
              {!isEditing && !profileLoading && (
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setIsEditing(true)}
                  className="text-white hover:bg-white/20"
                >
                  <Edit className="h-4 w-4 mr-1" />
                  Modifica
                </Button>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {profileLoading ? (
              <div className="text-center py-4 text-muted-foreground">Caricamento...</div>
            ) : isEditing ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="fullName">Nome Completo</Label>
                  <Input
                    id="fullName"
                    value={editFullName}
                    onChange={(e) => setEditFullName(e.target.value)}
                    placeholder="Inserisci il tuo nome completo"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="companyName">Nome Azienda</Label>
                  <Input
                    id="companyName"
                    value={editCompanyName}
                    onChange={(e) => setEditCompanyName(e.target.value)}
                    placeholder="Inserisci il nome della tua azienda"
                  />
                </div>
                <div className="flex gap-2 pt-2">
                  <Button onClick={handleSaveProfile} disabled={saving} className="flex items-center gap-2">
                    <Save className="h-4 w-4" />
                    {saving ? "Salvataggio..." : "Salva"}
                  </Button>
                  <Button variant="outline" onClick={handleCancelEdit} disabled={saving} className="flex items-center gap-2">
                    <X className="h-4 w-4" />
                    Annulla
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <User className="h-3 w-3" />
                      Nome Completo
                    </p>
                    <p className="font-medium">{profile.full_name || <span className="text-muted-foreground italic">Non specificato</span>}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <Building2 className="h-3 w-3" />
                      Azienda
                    </p>
                    <p className="font-medium">{profile.company_name || <span className="text-muted-foreground italic">Non specificata</span>}</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t">
                  <div>
                    <p className="text-sm text-muted-foreground">Email</p>
                    <p className="font-medium">{user.email}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <Shield className="h-3 w-3" />
                      Ruolo
                    </p>
                    <p className="font-medium">
                      {roleLoading ? (
                        <span className="text-muted-foreground italic">Caricamento...</span>
                      ) : (
                        <Badge className={getRoleBadgeStyles()}>{getRoleDisplayName()}</Badge>
                      )}
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t">
                  <div>
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      Iscritto dal
                    </p>
                    <p className="font-medium">
                      {user.created_at ? new Date(user.created_at).toLocaleDateString('it-IT', {
                        day: '2-digit',
                        month: 'long',
                        year: 'numeric'
                      }) : <span className="text-muted-foreground italic">Non disponibile</span>}
                    </p>
                  </div>
                </div>
                <div className="flex justify-end pt-2">
                  <Button variant="outline" onClick={handleSignOut} className="flex items-center gap-2">
                    <LogOut className="h-4 w-4" />
                    Esci
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Lista Bozze */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Le Mie Bozze
              {drafts.length > 0 && (
                <Badge variant="secondary" className="ml-2">{drafts.length}</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {draftsLoading ? (
              <div className="text-center py-8 text-muted-foreground">
                Caricamento...
              </div>
            ) : drafts.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Nessuna bozza salvata</p>
                <p className="text-sm mt-1">Le bozze appariranno qui quando salverai un form</p>
              </div>
            ) : (
              <div className="space-y-3">
                {drafts.map((draft) => (
                  <div 
                    key={draft.id} 
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium">{getServiceLabel(draft.service_type)}</span>
                        <Badge variant="outline" className="text-xs">
                          {getClientTypeLabel(draft.client_type)}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                        <Calendar className="h-3 w-3" />
                        <span>
                          Modificata il {new Date(draft.updated_at).toLocaleDateString('it-IT', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      </div>
                      {draft.form_data?.name && (
                        <p className="text-sm text-muted-foreground mt-1 truncate">
                          {draft.form_data.name}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => openDraft(draft)}
                        className="flex items-center gap-1"
                      >
                        <Edit className="h-4 w-4" />
                        <span className="hidden sm:inline">Continua</span>
                      </Button>
                      <Button 
                        size="sm" 
                        variant="ghost"
                        onClick={() => deleteDraft(draft.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="mt-6">
          <GoogleDriveSync userId={user?.id} />
        </div>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="h-5 w-5" />
              Colore Calendario
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Scegli un colore per identificarti nel calendario condiviso. Tutti i tuoi eventi e le tue note appariranno con questo colore.
            </p>
            <div className="flex items-center gap-3 flex-wrap">
              {CALENDAR_COLOR_PALETTE.map((color) => (
                <button
                  key={color}
                  onClick={() => handleSaveColor(color)}
                  disabled={savingColor}
                  className="relative w-10 h-10 rounded-full transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                  style={{ backgroundColor: color }}
                  aria-label={`Seleziona colore ${color}`}
                >
                  {calendarColor === color && (
                    <span className="absolute inset-0 flex items-center justify-center text-white">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </span>
                  )}
                </button>
              ))}
            </div>
            <div className="mt-4 flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">Anteprima:</span>
              <span
                className="inline-flex items-center gap-2 px-3 py-1 rounded-md text-xs font-medium"
                style={{ backgroundColor: `${calendarColor}20`, color: calendarColor, borderLeft: `3px solid ${calendarColor}` }}
              >
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: calendarColor }} />
                {profile.full_name || user.email}
              </span>
            </div>
            <div className="mt-4 pt-4 border-t flex items-center gap-3 flex-wrap">
              <Label htmlFor="customColor" className="text-sm">Colore personalizzato:</Label>
              <div className="flex items-center gap-2">
                <input
                  id="customColor"
                  type="color"
                  value={calendarColor}
                  onChange={(e) => setCalendarColor(e.target.value)}
                  className="h-10 w-14 rounded border border-border cursor-pointer bg-background"
                  aria-label="Scegli colore personalizzato"
                />
                <Input
                  value={calendarColor}
                  onChange={(e) => {
                    const v = e.target.value.trim();
                    if (/^#[0-9A-Fa-f]{0,6}$/.test(v)) setCalendarColor(v);
                  }}
                  placeholder="#3B82F6"
                  maxLength={7}
                  className="w-28 font-mono uppercase text-sm"
                />
                <Button
                  size="sm"
                  onClick={() => handleSaveColor(calendarColor)}
                  disabled={savingColor || !/^#[0-9A-Fa-f]{6}$/.test(calendarColor)}
                >
                  {savingColor ? 'Salvo...' : 'Salva'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
      
      <BottomNav />
    </div>
  );
};

export default Profile;