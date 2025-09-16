import { useLocation } from "react-router-dom";
import ContactForm from "@/components/ContactForm";
import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";

const ContactRequest = () => {
  const location = useLocation();
  const { title = "Richiesta Contatto", serviceType = "Servizio", clientType = "new" } = location.state || {};

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <ContactForm title={title} serviceType={serviceType} clientType={clientType} />
      <BottomNav />
    </div>
  );
};

export default ContactRequest;