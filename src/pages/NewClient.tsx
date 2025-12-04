import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";
import ServiceCard from "@/components/ServiceCard";
import { useNavigate } from "react-router-dom";
import { 
  CheckCircle,
  Search,
  Headphones,
  GraduationCap,
  FileText,
  Coins,
  MoreHorizontal,
  UserMinus
} from "lucide-react";

const NewClient = () => {
  const navigate = useNavigate();

  const services = [
    {
      id: "checkup",
      title: "Check-up Gratuito",
      description: "Analisi completa della situazione aziendale",
      icon: CheckCircle,
      variant: "secondary" as const
    },
    {
      id: "inspection",
      title: "Per Ispezione",
      description: "Richiesta ispezione e sopralluogo",
      icon: Search
    },
    {
      id: "assistance",
      title: "Assistenza",
      description: "Supporto tecnico e consulenza",
      icon: Headphones
    },
    {
      id: "end-of-work",
      title: "Rapporto di Fine Lavoro",
      description: "Gestione cessazione rapporti di lavoro",
      icon: UserMinus,
      variant: "secondary" as const
    },
    {
      id: "training",
      title: "Per Corsi",
      description: "Formazione e certificazioni",
      icon: GraduationCap
    },
    {
      id: "documents",
      title: "Per Documenti",
      description: "Gestione documentazione aziendale",
      icon: FileText
    },
    {
      id: "funding",
      title: "Per Fondi",
      description: "Accesso a finanziamenti e contributi",
      icon: Coins
    },
    {
      id: "other",
      title: "Altro",
      description: "Altri servizi personalizzati",
      icon: MoreHorizontal
    }
  ];

  const handleServiceClick = (service: typeof services[0]) => {
    navigate("/contact-request", { 
      state: { 
        title: "Richiesta Contatto - Nuovo Cliente",
        serviceType: service.title,
        clientType: "new"
      } 
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto p-4 pb-20">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold mb-2">Nuovo Cliente</h2>
          <p className="text-muted-foreground">
            Scegli il servizio di cui hai bisogno
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

export default NewClient;