import { Card, CardContent } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";

interface ServiceCardProps {
  title: string;
  description: string;
  icon: LucideIcon;
  onClick: () => void;
  variant?: "primary" | "secondary" | "success";
}

const ServiceCard = ({ title, description, icon: Icon, onClick, variant = "primary" }: ServiceCardProps) => {
  const getVariantClasses = () => {
    switch (variant) {
      case "secondary":
        return "bg-secondary text-secondary-foreground";
      case "success":
        return "bg-green-600 text-white";
      default:
        return "hover:bg-accent";
    }
  };

  const getIconClasses = () => {
    switch (variant) {
      case "secondary":
        return "bg-secondary-foreground/20";
      case "success":
        return "bg-white/20";
      default:
        return "bg-primary/20";
    }
  };

  return (
    <Card 
      className={`cursor-pointer transition-all hover:scale-105 hover:shadow-lg ${getVariantClasses()}`}
      onClick={onClick}
    >
      <CardContent className="p-6">
        <div className="flex items-center space-x-4">
          <div className={`p-3 rounded-full ${getIconClasses()}`}>
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