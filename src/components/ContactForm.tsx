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
}

const ContactForm = ({ title, serviceType }: ContactFormProps) => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    company: "",
    message: ""
  });
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      // Salva nel database
      const { error: dbError } = await supabase
        .from('contact_requests')
        .insert({
          user_type: serviceType,
          service_type: title,
          name: formData.name,
          email: formData.email,
          phone: formData.phone || null,
          company: formData.company || null,
          message: formData.message || null,
        });

      if (dbError) {
        throw new Error('Errore nel salvataggio: ' + dbError.message);
      }

      // Invia email
      const response = await fetch(`https://obzflzotzvwlmgyjxfpv.supabase.co/functions/v1/send-contact-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          company: formData.company,
          message: formData.message,
          serviceType: title,
          userType: serviceType,
        }),
      });

      if (!response.ok) {
        throw new Error('Errore nell\'invio dell\'email');
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
        message: ""
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
    setFormData({ ...formData, [e.target.name]: e.target.value });
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
            
            <div>
              <Label htmlFor="message">Messaggio</Label>
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