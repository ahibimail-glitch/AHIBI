"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Users, Globe, MapPin, Star } from "lucide-react";
import { useRouter } from "next/navigation";
import Navbar from "../../Navbar";
import Footer from "../../Footer";
import HeroBanner from "../components/HeroBanner";
import TicketCard from "../components/TicketCard";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const FestivalPass = () => {
  const router = useRouter();
  const [selectedPass, setSelectedPass] = useState<string | null>(null);

  const passes = [
    {
      icon: Users,
      title: "Local",
      price: "₹500",
      description: "10-day unlimited access for residents of Nagaland",
      features: [
        "10-day unlimited Heritage Village access",
        "VIP entry to opening & closing ceremonies",
        "Reserved seating at cultural events",
        "Festival merchandise discount"
      ]
    },
    {
      icon: MapPin,
      title: "Domestic (India)",
      price: "₹1,500",
      description: "10-day unlimited access for Indian residents",
      features: [
        "All Local benefits",
        "Priority entry to all events",
        "Complimentary festival kit",
        "Access to exclusive cultural workshops",
        "10% discount at food stalls"
      ],
      highlight: true
    },
    {
      icon: Globe,
      title: "International",
      price: "₹2,000",
      description: "10-day unlimited access for international visitors",
      features: [
        "All Domestic benefits",
        "Personal festival guide",
        "VIP lounge access",
        "Premium souvenir package",
        "Priority parking"
      ]
    }
  ];

  const handleBooking = () => {
    if (!selectedPass) {
      toast.error("Please select a festival pass");
      return;
    }
    
    const pass = passes.find(p => p.title === selectedPass);
    if (!pass) return;
    
    router.push(`/HornbillFestival2025/booking?type=10 Day Pass&category=${selectedPass}&price=${pass.price}`);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      
      <main className="flex-1">
        <HeroBanner
          image="/images/hero-daily.jpg"
          title="Hornbill Festival"
          subtitle="10-Day Festival Pass"
        />

        <section className="py-12 md:py-16 container mx-auto px-4 sm:px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-12"
          >
            <div className="inline-flex items-center space-x-2 bg-primary/10 text-primary px-4 py-2 rounded-full mb-4">
              <Star className="w-5 h-5" />
              <span className="font-semibold">Best Value</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-foreground">
              Festival Pass Options
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Get unlimited access to all 10 days of the Hornbill Festival with exclusive benefits
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
            {passes.map((pass, index) => (
              <div
                key={index}
                onClick={() => setSelectedPass(pass.title)}
                className="cursor-pointer"
              >
                <TicketCard
                  icon={pass.icon}
                  title={pass.title}
                  price={pass.price}
                  description={pass.description}
                  features={pass.features}
                  buttonText={selectedPass === pass.title ? "Selected" : "Select Pass"}
                  delay={index * 0.1}
                  highlight={pass.highlight || selectedPass === pass.title}
                />
              </div>
            ))}
          </div>

          <div className="bg-gradient-to-br from-primary/5 to-secondary/5 rounded-2xl p-8 md:p-12 mb-8 gradient-card border border-border/30 shadow-card">
            <h3 className="text-3xl font-bold mb-8 text-center text-foreground flex items-center justify-center gap-3">
              <span className="w-2 h-10 gradient-hero rounded-full" />
              Exclusive Benefits
              <span className="w-2 h-10 gradient-hero rounded-full" />
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[
                {
                  title: "VIP Access",
                  description: "Priority entry to opening & closing ceremonies with reserved seating"
                },
                {
                  title: "Unlimited Entry",
                  description: "10-day unlimited access to Kisama Heritage Village"
                },
                {
                  title: "Premium Seating",
                  description: "Reserved seats at all major cultural events and performances"
                },
                {
                  title: "Exclusive Workshops",
                  description: "Participate in traditional craft and cultural workshops"
                },
                {
                  title: "Merchandise Discounts",
                  description: "Special discounts at official festival merchandise stalls"
                },
                {
                  title: "Skip the Lines",
                  description: "Fast-track entry lanes for all festival venues"
                }
              ].map((benefit, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-card rounded-xl p-6 shadow-card"
                >
                  <h4 className="font-semibold text-lg mb-2 text-foreground">{benefit.title}</h4>
                  <p className="text-muted-foreground">{benefit.description}</p>
                </motion.div>
              ))}
            </div>
          </div>

          {selectedPass && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="fixed bottom-0 left-0 right-0 glass-effect border-t border-border/50 p-6 shadow-premium z-40"
            >
              <div className="container mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Selected:</p>
                  <p className="text-lg font-bold text-foreground">
                    {selectedPass} - 10 Day Festival Pass
                  </p>
                </div>
                <Button 
                  onClick={handleBooking}
                  size="lg"
                  className="gradient-hero text-white hover:shadow-premium transition-all duration-300 px-8 py-6 text-lg font-bold rounded-xl shadow-glow w-full sm:w-auto"
                >
                  Book Festival Pass →
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

export default FestivalPass;
