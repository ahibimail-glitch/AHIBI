"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowRight, LucideIcon } from "lucide-react";

interface TicketCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  price?: string;
  buttonText?: string;
  onClick?: () => void;
  delay?: number;
  highlight?: boolean;
  features?: string[];
}

const TicketCard = ({ 
  icon: Icon, 
  title, 
  description, 
  price, 
  buttonText = "View Details",
  onClick,
  delay = 0,
  highlight = false,
  features
}: TicketCardProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      whileHover={{ y: -12, scale: 1.02 }}
      className={`gradient-card rounded-2xl p-8 transition-all duration-300 border relative overflow-hidden group ${
        highlight 
          ? "border-primary/50 shadow-premium" 
          : "border-border/30 shadow-card hover:shadow-hover hover:border-primary/30"
      }`}
    >
      {highlight && (
        <div className="absolute top-0 right-0 bg-gradient-to-l from-primary to-secondary text-white px-4 py-1.5 rounded-bl-2xl text-xs font-bold">
          POPULAR
        </div>
      )}
      
      <div className="absolute inset-0 gradient-premium opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      
      <div className="relative">
        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-6 transition-all duration-300 ${
          highlight 
            ? "gradient-hero shadow-glow" 
            : "bg-muted/50 group-hover:gradient-hero group-hover:shadow-glow"
        }`}>
          <Icon className="w-8 h-8 text-white" />
        </div>
        
        <h3 className="text-2xl font-bold mb-3 text-foreground">{title}</h3>
        
        {price && (
          <div className="mb-5">
            <span className="text-4xl font-black bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">{price}</span>
            <span className="text-muted-foreground ml-2 text-sm">/person</span>
          </div>
        )}
        
        <p className="text-muted-foreground mb-6 text-sm leading-relaxed">{description}</p>
        
        {features && features.length > 0 && (
          <ul className="space-y-3 mb-8">
            {features.map((feature, index) => (
              <li key={index} className="flex items-start space-x-3 text-sm text-muted-foreground">
                <span className="text-accent text-lg mt-0.5 font-bold">✓</span>
                <span className="leading-relaxed">{feature}</span>
              </li>
            ))}
          </ul>
        )}
        
        {onClick && (
          <Button 
            onClick={onClick}
            className={`w-full rounded-xl font-bold text-base py-6 transition-all duration-300 group/btn ${
              highlight
                ? "gradient-hero shadow-glow hover:shadow-premium"
                : "bg-muted/50 hover:gradient-hero text-foreground hover:text-white hover:shadow-glow"
            }`}
          >
            {buttonText}
            <ArrowRight className="ml-2 w-5 h-5 group-hover/btn:translate-x-2 transition-transform duration-300" />
          </Button>
        )}
        {!onClick && (
          <div className={`w-full rounded-xl font-bold text-base py-6 transition-all duration-300 text-center flex items-center justify-center ${
            highlight
              ? "gradient-hero shadow-glow text-white"
              : "bg-muted/50 hover:gradient-hero text-foreground hover:text-white hover:shadow-glow"
          }`}>
            {buttonText}
            <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-2 transition-transform duration-300" />
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default TicketCard;
