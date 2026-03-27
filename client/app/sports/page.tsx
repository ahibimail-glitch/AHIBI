import React from "react";
import Link from "next/link";
import Image from "next/image";
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
    Zap,
    Phone,
    Headset
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
                    <Activity className="h-3 w-3" /> Book Sports Venues. List Your Venue.
                </div>
                {/* Updated Heading */}
                <h1 className="text-5xl md:text-8xl font-black tracking-tighter text-white uppercase italic leading-[0.9]">
                    AHIBI <br /> <span className="text-red-600">Sports</span>
                </h1>
                <p className="max-w-lg text-gray-400 md:text-xl leading-relaxed font-light">
                    Find and book verified sports venues — or list your venue and manage bookings online.
                </p>

                <div className="flex flex-wrap gap-5">
                    <Link href="/sports/list">
                        <Button
                            size="lg"
                            className="group rounded-none px-8 bg-red-600 hover:bg-white text-white hover:text-red-600 transition-all duration-300 transform skew-x-[-12deg] border-none"
                        >
                            <span className="inline-block skew-x-[12deg] font-bold uppercase tracking-tighter">
                                Explore Venues
                            </span>
                            <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform skew-x-[12deg]" />
                        </Button>
                    </Link>
                    <Link href="/arena-partner/auth">
                        <Button
                            size="lg"
                            className="group rounded-none px-8 bg-white hover:bg-red-600 text-red-600 hover:text-white transition-all duration-300 transform skew-x-[-12deg] border-none"
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
                Fill Your Venues. <span className="text-red-600">Fast.</span>
            </h2>
            <p className="mt-4 text-gray-400 font-medium tracking-wide">
                Professional management tools for venue owners.
            </p>
            <div className="mt-10">
                <Link href="/arena-partner/auth">
                    <button className="relative group overflow-hidden bg-white px-6 py-3 text-sm font-black uppercase tracking-tighter transform skew-x-[-6deg] transition-all hover:scale-105 active:scale-95 md:px-12 md:py-5 md:text-base md:skew-x-[-12deg] text-black">
                        <span className="relative z-10 inline-block skew-x-[6deg] md:skew-x-[12deg]">
                            Get Started
                        </span>
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
                    What You Can Book
                </h2>
                <p className="mt-2 text-gray-500 uppercase tracking-[0.2em] text-sm">Book by the hour. Check availability instantly.</p>
            </div>
            <Link href="/sports/list" className="text-red-500 font-bold uppercase tracking-widest text-sm hover:underline flex items-center gap-2">
                View All Arenas <ArrowRight className="h-4 w-4" />
            </Link>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
                { label: "Futsal & Football Grounds", sport: "football", icon: "⚽" },
                { label: "Badminton Courts", sport: "badminton", icon: "🏸" },
                { label: "Tennis Courts", sport: "tennis", icon: "🎾" },
                { label: "Basketball Courts", sport: "basketball", icon: "🏀" },
                { label: "Cricket Nets", sport: "cricket", icon: "🏏" },
                { label: "Volleyball Courts", sport: "volleyball", icon: "🏐" },
                { label: "Table Tennis", sport: "table_tennis", icon: "🏓" },
                { label: "Swimming Pools", sport: "swimming", icon: "🏊" },
                { label: "Pickleball Courts", sport: "pickleball", icon: "🎾" },
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
                How It Works
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
/* Upcoming Tournaments */
/* ----------------------------- */
const UpcomingTournaments = () => (
    <Section muted className="border-y border-white/5">
        <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-6">
            <div className="text-left">
                <h2 className="text-4xl md:text-6xl font-black tracking-tighter text-white uppercase italic">
                    Upcoming Tournaments
                </h2>
                <p className="mt-2 text-gray-500 uppercase tracking-[0.2em] text-sm">Compete at the Highest Level</p>
            </div>
            <Link href="/sports/tournaments" className="text-red-500 font-bold uppercase tracking-widest text-sm hover:underline flex items-center gap-2">
                Register Now <ArrowRight className="h-4 w-4" />
            </Link>
        </div>

        <div className="flex justify-center">
            {[{
                name: "Nagaland Pickleball Classic",
                date: "March 15-17, 2026",
                image: "/images/npatournament.jpeg",
                location: "Dimapur Sports Complex",
                categories: ["Mixed Doubles", "Men's Doubles", "Women's Doubles"],
                entryFee: "₹1,000 per player",
                status: "Open"
            }].map((tournament, index) => (
                <Card key={index} className="w-full max-w-2xl group rounded-none bg-[#111] border-white/5 overflow-hidden hover:border-red-600 transition-all duration-500">
                    <CardContent className="p-0">
                        <div className="relative h-64 overflow-hidden">
                            <Image
                                src={tournament.image}
                                alt={tournament.name}
                                fill
                                className="object-contain"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
                            <div className="absolute top-4 right-4 z-10">
                                <span className={`px-3 py-1 text-xs font-bold uppercase tracking-widest ${tournament.status === "Open"
                                    ? "bg-red-600 text-white"
                                    : "bg-white/10 text-gray-400"
                                    }`}>
                                    {tournament.status}
                                </span>
                            </div>

                        </div>

                        <div className="p-6 space-y-4">
                            <div>
                                <h3 className="text-xl font-bold text-white uppercase italic tracking-tight group-hover:text-red-600 transition-colors">
                                    {tournament.name}
                                </h3>
                            </div>

                            <div className="space-y-2 text-sm">
                                <div className="flex items-start gap-2 text-gray-400">
                                    <CalendarClock className="h-4 w-4 mt-0.5 flex-shrink-0 text-red-600" />
                                    <span>{tournament.date}</span>
                                </div>
                                <div className="flex items-start gap-2 text-gray-400">
                                    <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0 text-red-600" />
                                    <span>{tournament.location}</span>
                                </div>
                            </div>

                            <div className="pt-3 border-t border-white/5">
                                <p className="text-xs font-bold text-red-600 uppercase tracking-widest mb-2">Categories</p>
                                <div className="flex flex-wrap gap-2">
                                    {tournament.categories.map((category, idx) => (
                                        <span key={idx} className="px-2 py-1 text-xs bg-white/5 text-gray-400 font-medium">
                                            {category}
                                        </span>
                                    ))}
                                </div>
                            </div>

                            <div className="pt-3 border-t border-white/5 flex items-center justify-between">
                                <div>
                                    <p className="text-xs text-gray-500 uppercase tracking-widest">Entry Fee</p>
                                    <p className="text-sm font-bold text-white">{tournament.entryFee}</p>
                                </div>
                                <Link href="/sports/tournaments">
                                    <Button
                                        size="sm"
                                        disabled={tournament.status !== "Open"}
                                        className={`rounded-none font-bold uppercase tracking-tighter ${tournament.status === "Open"
                                            ? "bg-red-600 hover:bg-white text-white hover:text-red-600"
                                            : "bg-white/5 text-gray-600 cursor-not-allowed"
                                            } transition-all duration-300`}
                                    >
                                        {tournament.status === "Open" ? "Register" : "Soon"}
                                    </Button>
                                </Link>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
    </Section>
);

/* ----------------------------- */
/* FAQ */
/* ----------------------------- */
const FAQ = () => (
    <Section muted className="border-y border-white/5">
        <div className="text-center mb-16">
            <h2 className="text-4xl md:text-6xl font-black tracking-tighter text-white uppercase italic">
                Frequently Asked <span className="text-red-600">Questions</span>
            </h2>
        </div>
        <div className="grid gap-6 md:grid-cols-2 max-w-5xl mx-auto">
            {[
                {
                    q: "How can I book a sports facility online?",
                    a: "Simply search by sport and location, choose an available slot, and complete your booking online."
                },
                {
                    q: "Can I book courts by the hour?",
                    a: "Yes. Most facilities on AHIBI allow hourly bookings."
                },
                {
                    q: "Which sports facilities are available on AHIBI?",
                    a: "Futsal, badminton, tennis, basketball, cricket, volleyball, table tennis, swimming, and more."
                },
                {
                    q: "Is AHIBI only for Dimapur?",
                    a: "Currently focused on Dimapur, but expanding across Nagaland."
                },
                {
                    q: "How can venue owners list their facilities?",
                    a: "Use the “List Your Facility” option, complete verification, and start receiving bookings."
                },
                {
                    q: "Can tournaments and sports events be hosted on AHIBI?",
                    a: "Yes. Organizers and venue owners can list and manage tournaments through AHiBi Organizer."
                }
            ].map((faq, index) => (
                <Card key={index} className="rounded-none border-white/5 bg-[#111] hover:border-red-600 transition-colors duration-300">
                    <CardContent className="p-8">
                        <h3 className="text-lg font-bold text-white uppercase italic tracking-tight mb-3">
                            {faq.q}
                        </h3>
                        <p className="text-gray-400 leading-relaxed">
                            {faq.a}
                        </p>
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
        <div className="mx-auto max-w-7xl px-6 md:px-10 pt-20 pb-24">
            <div className="relative overflow-hidden bg-red-600 p-12 md:p-20 transform skew-y-[-2deg]">
                <div className="transform skew-y-[2deg] grid md:grid-cols-2 gap-12 items-center">
                    <div className="space-y-8">
                        <h3 className="text-4xl md:text-5xl lg:text-6xl font-black text-white uppercase italic tracking-tighter leading-tight pr-4">
                            Get Started&nbsp;<br />
                            With AHIBI Sports&nbsp;
                        </h3>
                        <div className="flex flex-wrap gap-4">
                            <Link href="/sports/list">
                                <Button size="lg" className="rounded-none bg-black text-white px-8 font-bold uppercase tracking-tighter hover:bg-white hover:text-black border-none transition-colors duration-300">
                                    Explore Facilities
                                </Button>
                            </Link>
                            <Link href="/arena-partner/auth">
                                <Button
                                    size="lg"
                                    className="rounded-none bg-transparent border-2 border-white text-white px-8 font-bold uppercase tracking-tighter hover:bg-white hover:text-red-600 transition-colors duration-300"
                                >
                                    List Your Facility
                                </Button>
                            </Link>
                        </div>
                    </div>
                    <div className="space-y-8 pl-0 md:pl-12 md:border-l border-white/20">
                        <div className="space-y-2">
                            <h4 className="text-2xl font-black text-white uppercase italic tracking-tighter flex items-center gap-3">
                                <Activity className="h-6 w-6" /> Looking to play?
                            </h4>
                            <p className="text-lg text-red-100 font-medium">Find and book sports facilities near you.</p>
                        </div>
                        <div className="space-y-2">
                            <h4 className="text-2xl font-black text-white uppercase italic tracking-tighter flex items-center gap-3">
                                <Trophy className="h-6 w-6" /> Own or manage a sports venue?
                            </h4>
                            <p className="text-lg text-red-100 font-medium">List your facility, manage bookings, and grow your reach.</p>
                        </div>
                    </div>
                </div>
            </div>
            <div className="mt-20 mx-auto max-w-5xl">
                <div className="grid md:grid-cols-[1fr_1.2fr] gap-8 items-center border border-black/10 bg-gray-50 p-8 md:p-12 hover:border-black transition-colors duration-300">
                    <div className="space-y-5 text-center md:text-left md:border-r border-black/10 pr-0 md:pr-8">
                        <div className="inline-flex h-14 w-14 items-center justify-center bg-black text-white rounded-none">
                            <Headset className="h-7 w-7" />
                        </div>
                        <div>
                            <h4 className="text-3xl font-black text-black uppercase italic tracking-tighter">
                                Need Assistance?
                            </h4>
                            <p className="mt-3 text-gray-600 font-medium leading-relaxed">
                                Questions about facility bookings, reservations, or hosting a tournament? Our support team is here.
                            </p>
                        </div>
                    </div>
                    <div className="flex flex-col space-y-5">
                        <p className="text-xs font-bold text-red-600 uppercase tracking-widest text-center md:text-left">Support Lines</p>
                        <div className="grid sm:grid-cols-2 gap-4">
                            <a href="tel:7005427394" className="group flex flex-col items-center sm:items-start gap-3 p-5 border border-black/5 bg-white hover:border-red-600 hover:bg-red-50 hover:-translate-y-1 transition-all duration-300">
                                <div className="bg-gray-100 p-2.5 rounded-full group-hover:bg-white group-hover:shadow-sm transition-all">
                                    <Phone className="h-5 w-5 text-gray-500 group-hover:text-red-600" />
                                </div>
                                <div>
                                    <span className="block text-2xl font-black text-black uppercase italic tracking-tighter group-hover:text-red-600 transition-colors">
                                        7005427394
                                    </span>
                                </div>
                            </a>
                            <a href="tel:7005727288" className="group flex flex-col items-center sm:items-start gap-3 p-5 border border-black/5 bg-white hover:border-red-600 hover:bg-red-50 hover:-translate-y-1 transition-all duration-300">
                                <div className="bg-gray-100 p-2.5 rounded-full group-hover:bg-white group-hover:shadow-sm transition-all">
                                    <Phone className="h-5 w-5 text-gray-500 group-hover:text-red-600" />
                                </div>
                                <div>
                                    <span className="block text-2xl font-black text-black uppercase italic tracking-tighter group-hover:text-red-600 transition-colors">
                                        7005727288
                                    </span>
                                </div>
                            </a>
                        </div>
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
            <UpcomingTournaments />
            <SportsCardSection />
            <Facilities />
            <HowItWorks />
            <ForPlayers />
            <ForOwners />
            <FAQ />
            <CTA />
            <div className="bg-white">
                <Footer />
            </div>
        </div>
    );
}