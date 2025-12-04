import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Check, CalendarClock, Sparkles, Wallet, Music, Mic, Headphones, MapPin, Shield, Star, ArrowRight, Search, SlidersHorizontal } from "lucide-react";
import Link from "next/link";
import Footer from "../Footer";
import Navbar from "../Navbar";

const features = [
  { icon: Search, title: "Get Discovered", text: "Your venue becomes visible to families, planners, and organizers searching by location, capacity, and budget." },
  { icon: CalendarClock, title: "Smart Booking System", text: "Real-time availability, instant confirmations, structured enquiries, and automated reminders — no more scattered WhatsApp messages." },
  { icon: Wallet, title: "Flexible Pricing", text: "Set hourly rates, full-day packages, or custom options with transparent pricing. Free listing. No convenience fees." },
  { icon: Shield, title: "Secure Bookings", text: "Verified payments, transparent cancellation policies, and booking protection in one trusted platform." },
  { icon: Sparkles, title: "Showcase Your Space", text: "Upload high-quality photos, add 360° virtual tours, and highlight the best features of your venue." },
  { icon: SlidersHorizontal, title: "Management Dashboard", text: "Track bookings, manage availability, view analytics, and respond to customers — all in one simple dashboard." },
];

const categories = [
  { icon: Music, label: "Concert Hall" },
  { icon: Headphones, label: "Banquet Hall" },
  { icon: Mic, label: "Conference Room" },
  { icon: Star, label: "Event Space" },
];

const faqs = [
  {
    q: "Who can list their venue on AHIBI?",
    a: "Event halls, banquet spaces, conference rooms, outdoor venues, auditoriums, and any space suitable for events — if you host events, you belong here.",
  },
  {
    q: "How does the booking process work?",
    a: "Customers find your venue via filters (capacity, location, facilities). They select dates and times, make secure payments through Razorpay, and receive instant confirmation.",
  },
  {
    q: "What facilities should I highlight?",
    a: "List all amenities: parking, AC, WiFi, sound system, lighting, catering, stage, power backup, accessibility features, and any unique offerings that make your venue stand out.",
  },
  {
    q: "How are payments handled?",
    a: "All payments are processed securely through Razorpay. You set your pricing (hourly/daily rates, cleaning fees, deposits), and funds are transferred after successful bookings.",
  },
  {
    q: "Is there a review system?",
    a: "Yes. Verified customers can rate and review your venue post-event. Positive reviews increase your visibility and attract more bookings.",
  },
];

const tiers = [
  {
    name: "Starter",
    tag: "Begin",
    price: "Free",
    bullets: [
      "Public venue listing & search visibility",
      "Basic booking management",
      "Photo gallery (up to 10 images)",
      "Customer reviews & ratings",
    ],
    cta: "List your venue",
  },
  {
    name: "Pro",
    tag: "Grow",
    price: "Best for active venues",
    bullets: [
      "Priority placement in searches",
      "Unlimited photo & video uploads",
      "Advanced calendar & availability",
      "Analytics & booking insights",
    ],
    cta: "Upgrade to Pro",
  },
  {
    name: "Premium",
    tag: "Scale",
    price: "For venue chains",
    bullets: [
      "Multi-venue management",
      "Custom branding & pages",
      "Dedicated account manager",
      "Priority support & marketing",
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
    <div className="grid items-center gap-10 md:grid-cols-2">
      <div>
        <h1 className="mt-4 text-4xl font-bold leading-tight md:text-6xl bg-gradient-to-r from-purple-600 via-pink-600 to-orange-500 bg-clip-text text-transparent">
          AHIBI Venue
          <span className="block text-gray-600 text-3xl md:text-4xl mt-2">Get discovered. Get booked.</span>
        </h1>
        <p className="mt-6 text-gray-600 md:text-xl leading-relaxed">
          Showcase your venue with photos, facilities and real-time availability. Families, organizers, and event planners can now find, compare and book your venue in minutes.
        </p>
        <div className="mt-8 flex flex-wrap gap-4">
          <Link href="/venue/auth/signup">
          <Button size="lg" className="rounded-2xl px-8 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300">
            List Your Venue
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
          </Link>
          <Link href="/venue/auth/login">
          <Button size="lg" className="rounded-2xl px-8 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300">
            Venue Login
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
          </Link>
          {/* <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" size="lg" className="rounded-2xl px-6">Preview form</Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>venue onboarding snapshot</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4">
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <Input placeholder="Venue name" />
                  <Input placeholder="City / Base" />
                  <Input placeholder="Phone" />
                  <Input placeholder="Email" />
                </div>
                <Tabs defaultValue="style">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="style">Style</TabsTrigger>
                    <TabsTrigger value="fees">Fees</TabsTrigger>
                    <TabsTrigger value="rider">Rider</TabsTrigger>
                  </TabsList>
                  <TabsContent value="style" className="space-y-3">
                    <div className="flex flex-wrap gap-2">
                      {[
                        "Weddings",
                        "Corporate",
                        "Clubs",
                        "College",
                        "Cultural",
                        "Festivals",
                      ].map((t) => (
                        <Badge key={t} variant="secondary" className="rounded-2xl">{t}</Badge>
                      ))}
                    </div>
                    <Textarea placeholder="Short bio (1–2 lines)" />
                  </TabsContent>
                  <TabsContent value="fees" className="space-y-3">
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                      <Input placeholder="Fee range (e.g., ₹50k–₹1L)" />
                      <Input placeholder="Advance % (e.g., 50%)" />
                    </div>
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                      <Input placeholder="Payment mode (UPI/Bank/GST)" />
                      <Input placeholder="Peak-day pricing? (Yes/No)" />
                    </div>
                  </TabsContent>
                  <TabsContent value="rider" className="space-y-3">
                    <Textarea placeholder="Key tech needs (mics, channels, stage size)" />
                    <Input placeholder="Soundcheck time (e.g., 60 min)" />
                  </TabsContent>
                </Tabs>
                <Button className="rounded-2xl">Looks good</Button>
              </div>
            </DialogContent>
          </Dialog> */}
        </div>
        <div className="mt-8 flex items-center gap-6 text-sm text-gray-600">
          <div className="flex items-center gap-2"><Check className="h-4 w-4 text-purple-600" /> Instant bookings</div>
          <div className="flex items-center gap-2"><Check className="h-4 w-4 text-purple-600" /> Secure payments</div>
          <div className="flex items-center gap-2"><Check className="h-4 w-4 text-purple-600" /> Real-time calendar</div>
        </div>
      </div>

      <div className="md:justify-self-end">
        <Card className="rounded-2xl shadow-2xl border-purple-200/50 bg-white/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-xl font-bold text-gray-800">Search snapshot for event organizers</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <Input placeholder="Search venue, city, capacity" className="flex-1 border-purple-200" />
              <Button variant="secondary" className="rounded-2xl bg-purple-100 hover:bg-purple-200 text-purple-700"><Search className="h-4 w-4" /></Button>
            </div>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {categories.map(({ icon: Icon, label }) => (
                <div key={label} className="flex items-center gap-2 rounded-2xl border border-purple-200 bg-purple-50/50 p-2 text-sm text-gray-700 hover:bg-purple-100 transition-colors">
                  <Icon className="h-4 w-4 text-purple-600" /> {label}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <div className="rounded-2xl border border-purple-200 bg-purple-50/50 p-3 text-sm text-gray-700"><MapPin className="mr-2 inline h-4 w-4 text-purple-600" /> Dimapur</div>
              <div className="rounded-2xl border border-purple-200 bg-purple-50/50 p-3 text-sm text-gray-700"><Wallet className="mr-2 inline h-4 w-4 text-purple-600" /> ₹50k–₹1L</div>
              <div className="rounded-2xl border border-purple-200 bg-purple-50/50 p-3 text-sm text-gray-700"><CalendarClock className="mr-2 inline h-4 w-4 text-purple-600" /> Nov–Dec</div>
            </div>
            <Button className="w-full rounded-2xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300" asChild>
              <Link href="/allVenues/list">Explore venues</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  </Section>
);

const FeatureGrid = () => (
  <Section id="features">
    <div className="mb-12 text-center">
      <h2 className="text-4xl font-bold md:text-5xl bg-gradient-to-r from-purple-600 to-orange-500 bg-clip-text text-transparent">Built for venues, designed for every event.</h2>
      <p className="mt-4 text-gray-600 md:text-xl max-w-3xl mx-auto">Whether it’s a birthday, wedding, workshop, concert, or corporate event—AHIBI makes booking and managing venues effortless.</p>
    </div>
    <div className="grid gap-6 md:grid-cols-3">
      {features.map((f) => (
        <Card key={f.title} className="rounded-2xl border-purple-200/50 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 bg-white/80 backdrop-blur-sm">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gradient-to-r from-purple-600 to-pink-600">
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

// Search section for discovery
const SearchSection = () => (
  <Section id="discover">
    <div className="mb-8 text-center">
      <h2 className="text-4xl font-bold md:text-5xl bg-gradient-to-r from-purple-600 to-orange-500 bg-clip-text text-transparent">Find the perfect venue for any event</h2>
      <p className="mt-2 text-gray-600">Use smart filters to discover venues by location, capacity, budget and facilities</p>
    </div>
    <Card className="rounded-2xl shadow-2xl border-purple-200/50 bg-white/80 backdrop-blur-sm">
      <CardContent className="space-y-4 pt-6">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <Input placeholder="City or Area" className="border-purple-200" />
          <Input placeholder="Capacity (e.g., 100-500)" className="border-purple-200" />
          <Input placeholder="Budget (e.g., ₹50k–₹1L)" className="border-purple-200" />
          <Input placeholder="Facilities (Parking, AC, Stage)" className="border-purple-200" />
        </div>
        <div className="flex justify-between items-center">
          <div className="flex flex-wrap gap-2 text-sm text-gray-700">
            {["Banquet Hall", "Auditorium", "Conference Room", "Open Air"].map((t) => (
              <Badge key={t} variant="secondary" className="rounded-2xl">{t}</Badge>
            ))}
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" className="rounded-2xl bg-purple-100 hover:bg-purple-200 text-purple-700"><Search className="h-4 w-4 mr-2" />Search</Button>
            <Button className="rounded-2xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700" asChild>
              <Link href="/allVenues/list">Book Your Venue</Link>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  </Section>
);

const HowItWorks = () => (
  <Section id="how">
    <div className="mb-12 text-center">
      <h2 className="text-4xl font-bold md:text-5xl bg-gradient-to-r from-purple-600 to-orange-500 bg-clip-text text-transparent">How it works</h2>
      <p className="mt-4 text-gray-600 md:text-xl max-w-3xl mx-auto">Three simple steps to start earning from your venue.</p>
    </div>
    <div className="grid gap-6 md:grid-cols-3">
      {[{
        step: 1,
        title: "List your venue",
        text: "Add photos, facilities, capacity, pricing, and set your availability calendar.",
      }, {
        step: 2,
        title: "Get bookings",
        text: "Organizers filter by location, capacity, facilities, and book your venue with secure payments.",
      }, {
        step: 3,
        title: "Host & earn",
        text: "AHIBI handles payments, reviews, and bookings so you focus on providing great experiences.",
      }].map((s) => (
        <Card key={s.step} className="rounded-2xl border-purple-200/50 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 bg-white/80 backdrop-blur-sm">
          <CardHeader>
            <Badge className="rounded-2xl bg-gradient-to-r from-purple-600 to-pink-600 text-white border-0">Step {s.step}</Badge>
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
      <h2 className="text-4xl font-bold md:text-5xl bg-gradient-to-r from-purple-600 to-orange-500 bg-clip-text text-transparent">Choose your plan</h2>
      <p className="mt-4 text-gray-600 md:text-xl max-w-3xl mx-auto">Start free. Upgrade when you need advanced features and priority visibility.</p>
    </div>
    <div className="grid gap-6 md:grid-cols-3">
      {tiers.map((t, index) => (
        <Card key={t.name} className={`rounded-2xl border-purple-200/50 shadow-lg hover:shadow-2xl transition-all duration-300 hover:scale-105 bg-white/80 backdrop-blur-sm ${index === 1 ? 'ring-2 ring-purple-600' : ''}`}>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="rounded-2xl bg-gradient-to-r from-purple-600 to-pink-600 text-white border-0">{t.tag}</Badge>
              <CardTitle className="text-xl font-bold text-gray-800">{t.name}</CardTitle>
            </div>
            <p className="text-gray-600 font-medium">{t.price}</p>
          </CardHeader>
          <CardContent>
            <ul className="mb-6 space-y-3 text-sm text-gray-600">
              {t.bullets.map((b) => (
                <li key={b} className="flex items-start gap-2"><Check className="mt-0.5 h-4 w-4 text-purple-600 flex-shrink-0" />{b}</li>
              ))}
            </ul>
            <Button className="w-full rounded-2xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300">{t.cta}</Button>
          </CardContent>
        </Card>
      ))}
    </div>
  </Section>
);

const FAQ = () => (
  <Section id="faq">
    <div className="mb-12 text-center">
      <h2 className="text-4xl font-bold md:text-5xl bg-gradient-to-r from-purple-600 to-orange-500 bg-clip-text text-transparent">Questions, answered</h2>
      <p className="mt-4 text-gray-600 md:text-xl max-w-3xl mx-auto">Short, clear, and helpful. No jargon.</p>
    </div>
    <div className="grid gap-6 md:grid-cols-2">
      {faqs.map((f) => (
        <Card key={f.q} className="rounded-2xl border-purple-200/50 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 bg-white/80 backdrop-blur-sm">
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
    <div className="rounded-3xl bg-gradient-to-br from-purple-600 via-pink-600 to-orange-500 p-8 md:p-12 shadow-2xl">
      <div className="grid items-center gap-8 md:grid-cols-2">
        <div>
          <h3 className="text-3xl font-bold md:text-5xl text-white">Ready to maximize your venue bookings?</h3>
          <p className="mt-4 text-purple-100 md:text-xl">Join AHIBI Venue and let your space shine. Professional listings. Instant bookings. Better revenue.</p>
          <div className="mt-8 flex flex-wrap gap-4">
            <Link href="/venue/auth/signup">
            <Button size="lg" className="rounded-2xl px-8 bg-white text-purple-600 hover:bg-gray-100 shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 font-semibold">List your venue free</Button>
            </Link>
            <Button size="lg" variant="outline" className="rounded-2xl px-8 border-2 border-white text-purple-600 hover:bg-white hover:text-purple-600 shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 font-semibold">Contact support</Button>
          </div>
        </div>
        <div className="rounded-2xl border-2 border-white/30 bg-white/10 backdrop-blur-sm p-6">
          <div className="mb-6 flex items-center gap-2 text-sm text-white">
            <Shield className="h-5 w-5" />
            We keep your data private and only share what you choose.
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-2xl border border-white/30 bg-white/10 p-3 text-white"><Check className="mr-2 inline h-4 w-4" /> Secure payments</div>
            <div className="rounded-2xl border border-white/30 bg-white/10 p-3 text-white"><Check className="mr-2 inline h-4 w-4" /> Smart calendar</div>
            <div className="rounded-2xl border border-white/30 bg-white/10 p-3 text-white"><Check className="mr-2 inline h-4 w-4" /> Instant bookings</div>
            <div className="rounded-2xl border border-white/30 bg-white/10 p-3 text-white"><Check className="mr-2 inline h-4 w-4" /> Customer reviews</div>
          </div>
        </div>
      </div>
    </div>
  </Section>
);

export default function AhibiVenuePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-purple-50/30 to-pink-50/30">

      <main>
        <Navbar />
        <Hero />
        <SearchSection />
        <FeatureGrid />
        <HowItWorks />
        <Plans />
        <FAQ />
        <CTA />
      </main>

      <Footer />
    </div>
  );
}
