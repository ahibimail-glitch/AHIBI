"use client";

import { motion } from "framer-motion";
import { Ticket, Calendar, Music } from "lucide-react";
import Link from "next/link";
import TicketCard from "./components/TicketCard";
import Navbar from "../Navbar";
import Footer from "../Footer";
import Image from "next/image";

const HornbillFestival2025 = () => {
  const ticketCategories = [
    {
      icon: Ticket,
      title: "Daily Pass",
      description: "Experience the Hornbill Festival for a day. Access cultural programs, traditional morungs, and craft bazaars.",
      href: "/HornbillFestival2025/daily-pass",
      delay: 0.2,
      highlight:true
    },
    // {
    //   icon: Calendar,
    //   title: "Festival Pass",
    //   description: "Unlimited 10-day access to the Heritage Village with VIP entry to ceremonies and reserved seating.",
    //   href: "/HornbillFestival2025/festival-pass",
    //   delay: 0.4,
    //   highlight: true,
    // },
    {
      icon: Music,
      title: "Hornbill Music Festival",
      description: "Eight nights of live music and celebration. Experience performances from renowned artists and bands.",
      href: "/HornbillFestival2025/music-festival",
      delay: 0.6,
      highlight:true
    },
  ];

  return (
    <div className="min-h-screen flex flex-col">

      <Navbar />
      <main className="flex-1">
        <div className="hidden md:block">
          <Image
            src="/images/HMF/hero-desktop.jpg"
            alt="Hornbill Festival 2025"
            width={1920}
            height={1080}
            title="Hornbill Festival 2025"

          />
        </div>
        <div className="md:hidden">
          <Image
            src="/images/HMF/hero-mobile.jpg"
            alt="Hornbill Festival 2025"
            width={1920}
            height={1080}
            title="Hornbill Festival 2025"

          />
        </div>

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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-7xl mx-auto">
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


      </main>
      <Footer />
    </div>
  );
};

export default HornbillFestival2025;
