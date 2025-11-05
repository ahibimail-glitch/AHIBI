"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Users, Globe, MapPin } from "lucide-react";
import { useRouter } from "next/navigation";
import Navbar from "../../Navbar";
import Footer from "../../Footer";
import HeroBanner from "../components/HeroBanner";
import DaySelector from "../components/DaySelector";
import TicketCard from "../components/TicketCard";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const DailyPass = () => {
  const router = useRouter();
  const [selectedDay, setSelectedDay] = useState(1);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const categories = [
    {
      icon: Users,
      title: "Local",
      price: "₹50",
      description: "Valid for single-day access for residents of Nagaland",
      features: [
        "Access to cultural programs",
        "Entry to Naga morungs",
        "Visit craft bazaar",
        "Day-long Heritage Village access"
      ]
    },
    {
      icon: MapPin,
      title: "Domestic (India)",
      price: "₹150",
      description: "Valid for single-day access for Indian residents",
      features: [
        "All Local benefits",
        "Access to food stalls",
        "Entry to handicraft exhibitions",
        "Cultural workshop participation"
      ],
      highlight: true
    },
    {
      icon: Globe,
      title: "International",
      price: "₹200",
      description: "Valid for single-day access for international visitors",
      features: [
        "All Domestic benefits",
        "Priority entry lanes",
        "Complimentary festival guide",
        "Souvenir badge"
      ]
    }
  ];

  const handleBooking = () => {
    if (!selectedCategory) {
      toast.error("Please select a ticket category");
      return;
    }
    
    const category = categories.find(c => c.title === selectedCategory);
    if (!category) return;
    
    router.push(`/HornbillFestival2025/booking?type=Daily Pass&category=${selectedCategory}&price=${category.price}&day=${selectedDay}`);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      
      <main className="flex-1">
        <HeroBanner
          image="/images/hero-daily.jpg"
          title="Hornbill Festival"
          subtitle="Daily Pass"
        />

        <section className="py-12 md:py-16 container mx-auto px-4 sm:px-6">
          <DaySelector
            selectedDay={selectedDay}
            onSelectDay={setSelectedDay}
          />

          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-3xl font-bold mb-8 text-center text-foreground"
          >
            Select Your Ticket Category
          </motion.h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
            {categories.map((category, index) => (
              <div
                key={index}
                onClick={() => setSelectedCategory(category.title)}
                className="cursor-pointer"
              >
                <TicketCard
                  icon={category.icon}
                  title={category.title}
                  price={category.price}
                  description={category.description}
                  features={category.features}
                  buttonText={selectedCategory === category.title ? "Selected" : "Select"}
                  delay={index * 0.1}
                  highlight={category.highlight || selectedCategory === category.title}
                />
              </div>
            ))}
          </div>

          <div className="bg-gradient-to-br from-primary/5 to-secondary/5 rounded-2xl p-6 md:p-8 mb-8 gradient-card border border-border/30 shadow-card">
            <h3 className="text-2xl font-bold mb-4 text-foreground flex items-center gap-3">
              <span className="w-2 h-8 gradient-hero rounded-full" />
              Pass Benefits
            </h3>
            <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                "Access to cultural programs and traditional performances",
                "Entry to all Naga morungs (traditional houses)",
                "Visit craft bazaar and local artisan stalls",
                "Access to food & traditional cuisine stalls",
                "Day-long access to Kisama Heritage Village",
                "Participation in interactive cultural activities"
              ].map((benefit, index) => (
                <motion.li
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-start space-x-3"
                >
                  <span className="text-accent text-2xl mt-0.5">✓</span>
                  <span className="text-muted-foreground leading-relaxed">{benefit}</span>
                </motion.li>
              ))}
            </ul>
          </div>

          {selectedCategory && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="fixed bottom-0 left-0 right-0 glass-effect border-t border-border/50 p-6 shadow-premium z-40"
            >
              <div className="container mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Selected:</p>
                  <p className="text-lg font-bold text-foreground">
                    Day {selectedDay} - {selectedCategory}
                  </p>
                </div>
                <Button 
                  onClick={handleBooking}
                  size="lg"
                  className="gradient-hero text-white hover:shadow-premium transition-all duration-300 px-8 py-6 text-lg font-bold rounded-xl shadow-glow w-full sm:w-auto"
                >
                  Book Now →
                </Button>
              </div>
            </motion.div>
          )}
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default DailyPass;
