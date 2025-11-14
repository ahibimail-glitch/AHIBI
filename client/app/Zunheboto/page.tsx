"use client"
import { useState } from "react";
import { TicketCard } from "./components/TicketCard";
import { DaySelector } from "./components/DaySelector";
import Image from "next/image";
import Navbar from "../Navbar";
import Footer from "../Footer";
const ticketCategories = [
    {
        id: "fan-pit",
        title: "Fan Pit",
        price: 250,
        admitCount: 1,
        validity: "Single day (select date below)",
        perks: [
            "Fan Pit seating with flexibility to stand near the stage",
            "Near-stage viewing area",
            "Access to all stalls",
        ],
    },
    {
        id: "vip",
        title: "VIP",
        price: 5000,
        admitCount: 2,
        validity: "Single day (select date below)",
        perks: [
            "Sofa seating in VIP lounge",
            "Premium stage view",
            "Packed food (per person)",
            "Coffee/soft beverages (per person)",
            "Access to all stalls",
            "Car pass",
        ],
    },
    {
        id: "fan-pit-group",
        title: "Fan Pit Group",
        price: 1000,
        originalPrice: 1250,
        admitCount: 5,
        validity: "Single day (select date below)",
        perks: [
            "Fan Pit seating with flexibility to stand near the stage",
            "Near-stage viewing area",
            "Access to all stalls",
        ],
    },
    {
        id: "vip-family",
        title: "VIP Family Pack",
        price: 10000,
        originalPrice: 12500,
        admitCount: 5,
        validity: "Single day (select date below)",
        perks: [
            "Sofa/table seating for five in VIP lounge",
            "Premium stage view",
            "Packed food (5)",
            "Coffee/soft beverages (5)",
            "Access to all stalls",
            "Car pass",
        ],
    },
];

const Index = () => {
    const [selectedTicket, setSelectedTicket] = useState<string | null>(null);
    const [selectedDay, setSelectedDay] = useState<string>("4");

    return (
        <div className="min-h-screen bg-gradient-to-b from-background to-festival-highlight">
            {/* Hero Section */}
            <Navbar />
            <section className="relative w-full">
                <div className="hidden md:block">
                    <Image
                        src="/Zunheboto/desktop.jpg"
                        alt="Hornbill Festival 2025"
                        width={1920}
                        height={1080}
                        title="Hornbill Festival 2025"

                    />
                </div>
                <div className="md:hidden">
                    <Image
                        src="/Zunheboto/mobile.jpg"
                        alt="Hornbill Festival 2025"
                        width={1920}
                        height={1080}
                        title="Hornbill Festival 2025"

                    />
                </div>
            </section>

            {/* Event Info */}
            {/* <section className="container mx-auto px-4 py-8 md:py-12">
                <div className="max-w-3xl mx-auto text-center space-y-4 animate-fade-in">
                    <h1 className="text-3xl md:text-5xl font-bold text-foreground">
                        Mini Hornbill — Zunheboto
                    </h1>
                    <p className="text-lg md:text-xl text-muted-foreground">
                        December 4th - 6th, 2025
                    </p>
                    <p className="text-base md:text-lg text-foreground/80">
                        Organized by Sumi Youth Organization
                    </p>
                </div>
            </section> */}


            {/* Day Selector */}
            <section className="container mx-auto px-4 py-8 md:py-12">
                <div className="max-w-4xl mx-auto animate-fade-in">
                    <DaySelector selectedDay={selectedDay} onSelectDay={setSelectedDay} />
                </div>
            </section>


            {/* Tickets Section */}
            <section className="container mx-auto px-4 py-8 md:py-16">
                <div className="max-w-6xl mx-auto">
                    <div className="text-center mb-12 space-y-3">
                        <h2 className="text-3xl md:text-4xl font-bold text-foreground">
                            Available Ticket Categories
                        </h2>
                        {/* <p className="text-lg text-muted-foreground">
                            Select your ticket category for an unforgettable festival experience
                        </p> */}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8 animate-fade-in">
                        {ticketCategories.map((ticket) => (
                            <TicketCard
                                key={ticket.id}
                                title={ticket.title}
                                price={ticket.price}
                                originalPrice={ticket.originalPrice}
                                admitCount={ticket.admitCount}
                                validity={ticket.validity}
                                perks={ticket.perks}
                                isSelected={selectedTicket === ticket.id}
                                onSelect={() => setSelectedTicket(ticket.id)}
                            />
                        ))}
                    </div>
                </div>
            </section>


            {/* Footer */}
            <Footer />
        </div>
    );
};

export default Index;
