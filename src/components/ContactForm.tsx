import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Save, FileText, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface ContactFormProps {
  title: string;
  serviceType: string;
  clientType?: string;
}

const initialFormData = {
  name: "",
  email: "",
  phone: "",
  company: "",
  message: "",
  birthPlace: "",
  birthDate: "",
  fiscalCode: "",
  startDate: "",
  endDate: "",
  contractType: "",
  contractTypeOther: "",
  jobRole: "",
  jobRoleOther: ""
};

const ContactForm = ({ title, serviceType, clientType = "new" }: ContactFormProps) => {
  const [formData, setFormData] = useState(initialFormData);
  const [fiscalCodeError, setFiscalCodeError] = useState("");
  const [hasDraft, setHasDraft] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user } = useAuth();

  // Determina se mostrare i campi aggiuntivi
  const isNeoInserimento = serviceType === "Per Neo Inserimento";
  const isFineLavoro = serviceType === "Rapporto di Fine Lavoro";
  const showExtraFields = isNeoInserimento || isFineLavoro;

  // Carica bozza esistente all'avvio
  useEffect(() => {
    if (user) {
      loadDraft();
    }
  }, [user, serviceType, clientType]);

  const loadDraft = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('form_drafts')
        .select('form_data')
        .eq('user_id', user.id)
        .eq('service_type', serviceType)
        .eq('client_type', clientType)
        .maybeSingle();

      if (error) throw error;

      if (data?.form_data) {
        setHasDraft(true);
      }
    } catch (error) {
      console.error('Errore caricamento bozza:', error);
    }
  };

  const restoreDraft = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('form_drafts')
        .select('form_data')
        .eq('user_id', user.id)
        .eq('service_type', serviceType)
        .eq('client_type', clientType)
        .maybeSingle();

      if (error) throw error;

      if (data?.form_data) {
        const savedData = data.form_data as typeof initialFormData;
        setFormData(savedData);
        toast({
          title: "Bozza ripristinata",
          description: "I dati salvati sono stati caricati nel form.",
        });
      }
    } catch (error) {
      console.error('Errore ripristino bozza:', error);
      toast({
        title: "Errore",
        description: "Impossibile ripristinare la bozza.",
        variant: "destructive",
      });
    }
  };

  const saveDraft = async () => {
    if (!user) {
      toast({
        title: "Accesso richiesto",
        description: "Effettua il login per salvare la bozza.",
        variant: "destructive",
      });
      return;
    }

    setSavingDraft(true);
    try {
      const { error } = await supabase
        .from('form_drafts')
        .upsert({
          user_id: user.id,
          service_type: serviceType,
          client_type: clientType,
          form_data: formData
        }, {
          onConflict: 'user_id,service_type,client_type'
        });

      if (error) throw error;

      setHasDraft(true);
      toast({
        title: "Bozza salvata",
        description: "Potrai completare il form in un secondo momento.",
      });
    } catch (error) {
      console.error('Errore salvataggio bozza:', error);
      toast({
        title: "Errore",
        description: "Impossibile salvare la bozza.",
        variant: "destructive",
      });
    } finally {
      setSavingDraft(false);
    }
  };

  const deleteDraft = async () => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('form_drafts')
        .delete()
        .eq('user_id', user.id)
        .eq('service_type', serviceType)
        .eq('client_type', clientType);

      if (error) throw error;
      setHasDraft(false);
    } catch (error) {
      console.error('Errore eliminazione bozza:', error);
    }
  };

  // Validazione Codice Fiscale Italiano
  const validateFiscalCode = (code: string): boolean => {
    if (!code) return false;
    const cfRegex = /^[A-Z]{6}[0-9]{2}[A-Z][0-9]{2}[A-Z][0-9]{3}[A-Z]$/i;
    return cfRegex.test(code);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Valida il codice fiscale se richiesto
    if (showExtraFields && !validateFiscalCode(formData.fiscalCode)) {
      setFiscalCodeError("Formato codice fiscale non valido (es. RSSMRA85M01H501Z)");
      toast({
        title: "Errore di validazione",
        description: "Il codice fiscale inserito non è nel formato corretto.",
        variant: "destructive",
      });
      return;
    }
    setFiscalCodeError("");
    
    try {
      let userType: string;
      if (clientType) {
        userType = clientType === 'new' ? 'new_client' : 'existing_client';
      } else {
        userType = title.toLowerCase().includes('nuovo cliente') ? 'new_client' : 'existing_client';
      }
      
      let fullMessage = formData.message || "";
      if (showExtraFields) {
        const contractTypeDisplay = formData.contractType === "altro" 
          ? `Altro: ${formData.contractTypeOther}` 
          : formData.contractType;
        const jobRoleDisplay = formData.jobRole === "altro" 
          ? `Altro: ${formData.jobRoleOther}` 
          : formData.jobRole;
        
        const extraInfo = [
          `Luogo di nascita: ${formData.birthPlace}`,
          `Data di nascita: ${formData.birthDate}`,
          `Codice Fiscale: ${formData.fiscalCode}`,
          isNeoInserimento ? `Data inizio: ${formData.startDate}` : `Data fine: ${formData.endDate}`,
          `Tipologia contratto: ${contractTypeDisplay}`,
          `Mansione: ${jobRoleDisplay}`
        ].join("\n");
        fullMessage = extraInfo + (fullMessage ? "\n\nNote aggiuntive:\n" + fullMessage : "");
      }
      
      const { error: dbError } = await supabase
        .from('contact_requests')
        .insert({
          user_type: userType,
          service_type: serviceType,
          name: formData.name,
          email: formData.email,
          phone: formData.phone || null,
          company: formData.company || null,
          message: fullMessage || null,
        });

      if (dbError) {
        throw new Error('Errore nel salvataggio: ' + dbError.message);
      }

      const { error: emailError } = await supabase.functions.invoke('send-contact-email', {
        body: {
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          company: formData.company,
          message: fullMessage,
          serviceType: serviceType,
          userType: userType,
        }
      });

      if (emailError) {
        throw new Error('Errore nell\'invio dell\'email: ' + emailError.message);
      }

      // Elimina la bozza dopo invio riuscito
      await deleteDraft();

      toast({
        title: "Richiesta inviata!",
        description: "Vi contatteremo entro 24 ore lavorative.",
      });
      
      setFormData(initialFormData);
    } catch (error) {
      console.error('Errore:', error);
      toast({
        title: "Errore",
        description: "Errore nell'invio della richiesta. Riprova.",
        variant: "destructive",
      });
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    
    if (name === "fiscalCode") {
      if (value && !validateFiscalCode(value)) {
        setFiscalCodeError("Formato non valido");
      } else {
        setFiscalCodeError("");
      }
    }
  };

  return (
    <div className="container mx-auto p-4 pb-20">
      <Button 
        variant="ghost" 
        onClick={() => navigate(-1)}
        className="mb-4 flex items-center gap-2"
      >
        <ArrowLeft className="h-4 w-4" />
        Indietro
      </Button>

      {/* Banner bozza esistente */}
      {user && hasDraft && (
        <Alert className="mb-4 bg-primary/10 border-primary">
          <FileText className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>Hai una bozza salvata per questo form.</span>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={restoreDraft}>
                Ripristina
              </Button>
              <Button size="sm" variant="ghost" onClick={deleteDraft}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}
      
      <Card>
        <CardHeader className="gradient-sicur text-white">
          <CardTitle className="text-xl">{title}</CardTitle>
          <p className="opacity-90">{serviceType}</p>
        </CardHeader>
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Nome e Cognome *</Label>
                <Input
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                />
              </div>
              <div>
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="phone">Telefono</Label>
                <Input
                  id="phone"
                  name="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={handleChange}
                />
              </div>
              <div>
                <Label htmlFor="company">Azienda</Label>
                <Input
                  id="company"
                  name="company"
                  value={formData.company}
                  onChange={handleChange}
                />
              </div>
            </div>

            {/* Campi aggiuntivi per Neo Inserimento / Fine Lavoro */}
            {showExtraFields && (
              <>
                <div className="border-t pt-4 mt-4">
                  <h3 className="font-semibold mb-3 text-primary">
                    {isNeoInserimento ? "Dati Nuovo Dipendente" : "Dati Dipendente in Uscita"}
                  </h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="birthPlace">Luogo di Nascita *</Label>
                    <Input
                      id="birthPlace"
                      name="birthPlace"
                      value={formData.birthPlace}
                      onChange={handleChange}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="birthDate">Data di Nascita *</Label>
                    <Input
                      id="birthDate"
                      name="birthDate"
                      type="date"
                      value={formData.birthDate}
                      onChange={handleChange}
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="fiscalCode">Codice Fiscale *</Label>
                    <Input
                      id="fiscalCode"
                      name="fiscalCode"
                      value={formData.fiscalCode}
                      onChange={handleChange}
                      placeholder="RSSMRA85M01H501Z"
                      required
                      className={fiscalCodeError ? "border-destructive" : ""}
                    />
                    {fiscalCodeError && (
                      <p className="text-sm text-destructive mt-1">{fiscalCodeError}</p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor={isNeoInserimento ? "startDate" : "endDate"}>
                      {isNeoInserimento ? "Data Inizio *" : "Data Fine *"}
                    </Label>
                    <Input
                      id={isNeoInserimento ? "startDate" : "endDate"}
                      name={isNeoInserimento ? "startDate" : "endDate"}
                      type="date"
                      value={isNeoInserimento ? formData.startDate : formData.endDate}
                      onChange={handleChange}
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="contractType">Tipologia Contratto *</Label>
                    <Select
                      value={formData.contractType}
                      onValueChange={(value) => setFormData({ ...formData, contractType: value })}
                      required
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleziona tipologia..." />
                      </SelectTrigger>
                      <SelectContent className="bg-background">
                        <SelectItem value="tempo_indeterminato">Tempo Indeterminato</SelectItem>
                        <SelectItem value="tempo_determinato">Tempo Determinato</SelectItem>
                        <SelectItem value="apprendistato">Apprendistato</SelectItem>
                        <SelectItem value="stagionale">Stagionale</SelectItem>
                        <SelectItem value="somministrazione">Somministrazione</SelectItem>
                        <SelectItem value="collaborazione">Collaborazione</SelectItem>
                        <SelectItem value="tirocinio">Tirocinio/Stage</SelectItem>
                        <SelectItem value="altro">Altro</SelectItem>
                      </SelectContent>
                    </Select>
                    {formData.contractType === "altro" && (
                      <Input
                        className="mt-2"
                        name="contractTypeOther"
                        value={formData.contractTypeOther}
                        onChange={handleChange}
                        placeholder="Specifica tipologia contratto..."
                        required
                      />
                    )}
                  </div>
                  <div>
                    <Label htmlFor="jobRole">Mansione *</Label>
                    <Select
                      value={formData.jobRole}
                      onValueChange={(value) => setFormData({ ...formData, jobRole: value })}
                      required
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleziona mansione..." />
                      </SelectTrigger>
                      <SelectContent className="bg-background">
                        <SelectItem value="dirigente">Dirigente</SelectItem>
                        <SelectItem value="quadro">Quadro</SelectItem>
                        <SelectItem value="impiegato">Impiegato</SelectItem>
                        <SelectItem value="operaio">Operaio</SelectItem>
                        <SelectItem value="apprendista">Apprendista</SelectItem>
                        <SelectItem value="tirocinante">Tirocinante</SelectItem>
                        <SelectItem value="altro">Altro</SelectItem>
                      </SelectContent>
                    </Select>
                    {formData.jobRole === "altro" && (
                      <Input
                        className="mt-2"
                        name="jobRoleOther"
                        value={formData.jobRoleOther}
                        onChange={handleChange}
                        placeholder="Specifica mansione..."
                        required
                      />
                    )}
                  </div>
                </div>
              </>
            )}
            
            <div>
              <Label htmlFor="message">{showExtraFields ? "Note aggiuntive" : "Messaggio"}</Label>
              <Textarea
                id="message"
                name="message"
                value={formData.message}
                onChange={handleChange}
                rows={4}
                placeholder="Descrivici le tue esigenze..."
              />
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3">
              <Button type="submit" className="flex-1 bg-secondary hover:bg-secondary/90">
                Invia Richiesta
              </Button>
              {user && (
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={saveDraft}
                  disabled={savingDraft}
                  className="flex items-center gap-2"
                >
                  <Save className="h-4 w-4" />
                  {savingDraft ? "Salvataggio..." : "Salva Bozza"}
                </Button>
              )}
            </div>

            {!user && (
              <p className="text-sm text-muted-foreground text-center">
                Effettua il login per salvare il form come bozza
              </p>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default ContactForm;