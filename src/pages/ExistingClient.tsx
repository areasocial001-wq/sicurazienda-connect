import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";
import ServiceCard from "@/components/ServiceCard";
import { useNavigate } from "react-router-dom";
import { 
  Search,
  Headphones,
  UserPlus,
  GraduationCap,
  Coins
} from "lucide-react";

const ExistingClient = () => {
  const navigate = useNavigate();

  const services = [
    {
      id: "inspection",
      title: "Per Ispezione",
      description: "Richiesta nuova ispezione aziendale",
      icon: Search
    },
    {
      id: "assistance",
      title: "Per Assistenza",
      description: "Supporto tecnico e consulenza continua",
      icon: Headphones
    },
    {
      id: "neo-hiring",
      title: "Per Neo Inserimento",
      description: "Gestione nuove assunzioni",
      icon: UserPlus,
      variant: "secondary" as const
    },
    {
      id: "training",
      title: "Per Corsi",
      description: "Formazione e aggiornamenti",
      icon: GraduationCap
    },
    {
      id: "funding",
      title: "Per Fondi",
      description: "Nuovi finanziamenti e contributi",
      icon: Coins
    }
  ];

  const handleServiceClick = (service: typeof services[0]) => {
    navigate("/contact-request", { 
      state: { 
        title: "Richiesta Contatto - Già Cliente",
        serviceType: service.title,
        clientType: "existing"
      } 
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto p-4 pb-20">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold mb-2">Già Cliente</h2>
          <p className="text-muted-foreground">
            Seleziona il tipo di assistenza richiesta
          </p>
        </div>

        <div className="space-y-3">
          {services.map((service) => (
            <ServiceCard
              key={service.id}
              title={service.title}
              description={service.description}
              icon={service.icon}
              onClick={() => handleServiceClick(service)}
              variant={service.variant}
            />
          ))}
        </div>
      </main>
      
      <BottomNav />
    </div>
  );
};

export default ExistingClient;