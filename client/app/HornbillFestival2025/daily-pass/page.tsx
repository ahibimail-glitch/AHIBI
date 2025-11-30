"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Music, Users2, Star } from "lucide-react";
import { useRouter } from "next/navigation";
import Navbar from "../../Navbar";
import Footer from "../../Footer";
import HeroBanner from "../components/HeroBanner";
import TicketCard from "../components/TicketCard";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import DaySelectorHF from "../components/DayselectorHornbill";



const MusicFestival = () => {
  const router = useRouter();
  const [selectedDay, setSelectedDay] = useState(1);
  const [selectedTicket, setSelectedTicket] = useState<string | null>(null);
  const [ticketType, setTicketType] = useState<"normal" | "highProfile" | "festivalPass">("normal");
  const [acceptedTerms, setAcceptedTerms] = useState({
    musicFestival: false,
    hornbillFestival: false
  });

 
  const daytoIdMap = {
    1:"/events/6927f5532cd1c48b94f5bd94",
    2: "/events/6927f5f02cd1c48b94f5be37",
    3: "/events/6927f61d2cd1c48b94f5be3d",
    4: "/events/6927f66e2cd1c48b94f5be88",
    5: "/events/6927f69c2cd1c48b94f5be8c",
    6: "/events/6927f6cf2cd1c48b94f5be91",
    7: "/events/6927f7102cd1c48b94f5bedb",
    8: "/events/6927f73c2cd1c48b94f5bee0",
    9: "/events/6927f7a32cd1c48b94f5bf36",
    10:"/events/6927f7dd2cd1c48b94f5bf3b"
  }
  const freeDays=[0]
  const normalDays=[1,2,3,4,5,6,7,8,9,10]
  const highProfileDays = [6, 7];

  const isDayFree = (day: number) => freeDays.includes(day);
  const isDayNormal = (day: number) => normalDays.includes(day);
  const isDayHighProfile = (day: number) => highProfileDays.includes(day);

  const normalDayTickets = [
    {
      icon: Users2,
      title: "General (Standing)",
      price: "₹150",
      description: "Standing area with direct crowd energy and stage view",
      features: [
        // "Standing area access",
        // "Front crowd energy",
        // "Access to food courts",
        // "Festival merchandise access"
      ],
      highlight: true
    }
  ];

  const highProfileTickets = [
    {
      icon: Users2,
      title: "General (Standing)",
      price: "₹300",
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
      price: "₹400",
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
      title: "10-Day General Pass",
      price: "₹1,350",
      description: "Standing access for all 10 nights of the music festival",
      features: [
        // "All 8 nights standing access",
        // "Discounted food & beverages",
        // "Priority re-entry",
        // "Festival merchandise discount"
      ],
      highlight: true
    }
  ];

  const handleDaySelect = (day: number) => {
    setSelectedDay(day);
    setSelectedTicket(null);

    if (isDayFree(day)) {
      setTicketType("normal");
    } else if (isDayNormal(day)) {
      setTicketType("normal");
    } else if (isDayHighProfile(day)) {
      setTicketType("highProfile");
    }
  };

  const getCurrentTickets = () => {
    if (ticketType === "festivalPass") return festivalPasses;
    if (ticketType === "highProfile") return highProfileTickets;
    return normalDayTickets;
  };

  const handleBooking = () => {
    if (isDayFree(selectedDay)) {
      toast.success("This is a FREE entry day! No booking needed. Just come and enjoy!");
      return;
    }

    if (!selectedTicket) {
      toast.error("Please select a ticket");
      return;
    }

    if (!acceptedTerms.musicFestival || !acceptedTerms.hornbillFestival) {
      toast.error("Please accept both terms and conditions to proceed");
      return;
    }

    const currentTickets = getCurrentTickets();
    const ticket = currentTickets.find(t => t.title === selectedTicket);
    if (!ticket) return;

    const ticketTypeName = ticketType === "festivalPass"
      ? "10-Day Festival Pass"
      : isDayHighProfile(selectedDay)
        ? "High-Profile Artist Day"
        : "Normal Day";

    const params = new URLSearchParams({
      type: "Hornbill Music Festival",
      category: selectedTicket,
      price: ticket.price,
      ticketType: ticketTypeName,
    });

    if (ticketType !== "festivalPass" && selectedDay) {
      params.append('day', selectedDay.toString());
    }

    router.push(`/HornbillFestival2025/booking?${params.toString()}`);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <main className="flex-1">
        <HeroBanner
          image="/images/HF/desktop.jpg"
          title="Hornbill Music Festival"
          subtitle="Eight Nights of Live Music · Free Entry: 1st & 10th December"
        />

        <section className="py-12 md:py-16 container mx-auto px-4 sm:px-6">
          <div className="gradient-card rounded-2xl p-6 md:p-8 shadow-card border border-border/30 mb-10">
            <h3 className="text-2xl font-bold mb-6 text-foreground flex items-center gap-3">
              <span className="w-2 h-8 gradient-hero rounded-full" />
              Choose Ticket Type
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  setTicketType("normal");
                  setSelectedTicket(null);
                }}
                className={`p-6 rounded-xl border-2 transition-all duration-300 ${ticketType !== "festivalPass"
                  ? "gradient-hero text-white border-primary shadow-glow"
                  : "gradient-card text-foreground border-border/30 hover:border-primary/50"
                  }`}
              >
                <h4 className="text-xl font-bold mb-2">Daily Tickets</h4>
                <p className="text-sm opacity-90">Choose a specific day to attend</p>
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  setTicketType("festivalPass");
                  setSelectedTicket(null);
                }}
                className={`p-6 rounded-xl border-2 transition-all duration-300 ${ticketType === "festivalPass"
                  ? "gradient-hero text-white border-primary shadow-glow"
                  : "gradient-card text-foreground border-border/30 hover:border-primary/50"
                  }`}
              >
                <h4 className="text-xl font-bold mb-2">10-Day Festival Pass</h4>
                <p className="text-sm opacity-90">All 10 nights </p>
              </motion.button>
            </div>
          </div>

          {ticketType !== "festivalPass" && (
            <DaySelectorHF
              selectedDay={selectedDay}
              onSelectDay={handleDaySelect}
              totalDays={10}
              freeDays={freeDays}
              normalDays={normalDays}
              highProfileDays={highProfileDays}
            />
          )}

          {ticketType === "festivalPass" && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-10"
            >
              <h3 className="text-2xl font-bold mb-6 text-center text-foreground flex items-center justify-center gap-3">
                <span className="w-2 h-8 gradient-hero rounded-full" />
                8-Day Festival Pass Options
                <span className="w-2 h-8 gradient-hero rounded-full" />
              </h3>
            </motion.div>
          )}

          {isDayFree(selectedDay) && ticketType !== "festivalPass" ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="max-w-2xl mx-auto mb-12"
            >
              <div className="gradient-card rounded-2xl p-8 md:p-12 text-center border-2 border-emerald-400/50 shadow-premium bg-gradient-to-br from-emerald-400/10 via-green-400/10 to-teal-400/10">
                <div className="w-20 h-20 rounded-full bg-gradient-to-r from-emerald-400 via-green-400 to-teal-400 flex items-center justify-center mx-auto mb-6 shadow-glow">
                  <Music className="w-10 h-10 text-white" />
                </div>
                <h3 className="text-3xl font-bold mb-4 text-foreground">
                  🎉 FREE ENTRY DAY! 🎉
                </h3>
                <p className="text-xl text-muted-foreground mb-6 leading-relaxed">
                  Day {selectedDay} is completely FREE! No tickets required - just come and enjoy amazing live music performances!
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                  <div className="gradient-card rounded-xl p-4 border border-border/30">
                    <p className="text-sm text-muted-foreground mb-1">Date</p>
                    <p className="text-lg font-bold text-foreground">
                      {selectedDay === 1 ? "1st December 2024" : "10th December 2024"}
                    </p>
                  </div>
                  <div className="gradient-card rounded-xl p-4 border border-border/30">
                    <p className="text-sm text-muted-foreground mb-1">Entry Fee</p>
                    <p className="text-lg font-bold bg-gradient-to-r from-emerald-400 via-green-400 to-teal-400 bg-clip-text text-transparent">
                      ₹0 - FREE
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          ) : (
            <>
              <motion.h2
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-3xl font-bold mb-8 text-center text-foreground"
              >
                {ticketType === "festivalPass" ? "Select Your Pass" : "Select Your Ticket"}
              </motion.h2>

              <div className=" mb-12 max-w-4xl mx-auto">
                {getCurrentTickets().map((ticket, index) => (
                  <div
                    key={index}
                    onClick={() => {
                      setSelectedTicket(ticket.title);
                      if (ticketType === "festivalPass") {
                        router.push("/events/6927f84d2cd1c48b94f5bf48");
                        return;
                      }
                      const target = (daytoIdMap as Record<number, string>)[selectedDay];
                      if (target) {
                        router.push(target);
                      } else {
                        toast.error("Tickets for this day are not live yet.");
                      }
                    }}
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
            </>
          )}

          <div className="bg-gradient-to-br from-primary/5 to-secondary/5 rounded-2xl p-6 md:p-8 mb-8 gradient-card border border-border/30 shadow-card">
            <h3 className="text-2xl font-bold mb-6 text-foreground flex items-center gap-3">
              <span className="w-2 h-8 gradient-hero rounded-full" />
               Festival Benefits
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

          {/* {(selectedTicket || isDayFree(selectedDay)) && ticketType !== "festivalPass" && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="fixed bottom-0 left-0 right-0 glass-effect border-t border-border/50 p-6 shadow-premium z-40"
            >
              <div className="container mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Selected:</p>
                  <p className="text-lg font-bold text-foreground">
                    {isDayFree(selectedDay)
                      ? `Day ${selectedDay} - FREE Entry`
                      : `Day ${selectedDay} - ${selectedTicket}`
                    }
                  </p>
                </div>
                <div className="w-full space-y-4">
                  <div className="flex items-start space-x-2">
                    <input
                      type="checkbox"
                      id="musicFestivalTerms"
                      checked={acceptedTerms.musicFestival}
                      onChange={(e) => setAcceptedTerms(prev => ({ ...prev, musicFestival: e.target.checked }))}
                      className="mt-1 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                    />
                    <label htmlFor="musicFestivalTerms" className="text-sm text-muted-foreground">
                      I agree to the <a href="/HornbillFestival2025/music-festival/terms&conditions" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Music Festival Terms & Conditions</a>
                    </label>
                  </div>
                  <div className="flex items-start space-x-2">
                    <input
                      type="checkbox"
                      id="hornbillFestivalTerms"
                      checked={acceptedTerms.hornbillFestival}
                      onChange={(e) => setAcceptedTerms(prev => ({ ...prev, hornbillFestival: e.target.checked }))}
                      className="mt-1 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                    />
                    <label htmlFor="hornbillFestivalTerms" className="text-sm text-muted-foreground">
                      I agree to the <a href="/HornbillFestival2025/terms&conditions" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Hornbill Festival General Terms & Conditions</a>
                    </label>
                  </div>
                  <Button
                    onClick={handleBooking}
                    size="lg"
                    disabled={!acceptedTerms.musicFestival || !acceptedTerms.hornbillFestival}
                    className={`${isDayFree(selectedDay)
                        ? "bg-gradient-to-r from-emerald-400 via-green-400 to-teal-400"
                        : "gradient-hero"
                      } text-white hover:shadow-premium transition-all duration-300 px-8 py-6 text-lg font-bold rounded-xl shadow-glow w-full mt-4 ${!acceptedTerms.musicFestival || !acceptedTerms.hornbillFestival ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    {isDayFree(selectedDay) ? "FREE Entry - No Booking Needed ✓" : "Book Music Pass →"}
                  </Button>
                </div>
              </div>
            </motion.div>
          )} */}

          {/* {selectedTicket && ticketType === "festivalPass" && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="fixed bottom-0 left-0 right-0 glass-effect border-t border-border/50 p-6 shadow-premium z-40"
            >
              <div className="container mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Selected:</p>
                  <p className="text-lg font-bold text-foreground">{selectedTicket}</p>
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
          )} */}
        </section>
      </main>

      <Footer />
    </div>
  );
};


export default MusicFestival;
