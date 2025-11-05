import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Check, CalendarClock, Sparkles, Wallet, Music, Mic, Headphones, MapPin, Shield, Star, ArrowRight, Search, SlidersHorizontal, Users, Zap } from "lucide-react";
import Link from "next/link";
import Footer from "../Footer";
import Navbar from "../Navbar";

const features = [
  { icon: Search, title: "Find Perfect Talent", text: "Search and discover artists, venues, and vendors with advanced filters for location, budget, and style." },
  { icon: CalendarClock, title: "Streamlined Booking", text: "Manage all your event bookings in one place with real-time availability and instant confirmations." },
  { icon: Wallet, title: "Budget Management", text: "Track expenses, compare quotes, and manage payments securely with transparent pricing from all vendors." },
  { icon: Shield, title: "Secure Contracts", text: "Digital contracts, payment protection, and cancellation policies ensure safe and professional transactions." },
  { icon: Sparkles, title: "Event Planning Tools", text: "Access comprehensive tools for timeline management, guest lists, and vendor coordination." },
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
  <section id={id} className="py-16 md:py-24">
    <div className="mx-auto max-w-6xl px-4">{children}</div>
  </section>
);

const Hero = () => (
  <Section>
    <div className="min-h-[50vh] flex items-center">
      <div className="space-y-6 animate-fadeIn mx-auto text-center max-w-3xl">
        <h1 className="mt-4 text-4xl font-bold leading-tight md:text-6xl bg-gradient-to-r from-emerald-600 via-teal-600 to-blue-500 bg-clip-text text-transparent">
          AHIBI Organizer
          <span className="block text-gray-600 text-3xl md:text-4xl mt-2">Plan. Book. Execute. Succeed.</span>
        </h1>
        <p className="text-gray-600 md:text-xl leading-relaxed max-w-2xl mx-auto">
          Your all-in-one platform to discover artists, book venues, and manage
          events seamlessly. From concept to celebration — we’ve got you covered.
        </p>

        <div className="flex flex-wrap justify-center gap-4 pt-2">
          <Link href="/organizer/auth/signup">
            <Button
              size="lg"
              className="rounded-2xl px-8 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300"
            >
              Start Planning
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>

          <Link href="/organizer/auth/login">
            <Button
              size="lg"
              variant="outline"
              className="rounded-2xl px-8 border-2 border-emerald-600 text-emerald-700 hover:bg-emerald-50 transition-all duration-300"
            >
              Organizer Login
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-gray-600 pt-4">
          <div className="flex items-center gap-2">
            <Check className="h-4 w-4 text-emerald-600" /> One platform
          </div>
          <div className="flex items-center gap-2">
            <Check className="h-4 w-4 text-emerald-600" /> Secure bookings
          </div>
          <div className="flex items-center gap-2">
            <Check className="h-4 w-4 text-emerald-600" /> Easy management
          </div>
        </div>
      </div>
    </div>
  </Section>
);

const FeatureGrid = () => (
  <Section id="features">
    <div className="mb-12 text-center">
      <h2 className="text-4xl font-bold md:text-5xl bg-gradient-to-r from-emerald-600 to-blue-500 bg-clip-text text-transparent">Everything you need to organize amazing events</h2>
      <p className="mt-4 text-gray-600 md:text-xl max-w-3xl mx-auto">Powerful tools to find talent, manage bookings, and execute flawless events.</p>
    </div>
    <div className="grid gap-6 md:grid-cols-3">
      {features.map((f) => (
        <Card key={f.title} className="rounded-2xl border-emerald-200/50 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 bg-white/80 backdrop-blur-sm">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600">
                <f.icon className="h-5 w-5 text-white" />
              </div>
              <CardTitle className="text-lg font-bold text-gray-800">{f.title}</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="text-gray-600">{f.text}</CardContent>
        </Card>
      ))}
    </div>
  </Section>
);

const HowItWorks = () => (
  <Section id="how">
    <div className="mb-12 text-center">
      <h2 className="text-4xl font-bold md:text-5xl bg-gradient-to-r from-emerald-600 to-blue-500 bg-clip-text text-transparent">How it works</h2>
      <p className="mt-4 text-gray-600 md:text-xl max-w-3xl mx-auto">Three simple steps to organize your perfect event.</p>
    </div>
    <div className="grid gap-6 md:grid-cols-3">
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
        <Card key={s.step} className="rounded-2xl border-emerald-200/50 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 bg-white/80 backdrop-blur-sm">
          <CardHeader>
            <Badge className="rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white border-0">Step {s.step}</Badge>
            <CardTitle className="mt-3 text-xl font-bold text-gray-800">{s.title}</CardTitle>
          </CardHeader>
          <CardContent className="text-gray-600">{s.text}</CardContent>
        </Card>
      ))}
    </div>
  </Section>
);

const Plans = () => (
  <Section id="plans">
    <div className="mb-12 text-center">
      <h2 className="text-4xl font-bold md:text-5xl bg-gradient-to-r from-emerald-600 to-blue-500 bg-clip-text text-transparent">Choose your plan</h2>
      <p className="mt-4 text-gray-600 md:text-xl max-w-3xl mx-auto">Start free. Upgrade as your event planning needs grow.</p>
    </div>
    <div className="grid gap-6 md:grid-cols-3">
      {tiers.map((t, index) => (
        <Card key={t.name} className={`rounded-2xl border-emerald-200/50 shadow-lg hover:shadow-2xl transition-all duration-300 hover:scale-105 bg-white/80 backdrop-blur-sm ${index === 1 ? 'ring-2 ring-emerald-600' : ''}`}>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white border-0">{t.tag}</Badge>
              <CardTitle className="text-xl font-bold text-gray-800">{t.name}</CardTitle>
            </div>
            <p className="text-gray-600 font-medium">{t.price}</p>
          </CardHeader>
          <CardContent>
            <ul className="mb-6 space-y-3 text-sm text-gray-600">
              {t.bullets.map((b) => (
                <li key={b} className="flex items-start gap-2"><Check className="mt-0.5 h-4 w-4 text-emerald-600 flex-shrink-0" />{b}</li>
              ))}
            </ul>
            <Button className="w-full rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300">{t.cta}</Button>
          </CardContent>
        </Card>
      ))}
    </div>
  </Section>
);

const FAQ = () => (
  <Section id="faq">
    <div className="mb-12 text-center">
      <h2 className="text-4xl font-bold md:text-5xl bg-gradient-to-r from-emerald-600 to-blue-500 bg-clip-text text-transparent">Questions, answered</h2>
      <p className="mt-4 text-gray-600 md:text-xl max-w-3xl mx-auto">Everything you need to know about organizing events on AHIBI.</p>
    </div>
    <div className="grid gap-6 md:grid-cols-2">
      {faqs.map((f) => (
        <Card key={f.q} className="rounded-2xl border-emerald-200/50 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 bg-white/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-lg font-bold text-gray-800">{f.q}</CardTitle>
          </CardHeader>
          <CardContent className="text-gray-600">{f.a}</CardContent>
        </Card>
      ))}
    </div>
  </Section>
);

const CTA = () => (
  <Section id="join">
    <div className="rounded-3xl bg-gradient-to-br from-emerald-600 via-teal-600 to-blue-500 p-8 md:p-12 shadow-2xl">
      <div className="grid items-center gap-8 md:grid-cols-2">
        <div>
          <h3 className="text-3xl font-bold md:text-5xl text-white">Ready to organize unforgettable events?</h3>
          <p className="mt-4 text-emerald-100 md:text-xl">Join AHIBI Organizer and access the best artists, venues, and vendors. Plan smarter. Book faster. Execute flawlessly.</p>
          <div className="mt-8 flex flex-wrap gap-4">
            <Link href="/organizer/auth/signup">
            <Button size="lg" className="rounded-2xl px-8 bg-white text-emerald-600 hover:bg-gray-100 shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 font-semibold">Start planning free</Button>
            </Link>
            <Button size="lg" variant="outline" className="rounded-2xl px-8 border-2 border-white text-white hover:bg-white hover:text-emerald-600 shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 font-semibold">Contact support</Button>
          </div>
        </div>
        <div className="rounded-2xl border-2 border-white/30 bg-white/10 backdrop-blur-sm p-6">
          <div className="mb-6 flex items-center gap-2 text-sm text-white">
            <Shield className="h-5 w-5" />
            Secure platform with verified artists and venues.
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-2xl border border-white/30 bg-white/10 p-3 text-white"><Check className="mr-2 inline h-4 w-4" /> Instant bookings</div>
            <div className="rounded-2xl border border-white/30 bg-white/10 p-3 text-white"><Check className="mr-2 inline h-4 w-4" /> Budget tracking</div>
            <div className="rounded-2xl border border-white/30 bg-white/10 p-3 text-white"><Check className="mr-2 inline h-4 w-4" /> Event timeline</div>
            <div className="rounded-2xl border border-white/30 bg-white/10 p-3 text-white"><Check className="mr-2 inline h-4 w-4" /> Vendor coordination</div>
          </div>
        </div>
      </div>
    </div>
  </Section>
);

export default function AhibiOrganizerPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-emerald-50/30 to-teal-50/30">

      <main>
        <Navbar />
        <Hero />
        <FeatureGrid />
        <HowItWorks />
        {/* <Plans /> */}
        <FAQ />
        <CTA />
      </main>

      <Footer />
    </div>
  );
}
