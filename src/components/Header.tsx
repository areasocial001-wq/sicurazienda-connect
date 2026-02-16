import { useState } from "react";
import { useNavigate } from "react-router-dom";
import logoImg from "@/assets/sicurazienda-logo-optimized.png";
import headerBg from "@/assets/header-background.jpg";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import AuthModal from "@/components/AuthModal";
import { NotificationBell } from "@/components/NotificationBell";
import { User, LogOut, FileText, QrCode, BookOpen, Users, StickyNote } from "lucide-react";

const Header = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [showAuthModal, setShowAuthModal] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <header 
      className="relative text-primary-foreground shadow-lg bg-cover bg-center bg-no-repeat"
      style={{ backgroundImage: `url(${headerBg})` }}
    >
      <div className="container mx-auto px-4 py-6 flex items-center justify-between relative z-10">
        <div className="flex-1" />
        
        <img 
          src={logoImg} 
          alt="SicurAzienda - l'azione di tanti per la sicurezza di tutti" 
          className="h-48 object-contain cursor-pointer"
          onClick={() => navigate("/")}
        />
        
        <div className="flex-1 flex justify-end items-center gap-2">
          {user && (
            <div className="bg-background/80 rounded-full">
              <NotificationBell />
            </div>
          )}
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="outline" 
                  size="icon"
                  className="rounded-full bg-background/80 hover:bg-background"
                >
                  <User className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 bg-background">
                <DropdownMenuItem onClick={() => navigate("/profile")} className="cursor-pointer">
                  <User className="h-4 w-4 mr-2" />
                  Profilo
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/profile")} className="cursor-pointer">
                  <FileText className="h-4 w-4 mr-2" />
                  Le mie bozze
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/crm")} className="cursor-pointer">
                  <Users className="h-4 w-4 mr-2" />
                  CRM Contatti
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/notes")} className="cursor-pointer">
                  <StickyNote className="h-4 w-4 mr-2" />
                  Le mie Note
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/qr-history")} className="cursor-pointer">
                  <QrCode className="h-4 w-4 mr-2" />
                  Cronologia QR
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/documentazione")} className="cursor-pointer">
                  <BookOpen className="h-4 w-4 mr-2" />
                  Documentazione App
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer text-destructive">
                  <LogOut className="h-4 w-4 mr-2" />
                  Esci
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button 
              variant="outline"
              size="sm"
              onClick={() => setShowAuthModal(true)}
              className="bg-background/80 hover:bg-background"
            >
              Accedi
            </Button>
          )}
        </div>
      </div>

      <AuthModal open={showAuthModal} onOpenChange={setShowAuthModal} />
    </header>
  );
};

export default Header;
