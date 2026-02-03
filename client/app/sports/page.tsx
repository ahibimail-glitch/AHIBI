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
} from "lucide-react";
import { Input } from "@/components/ui/input";

/* ----------------------------- */
/* Shared Section Wrapper */
/* ----------------------------- */
const Section = ({
    children,
    id,
    muted,
}: {
    children: React.ReactNode;
    id?: string;
    muted?: boolean;
}) => (
    <section
        id={id}
        className={`py-20 md:py-28 ${muted ? "bg-slate-50/70" : "bg-white"
            }`}
    >
        <div className="mx-auto max-w-7xl px-5 md:px-8">{children}</div>
    </section>
);

/* ----------------------------- */
/* Hero */
/* ----------------------------- */
const Hero = () => (
    <Section>
        <div className="grid items-center gap-14 md:grid-cols-2">
            {/* Left */}
            <div>
                <h1 className="text-4xl md:text-6xl xl:text-7xl font-extrabold tracking-tight text-slate-900 leading-[1.05]">
                    AHIBI Sports
                </h1>
                <p className="mt-4 text-xl md:text-2xl text-slate-600 font-medium">
                    Book Sports Facilities. List Your Ground.
                </p>

                <p className="mt-6 max-w-xl text-slate-600 md:text-lg leading-relaxed">
                    Discover and book verified sports courts instantly — or list your
                    facility and manage bookings effortlessly.
                </p>

                <div className="mt-10 flex flex-wrap gap-4">
                    <Link href="/arena-partner/auth">
                        <Button
                            size="lg"
                            variant="outline"
                            className="rounded-full px-8 border-black/20 text-slate-900 hover:bg-black hover:text-white transition"
                        >
                            List Your Facility
                            <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                    </Link>
                </div>

                <div className="mt-8 flex flex-wrap gap-6 text-sm text-slate-600">
                    <span className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-black" /> Book by the hour
                    </span>
                    <span className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-black" /> Live availability
                    </span>
                </div>
            </div>

            {/* Right – Search Card */}
            <div className="w-full">
                <Card className="rounded-3xl border border-black/10 shadow-2xl bg-white/80 backdrop-blur">
                    <CardHeader>
                        <CardTitle className="text-xl font-bold text-slate-900">
                            Quick search
                        </CardTitle>
                    </CardHeader>

                    <CardContent className="space-y-5">
                        <div className="flex gap-3">
                            <Input
                                placeholder="Search sport or facility"
                                className="rounded-full"
                            />
                            <Button className="rounded-full bg-black text-white hover:bg-black/90">
                                <Search className="h-4 w-4" />
                            </Button>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            {[
                                "Football",
                                "Badminton",
                                "Tennis",
                                "Basketball",
                                "Cricket",
                                "Volleyball",
                                "Table Tennis",
                                "Swimming",
                            ].map((label) => (
                                <div
                                    key={label}
                                    className="rounded-full border border-black/10 bg-slate-50 px-3 py-2 text-sm text-slate-700 text-center hover:bg-slate-100 transition"
                                >
                                    {label}
                                </div>
                            ))}
                        </div>

                        <div className="grid gap-3 sm:grid-cols-3">
                            <div className="rounded-full border bg-slate-50 px-4 py-2 text-sm">
                                <MapPin className="inline h-4 w-4 mr-2" />
                                Dimapur
                            </div>
                            <div className="rounded-full border bg-slate-50 px-4 py-2 text-sm">
                                <CalendarClock className="inline h-4 w-4 mr-2" />
                                Today
                            </div>
                            <div className="rounded-full border bg-slate-50 px-4 py-2 text-sm">
                                <CalendarClock className="inline h-4 w-4 mr-2" />
                                Evening
                            </div>
                        </div>

                        <Button
                            asChild
                            className="w-full rounded-full bg-black text-white hover:bg-black/90"
                        >
                            <Link href="/sports/list">Explore facilities</Link>
                        </Button>
                    </CardContent>
                </Card>
            </div>
        </div>
    </Section>
);

/* ----------------------------- */
/* Facilities */
/* ----------------------------- */
const SportsCardSection = () => (
  <section className="relative overflow-hidden bg-[#fff] py-16 sm:py-20">
    {/* dotted background */}
    <div
      className="absolute inset-0 opacity-60"
      style={{
        backgroundImage: "radial-gradient(#e6cfc7 1px, transparent 1px)",
        backgroundSize: "18px 18px",
      }}
    />

    <div className="relative z-10 container mx-auto px-4">
      <div className="mx-auto max-w-2xl text-center">
        {/* badge */}
        <div className="inline-block rounded bg-black px-4 py-1 text-lg font-semibold tracking-widest text-white">
          SPORT
        </div>

        {/* heading */}
        <h1 className="mt-6 text-3xl sm:text-4xl md:text-5xl font-extrabold text-gray-900 leading-tight">
          Post your{" "}
          <span className="text-red-600">sports events </span>
        </h1>

        {/* subtext */}
        <p className="mt-4 text-sm sm:text-base text-gray-600">
          Fill the stands. Live in under{" "}
          <span className="font-semibold text-gray-900">5 minutes.</span>
        </p>

        {/* CTA */}
        <div className="mt-8">
          <Link href="/allOrganizers">
            <button className="rounded-full bg-red-600 px-10 py-4 text-sm sm:text-base font-semibold text-white shadow-lg hover:bg-red-700 transition">
              GET STARTED
            </button>
          </Link>
        </div>
      </div>
    </div>
  </section>
);
const Facilities = () => (
    <Section id="facilities" muted>
        <div className="text-center mb-14">
            <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight">
                What You Can Book
            </h2>
            <p className="mt-3 text-slate-600">
                Flexible hourly bookings across multiple sports.
            </p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 md:grid-cols-3">
            {[
                "Futsal & Football Grounds",
                "Badminton Courts",
                "Tennis Courts",
                "Basketball Courts",
                "Cricket Nets & Grounds",
                "Volleyball Courts",
                "Table Tennis",
                "Swimming Pools",
            ].map((item) => (
                <Card
                    key={item}
                    className="rounded-2xl border border-black/10 hover:shadow-lg transition"
                >
                    <CardContent className="p-6 font-medium text-slate-800">
                        {item}
                    </CardContent>
                </Card>
            ))}
        </div>
    </Section>
);

/* ----------------------------- */
/* How It Works */
/* ----------------------------- */
const HowItWorks = () => (
    <Section>
        <div className="text-center mb-14">
            <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight">
                How It Works
            </h2>
        </div>

        <div className="grid gap-6 md:grid-cols-4">
            {[
                "Search by sport & location",
                "Check live availability",
                "Book securely online",
                "No calls. No confusion.",
            ].map((step) => (
                <Card
                    key={step}
                    className="rounded-2xl border border-black/10 hover:shadow-md transition"
                >
                    <CardContent className="p-6 text-center font-medium">
                        {step}
                    </CardContent>
                </Card>
            ))}
        </div>
    </Section>
);

/* ----------------------------- */
/* For Players */
/* ----------------------------- */
const ForPlayers = () => (
    <Section muted>
        <div className="text-center mb-10">
            <h3 className="text-2xl md:text-4xl font-extrabold">
                For Players & Teams
            </h3>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
            {[
                "Real-time bookings",
                "Transparent pricing",
                "Verified facilities",
                "Secure payments",
            ].map((t) => (
                <Card key={t} className="rounded-2xl border hover:shadow-md transition">
                    <CardContent className="p-5 font-medium text-center">
                        {t}
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
    <Section>
        <div className="text-center mb-10">
            <h3 className="text-2xl md:text-4xl font-extrabold">
                For Venue Owners & Organizers
            </h3>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
            {[
                "List your facility",
                "Manage bookings",
                "Accept online payments",
                "Host tournaments & events",
            ].map((t) => (
                <Card key={t} className="rounded-2xl border hover:shadow-md transition">
                    <CardContent className="p-5 font-medium text-center">
                        {t}
                    </CardContent>
                </Card>
            ))}
        </div>
    </Section>
);

/* ----------------------------- */
/* CTA */
/* ----------------------------- */
const CTA = () => (
    <Section>
        <div className="rounded-3xl bg-black p-10 md:p-14 text-white shadow-2xl">
            <div className="grid md:grid-cols-2 gap-10 items-center">
                <div>
                    <h3 className="text-3xl md:text-5xl font-extrabold">
                        Get Started with AHiBi
                    </h3>
                    <p className="mt-4 text-white/80 md:text-lg">
                        Book facilities or grow your sports venue — all in one place.
                    </p>

                    <div className="mt-8 flex flex-wrap gap-4">
                        <Link href="/sports/list">
                            <Button size="lg" className="rounded-full bg-white text-black hover:bg-black hover:text-white hover:border"  >
                                Explore Facilities
                            </Button>
                        </Link>
                        <Link href="/arena-partner/auth">
                            <Button
                                size="lg"
                                variant="outline"
                                className="rounded-full border-white text-black hover:bg-black hover:text-white"
                            >
                                List Your Facility
                            </Button>
                        </Link>
                    </div>
                </div>

                <div className="rounded-2xl bg-white/10 p-6 backdrop-blur border border-white/20">
                    <div className="flex items-center gap-2 text-sm mb-6">
                        <Shield className="h-5 w-5" />
                        Secure. Verified. Trusted.
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-sm">
                        {[
                            "Real-time bookings",
                            "Transparent pricing",
                            "Verified facilities",
                            "Secure payments",
                        ].map((f) => (
                            <div
                                key={f}
                                className="rounded-xl border border-white/20 bg-white/10 p-3"
                            >
                                <Check className="inline h-4 w-4 mr-2" />
                                {f}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    </Section>
);

/* ----------------------------- */
/* Page */
/* ----------------------------- */
export default function SportsPage() {
    return (
        <div className="min-h-screen bg-white text-slate-900">
            <Navbar />
            <Hero />
            <SportsCardSection />
            <Facilities />
            <HowItWorks />
            <ForPlayers />
            <ForOwners />
            <CTA />
            <Footer />
        </div>
    );
}
