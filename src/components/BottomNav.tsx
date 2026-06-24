import { Home, UserPlus, Users, FileText, FolderOpen, Contact, GraduationCap, Briefcase } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useUserRole } from "@/hooks/useUserRole";
import { useAuth } from "@/hooks/useAuth";

const BottomNav = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { isAdmin, isAreaAziendale, isGestioneCorsi, loading: roleLoading } = useUserRole();

  // Determine which CRM/document route to show based on role
  const getCRMNavItem = () => {
    // If not logged in or still loading, show generic CRM
    if (!user || roleLoading) {
      return { path: "/crm", label: "CRM", icon: Contact };
    }
    
    // Admin and business area users see the full CRM
    if (isAdmin || isAreaAziendale) {
      return { path: "/crm", label: "CRM", icon: Contact };
    }
    
    // Regular users (clients) see their personal document drawer
    return { path: "/my-documents", label: "I Miei Doc", icon: FolderOpen };
  };

  const navItems = [
    { path: "/", label: "Home", icon: Home },
    { path: "/new-client", label: "Nuovo Cliente", icon: UserPlus },
    { path: "/existing-client", label: "Già Cliente", icon: Users },
    getCRMNavItem(),
    // Show Corsi link for gestione_corsi, admin, and all business area users
    ...((isAdmin || isAreaAziendale) ? [{ path: "/corsi", label: "Corsi", icon: GraduationCap }] : []),
    ...((isAdmin || isAreaAziendale) ? [{ path: "/area-lavoratori", label: "Lavoratori", icon: Briefcase }] : []),
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-border">
      <div className="container mx-auto px-2">
        <div className="flex items-center justify-around py-2">
          {navItems.map(({ path, label, icon: Icon }) => (
            <button
              key={path}
              onClick={() => navigate(path)}
              className={cn(
                "flex flex-col items-center py-2 px-3 rounded-lg transition-colors min-w-0 flex-1 max-w-20",
                location.pathname === path
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className="h-5 w-5 mb-1" />
              <span className="text-xs font-medium truncate">{label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default BottomNav;
