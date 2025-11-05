"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Music, Users2, Star } from "lucide-react";
import { useRouter } from "next/navigation";
import Navbar from "../../Navbar";
import Footer from "../../Footer";
import HeroBanner from "../components/HeroBanner";
import DaySelector from "../components/DaySelector";
import TicketCard from "../components/TicketCard";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const MusicFestival = () => {
  const router = useRouter();
  const [selectedDay, setSelectedDay] = useState(1);
  const [selectedTicket, setSelectedTicket] = useState<string | null>(null);
  const [ticketType, setTicketType] = useState<"normal" | "highProfile" | "festivalPass">("normal");

  const normalDayTickets = [
    {
      icon: Users2,
      title: "General (Standing)",
      price: "₹100",
      description: "Standing area with direct crowd energy and stage view",
      features: [
        "Standing area access",
        "Front crowd energy",
        "Access to food courts",
        "Festival merchandise access"
      ]
    },
    {
      icon: Music,
      title: "Gallery (Seated)",
      price: "₹200",
      description: "Comfortable seated area with elevated stage view",
      features: [
        "Comfortable seating",
        "Elevated stage view",
        "Priority food court entry",
        "Dedicated rest areas"
      ],
      highlight: true
    }
  ];

  const highProfileTickets = [
    {
      icon: Users2,
      title: "General (Standing)",
      price: "₹200",
      description: "Standing area for high-profile artist performances",
      features: [
        "Standing area access",
        "Premium sound experience",
        "Extended show hours",
        "Special merchandise booth"
      ]
    },
    {
      icon: Music,
      title: "Gallery (Seated)",
      price: "₹300",
      description: "Premium seated area for high-profile concerts",
      features: [
        "Premium seating",
        "Best stage visibility",
        "Exclusive entry lanes",
        "VIP food court access"
      ],
      highlight: true
    }
  ];

  const festivalPasses = [
    {
      icon: Users2,
      title: "8-Day General Pass",
      price: "₹1,000",
      description: "Standing access for all 8 nights of the music festival",
      features: [
        "All 8 nights standing access",
        "Discounted food & beverages",
        "Priority re-entry",
        "Festival merchandise discount"
      ]
    },
    {
      icon: Star,
      title: "8-Day Gallery Pass",
      price: "₹1,800",
      description: "Seated access for all 8 nights with VIP benefits",
      features: [
        "All 8 nights seated access",
        "VIP lounge access",
        "Complimentary beverage vouchers",
        "After-party zone entry",
        "Exclusive merchandise package"
      ],
      highlight: true
    }
  ];

  const getCurrentTickets = () => {
    if (ticketType === "festivalPass") return festivalPasses;
    if (ticketType === "highProfile") return highProfileTickets;
    return normalDayTickets;
  };

  const handleBooking = () => {
    if (!selectedTicket) {
      toast.error("Please select a ticket");
      return;
    }

    const currentTickets = getCurrentTickets();
    const ticket = currentTickets.find(t => t.title === selectedTicket);
    if (!ticket) return;

    const ticketTypeName = ticketType === "festivalPass"
      ? "8-Day Festival Pass"
      : ticketType === "highProfile"
        ? "High-Profile Artist Day"
        : "Normal Day";

    const params = new URLSearchParams({
      type: "Music Festival",
      category: selectedTicket,
      price: ticket.price,
      ticketType: ticketTypeName,
    });

    if (ticketType !== "festivalPass") {
      params.append("day", selectedDay.toString());
    }

    router.push(`/HornbillFestival2025/booking?${params.toString()}`);
  };

  return (
    <div className="min-h-screen flex flex-col">

      <Navbar />
      <main className="flex-1">
        <HeroBanner
          image="/images/hero-music.jpg"
          title="Hornbill Music Festival"
          subtitle="Eight Nights of Live Music"
        />

        <section className="py-12 md:py-16 container mx-auto px-4 sm:px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-10"
          >
            <h3 className="text-2xl font-bold mb-6 text-center text-foreground flex items-center justify-center gap-3">
              <span className="w-2 h-8 gradient-hero rounded-full" />
              Ticket Type
              <span className="w-2 h-8 gradient-hero rounded-full" />
            </h3>
            <div className="flex flex-wrap justify-center gap-4">
              <Button
                onClick={() => setTicketType("normal")}
                variant={ticketType === "normal" ? "default" : "outline"}
                size="lg"
                className={`rounded-xl px-8 py-6 text-base font-bold transition-all duration-300 ${ticketType === "normal"
                  ? "gradient-hero text-white shadow-glow"
                  : "border-border/30 hover:border-primary/50"
                  }`}
              >
                Normal Days
              </Button>
              <Button
                onClick={() => setTicketType("highProfile")}
                variant={ticketType === "highProfile" ? "default" : "outline"}
                size="lg"
                className={`rounded-xl px-8 py-6 text-base font-bold transition-all duration-300 ${ticketType === "highProfile"
                  ? "bg-gradient-to-r from-secondary to-accent text-white shadow-glow"
                  : "border-border/30 hover:border-secondary/50"
                  }`}
              >
                High-Profile Artists
              </Button>
              <Button
                onClick={() => setTicketType("festivalPass")}
                variant={ticketType === "festivalPass" ? "default" : "outline"}
                size="lg"
                className={`rounded-xl px-8 py-6 text-base font-bold transition-all duration-300 ${ticketType === "festivalPass"
                  ? "bg-gradient-to-r from-accent to-primary text-white shadow-glow"
                  : "border-border/30 hover:border-accent/50"
                  }`}
              >
                8-Day Festival Pass
              </Button>
            </div>
          </motion.div>

          {ticketType !== "festivalPass" && (
            <DaySelector
              selectedDay={selectedDay}
              onSelectDay={setSelectedDay}
              totalDays={8}
            />
          )}

          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-3xl font-bold mb-8 text-center text-foreground"
          >
            {ticketType === "festivalPass" ? "Festival Pass Options" : "Select Your Ticket"}
          </motion.h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12 max-w-4xl mx-auto">
            {getCurrentTickets().map((ticket, index) => (
              <div
                key={index}
                onClick={() => setSelectedTicket(ticket.title)}
                className="cursor-pointer"
              >
                <TicketCard
                  icon={ticket.icon}
                  title={ticket.title}
                  price={ticket.price}
                  description={ticket.description}
                  features={ticket.features}
                  buttonText={selectedTicket === ticket.title ? "Selected" : "Select"}
                  delay={index * 0.1}
                  highlight={ticket.highlight || selectedTicket === ticket.title}
                />
              </div>
            ))}
          </div>

          <div className="bg-gradient-to-br from-primary/5 to-secondary/5 rounded-2xl p-6 md:p-8 mb-8 gradient-card border border-border/30 shadow-card">
            <h3 className="text-2xl font-bold mb-6 text-foreground flex items-center gap-3">
              <span className="w-2 h-8 gradient-hero rounded-full" />
              Music Festival Benefits
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                "Access to live performances by top artists",
                "DJ nights and electronic music shows",
                "Dedicated food courts with diverse cuisines",
                "Festival merchandise and band merchandise booths",
                "After-party zone access (with applicable passes)",
                "Special discounts for Festival Pass holders"
              ].map((benefit, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-start space-x-3"
                >
                  <span className="text-accent text-2xl mt-0.5">♪</span>
                  <span className="text-muted-foreground leading-relaxed">{benefit}</span>
                </motion.div>
              ))}
            </div>
          </div>

          {selectedTicket && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="fixed bottom-0 left-0 right-0 glass-effect border-t border-border/50 p-6 shadow-premium z-40"
            >
              <div className="container mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Selected:</p>
                  <p className="text-lg font-bold text-foreground">
                    {ticketType === "festivalPass" ? selectedTicket : `Day ${selectedDay} - ${selectedTicket}`}
                  </p>
                </div>
                <Button
                  onClick={handleBooking}
                  size="lg"
                  className="gradient-hero text-white hover:shadow-premium transition-all duration-300 px-8 py-6 text-lg font-bold rounded-xl shadow-glow w-full sm:w-auto"
                >
                  Book Music Pass →
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

export default MusicFestival;
