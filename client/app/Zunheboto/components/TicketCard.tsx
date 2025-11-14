import { Check } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface TicketCardProps {
  title: string;
  price: number;
  originalPrice?: number;
  admitCount: number;
  validity: string;
  perks: string[];
  isSelected?: boolean;
  onSelect?: () => void;
}

export const TicketCard = ({
  title,
  price,
  originalPrice,
  admitCount,
  validity,
  perks,
  isSelected = false,
  onSelect,
}: TicketCardProps) => {
  const hasDiscount = originalPrice && originalPrice > price;

  return (
    <Card
      className={cn(
        "relative overflow-hidden transition-all duration-300 cursor-pointer",
        "bg-card hover:shadow-[var(--shadow-card-hover)] shadow-[var(--shadow-card)]",
        "border-2 rounded-[var(--radius)]",
        isSelected
          ? "border-primary shadow-[var(--shadow-glow)] scale-[1.02]"
          : "border-border hover:border-primary/30"
      )}
      onClick={onSelect}
    >
      {hasDiscount && (
        <div className="absolute top-4 right-4">
          <Badge className="bg-primary text-primary-foreground font-semibold">
            Save ₹{originalPrice - price}
          </Badge>
        </div>
      )}

      <div className="p-6 space-y-4">
        <div>
          <h3 className="text-2xl font-bold text-foreground mb-2">{title}</h3>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-bold text-primary">₹{price.toLocaleString()}</span>
            {hasDiscount && (
              <span className="text-lg text-muted-foreground line-through">
                ₹{originalPrice.toLocaleString()}
              </span>
            )}
          </div>
        </div>

        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2 text-foreground">
            <span className="font-semibold">Admit:</span>
            <span>{admitCount} {admitCount === 1 ? "person" : "people"}</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <span className="font-semibold">Validity:</span>
            <span>{validity}</span>
          </div>
        </div>

        <div className="pt-4 border-t border-border">
          <h4 className="font-semibold text-foreground mb-3">What's included:</h4>
          <ul className="space-y-2">
            {perks.map((perk, index) => (
              <li key={index} className="flex items-start gap-2 text-sm text-foreground">
                <Check className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                <span>{perk}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {isSelected && (
        <div className="absolute inset-0 border-2 border-primary rounded-[var(--radius)] pointer-events-none" />
      )}
    </Card>
  );
};
