import React from "react";
import Link from "next/link";
import Navbar from "../Navbar";
import Footer from "../Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Check,
    Search,
    CalendarClock,
    Shield,
    ArrowRight,
    MapPin,
    Trophy,
    Activity,
    CreditCard,
    Target,
    Zap
} from "lucide-react";
import { Input } from "@/components/ui/input";

/* ----------------------------- */
/* Shared Section Wrapper */
/* ----------------------------- */
const Section = ({
    children,
    id,
    muted,
    className,
    style,
}: {
    children: React.ReactNode;
    id?: string;
    muted?: boolean;
    className?: string;
    style?: React.CSSProperties;
}) => (
    <section
        id={id}
        style={style}
        className={`py-24 md:py-32 ${muted ? "bg-[#0a0a0a]" : "bg-white"} ${className || ''}`}
    >
        <div className="mx-auto max-w-7xl px-6 md:px-10">{children}</div>
    </section>
);

/* ----------------------------- */
/* Hero */
/* ----------------------------- */
const Hero = () => (
    <Section
        className="relative min-h-[90vh] flex items-center overflow-hidden border-b border-white/10"
        style={{
            backgroundColor: "#000",
            backgroundImage: "linear-gradient(to bottom, rgba(0,0,0,0.7), rgba(0,0,0,0.9)), url('https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?q=80&w=2000&auto=format&fit=crop')",
            backgroundSize: "cover",
            backgroundPosition: "center",
        }}
    >
        <div className="relative z-10 grid items-center gap-16 md:grid-cols-2">
            <div className="space-y-8">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-600/10 border border-red-600/20 text-red-500 text-xs font-bold uppercase tracking-widest">
                    <Activity className="h-3 w-3" /> Live Booking Now Available
                </div>
                {/* Updated Heading */}
                <h1 className="text-5xl md:text-8xl font-black tracking-tighter text-white uppercase italic leading-[0.9]">
                    AHIBI <br /> <span className="text-red-600">Sports</span>
                </h1>
                <p className="max-w-lg text-gray-400 md:text-xl leading-relaxed font-light">
                    The ultimate arena network. Book elite facilities or monetize your ground with the industry's most powerful booking engine.
                </p>

                <div className="flex flex-wrap gap-5">
                    <Link href="/arena-partner/auth">
                        <Button
                            size="lg"
                            className="group rounded-none px-10 bg-red-600 hover:bg-white text-white hover:text-red-600 transition-all duration-300 transform skew-x-[-12deg] border-none"
                        >
                            <span className="inline-block skew-x-[12deg] font-bold uppercase tracking-tighter">
                                List Your Facility
                            </span>
                            <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform skew-x-[12deg]" />
                        </Button>
                    </Link>
                </div>

                <div className="flex gap-8 pt-4 border-t border-white/10 text-white">
                    <div>
                        <p className="text-2xl font-bold uppercase italic">24/7</p>
                        <p className="text-xs text-gray-500 uppercase tracking-widest">Live Access</p>
                    </div>
                    <div>
                        <p className="text-2xl font-bold uppercase italic">100%</p>
                        <p className="text-xs text-gray-500 uppercase tracking-widest">Verified</p>
                    </div>
                </div>
            </div>

            <div className="w-full">
                <Card className="rounded-none border-0 shadow-2xl bg-white p-2">
                    <div className="border border-black/5 p-6 space-y-6">
                        <CardHeader className="p-0">
                            <CardTitle className="text-2xl font-black uppercase italic tracking-tighter text-black">
                                Find Your Pitch
                            </CardTitle>
                        </CardHeader>

                        <CardContent className="p-0 space-y-6">
                            <form action="/sports/list" className="relative group">
                                <Input
                                    name="q"
                                    placeholder="Enter Sport or Arena Name..."
                                    className="h-14 rounded-none border-2 border-black/10 focus:border-black transition-all pl-12 text-black"
                                />
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 group-focus-within:text-black transition-colors" />
                                <Button
                                    type="submit"
                                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-none bg-black text-white hover:bg-red-600 px-4"
                                >
                                    GO
                                </Button>
                            </form>

                            <div className="grid grid-cols-2 gap-2">
                                {[
                                    { label: "Football", sport: "football" },
                                    { label: "Cricket", sport: "cricket" },
                                    { label: "Tennis", sport: "tennis" },
                                    { label: "Swimming", sport: "swimming" },
                                ].map((item) => (
                                    <Link
                                        key={item.sport}
                                        href={`/sports/list?sport=${encodeURIComponent(item.sport)}`}
                                        className="group relative overflow-hidden border border-black/5 bg-gray-50 px-4 py-3 text-sm font-bold uppercase tracking-tighter text-black hover:text-white transition-colors"
                                    >
                                        <div className="absolute inset-0 bg-black translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                                        <span className="relative z-10">{item.label}</span>
                                    </Link>
                                ))}
                            </div>

                            <div className="flex flex-wrap gap-2">
                                <Link href="/sports/list?city=Dimapur" className="text-xs font-bold uppercase tracking-widest text-gray-400 hover:text-red-600 transition-colors">
                                    <MapPin className="inline h-3 w-3 mr-1" /> Dimapur
                                </Link>
                                <span className="text-gray-200">|</span>
                                <Link href={`/sports/list?date=${encodeURIComponent(new Date().toISOString().slice(0, 10))}`} className="text-xs font-bold uppercase tracking-widest text-gray-400 hover:text-red-600 transition-colors">
                                    <CalendarClock className="inline h-3 w-3 mr-1" /> Today
                                </Link>
                            </div>
                        </CardContent>
                    </div>
                </Card>
            </div>
        </div>
    </Section>
);

/* ----------------------------- */
/* Partner Strip */
/* ----------------------------- */
const SportsCardSection = () => (
    <section className="relative overflow-hidden bg-black py-24">
        <div className="absolute inset-0 opacity-10"
             style={{
                backgroundImage: "radial-gradient(circle at 2px 2px, white 1px, transparent 0)",
                backgroundSize: "40px 40px"
             }}
        />
        <div className="relative z-10 container mx-auto px-6 text-center">
            <h2 className="text-4xl md:text-6xl font-black text-white uppercase italic tracking-tighter">
                Fill Your Stands. <span className="text-red-600">Fast.</span>
            </h2>
            <p className="mt-4 text-gray-400 font-medium tracking-wide">
                Professional management tools for venue owners.
            </p>
            <div className="mt-10">
                <Link href="/arena-partner/auth">
                    <button className="relative group overflow-hidden bg-white px-12 py-5 text-black font-black uppercase tracking-tighter transform skew-x-[-12deg] hover:scale-105 transition-all">
                        <span className="relative z-10 inline-block skew-x-[12deg]">Get Started</span>
                        <div className="absolute inset-0 bg-red-600 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                    </button>
                </Link>
            </div>
        </div>
    </section>
);

/* ----------------------------- */
/* Facilities */
/* ----------------------------- */
const Facilities = () => (
    <Section id="facilities" muted className="border-t border-white/5">
        <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-6">
            <div className="text-left">
                <h2 className="text-4xl md:text-6xl font-black tracking-tighter text-white uppercase italic">
                    The Roster
                </h2>
                <p className="mt-2 text-gray-500 uppercase tracking-[0.2em] text-sm">Elite Tier Facilities Only</p>
            </div>
            <Link href="/sports/list" className="text-red-500 font-bold uppercase tracking-widest text-sm hover:underline flex items-center gap-2">
                View All Arenas <ArrowRight className="h-4 w-4" />
            </Link>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
                { label: "Futsal & Football", sport: "football", icon: "⚽" },
                { label: "Badminton Pro", sport: "badminton", icon: "🏸" },
                { label: "Tennis Courts", sport: "tennis", icon: "🎾" },
                { label: "Basketball Hub", sport: "basketball", icon: "🏀" },
                { label: "Cricket Nets", sport: "cricket", icon: "🏏" },
                { label: "Volleyball Pro", sport: "volleyball", icon: "🏐" },
                { label: "Table Tennis", sport: "table_tennis", icon: "🏓" },
                { label: "Swimming Pools", sport: "swimming", icon: "🏊" },
                { label: "Pickleball", sport: "pickleball", icon: "🎾" },
            ].map((item) => (
                <Link key={item.label} href={`/sports/list?sport=${encodeURIComponent(item.sport)}`}>
                    <Card className="group relative rounded-none bg-[#111] border-white/5 overflow-hidden hover:border-red-600 transition-colors duration-500">
                        <CardContent className="p-8 flex items-center justify-between">
                            <div>
                                <span className="text-xs font-bold text-red-600 uppercase tracking-widest mb-2 block">Premium</span>
                                <h3 className="text-xl font-bold text-white uppercase italic tracking-tight">{item.label}</h3>
                            </div>
                            <span className="text-3xl grayscale group-hover:grayscale-0 transition-all">{item.icon}</span>
                        </CardContent>
                    </Card>
                </Link>
            ))}
        </div>
    </Section>
);

/* ----------------------------- */
/* How It Works - The Playbook */
/* ----------------------------- */
const HowItWorks = () => (
    <Section className="bg-white">
        <div className="text-center mb-20">
            <h2 className="text-4xl md:text-6xl font-black tracking-tighter text-black uppercase italic">
                The Playbook
            </h2>
        </div>

        <div className="grid gap-12 md:grid-cols-4">
            {[
                { step: "Search by sport & location", num: "01" },
                { step: "Check live availability", num: "02" },
                { step: "Book securely online", num: "03" },
                { step: "No calls. No confusion.", num: "04" },
            ].map((item) => (
                <div key={item.num} className="relative group text-center md:text-left">
                    <span className="text-8xl font-black text-black/[0.05] absolute -top-10 left-0 group-hover:text-red-600/10 transition-colors italic select-none">
                        {item.num}
                    </span>
                    <div className="relative z-10 pt-4">
                        <p className="font-black uppercase italic tracking-tighter text-black text-xl leading-tight">
                            {item.step}
                        </p>
                    </div>
                </div>
            ))}
        </div>
    </Section>
);

/* ----------------------------- */
/* For Players */
/* ----------------------------- */
const ForPlayers = () => (
    <Section muted className="border-y border-white/5">
        <div className="flex items-center gap-4 mb-12">
            <div className="h-10 w-2 bg-red-600" />
            <h3 className="text-3xl md:text-5xl font-black text-white uppercase italic tracking-tighter">
                For Players & Teams
            </h3>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
            {[
                { t: "Real-time bookings", icon: <Zap className="h-5 w-5" /> },
                { t: "Transparent pricing", icon: <Target className="h-5 w-5" /> },
                { t: "Verified facilities", icon: <Shield className="h-5 w-5" /> },
                { t: "Secure payments", icon: <CreditCard className="h-5 w-5" /> },
            ].map((item) => (
                <Card key={item.t} className="rounded-none border-white/5 bg-[#111] hover:bg-red-600 group transition-all duration-300">
                    <CardContent className="p-8 flex flex-col items-center gap-4 text-center text-white">
                        <div className="text-red-600 group-hover:text-white transition-colors">{item.icon}</div>
                        <span className="font-bold uppercase italic tracking-tight">{item.t}</span>
                    </CardContent>
                </Card>
            ))}
        </div>
    </Section>
);

/* ----------------------------- */
/* For Owners */
/* ----------------------------- */
const ForOwners = () => (
    <Section className="bg-white">
        <div className="flex items-center gap-4 mb-12 justify-end">
            <h3 className="text-3xl md:text-5xl font-black text-black uppercase italic tracking-tighter text-right">
                For Venue Owners
            </h3>
            <div className="h-10 w-2 bg-black" />
        </div>

        <div className="grid gap-4 md:grid-cols-4">
            {[
                { t: "List your facility", icon: <Activity className="h-5 w-5" /> },
                { t: "Manage bookings", icon: <CalendarClock className="h-5 w-5" /> },
                { t: "Accept online payments", icon: <CreditCard className="h-5 w-5" /> },
                { t: "Host tournaments", icon: <Trophy className="h-5 w-5" /> },
            ].map((item) => (
                <Card key={item.t} className="rounded-none border-black/10 bg-gray-50 hover:bg-black group transition-all duration-300">
                    <CardContent className="p-8 flex flex-col items-center gap-4 text-center text-black group-hover:text-white">
                        <div className="text-black group-hover:text-red-600 transition-colors">{item.icon}</div>
                        <span className="font-bold uppercase italic tracking-tight">{item.t}</span>
                    </CardContent>
                </Card>
            ))}
        </div>
    </Section>
);

/* ----------------------------- */
/* CTA - Fixed Black Line Issue */
/* ----------------------------- */
const CTA = () => (
    <section className="bg-white py-0"> 
        <div className="mx-auto max-w-7xl px-6 md:px-10 pb-24">
            <div className="relative overflow-hidden bg-red-600 p-12 md:p-20 transform skew-y-[-2deg]">
                <div className="transform skew-y-[2deg] grid md:grid-cols-2 gap-12 items-center">
                    <div>
                        <h3 className="text-4xl md:text-7xl font-black text-white uppercase italic tracking-tighter leading-none">
                            Ready to <br /> Play?
                        </h3>
                        <div className="mt-10 flex flex-wrap gap-4">
                            <Link href="/sports/list">
                                <Button size="lg" className="rounded-none bg-black text-white px-10 font-bold uppercase tracking-tighter hover:bg-white hover:text-black border-none transition-colors duration-300">
                                    Explore Now
                                </Button>
                            </Link>
                            <Link href="/arena-partner/auth">
                                <Button 
                                    size="lg" 
                                    className="rounded-none bg-transparent border-2 border-white text-white px-10 font-bold uppercase tracking-tighter hover:bg-white hover:text-red-600 transition-colors duration-300"
                                >
                                    List Facility
                                </Button>
                            </Link>
                        </div>
                    </div>
                    <div className="space-y-4">
                        {[
                            "Instant Arena Confirmation",
                            "Elite Turf Standards",
                            "Zero Hidden Fees"
                        ].map((text) => (
                            <div key={text} className="flex items-center gap-3 text-white font-bold uppercase tracking-tighter text-lg">
                                <Trophy className="h-6 w-6" /> {text}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    </section>
);

/* ----------------------------- */
/* Page Wrapper */
/* ----------------------------- */
export default function SportsPage() {
    return (
        <div className="min-h-screen bg-white text-black selection:bg-red-600 selection:text-white">
            <Navbar />
            <Hero />
            <SportsCardSection />
            <Facilities />
            <HowItWorks />
            <ForPlayers />
            <ForOwners />
            <CTA />
            <div className="bg-white">
                <Footer />
            </div>
        </div>
    );
}