import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Check, CalendarClock, Sparkles, Wallet, Music, Mic, Headphones, MapPin, Shield, Star, ArrowRight, Search, SlidersHorizontal, Users, Building2, Calendar, Heart, ChevronRight, TrendingUp, Clock, DollarSign, BarChart3, Zap, Target } from "lucide-react";
import Link from "next/link";
import Footer from "../Footer";
import Navbar from "../Navbar";

type VenueApiItem = {
  _id: string;
  name: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
  };
  capacity?: number;
  capacityDetails?: {
    standingCapacity?: number;
  };
  pricing?: {
    basePrice?: number;
  };
  rating?: {
    average?: number;
    count?: number;
  };
  venueClassification?: {
    venueTypes?: string[];
  };
  gallery?: Array<{ url?: string; isMain?: boolean }>;
  documents?: {
    venueImages?: Array<{ url?: string; isMain?: boolean }>;
  };
};

const features = [
  { icon: Search, title: "Get Discovered", text: "Reach thousands of event organizers searching for the perfect venue." },
  { icon: CalendarClock, title: "Real-Time Bookings", text: "Automated scheduling with instant confirmations and calendar sync." },
  { icon: Wallet, title: "Smart Pricing", text: "Set dynamic pricing by hour, day, or custom packages." },
  { icon: BarChart3, title: "Analytics Dashboard", text: "Track bookings, revenue, and customer insights in one place." },
];

const venueTypes = [
  { icon: Building2, label: "Banquet Halls" },
  { icon: Music, label: "Concert Venues" },
  { icon: Mic, label: "Conference Rooms" },
  { icon: Users, label: "Event Spaces" },
  { icon: Sparkles, label: "Party Halls" },
  { icon: Calendar, label: "Meeting Rooms" },
];

const getVenueImageUrl = (venue: VenueApiItem) => {
  const gallery = Array.isArray(venue.gallery) ? venue.gallery : [];
  const venueImages = Array.isArray(venue.documents?.venueImages) ? venue.documents?.venueImages || [] : [];
  const all = [...gallery, ...venueImages];
  return (
    all.find((img) => img?.isMain && img?.url)?.url ||
    all.find((img) => img?.url)?.url ||
    "https://images.unsplash.com/photo-1519167758481-83f550bb49b3"
  );
};

const formatVenueType = (venue: VenueApiItem) => {
  const type = venue.venueClassification?.venueTypes?.[0];
  if (!type) return "Venue";
  return type.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
};

const formatCapacityLabel = (venue: VenueApiItem) => {
  const cap = venue.capacityDetails?.standingCapacity ?? venue.capacity;
  if (!cap || cap <= 0) return "Capacity on request";
  return `${cap}+ guests`;
};

const formatPriceLabel = (venue: VenueApiItem) => {
  const base = venue.pricing?.basePrice;
  if (!base || base <= 0) return "Price on request";
  return `₹${base.toLocaleString("en-IN")}/day`;
};

const toFeaturedVenueCard = (venue: VenueApiItem) => {
  const location = [venue.address?.city, venue.address?.state].filter(Boolean).join(", ") || "Location not provided";
  return {
    id: venue._id,
    name: venue.name,
    location,
    capacity: formatCapacityLabel(venue),
    price: formatPriceLabel(venue),
    rating: venue.rating?.average ?? 0,
    reviews: venue.rating?.count ?? 0,
    type: formatVenueType(venue),
    image: getVenueImageUrl(venue),
  };
};

const eventCategories = [
  {
    title: "Corporate Events",
    count: "2000+ venues",
    image: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=300&h=200&fit=crop",
    color: "bg-blue-50",
    description: "Conferences, seminars, team building"
  },
  {
    title: "Social Gatherings",
    count: "1500+ venues",
    image: "https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?w=300&h=200&fit=crop",
    color: "bg-purple-50",
    description: "Parties, celebrations, receptions"
  },
  {
    title: "Workshops & Training",
    count: "800+ venues",
    image: "https://images.unsplash.com/photo-1591115765373-5207764f72e7?w=300&h=200&fit=crop",
    color: "bg-green-50",
    description: "Classes, seminars, skill development"
  },
  {
    title: "Entertainment Events",
    count: "1200+ venues",
    image: "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=300&h=200&fit=crop",
    color: "bg-orange-50",
    description: "Concerts, shows, performances"
  },
];

const whyJoin = [
  {
    icon: TrendingUp,
    title: "Increase Revenue",
    description: "Fill empty slots and maximize your venue's earning potential with our smart booking system.",
    stat: "40% avg. revenue increase"
  },
  {
    icon: Clock,
    title: "Save Time",
    description: "Automate booking management, payments, and customer communication. Focus on what matters.",
    stat: "15 hrs saved weekly"
  },
  {
    icon: Target,
    title: "Reach More Customers",
    description: "Get discovered by thousands of event organizers actively searching for venues like yours.",
    stat: "5000+ monthly visitors"
  },
  {
    icon: Shield,
    title: "Secure & Reliable",
    description: "Protected payments, verified bookings, and comprehensive insurance coverage for peace of mind.",
    stat: "100% payment guarantee"
  },
];

const howToJoin = [
  {
    step: 1,
    title: "Create Your Account",
    description: "Sign up in under 2 minutes with your basic venue information. It's completely free to start.",
    duration: "2 minutes",
    icon: Users
  },
  {
    step: 2,
    title: "Complete Your Profile",
    description: "Add photos, amenities, pricing, and availability. Our team helps you optimize your listing.",
    duration: "15 minutes",
    icon: Building2
  },
  {
    step: 3,
    title: "Go Live & Get Bookings",
    description: "Once approved, your venue appears in search results. Start receiving booking requests instantly.",
    duration: "24 hours",
    icon: Zap
  },
  {
    step: 4,
    title: "Manage & Grow",
    description: "Use our dashboard to manage bookings, track revenue, and grow your business with insights.",
    duration: "Ongoing",
    icon: BarChart3
  },
];

const benefits = [
  { text: "No upfront costs or setup fees", icon: DollarSign },
  { text: "Instant booking confirmations", icon: Zap },
  { text: "Secure payment processing", icon: Shield },
  { text: "24/7 customer support", icon: Clock },
  { text: "Marketing & promotion included", icon: TrendingUp },
  { text: "Easy calendar management", icon: Calendar },
];

const faqs = [
  {
    q: "What types of venues can join AHIBI?",
    a: "Any venue that hosts events! This includes banquet halls, conference rooms, party venues, outdoor spaces, auditoriums, meeting rooms, theaters, sports facilities, and more. If people can gather and hold events at your location, you're welcome to join.",
  },
  {
    q: "How much does it cost to list my venue?",
    a: "Creating an account and listing your venue is completely free. We only earn when you earn - a small commission is taken from successful bookings. No hidden fees, no monthly charges, no surprises.",
  },
  {
    q: "How do I get paid?",
    a: "Payments are processed securely through Razorpay. When a booking is confirmed and the event is completed, funds are automatically transferred to your registered bank account within 3-5 business days. You can track all transactions in your dashboard.",
  },
  {
    q: "Can I control my availability and pricing?",
    a: "Absolutely! You have full control over your calendar, pricing, and booking rules. Set different rates for weekdays/weekends, peak seasons, or specific time slots. Block dates when you're unavailable. Update anytime.",
  },
  {
    q: "What if I need to cancel a booking?",
    a: "While we encourage honoring confirmed bookings, we understand emergencies happen. You can cancel bookings through your dashboard. Cancellation policies and any applicable penalties are clearly outlined in your vendor agreement.",
  },
  {
    q: "How long does verification take?",
    a: "Most venue applications are reviewed and approved within 24-48 hours. We verify ownership, check facility details, and ensure quality standards. You'll receive an email once your venue is live and ready to accept bookings.",
  },
];

const tiers = [
  {
    name: "Starter",
    tag: "Free Forever",
    price: "₹0/month",
    commission: "8% per booking",
    bullets: [
      "Public venue listing",
      "Basic booking management",
      "Up to 10 photos",
      "Email support",
      "Customer reviews",
      "Standard search visibility"
    ],
    cta: "Start Free",
    popular: false
  },
  {
    name: "Professional",
    tag: "Most Popular",
    price: "₹2,999/month",
    commission: "5% per booking",
    bullets: [
      "Everything in Starter",
      "Priority search placement",
      "Unlimited photos & videos",
      "Advanced analytics",
      "Promotional features",
      "Priority support"
    ],
    cta: "Upgrade to Pro",
    popular: true
  },
  {
    name: "Enterprise",
    tag: "For Venue Chains",
    price: "Custom Pricing",
    commission: "3% per booking",
    bullets: [
      "Everything in Professional",
      "Multi-venue management",
      "Custom branding",
      "Dedicated account manager",
      "API access",
      "White-label options"
    ],
    cta: "Contact Sales",
    popular: false
  },
];

const Section = ({ children, id, className = "" }: { children: React.ReactNode; id?: string; className?: string }) => (
  <section id={id} className={`py-8 md:py-16 lg:py-20 ${className}`}>
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">{children}</div>
  </section>
);

const Hero = () => (
  <div className="relative min-h-[420px] sm:min-h-[460px] md:h-[540px] lg:h-[640px] overflow-hidden">
    {/* Background Image */}
    <div className="absolute inset-0">
      <img
        src="https://images.unsplash.com/photo-1511578314322-379afb476865?w=1600&h=900&fit=crop"
        alt="Event venue"
        className="w-full h-full object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/70"></div>
    </div>

    {/* Content */}
    <div className="relative h-full flex items-center justify-center">
      <div className="text-center px-4 sm:px-6 max-w-5xl mx-auto">

        <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4 md:mb-6 drop-shadow-2xl leading-tight">
          Turn Your Venue Into a<br className="hidden sm:block" />
          <span className="text-pink-400">Profitable Business</span>
        </h1>
        <p className="text-base sm:text-lg md:text-xl lg:text-2xl text-white/95 mb-6 sm:mb-8 md:mb-10 max-w-3xl mx-auto drop-shadow-lg">
          List your space. Get discovered. Accept bookings online. <br className="hidden md:block" />
          Start earning more from your venue today.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-center max-w-lg mx-auto">
          <Link href="/venue/auth/signup" className="w-full sm:w-auto">
            <Button size="lg" className="w-full sm:w-auto bg-pink-600 hover:bg-pink-700 text-white px-8 md:px-10 py-6 text-base md:text-lg font-semibold shadow-2xl">
              List Your Venue Free
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
          <Link href="#how-to-join" className="w-full sm:w-auto">
            <Button size="lg" variant="outline" className="w-full sm:w-auto border-2 border-white text-white hover:bg-white hover:text-gray-900 px-8 md:px-10 py-6 text-base md:text-lg font-semibold backdrop-blur-sm bg-white/10">
              See How It Works
            </Button>
          </Link>
        </div>

        <div className="mt-6 sm:mt-8 md:mt-10 flex flex-wrap justify-center items-center gap-3 md:gap-6 text-xs sm:text-sm md:text-base text-white/90">
          <div className="flex items-center gap-2">
            <Check className="h-5 w-5 text-pink-400" />
            <span>Free to start</span>
          </div>
          <div className="flex items-center gap-2">
            <Check className="h-5 w-5 text-pink-400" />
            <span>No setup fees</span>
          </div>
          <div className="flex items-center gap-2">
            <Check className="h-5 w-5 text-pink-400" />
            <span>Live in 24 hours</span>
          </div>
        </div>
      </div>
    </div>
  </div>
);

const PopularVenuesList = ({ featuredVenues }: { featuredVenues: ReturnType<typeof toFeaturedVenueCard>[] }) => (
  <Section className="bg-gray-50">
    <div className="flex items-center justify-between mb-6 md:mb-8">
      <div>
        <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-gray-900 mb-2">Featured Venues</h2>
        <p className="text-gray-600 text-sm md:text-base">Successful venues already earning on AHiBi</p>
      </div>
      <Link href="/allVenues/list">
        <Button variant="link" className="text-pink-600 hover:text-pink-700 hidden md:flex">
          View all <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </Link>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
      {featuredVenues.map((venue) => (
        <Link key={venue.id} href={`/allVenues/${venue.id}`} className="block">
          <Card className="overflow-hidden hover:shadow-xl transition-all duration-300 cursor-pointer border-0 group h-full">
          <div className="aspect-[4/3] overflow-hidden relative">
            <img
              src={venue.image}
              alt={venue.name}
              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
            />
            <Badge className="absolute top-3 left-3 bg-pink-600 hover:bg-pink-700 text-white border-0">
              {venue.type}
            </Badge>
          </div>
          <CardContent className="p-4 md:p-5">
            <h3 className="font-semibold text-lg md:text-xl text-gray-900 mb-2">{venue.name}</h3>
            <p className="text-sm text-gray-600 mb-3 flex items-center">
              <MapPin className="h-4 w-4 mr-1 flex-shrink-0" />
              {venue.location}
            </p>
            <div className="flex items-center justify-between text-sm mb-3">
              <span className="text-gray-600 flex items-center">
                <Users className="h-4 w-4 mr-1 flex-shrink-0" />
                {venue.capacity}
              </span>
              <span className="font-semibold text-pink-600 text-base">{venue.price}</span>
            </div>
            <div className="flex items-center text-sm border-t pt-3">
              <Star className="h-4 w-4 fill-yellow-400 text-yellow-400 mr-1" />
              <span className="font-medium">{venue.rating}</span>
              <span className="text-gray-500 ml-1">({venue.reviews} reviews)</span>
            </div>
          </CardContent>
          </Card>
        </Link>
      ))}

      <Link href="/allVenues/list" className="block">
        <Card className="overflow-hidden hover:shadow-xl transition-all duration-300 cursor-pointer border-0 group h-full">
          <CardContent className="p-0 h-full">
            <div className="relative h-full min-h-[320px] flex flex-col items-center justify-center p-6 text-center bg-gradient-to-br from-pink-600 via-purple-600 to-indigo-700">
              <div
                className="absolute inset-0 opacity-20"
                style={{
                  backgroundImage: "radial-gradient(#ffffff 1px, transparent 1px)",
                  backgroundSize: "18px 18px",
                }}
              />
              <div className="relative">
                <div className="w-14 h-14 rounded-2xl bg-white/15 border border-white/20 flex items-center justify-center mb-4 backdrop-blur-sm mx-auto">
                  <Building2 className="h-7 w-7 text-white" />
                </div>
                <h3 className="text-white text-xl font-bold mb-2">View All Venues</h3>
                <p className="text-white/90 text-sm mb-5 max-w-xs mx-auto">
                  Browse every verified venue, filter by city and capacity, and book instantly.
                </p>
                <Button className="bg-white text-pink-700 hover:bg-white/90 font-semibold">
                  Explore Venues
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </Link>
    </div>
  </Section>
);
const VenueCardSection = () => (
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
          VENUE
        </div>

        {/* heading */}
        <h1 className="mt-6 text-3xl sm:text-4xl md:text-5xl font-extrabold text-gray-900 leading-tight">
          List your{" "}
          <span className="text-red-600">Venue Space</span>
        </h1>

        {/* subtext */}
        <p className="mt-4 text-sm sm:text-base text-gray-600">
          The right audience. Live in under{" "}
          <span className="font-semibold text-gray-900">5 minutes.</span>
        </p>

        {/* CTA */}
        <div className="mt-8">
          <Link href="/venue/dashboard">
            <button className="rounded-full bg-red-600 px-10 py-4 text-sm sm:text-base font-semibold text-white shadow-lg hover:bg-red-700 transition">
              GET STARTED
            </button>
          </Link>
        </div>
      </div>
    </div>
  </section>
);



const WhyJoinSection = () => (
  <Section id="why-join">
    <div className="text-center mb-10 md:mb-12">
      <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
        Why Venue Owners Choose AHiBi
      </h2>
      <p className="text-gray-600 text-base md:text-lg max-w-3xl mx-auto">
        Join thousands of venue owners who are growing their business with our platform
      </p>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
      {whyJoin.map((item, index) => (
        <Card key={index} className="border-0 shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden group">
          <CardContent className="p-6 md:p-8">
            <div className="flex items-start gap-4 md:gap-6">
              <div className="p-3 md:p-4 rounded-xl bg-pink-100 group-hover:bg-pink-600 transition-colors duration-300 flex-shrink-0">
                <item.icon className="h-6 w-6 md:h-8 md:w-8 text-pink-600 group-hover:text-white transition-colors duration-300" />
              </div>
              <div className="flex-1">
                <h3 className="text-xl md:text-2xl font-bold text-gray-900 mb-2">{item.title}</h3>
                <p className="text-gray-600 mb-4 text-sm md:text-base">{item.description}</p>
                <Badge variant="secondary" className="bg-pink-100 text-pink-700 border-0 text-sm">
                  {item.stat}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  </Section>
);

const HowToJoinSection = () => (
  <Section id="how-to-join" className="bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50">
    <div className="text-center mb-10 md:mb-16">
      <Badge className="mb-4 bg-pink-600 hover:bg-pink-700 text-white border-0 px-4 py-1.5">
        Simple Process
      </Badge>
      <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
        How to Join AHiBi
      </h2>
      <p className="text-gray-600 text-base md:text-lg max-w-3xl mx-auto">
        Get your venue listed and start accepting bookings in just 4 easy steps
      </p>
    </div>

    <div className="max-w-5xl mx-auto">
      {howToJoin.map((item, index) => (
        <div key={index} className="relative mb-8 md:mb-12 last:mb-0">
          {/* Connection Line */}
          {index < howToJoin.length - 1 && (
            <div className="absolute left-6 md:left-8 top-20 md:top-24 w-0.5 h-full bg-gradient-to-b from-pink-300 to-purple-300 -z-10"></div>
          )}

          <Card className="border-0 shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden">
            <CardContent className="p-6 md:p-8">
              <div className="flex flex-col md:flex-row items-start gap-6">
                {/* Step Number */}
                <div className="flex items-center gap-4 md:gap-6 w-full md:w-auto">
                  <div className="relative flex-shrink-0">
                    <div className="w-12 h-12 md:w-16 md:h-16 rounded-full bg-gradient-to-br from-pink-600 to-purple-600 flex items-center justify-center text-white text-xl md:text-2xl font-bold shadow-lg">
                      {item.step}
                    </div>
                  </div>
                  <div className="md:hidden flex-1">
                    <h3 className="text-xl font-bold text-gray-900 mb-1">{item.title}</h3>
                    <Badge variant="secondary" className="bg-pink-100 text-pink-700 border-0 text-xs">
                      <Clock className="h-3 w-3 mr-1" />
                      {item.duration}
                    </Badge>
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1 w-full">
                  <div className="hidden md:flex items-center justify-between mb-3">
                    <h3 className="text-2xl font-bold text-gray-900">{item.title}</h3>
                    <Badge variant="secondary" className="bg-pink-100 text-pink-700 border-0">
                      <Clock className="h-3 w-3 mr-1" />
                      {item.duration}
                    </Badge>
                  </div>
                  <p className="text-gray-600 text-sm md:text-base leading-relaxed">
                    {item.description}
                  </p>
                </div>

                {/* Icon */}
                <div className="hidden lg:flex p-4 rounded-xl bg-pink-100 flex-shrink-0">
                  <item.icon className="h-8 w-8 text-pink-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      ))}
    </div>

    <div className="text-center mt-10 md:mt-12">
      <Link href="/venue/auth/signup">
        <Button size="lg" className="bg-pink-600 hover:bg-pink-700 text-white px-10 md:px-12 py-6 text-base md:text-lg font-semibold shadow-xl">
          Get Started Now - It's Free
          <ArrowRight className="ml-2 h-5 w-5" />
        </Button>
      </Link>
    </div>
  </Section>
);

const EventCategories = () => (
  <Section className="bg-white">
    <div className="text-center mb-10 md:mb-12">
      <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
        All Types of Events Welcome
      </h2>
      <p className="text-gray-600 text-base md:text-lg max-w-3xl mx-auto">
        Whatever type of venue you have, there's demand for it on AHiBi
      </p>
    </div>

    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
      {eventCategories.map((category, index) => (
        <Card key={index} className={`overflow-hidden hover:shadow-xl transition-all duration-300 cursor-pointer border-0 group ${category.color}`}>
          <CardContent className="p-0">
            <div className="aspect-[4/3] overflow-hidden">
              <img
                src={category.image}
                alt={category.title}
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
              />
            </div>
            <div className="p-5">
              <h3 className="font-bold text-lg md:text-xl text-gray-900 mb-2">{category.title}</h3>
              <p className="text-sm text-gray-600 mb-2">{category.description}</p>
              <p className="text-xs text-pink-600 font-medium">{category.count}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  </Section>
);

const BenefitsSection = () => (
  <Section className="bg-gradient-to-br from-gray-900 to-gray-800 text-white">
    <div className="text-center mb-10 md:mb-12">
      <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
        Everything You Need to Succeed
      </h2>
      <p className="text-gray-300 text-base md:text-lg max-w-3xl mx-auto">
        We've built the complete toolkit for venue management
      </p>
    </div>

    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 max-w-5xl mx-auto">
      {benefits.map((benefit, index) => (
        <div key={index} className="flex items-center gap-3 bg-white/10 backdrop-blur-sm rounded-xl p-4 md:p-5 hover:bg-white/20 transition-colors duration-300">
          <div className="p-2 rounded-lg bg-pink-600/20 flex-shrink-0">
            <benefit.icon className="h-5 w-5 text-pink-400" />
          </div>
          <span className="text-sm md:text-base font-medium">{benefit.text}</span>
        </div>
      ))}
    </div>
  </Section>
);

const Plans = () => (
  <Section id="plans" className="bg-gray-50">
    <div className="text-center mb-10 md:mb-12">
      <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
        Choose Your Plan
      </h2>
      <p className="text-gray-600 text-base md:text-lg max-w-3xl mx-auto">
        Start free, upgrade anytime. All plans include our core features.
      </p>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 max-w-6xl mx-auto">
      {tiers.map((t, index) => (
        <Card key={t.name} className={`border-0 shadow-lg hover:shadow-2xl transition-all duration-300 relative overflow-hidden ${t.popular ? 'ring-2 ring-pink-600 scale-105 md:scale-110' : ''}`}>
          {t.popular && (
            <div className="absolute top-0 right-0 bg-pink-600 text-white px-4 py-1 text-xs font-bold transform rotate-0 translate-x-0 translate-y-0">
              MOST POPULAR
            </div>
          )}
          <CardHeader className="pb-4">
            <Badge variant="secondary" className={`w-fit ${t.popular ? 'bg-pink-600 text-white' : 'bg-gray-100 text-gray-700'} border-0 mb-3`}>
              {t.tag}
            </Badge>
            <CardTitle className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">{t.name}</CardTitle>
            <div className="mb-4">
              <span className="text-3xl md:text-4xl font-bold text-gray-900">{t.price}</span>
            </div>
            <p className="text-sm text-gray-600">
              <span className="font-semibold text-pink-600">{t.commission}</span> commission on bookings
            </p>
          </CardHeader>
          <CardContent>
            <ul className="mb-6 space-y-3 text-sm">
              {t.bullets.map((b) => (
                <li key={b} className="flex items-start gap-3">
                  <Check className="mt-0.5 h-5 w-5 text-pink-600 flex-shrink-0" />
                  <span className="text-gray-700">{b}</span>
                </li>
              ))}
            </ul>
            <Button className={`w-full ${t.popular ? 'bg-pink-600 hover:bg-pink-700' : 'bg-gray-900 hover:bg-gray-800'} text-white py-6`}>
              {t.cta}
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  </Section>
);

const FAQ = () => (
  <Section id="faq" className="bg-white">
    <div className="text-center mb-10 md:mb-12">
      <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
        Frequently Asked Questions
      </h2>
      <p className="text-gray-600 text-base md:text-lg max-w-3xl mx-auto">
        Everything you need to know about joining AHiBi
      </p>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-6xl mx-auto">
      {faqs.map((f, index) => (
        <Card key={index} className="border-0 shadow-md hover:shadow-xl transition-all duration-300">
          <CardHeader>
            <CardTitle className="text-lg md:text-xl font-bold text-gray-900 leading-tight">{f.q}</CardTitle>
          </CardHeader>
          <CardContent className="text-gray-600 text-sm md:text-base leading-relaxed">{f.a}</CardContent>
        </Card>
      ))}
    </div>
  </Section>
);

const CTA = () => (
  <Section id="join" className="bg-gradient-to-br from-pink-600 via-pink-500 to-purple-600">
    <div className="rounded-2xl md:rounded-3xl bg-white/10 backdrop-blur-sm p-6 md:p-12 lg:p-16 shadow-2xl border border-white/20">
      <div className="text-center max-w-4xl mx-auto">
        <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-4 md:mb-6">
          Ready to Transform Your Venue Business?
        </h2>
        <p className="text-pink-50 text-base md:text-xl mb-8 md:mb-10 max-w-2xl mx-auto">
          Join 5,000+ venue owners already earning more with AHiBi. List your venue today and start accepting bookings within 24 hours.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8 md:mb-10">
          <Link href="/venue/auth/signup">
            <Button size="lg" className="w-full sm:w-auto bg-white text-pink-600 hover:bg-gray-100 font-semibold px-10 md:px-12 py-6 text-base md:text-lg shadow-xl">
              List Your Venue Free
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
          <Link href="/venue/auth/login">
            <Button size="lg" variant="outline" className="w-full sm:w-auto border-2 border-white text-black hover:bg-white hover:text-pink-600 font-semibold px-10 md:px-12 py-6 text-base md:text-lg">
              Venue Login
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 text-sm max-w-3xl mx-auto">
          <div className="rounded-xl border border-white/30 bg-white/10 backdrop-blur-sm p-4 text-white">
            <Check className="mx-auto mb-2 h-5 w-5" />
            <div className="font-semibold">Free to Start</div>
          </div>
          <div className="rounded-xl border border-white/30 bg-white/10 backdrop-blur-sm p-4 text-white">
            <Check className="mx-auto mb-2 h-5 w-5" />
            <div className="font-semibold">No Setup Fees</div>
          </div>
          <div className="rounded-xl border border-white/30 bg-white/10 backdrop-blur-sm p-4 text-white">
            <Check className="mx-auto mb-2 h-5 w-5" />
            <div className="font-semibold">Secure Payments</div>
          </div>
          <div className="rounded-xl border border-white/30 bg-white/10 backdrop-blur-sm p-4 text-white">
            <Check className="mx-auto mb-2 h-5 w-5" />
            <div className="font-semibold">24/7 Support</div>
          </div>
        </div>
      </div>
    </div>
  </Section>
);

export default async function AhibiVenuePage() {
  let featuredVenues: ReturnType<typeof toFeaturedVenueCard>[] = [];
  try {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
    const res = await fetch(`${apiUrl}/api/venue/`, { cache: "no-store" });
    const data = await res.json();
    const venues: VenueApiItem[] = data?.success ? data?.data?.venues || [] : [];
    featuredVenues = venues.slice(0, 2).map(toFeaturedVenueCard);
  } catch {
    featuredVenues = [];
  }

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      <main>
        <Hero />
        <PopularVenuesList featuredVenues={featuredVenues} />
        <VenueCardSection />
        <WhyJoinSection />
        <HowToJoinSection />
        <EventCategories />
        <BenefitsSection />
        {/* <Plans /> */}
        <FAQ />
        <CTA />
      </main>

      <Footer />
    </div>
  );
}