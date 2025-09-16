import logoImg from "@/assets/sicurazienda-logo.png";

const Header = () => {
  return (
    <header className="bg-primary text-primary-foreground shadow-lg">
      <div className="container mx-auto px-4 py-4 flex items-center justify-center">
        <img 
          src={logoImg} 
          alt="SicurAzienda - l'azione di tanti per la sicurezza di tutti" 
          className="h-16 object-contain"
        />
      </div>
    </header>
  );
};

export default Header;