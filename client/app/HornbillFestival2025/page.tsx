"use client";

import { motion } from "framer-motion";
import { Ticket, Calendar, Music } from "lucide-react";
import Link from "next/link";

import HeroBanner from "./components/HeroBanner";
import TicketCard from "./components/TicketCard";
import Navbar from "../Navbar";
import Footer from "../Footer";

const HornbillFestival2025 = () => {
    const ticketCategories = [
        {
            icon: Ticket,
            title: "Daily Pass",
            description: "Experience the Hornbill Festival for a day. Access cultural programs, traditional morungs, and craft bazaars.",
            href: "/HornbillFestival2025/daily-pass",
            delay: 0.2,
        },
        {
            icon: Calendar,
            title: "Festival Pass",
            description: "Unlimited 10-day access to the Heritage Village with VIP entry to ceremonies and reserved seating.",
            href: "/HornbillFestival2025/festival-pass",
            delay: 0.4,
            highlight: true,
        },
        {
            icon: Music,
            title: "Hornbill Music Festival",
            description: "Eight nights of live music and celebration. Experience performances from renowned artists and bands.",
            href: "/HornbillFestival2025/music-festival",
            delay: 0.6,
        },
    ];

    return (
        <div className="min-h-screen flex flex-col">

            <main className="flex-1">
                <Navbar />
                <HeroBanner
                    image="/images/hero-hornbill.jpg"
                    title="Hornbill Festival 2025"
                    subtitle="Festival of Festivals - December 1-10"
                />

                <section className="py-16 md:py-24 container mx-auto px-4 sm:px-6">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6 }}
                        className="text-center mb-16"
                    >
                        <h2 className="text-4xl md:text-5xl font-black mb-6 text-foreground">
                            Choose Your Experience
                        </h2>
                        <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                            Select from our range of ticket options to experience the vibrant culture,
                            music, and traditions of Nagaland at the Hornbill Festival.
                        </p>
                    </motion.div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-7xl mx-auto">
                        {ticketCategories.map((category, index) => (
                            <Link key={index} href={category.href}>
                                <TicketCard
                                    icon={category.icon}
                                    title={category.title}
                                    description={category.description}
                                    delay={category.delay}
                                    highlight={category.highlight}
                                />
                            </Link>
                        ))}
                    </div>
                </section>

                {/* <section className="py-20 gradient-card border-y border-border/30">
          <div className="container mx-auto px-4 sm:px-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="text-center"
              >
                <div className="w-20 h-20 gradient-hero rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-glow animate-float">
                  <span className="text-4xl font-black text-white">10</span>
                </div>
                <h3 className="text-2xl font-bold mb-3 text-foreground">Days of Celebration</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Non-stop cultural programs, music, and festivities
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="text-center"
              >
                <div className="w-20 h-20 bg-gradient-to-br from-secondary to-accent rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-glow animate-float" style={{ animationDelay: "0.5s" }}>
                  <span className="text-4xl font-black text-white">16</span>
                </div>
                <h3 className="text-2xl font-bold mb-3 text-foreground">Naga Tribes</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Experience the unique culture of all major Naga tribes
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.3 }}
                className="text-center"
              >
                <div className="w-20 h-20 bg-gradient-to-br from-accent to-primary rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-glow animate-float" style={{ animationDelay: "1s" }}>
                  <span className="text-4xl font-black text-white">8</span>
                </div>
                <h3 className="text-2xl font-bold mb-3 text-foreground">Music Nights</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Live performances from top national and international artists
                </p>
              </motion.div>
            </div>
          </div>
        </section> */}
            </main>
            <Footer />
        </div>
    );
};

export default HornbillFestival2025;
