import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

interface ContactFormProps {
  title: string;
  serviceType: string;
  clientType?: string;
}

const ContactForm = ({ title, serviceType, clientType = "new" }: ContactFormProps) => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    company: "",
    message: "",
    // Campi aggiuntivi per Neo Inserimento / Fine Lavoro
    birthPlace: "",
    birthDate: "",
    fiscalCode: "",
    startDate: "",
    endDate: "",
    contractType: "",
    jobRole: ""
  });
  const [fiscalCodeError, setFiscalCodeError] = useState("");
  const { toast } = useToast();
  const navigate = useNavigate();

  // Determina se mostrare i campi aggiuntivi
  const isNeoInserimento = serviceType === "Per Neo Inserimento";
  const isFineLavoro = serviceType === "Rapporto di Fine Lavoro";
  const showExtraFields = isNeoInserimento || isFineLavoro;

  // Validazione Codice Fiscale Italiano
  const validateFiscalCode = (code: string): boolean => {
    if (!code) return false;
    // Formato: 6 lettere + 2 numeri + 1 lettera + 2 numeri + 1 lettera + 3 caratteri alfanumerici + 1 lettera
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
       // Determina il tipo di utente dal clientType o dal titolo
       let userType: string;
       if (clientType) {
         userType = clientType === 'new' ? 'new_client' : 'existing_client';
       } else {
         userType = title.toLowerCase().includes('nuovo cliente') ? 'new_client' : 'existing_client';
       }
       
       // Costruisci il messaggio includendo i campi extra se presenti
       let fullMessage = formData.message || "";
       if (showExtraFields) {
         const extraInfo = [
           `Luogo di nascita: ${formData.birthPlace}`,
           `Data di nascita: ${formData.birthDate}`,
           `Codice Fiscale: ${formData.fiscalCode}`,
           isNeoInserimento ? `Data inizio: ${formData.startDate}` : `Data fine: ${formData.endDate}`,
           `Tipologia contratto: ${formData.contractType}`,
           `Mansione: ${formData.jobRole}`
         ].join("\n");
         fullMessage = extraInfo + (fullMessage ? "\n\nNote aggiuntive:\n" + fullMessage : "");
       }
       
       // Salva nel database
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

      // Invia email usando supabase.functions.invoke
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

      toast({
        title: "Richiesta inviata!",
        description: "Vi contatteremo entro 24 ore lavorative.",
      });
      
      // Reset form
      setFormData({
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
        jobRole: ""
      });
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
    
    // Valida CF in tempo reale
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
                    <Input
                      id="contractType"
                      name="contractType"
                      value={formData.contractType}
                      onChange={handleChange}
                      placeholder="Es. Tempo indeterminato, Determinato..."
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="jobRole">Mansione *</Label>
                    <Input
                      id="jobRole"
                      name="jobRole"
                      value={formData.jobRole}
                      onChange={handleChange}
                      placeholder="Es. Operaio, Impiegato..."
                      required
                    />
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
            
            <Button type="submit" className="w-full bg-secondary hover:bg-secondary/90">
              Invia Richiesta
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default ContactForm;