import logoImg from "@/assets/sicurazienda-logo.png";

const Header = () => {
  return (
    <header className="bg-primary text-primary-foreground shadow-lg">
      <div className="container mx-auto px-4 py-4 flex items-center justify-center">
        <div className="flex items-center space-x-3">
          <img 
            src={logoImg} 
            alt="SicurAzienda Logo" 
            className="h-12 w-12 object-contain"
          />
          <div className="text-center">
            <h1 className="text-2xl font-bold">SicurAzienda</h1>
            <p className="text-sm opacity-90">l'azione di tanti per la sicurezza di tutti</p>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;