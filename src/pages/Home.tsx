import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";
import ServiceCard from "@/components/ServiceCard";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import heroBackground from "@/assets/hero-background.jpg";
import { 
  UserPlus, 
  Users, 
  FileCheck, 
  Shield, 
  Phone, 
  Mail,
  MapPin,
  Clock
} from "lucide-react";

const Home = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto p-4 pb-20">
        {/* Hero Section */}
        <Card className="mb-6 gradient-sicur text-white relative overflow-hidden">
          <div 
            className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-20"
            style={{ backgroundImage: `url(${heroBackground})` }}
          />
          <CardContent className="relative z-10 p-6 text-center">
            <Shield className="h-16 w-16 mx-auto mb-4 opacity-90" />
            <h2 className="text-2xl font-bold mb-2">Sicurezza sul Lavoro</h2>
            <p className="text-lg opacity-90 mb-4">
              Consulenza specializzata per la tua azienda
            </p>
            <Button 
              onClick={() => navigate("/new-client")}
              variant="secondary"
              className="bg-white text-primary hover:bg-white/90"
            >
              Richiedi Check-up Gratuito
            </Button>
          </CardContent>
        </Card>

        {/* Services Grid */}
        <div className="space-y-4 mb-6">
          <h3 className="text-xl font-semibold text-center mb-4">I nostri servizi</h3>
          
          <ServiceCard
            title="Nuovo Cliente"
            description="Check-up gratuito e consulenza iniziale"
            icon={UserPlus}
            onClick={() => navigate("/new-client")}
          />
          
          <ServiceCard
            title="Già Cliente"
            description="Assistenza e supporto continuo"
            icon={Users}
            onClick={() => navigate("/existing-client")}
          />
          
          <ServiceCard
            title="Area Documenti"
            description="Gestione documenti riservata"
            icon={FileCheck}
            onClick={() => navigate("/documents")}
          />
        </div>

        {/* Quick Contact */}
        <Card className="mb-4">
          <CardContent className="p-4">
            <h4 className="font-semibold mb-3 flex items-center gap-2">
              <Phone className="h-4 w-4" />
              Contatti Rapidi
            </h4>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span>info@sicurazienda.com</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span>+39 011 123 4567</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span>Lun-Ven 8:30-17:30</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
      
      <BottomNav />
    </div>
  );
};

export default Home;