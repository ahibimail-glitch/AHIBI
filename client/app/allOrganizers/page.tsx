import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, CalendarClock, Sparkles, Wallet, Music, Mic, Headphones, MapPin, Shield, Star, ArrowRight, Search, SlidersHorizontal, Users, Zap } from "lucide-react";
import Link from "next/link";
import Footer from "../Footer";
import Navbar from "../Navbar";

const features = [
  { icon: Search, title: "Find Perfect Talent", text: "Search and discover artists, venues, and vendors with advanced filters for location, budget, and style." },
  { icon: CalendarClock, title: "Streamlined Booking", text: "Manage all your event bookings in one place with real-time availability and instant confirmations." },
  { icon: Wallet, title: "Budget Management", text: "Track expenses, compare quotes, and manage payments securely with transparent pricing from all vendors." },
  { icon: Shield, title: "Secure Contracts", text: "Digital contracts, payment protection, and cancellation policies ensure safe and professional transactions." },
  { icon: Sparkles, title: "Event Planning Tools", text: "Access comprehensive tools for timeline management, guest lists." },
  { icon: SlidersHorizontal, title: "Analytics Dashboard", text: "Track RSVPs, monitor budgets, and get insights to make your events more successful." },
];

const categories = [
  { icon: Music, label: "Artists" },
  { icon: Headphones, label: "Venues" },
  { icon: Mic, label: "Vendors" },
  { icon: Star, label: "Services" },
];

const faqs = [
  {
    q: "Who can use AHIBI Organizer?",
    a: "Event planners, corporate organizers, wedding planners, festival coordinators, and anyone organizing events — from intimate gatherings to large-scale productions.",
  },
  {
    q: "How does the booking process work?",
    a: "Browse artists, venues, and vendors using our filters. Check real-time availability, send booking requests, review quotes, and confirm with secure payments — all in one platform.",
  },
  {
    q: "What types of events can I organize?",
    a: "Weddings, corporate events, concerts, festivals, conferences, private parties, cultural events, and any type of gathering that needs professional talent and venues.",
  },
  {
    q: "How are payments handled?",
    a: "All payments are processed securely through Razorpay. You can compare quotes, make advance payments, and track all transactions with complete transparency and invoicing.",
  },
  {
    q: "Can I manage multiple events?",
    a: "Yes! Our dashboard allows you to manage multiple events simultaneously, track different budgets, coordinate various vendors, and keep everything organized in one place.",
  },
];

const tiers = [
  {
    name: "Starter",
    tag: "Begin",
    price: "Free",
    bullets: [
      "Browse artists & venues",
      "Basic booking management",
      "Up to 3 active events",
      "Standard support",
    ],
    cta: "Get started free",
  },
  {
    name: "Pro",
    tag: "Grow",
    price: "Best for professionals",
    bullets: [
      "Unlimited events & bookings",
      "Advanced planning tools",
      "Priority vendor access",
      "Analytics & insights",
    ],
    cta: "Upgrade to Pro",
  },
  {
    name: "Enterprise",
    tag: "Scale",
    price: "For agencies",
    bullets: [
      "Team collaboration features",
      "Custom contracts & terms",
      "Dedicated account manager",
      "White-label options",
    ],
    cta: "Contact sales",
  },
];

const Section = ({ children, id }: { children: React.ReactNode; id?: string }) => (
  <section id={id} className="py-20 md:py-32">
    <div className="mx-auto max-w-6xl px-6 md:px-8">{children}</div>
  </section>
);

const Hero = () => (
  <Section>
    <div className="min-h-[55vh] flex items-center justify-center">
      <div className="space-y-8 animate-fadeIn mx-auto text-center max-w-4xl">
        <h1 className="mt-4 text-5xl font-extrabold tracking-tight md:text-7xl bg-gradient-to-r from-emerald-600 via-teal-600 to-blue-600 bg-clip-text text-transparent pb-2">
          AHIBI Organizer
          <span className="block text-slate-700 text-3xl md:text-5xl mt-4 font-bold tracking-tight">Plan. Book. Execute. Succeed.</span>
        </h1>
        <p className="text-slate-600 md:text-xl leading-relaxed max-w-2xl mx-auto font-medium">
          Your all-in-one platform to discover artists, book venues, and manage
          events seamlessly. From concept to celebration — we’ve got you covered.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
          <Link href="/organizer/auth/signup" className="w-full sm:w-auto">
            <Button
              size="lg"
              className="w-full sm:w-auto rounded-full px-10 h-14 text-lg bg-[#F4A629] hover:bg-[#e09622] text-white shadow-lg shadow-[#F4A629]/20 transform hover:-translate-y-1 transition-all duration-300 font-bold"
            >
              Start Planning
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>

          <Link href="/organizer/auth/login" className="w-full sm:w-auto">
            <Button
              size="lg"
              variant="outline"
              className="group w-full sm:w-auto rounded-full px-10 h-14 text-lg border-2 border-emerald-200 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800 hover:border-emerald-300 shadow-sm hover:shadow-md transition-all duration-300 font-semibold bg-white/50 backdrop-blur-sm"
            >
              Organizer Login
              <ArrowRight className="ml-2 h-5 w-5 transition-transform duration-300 group-hover:translate-x-1" />
            </Button>
          </Link>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-8 text-sm font-semibold text-slate-500 pt-8">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100"><Check className="h-3.5 w-3.5 text-emerald-600" /></div> One platform
          </div>
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100"><Check className="h-3.5 w-3.5 text-emerald-600" /></div> Secure bookings
          </div>
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100"><Check className="h-3.5 w-3.5 text-emerald-600" /></div> Easy management
          </div>
        </div>
      </div>
    </div>
  </Section>
);

const comingSoonFeatures = [
  "Find Perfect Talent",
  "Secure Contracts",
  "Budget Management",
];

const FeatureGrid = () => (
  <Section id="features">
    <div className="mb-16 text-center">
      <h2 className="text-3xl font-extrabold tracking-tight md:text-5xl bg-gradient-to-r from-emerald-600 to-blue-600 bg-clip-text text-transparent pb-2">
        Everything you need to organize amazing events
      </h2>
      <p className="mt-4 text-slate-600 md:text-xl max-w-3xl mx-auto font-medium">
        Powerful tools to find talent, manage bookings, and execute flawless events.
      </p>
    </div>

    <div className="grid gap-6 md:gap-8 md:grid-cols-3">
      {features.map((f) => (
        <Card
          key={f.title}
          className="group relative rounded-3xl border border-emerald-100 shadow-sm hover:shadow-xl hover:shadow-emerald-900/5 transition-all duration-500 hover:-translate-y-1 bg-white/60 backdrop-blur-md overflow-hidden"
        >
          {comingSoonFeatures.includes(f.title) && (
            <span className="absolute top-5 right-5 text-[10px] uppercase tracking-widest font-black bg-[#F4A629]/10 text-[#F4A629] px-3 py-1.5 rounded-full border border-[#F4A629]/20 z-20">
              Coming Soon
            </span>
          )}

          <CardHeader className="relative z-10 pr-24 pt-8 pl-8">
            <div className="flex flex-col gap-5">
              <div className="w-14 h-14 flex items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-md shadow-emerald-200 transition-transform duration-500 group-hover:rotate-6 group-hover:scale-110">
                <f.icon className="h-6 w-6 text-white" />
              </div>
              <CardTitle className="text-xl font-bold text-slate-800 leading-tight">
                {f.title}
              </CardTitle>
            </div>
          </CardHeader>

          <CardContent className="relative z-10 text-slate-600 leading-relaxed pb-8 pl-8 pr-8">
            {f.text}
          </CardContent>

          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-emerald-50/50 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
        </Card>
      ))}
    </div>
  </Section>
);

const HowItWorks = () => (
  <Section id="how">
    <div className="mb-16 text-center">
      <h2 className="text-3xl font-extrabold tracking-tight md:text-5xl bg-gradient-to-r from-emerald-600 to-blue-600 bg-clip-text text-transparent pb-2">How it works</h2>
      <p className="mt-4 text-slate-600 md:text-xl max-w-3xl mx-auto font-medium">Three simple steps to organize your perfect event.</p>
    </div>
    <div className="grid gap-6 md:gap-8 md:grid-cols-3">
      {[{
        step: 1,
        title: "Search & discover",
        text: "Browse artists, venues, and vendors. Filter by location, budget, style, and availability to find perfect matches.",
      }, {
        step: 2,
        title: "Book & manage",
        text: "Send booking requests, compare quotes, review contracts, and confirm with secure payments — all in one dashboard.",
      }, {
        step: 3,
        title: "Execute & succeed",
        text: "Coordinate with vendors, track timelines, manage guest lists, and ensure your event runs smoothly from start to finish.",
      }].map((s) => (
          <Card 
            key={s.step} 
            className="group relative overflow-hidden rounded-3xl border border-slate-200/60 bg-white/60 shadow-sm backdrop-blur-md transition-all duration-500 hover:-translate-y-2 hover:border-emerald-500/30 hover:shadow-xl hover:shadow-emerald-900/5 p-2"
          >
            <div className="absolute -right-1 -top-2 select-none pointer-events-none">
                <span className="text-[140px] font-black leading-none text-emerald-500/5 transition-colors duration-500 group-hover:text-emerald-500/10">
                  {s.step}
                </span>
            </div>

            <CardHeader className="relative z-10 pb-4">
              <div className="flex items-center justify-between">
                <Badge className="rounded-full bg-emerald-50 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-emerald-700 ring-1 ring-inset ring-emerald-700/10 transition-colors duration-300 group-hover:bg-emerald-600 group-hover:text-white group-hover:ring-emerald-600">
                  Step {s.step}
                </Badge>
                <div className="h-2 w-2 rounded-full bg-emerald-400 opacity-0 transition-opacity group-hover:opacity-100" />
              </div>
              <CardTitle className="mt-6 text-2xl font-extrabold tracking-tight text-slate-900">
                {s.title}
              </CardTitle>
            </CardHeader>

            <CardContent className="relative z-10">
              <p className="text-base font-medium leading-relaxed text-slate-600">
                {s.text}
              </p>
            </CardContent>

            <div className="absolute bottom-0 left-0 h-1.5 w-0 bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-700 ease-out group-hover:w-full" />
          </Card>
      ))}
    </div>
  </Section>
);

const Plans = () => (
  <Section id="plans">
    <div className="mb-16 text-center">
      <h2 className="text-3xl font-extrabold tracking-tight md:text-5xl bg-gradient-to-r from-emerald-600 to-blue-600 bg-clip-text text-transparent pb-2">Choose your plan</h2>
      <p className="mt-4 text-slate-600 md:text-xl max-w-3xl mx-auto font-medium">Start free. Upgrade as your event planning needs grow.</p>
    </div>
    <div className="grid gap-8 md:grid-cols-3 items-center">
      {tiers.map((t, index) => (
        <Card 
          key={t.name} 
          className={`relative rounded-3xl border-slate-200/60 shadow-sm hover:shadow-xl transition-all duration-500 bg-white/70 backdrop-blur-md overflow-hidden ${index === 1 ? 'ring-2 ring-emerald-500 shadow-lg scale-105 z-10' : 'hover:-translate-y-1'}`}
        >
          {index === 1 && (
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 to-teal-500" />
          )}
          <CardHeader className="p-8 pb-6">
            <div className="flex items-center justify-between mb-2">
              <CardTitle className="text-2xl font-extrabold text-slate-900">{t.name}</CardTitle>
              <Badge variant="secondary" className="rounded-full bg-emerald-100 text-emerald-800 border-0 font-bold px-3">{t.tag}</Badge>
            </div>
            <p className="text-slate-500 font-semibold">{t.price}</p>
          </CardHeader>
          <CardContent className="p-8 pt-0">
            <ul className="mb-8 space-y-4 text-base font-medium text-slate-600">
              {t.bullets.map((b) => (
                <li key={b} className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100">
                        <Check className="h-3 w-3 text-emerald-600 font-bold" />
                    </div>
                    {b}
                </li>
              ))}
            </ul>
            <Button 
                size="lg"
                className={`w-full rounded-full h-12 font-bold transition-all duration-300 ${index === 1 ? 'bg-[#F4A629] hover:bg-[#e09622] text-white shadow-md shadow-[#F4A629]/20 hover:-translate-y-0.5' : 'bg-slate-900 hover:bg-slate-800 text-white hover:-translate-y-0.5'}`}
            >
                {t.cta}
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  </Section>
);

const FAQ = () => (
  <Section id="faq">
    <div className="mb-16 text-center">
      <h2 className="text-3xl font-extrabold tracking-tight md:text-5xl bg-gradient-to-r from-emerald-600 to-blue-600 bg-clip-text text-transparent pb-2">
        Questions, answered
      </h2>
      <p className="mt-4 text-slate-600 md:text-xl max-w-3xl mx-auto font-medium">
        Everything you need to know about organizing events on AHIBI.
      </p>
    </div>
    
    <div className="grid gap-6 md:grid-cols-2">
      {faqs.map((f) => (
        <Card 
          key={f.q} 
          className="group relative overflow-hidden rounded-3xl border border-slate-200/50 shadow-sm hover:shadow-lg hover:shadow-emerald-900/5 transition-all duration-300 hover:-translate-y-1 bg-white/60 backdrop-blur-md"
        >
          <div className="absolute left-0 top-0 h-full w-1 bg-emerald-500/20 transition-all duration-300 group-hover:w-1.5 group-hover:bg-emerald-500" />
          
          <CardHeader className="pl-8 pt-6 pb-2 pr-6">
            <CardTitle className="text-lg font-bold text-slate-900 leading-snug">
              {f.q}
            </CardTitle>
          </CardHeader>
          
          <CardContent className="pl-8 pb-6 pr-6 text-slate-600 font-medium leading-relaxed">
            {f.a}
          </CardContent>
        </Card>
      ))}
    </div>
  </Section>
);

const CTA = () => (
  <Section id="join">
    <div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-emerald-600 via-teal-700 to-blue-800 p-8 sm:p-12 md:p-16 shadow-2xl">
      
      <div className="absolute -top-32 -right-32 h-[500px] w-[500px] rounded-full bg-teal-400/20 blur-[100px] pointer-events-none" />
      <div className="absolute -bottom-32 -left-32 h-[400px] w-[400px] rounded-full bg-blue-500/20 blur-[100px] pointer-events-none" />

      <div className="relative z-10 grid items-center gap-12 lg:grid-cols-2">
        <div>
          <h3 className="text-3xl font-extrabold tracking-tight md:text-5xl text-white leading-tight">
            Ready to organize unforgettable events?
          </h3>
          <p className="mt-6 text-emerald-50 md:text-xl font-medium leading-relaxed max-w-lg">
            Join AHIBI Organizer and access the best artists, venues, and vendors. Plan smarter. Book faster. Execute flawlessly.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row gap-4">
            <Link href="/organizer/auth/signup" className="w-full sm:w-auto">
              <Button 
                size="lg" 
                className="w-full sm:w-auto rounded-full h-14 px-8 bg-[#F4A629] text-white hover:bg-[#e09622] shadow-lg shadow-[#F4A629]/20 transform hover:-translate-y-1 transition-all duration-300 font-bold text-lg"
              >
                Start planning free
              </Button>
            </Link>
            <Button 
              size="lg" 
              variant="outline" 
              className="w-full sm:w-auto bg-transparent rounded-full h-14 px-8 border-2 border-white/80 text-white hover:bg-white hover:text-teal-900 hover:border-white shadow-lg transform hover:-translate-y-1 transition-all duration-300 font-bold text-lg"
            >
              Contact support
            </Button>
          </div>
        </div>

        <div className="rounded-3xl border border-white/20 bg-white/10 backdrop-blur-md p-8 sm:p-10 shadow-2xl">
          <div className="mb-8 flex items-center gap-5 text-white font-semibold text-lg leading-snug">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/20 shadow-inner backdrop-blur-lg">
              <Shield className="h-7 w-7 text-emerald-100" />
            </div>
            Secure platform with verified artists and venues.
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm font-bold tracking-wide">
            <div className="flex items-center rounded-2xl border border-white/10 bg-white/5 p-4 text-white hover:bg-white/15 transition-colors duration-300">
              <Check className="mr-3 h-5 w-5 text-emerald-300 shrink-0" /> 
              Instant bookings
            </div>
            <div className="flex items-center rounded-2xl border border-white/10 bg-white/5 p-4 text-white hover:bg-white/15 transition-colors duration-300">
              <Check className="mr-3 h-5 w-5 text-emerald-300 shrink-0" /> 
              Budget tracking
            </div>
            <div className="flex items-center rounded-2xl border border-white/10 bg-white/5 p-4 text-white hover:bg-white/15 transition-colors duration-300">
              <Check className="mr-3 h-5 w-5 text-emerald-300 shrink-0" /> 
              Event timeline
            </div>
            <div className="flex items-center rounded-2xl border border-white/10 bg-white/5 p-4 text-white hover:bg-white/15 transition-colors duration-300">
              <Check className="mr-3 h-5 w-5 text-emerald-300 shrink-0" /> 
              Vendor coordination
            </div>
          </div>
        </div>
      </div>
    </div>
  </Section>
);

export default function AhibiOrganizerPage() {
  return (
    <div className="min-h-screen bg-slate-50 relative selection:bg-emerald-200 selection:text-emerald-900">
      {/* Decorative ambient background */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none flex justify-center z-0">
         <div className="w-[800px] h-[800px] bg-emerald-300/20 rounded-full blur-[120px] absolute -top-40 -left-20 mix-blend-multiply opacity-70" />
         <div className="w-[600px] h-[600px] bg-teal-300/20 rounded-full blur-[100px] absolute top-40 right-0 mix-blend-multiply opacity-70" />
      </div>

      <main className="relative z-10">
        <Navbar />
        <Hero />
        <FeatureGrid />
        <HowItWorks />
        {/* <Plans /> */}
        <FAQ />
        <CTA />
      </main>

      <div className="relative z-10">
        <Footer />
      </div>
    </div>
  );
}