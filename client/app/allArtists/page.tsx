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
  { icon: Search, title: "Get Discovered", text: "Your profile appears in organiser searches with category, vibe, and budget filters." },
  { icon: CalendarClock, title: "Frictionless Booking", text: "Clear availability, instant enquiries, and smart reminders to close faster." },
  { icon: Wallet, title: "Transparent Fees", text: "Show fee ranges, advances, peak-day pricing, and payment preferences upfront." },
  { icon: Shield, title: "Safe & Clear Terms", text: "Contracts, licenses, cancel/reschedule and security notes in one place." },
  { icon: Sparkles, title: "Brand & Growth", text: "Add reels, press kits, rider, and get help with marketing, PR, and content." },
  { icon: SlidersHorizontal, title: "Manager Toolkit", text: "Ahibi doubles as your web-based manager: profile, rider, settlements, and reviews." },
];

const categories = [
  { icon: Music, label: "Singer/Band" },
  { icon: Headphones, label: "DJ" },
  { icon: Mic, label: "MC/Host" },
  { icon: Star, label: "Performer" },
];

const faqs = [
  {
    q: "Who can join AHIBI Artist?",
    a: "Singers, bands, DJs, MCs, comedians, dancers, instrumentalists, cultural and visual performers — if you perform, you belong here.",
  },
  {
    q: "How does booking work?",
    a: "Organisers find you via filters. They send an enquiry with date, city, budget, and tech setup. You accept with clear terms and Ahibi logs it all.",
  },
  {
    q: "Do I need a tech rider?",
    a: "Not mandatory. You can start simple and upload a rider later. We provide a guided template inside your profile.",
  },
  {
    q: "Fees and payments?",
    a: "You set your range and advance. Choose UPI, bank transfer, and GST invoice. Everything is stated before confirmation.",
  },
  {
    q: "Is there a review system?",
    a: "Yes. Verified organisers can rate post-event. Great work compounds into better visibility.",
  },
];

const tiers = [
  {
    name: "Starter",
    tag: "Begin",
    price: "Free",
    bullets: [
      "Public profile & search visibility",
      "Enquiries and lead inbox",
      "Basic rider fields",
      "Reviews & ratings",
    ],
    cta: "Create free profile",
  },
  {
    name: "Pro",
    tag: "Grow",
    price: "Best for active artists",
    bullets: [
      "Priority placement in searches",
      "Advanced rider + file uploads",
      "Booking calendar & holds",
      "Marketing boosts & insights",
    ],
    cta: "Unlock Pro",
  },
  {
    name: "Studio",
    tag: "Scale",
    price: "For teams",
    bullets: [
      "Multi-member management",
      "Contracts & settlements",
      "Branded press kit pages",
      "Priority support",
    ],
    cta: "Talk to us",
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
        <h1 className="mt-4 text-4xl font-bold leading-tight md:text-6xl bg-gradient-to-r from-indigo-600 via-blue-600 to-cyan-500 bg-clip-text text-transparent">
          AHIBI Artist
          <span className="block text-gray-600 text-3xl md:text-4xl mt-2">Get discovered. Booked. Paid. Repeat.</span>
        </h1>
        <p className="mt-6 text-gray-600 md:text-xl leading-relaxed">
          Create a credible artist profile with fees, formats, rider, and availability. Organisers find, compare, and book you in minutes.
        </p>
        <div className="mt-8 flex flex-wrap gap-4">
          <Link href="/artist/auth/signup">
          <Button size="lg" className="rounded-2xl px-8 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300">
            Create your profile
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
          </Link>
          <Link href="/artist/auth/login">
          <Button size="lg" className="rounded-2xl px-8 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300">
            Login
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
          </Link>
          {/* <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" size="lg" className="rounded-2xl px-6">Preview form</Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Artist onboarding snapshot</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4">
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <Input placeholder="Stage name" />
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
          <div className="flex items-center gap-2"><Check className="h-4 w-4 text-indigo-600" /> No long emails</div>
          <div className="flex items-center gap-2"><Check className="h-4 w-4 text-indigo-600" /> Clear fees & rider</div>
          <div className="flex items-center gap-2"><Check className="h-4 w-4 text-indigo-600" /> Faster confirmations</div>
        </div>
      </div>

      <div className="md:justify-self-end">
        <Card className="rounded-2xl shadow-2xl border-indigo-200/50 bg-white/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-xl font-bold text-gray-800">Search snapshot for organisers</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <Input placeholder="Search artist, city, vibe" className="flex-1 border-indigo-200" />
              <Button variant="secondary" className="rounded-2xl bg-indigo-100 hover:bg-indigo-200 text-indigo-700"><Search className="h-4 w-4" /></Button>
            </div>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {categories.map(({ icon: Icon, label }) => (
                <div key={label} className="flex items-center gap-2 rounded-2xl border border-indigo-200 bg-indigo-50/50 p-2 text-sm text-gray-700 hover:bg-indigo-100 transition-colors">
                  <Icon className="h-4 w-4 text-indigo-600" /> {label}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <div className="rounded-2xl border border-indigo-200 bg-indigo-50/50 p-3 text-sm text-gray-700"><MapPin className="mr-2 inline h-4 w-4 text-indigo-600" /> Dimapur</div>
              <div className="rounded-2xl border border-indigo-200 bg-indigo-50/50 p-3 text-sm text-gray-700"><Wallet className="mr-2 inline h-4 w-4 text-indigo-600" /> ₹50k–₹1L</div>
              <div className="rounded-2xl border border-indigo-200 bg-indigo-50/50 p-3 text-sm text-gray-700"><CalendarClock className="mr-2 inline h-4 w-4 text-indigo-600" /> Nov–Dec</div>
            </div>
            <Button className="w-full rounded-2xl bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-700 hover:to-cyan-700 shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300" asChild>
              <Link href="/allArtists/list">Explore artists</Link>
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
      <h2 className="text-4xl font-bold md:text-5xl bg-gradient-to-r from-indigo-600 to-cyan-500 bg-clip-text text-transparent">Built for bookings, not busywork</h2>
      <p className="mt-4 text-gray-600 md:text-xl max-w-3xl mx-auto">Everything organisers need to say yes. Everything artists need to look pro.</p>
    </div>
    <div className="grid gap-6 md:grid-cols-3">
      {features.map((f) => (
        <Card key={f.title} className="rounded-2xl border-indigo-200/50 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 bg-white/80 backdrop-blur-sm">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gradient-to-r from-indigo-600 to-cyan-600">
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
      <h2 className="text-4xl font-bold md:text-5xl bg-gradient-to-r from-indigo-600 to-cyan-500 bg-clip-text text-transparent">How it works</h2>
      <p className="mt-4 text-gray-600 md:text-xl max-w-3xl mx-auto">Three simple steps to your next stage.</p>
    </div>
    <div className="grid gap-6 md:grid-cols-3">
      {[{
        step: 1,
        title: "Create your profile",
        text: "Add bio, formats, fee range, rider basics, and availability.",
      }, {
        step: 2,
        title: "Get matched",
        text: "Organisers filter by city, budget, vibe, and book you with clear terms.",
      }, {
        step: 3,
        title: "Perform & get paid",
        text: "Ahibi logs the gig, reviews, and settlements so you focus on the show.",
      }].map((s) => (
        <Card key={s.step} className="rounded-2xl border-indigo-200/50 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 bg-white/80 backdrop-blur-sm">
          <CardHeader>
            <Badge className="rounded-2xl bg-gradient-to-r from-indigo-600 to-cyan-600 text-white border-0">Step {s.step}</Badge>
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
      <h2 className="text-4xl font-bold md:text-5xl bg-gradient-to-r from-indigo-600 to-cyan-500 bg-clip-text text-transparent">Pick your pace</h2>
      <p className="mt-4 text-gray-600 md:text-xl max-w-3xl mx-auto">Start free. Upgrade when you want priority and pro tools.</p>
    </div>
    <div className="grid gap-6 md:grid-cols-3">
      {tiers.map((t, index) => (
        <Card key={t.name} className={`rounded-2xl border-indigo-200/50 shadow-lg hover:shadow-2xl transition-all duration-300 hover:scale-105 bg-white/80 backdrop-blur-sm ${index === 1 ? 'ring-2 ring-indigo-600' : ''}`}>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="rounded-2xl bg-gradient-to-r from-indigo-600 to-cyan-600 text-white border-0">{t.tag}</Badge>
              <CardTitle className="text-xl font-bold text-gray-800">{t.name}</CardTitle>
            </div>
            <p className="text-gray-600 font-medium">{t.price}</p>
          </CardHeader>
          <CardContent>
            <ul className="mb-6 space-y-3 text-sm text-gray-600">
              {t.bullets.map((b) => (
                <li key={b} className="flex items-start gap-2"><Check className="mt-0.5 h-4 w-4 text-indigo-600 flex-shrink-0" />{b}</li>
              ))}
            </ul>
            <Button className="w-full rounded-2xl bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-700 hover:to-cyan-700 shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300">{t.cta}</Button>
          </CardContent>
        </Card>
      ))}
    </div>
  </Section>
);

const FAQ = () => (
  <Section id="faq">
    <div className="mb-12 text-center">
      <h2 className="text-4xl font-bold md:text-5xl bg-gradient-to-r from-indigo-600 to-cyan-500 bg-clip-text text-transparent">Questions, answered</h2>
      <p className="mt-4 text-gray-600 md:text-xl max-w-3xl mx-auto">Short, clear, and helpful. No jargon.</p>
    </div>
    <div className="grid gap-6 md:grid-cols-2">
      {faqs.map((f) => (
        <Card key={f.q} className="rounded-2xl border-indigo-200/50 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 bg-white/80 backdrop-blur-sm">
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
    <div className="rounded-3xl bg-gradient-to-br from-indigo-600 via-blue-600 to-cyan-600 p-8 md:p-12 shadow-2xl">
      <div className="grid items-center gap-8 md:grid-cols-2">
        <div>
          <h3 className="text-3xl font-bold md:text-5xl text-white">Ready to turn enquiries into events?</h3>
          <p className="mt-4 text-indigo-100 md:text-xl">Join AHIBI Artist and let your profile do the talking. Clear info. Faster 'yes.' Better gigs.</p>
          <div className="mt-8 flex flex-wrap gap-4">
            <Button size="lg" className="rounded-2xl px-8 bg-white text-indigo-600 hover:bg-gray-100 shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 font-semibold">Create free profile</Button>
            <Button size="lg" variant="outline" className="rounded-2xl px-8 border-2 border-white text-indigo-600 hover:bg-white hover:text-indigo-600 shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 font-semibold">Talk to team</Button>
          </div>
        </div>
        <div className="rounded-2xl border-2 border-white/30 bg-white/10 backdrop-blur-sm p-6">
          <div className="mb-6 flex items-center gap-2 text-sm text-white">
            <Shield className="h-5 w-5" />
            We keep your data private and only share what you choose.
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-2xl border border-white/30 bg-white/10 p-3 text-white"><Check className="mr-2 inline h-4 w-4" /> Transparent fees</div>
            <div className="rounded-2xl border border-white/30 bg-white/10 p-3 text-white"><Check className="mr-2 inline h-4 w-4" /> Clear rider</div>
            <div className="rounded-2xl border border-white/30 bg-white/10 p-3 text-white"><Check className="mr-2 inline h-4 w-4" /> Calendar holds</div>
            <div className="rounded-2xl border border-white/30 bg-white/10 p-3 text-white"><Check className="mr-2 inline h-4 w-4" /> Reviews</div>
          </div>
        </div>
      </div>
    </div>
  </Section>
);

export default function AhibiArtistPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-indigo-50/30 to-cyan-50/30">

      <main>
        <Navbar />
        <Hero />
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
