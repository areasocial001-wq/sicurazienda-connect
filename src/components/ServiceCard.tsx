import { Card, CardContent } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";

interface ServiceCardProps {
  title: string;
  description: string;
  icon: LucideIcon;
  onClick: () => void;
  variant?: "primary" | "secondary";
}

const ServiceCard = ({ title, description, icon: Icon, onClick, variant = "primary" }: ServiceCardProps) => {
  return (
    <Card 
      className={`cursor-pointer transition-all hover:scale-105 hover:shadow-lg ${
        variant === "secondary" ? "bg-secondary text-secondary-foreground" : "hover:bg-accent"
      }`}
      onClick={onClick}
    >
      <CardContent className="p-6">
        <div className="flex items-center space-x-4">
          <div className={`p-3 rounded-full ${
            variant === "secondary" ? "bg-secondary-foreground/20" : "bg-primary/20"
          }`}>
            <Icon className="h-6 w-6" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-lg">{title}</h3>
            <p className="text-sm opacity-80">{description}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ServiceCard;