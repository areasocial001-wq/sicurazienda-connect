import logoImg from "@/assets/sicurazienda-logo-optimized.png";
import headerBg from "@/assets/header-background.jpg";

const Header = () => {
  return (
    <header 
      className="relative text-primary-foreground shadow-lg bg-cover bg-center bg-no-repeat"
      style={{ backgroundImage: `url(${headerBg})` }}
    >
      <div className="container mx-auto px-4 py-6 flex items-center justify-center relative z-10">
        <img 
          src={logoImg} 
          alt="SicurAzienda - l'azione di tanti per la sicurezza di tutti" 
          className="h-48 object-contain"
        />
      </div>
    </header>
  );
};

export default Header;