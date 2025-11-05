"use client"

import React from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Check, CalendarClock, Sparkles, Wallet, Music, MicVocal, Headphones, MapPin, Shield, Star, ArrowRight, Search, SlidersHorizontal } from "lucide-react";
import Link from "next/link";

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
  { icon: MicVocal, label: "MC/Host" },
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
  <section id={id} className="py-14 md:py-20">
    <div className="mx-auto max-w-6xl px-4">{children}</div>
  </section>
);

const Hero = () => (
  <Section>
    <div className="grid items-center gap-10 md:grid-cols-2">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <Badge className="rounded-2xl px-3 py-1 text-sm">New on Ahibi</Badge>
        <h1 className="mt-4 text-4xl font-semibold leading-tight md:text-5xl">
          AHIBI Artist
          <span className="block text-muted-foreground">Get discovered. Booked. Paid. Repeat.</span>
        </h1>
        <p className="mt-4 text-muted-foreground md:text-lg">
          Create a credible artist profile with fees, formats, rider, and availability. Organisers find, compare, and book you in minutes.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button size="lg" className="rounded-2xl px-6">
            Create your profile
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
          <Dialog>
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
          </Dialog>
        </div>
        <div className="mt-6 flex items-center gap-6 text-sm text-muted-foreground">
          <div className="flex items-center gap-2"><Check className="h-4 w-4" /> No long emails</div>
          <div className="flex items-center gap-2"><Check className="h-4 w-4" /> Clear fees & rider</div>
          <div className="flex items-center gap-2"><Check className="h-4 w-4" /> Faster confirmations</div>
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="md:justify-self-end">
        <Card className="rounded-2xl shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl">Search snapshot for organisers</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <Input placeholder="Search artist, city, vibe" className="flex-1" />
              <Button variant="secondary" className="rounded-2xl"><Search className="h-4 w-4" /></Button>
            </div>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {categories.map(({ icon: Icon, label }) => (
                <div key={label} className="flex items-center gap-2 rounded-2xl border p-2 text-sm">
                  <Icon className="h-4 w-4" /> {label}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <div className="rounded-2xl border p-3 text-sm"><MapPin className="mr-2 inline h-4 w-4" /> Dimapur</div>
              <div className="rounded-2xl border p-3 text-sm"><Wallet className="mr-2 inline h-4 w-4" /> ₹50k–₹1L</div>
              <div className="rounded-2xl border p-3 text-sm"><CalendarClock className="mr-2 inline h-4 w-4" /> Nov–Dec</div>
            </div>
            <Button className="w-full rounded-2xl" asChild>
              <Link href="/allArtists/list">Explore artists</Link>
            </Button>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  </Section>
);

const FeatureGrid = () => (
  <Section id="features">
    <div className="mb-10">
      <h2 className="text-3xl font-semibold md:text-4xl">Built for bookings, not busywork</h2>
      <p className="mt-2 text-muted-foreground md:text-lg">Everything organisers need to say yes. Everything artists need to look pro.</p>
    </div>
    <div className="grid gap-4 md:grid-cols-3">
      {features.map((f) => (
        <Card key={f.title} className="rounded-2xl">
          <CardHeader>
            <div className="flex items-center gap-2">
              <f.icon className="h-5 w-5" />
              <CardTitle className="text-lg">{f.title}</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="text-muted-foreground">{f.text}</CardContent>
        </Card>
      ))}
    </div>
  </Section>
);

const HowItWorks = () => (
  <Section id="how">
    <div className="mb-10">
      <h2 className="text-3xl font-semibold md:text-4xl">How it works</h2>
      <p className="mt-2 text-muted-foreground md:text-lg">Three simple steps to your next stage.</p>
    </div>
    <div className="grid gap-4 md:grid-cols-3">
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
        <Card key={s.step} className="rounded-2xl">
          <CardHeader>
            <Badge className="rounded-2xl">Step {s.step}</Badge>
            <CardTitle className="mt-2">{s.title}</CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground">{s.text}</CardContent>
        </Card>
      ))}
    </div>
  </Section>
);

const Plans = () => (
  <Section id="plans">
    <div className="mb-10">
      <h2 className="text-3xl font-semibold md:text-4xl">Pick your pace</h2>
      <p className="mt-2 text-muted-foreground md:text-lg">Start free. Upgrade when you want priority and pro tools.</p>
    </div>
    <div className="grid gap-4 md:grid-cols-3">
      {tiers.map((t) => (
        <Card key={t.name} className="rounded-2xl">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="rounded-2xl">{t.tag}</Badge>
              <CardTitle>{t.name}</CardTitle>
            </div>
            <p className="text-muted-foreground">{t.price}</p>
          </CardHeader>
          <CardContent>
            <ul className="mb-4 space-y-2 text-sm text-muted-foreground">
              {t.bullets.map((b) => (
                <li key={b} className="flex items-start gap-2"><Check className="mt-0.5 h-4 w-4" />{b}</li>
              ))}
            </ul>
            <Button className="w-full rounded-2xl">{t.cta}</Button>
          </CardContent>
        </Card>
      ))}
    </div>
  </Section>
);

const FAQ = () => (
  <Section id="faq">
    <div className="mb-10">
      <h2 className="text-3xl font-semibold md:text-4xl">Questions, answered</h2>
      <p className="mt-2 text-muted-foreground md:text-lg">Short, clear, and helpful. No jargon.</p>
    </div>
    <div className="grid gap-4 md:grid-cols-2">
      {faqs.map((f) => (
        <Card key={f.q} className="rounded-2xl">
          <CardHeader>
            <CardTitle className="text-lg">{f.q}</CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground">{f.a}</CardContent>
        </Card>
      ))}
    </div>
  </Section>
);

const CTA = () => (
  <Section id="join">
    <div className="rounded-3xl bg-gradient-to-br from-muted/40 to-background p-8 md:p-12">
      <div className="grid items-center gap-8 md:grid-cols-2">
        <div>
          <h3 className="text-3xl font-semibold md:text-4xl">Ready to turn enquiries into events?</h3>
          <p className="mt-3 text-muted-foreground md:text-lg">Join AHIBI Artist and let your profile do the talking. Clear info. Faster ‘yes.’ Better gigs.</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button size="lg" className="rounded-2xl px-6">Create free profile</Button>
            <Button size="lg" variant="outline" className="rounded-2xl px-6">Talk to team</Button>
          </div>
        </div>
        <div className="rounded-2xl border p-4">
          <div className="mb-4 flex items-center gap-2 text-sm text-muted-foreground">
            <Shield className="h-4 w-4" />
            We keep your data private and only share what you choose.
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-2xl border p-3"><Check className="mr-2 inline h-4 w-4" /> Transparent fees</div>
            <div className="rounded-2xl border p-3"><Check className="mr-2 inline h-4 w-4" /> Clear rider</div>
            <div className="rounded-2xl border p-3"><Check className="mr-2 inline h-4 w-4" /> Calendar holds</div>
            <div className="rounded-2xl border p-3"><Check className="mr-2 inline h-4 w-4" /> Reviews</div>
          </div>
        </div>
      </div>
    </div>
  </Section>
);

export default function ArtistLanding() {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-2 text-lg font-semibold">
            <Sparkles className="h-5 w-5" /> AHIBI Artist
          </div>
          <nav className="hidden items-center gap-6 md:flex">
            <a href="#features" className="text-sm text-muted-foreground hover:text-foreground">Features</a>
            <a href="#how" className="text-sm text-muted-foreground hover:text-foreground">How it works</a>
            <a href="#plans" className="text-sm text-muted-foreground hover:text-foreground">Plans</a>
            <a href="#faq" className="text-sm text-muted-foreground hover:text-foreground">FAQ</a>
          </nav>
          <div className="flex items-center gap-3">
            <Button variant="ghost" className="rounded-2xl">Log in</Button>
            <Button className="rounded-2xl">Create profile</Button>
          </div>
        </div>
      </header>

      <main>
        <Hero />
        <FeatureGrid />
        <HowItWorks />
        <Plans />
        <FAQ />
        <CTA />
      </main>

      <footer className="border-t py-10">
        <div className="mx-auto max-w-6xl px-4">
          <div className="grid gap-6 md:grid-cols-3">
            <div>
              <div className="flex items-center gap-2 text-lg font-semibold"><Sparkles className="h-5 w-5" /> AHIBI</div>
              <p className="mt-2 text-sm text-muted-foreground">Event-tech from the Northeast, helping artists and organisers book smarter.</p>
            </div>
            <div className="text-sm">
              <div className="font-medium">For artists</div>
              <ul className="mt-2 space-y-1 text-muted-foreground">
                <li><a href="#features" className="hover:text-foreground">Features</a></li>
                <li><a href="#how" className="hover:text-foreground">How it works</a></li>
                <li><a href="#plans" className="hover:text-foreground">Plans</a></li>
              </ul>
            </div>
            <div className="text-sm">
              <div className="font-medium">Get in touch</div>
              <ul className="mt-2 space-y-1 text-muted-foreground">
                <li>Email: hello@ahibi.in</li>
                <li>Instagram: @ahibi.in</li>
                <li>Support: Mon–Sat</li>
              </ul>
            </div>
          </div>
          <div className="mt-8 text-xs text-muted-foreground">© {new Date().getFullYear()} AHIBI. All rights reserved.</div>
        </div>
      </footer>
    </div>
  );
}
