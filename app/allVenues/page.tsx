import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, ArrowRight, Search, CalendarClock, Wallet, LayoutDashboard, Building2, MapPin, Users, Star, ChevronRight } from "lucide-react";
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

const features = [
  {
    icon: Search,
    title: "Get Discovered",
    text: "Appear in searches by location, capacity, and budget."
  },
  {
    icon: CalendarClock,
    title: "Online Bookings",
    text: "Real-time availability with instant confirmations."
  },
  {
    icon: Wallet,
    title: "Flexible Pricing",
    text: "Hourly, full-day, or custom pricing — you decide."
  },
  {
    icon: LayoutDashboard,
    title: "Simple Dashboard",
    text: "Manage bookings, availability, and payments from one place."
  },
];

const howItWorks = [
  {
    step: 1,
    title: "List your venue",
    description: "Add photos, details, pricing, and availability.",
  },
  {
    step: 2,
    title: "Get bookings",
    description: "Organizers discover and book your venue online.",
  },
  {
    step: 3,
    title: "Host & earn",
    description: "We handle bookings and payments. You focus on hosting.",
  },
];

const Section = ({ children, id, className = "" }: { children: React.ReactNode; id?: string; className?: string }) => (
  <section id={id} className={`py-12 md:py-16 lg:py-20 ${className}`}>
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">{children}</div>
  </section>
);


const Hero = () => (
  <div className="relative min-h-[320px] md:min-h-[420px] overflow-hidden">
    {/* Background Image */}
    <div className="absolute inset-0">
      <img
        src={"https://images.unsplash.com/photo-1670529776180-60e4132ab90c?q=80&w=1172&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"}
        alt="Beautiful event venue interior"
        className="w-full h-full object-cover object-center"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/60" />
    </div>

    {/* Content (z-10 to sit above overlay) */}
    <div className="relative z-10 flex items-center justify-center h-full">
      <div className="text-center px-4 sm:px-6 max-w-4xl mx-auto py-10">
        <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4 drop-shadow-lg">
          AHIBI Venues
        </h1>

        <p className="text-lg sm:text-xl md:text-2xl text-white/95 mb-3 font-light drop-shadow">
          Get discovered. Get booked.
        </p>

        <p className="text-sm sm:text-base md:text-lg text-white/90 mb-6 max-w-2xl mx-auto">
          Built for venue owners to manage listings and bookings online.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center items-center mb-6">
          <Link href="/venue/auth/signup" aria-label="List your venue">
            <Button
              size="lg"
              className="px-8 py-3 md:px-10 md:py-4 bg-pink-600 hover:bg-pink-700 text-white font-semibold shadow-lg"
            >
              List Your Venue
            </Button>
          </Link>

          <Link href="/venue/auth/login" aria-label="Venue login">
            <Button
              size="lg"
              variant="outline"
              className={
                "px-8 py-3 md:px-10 md:py-4 border-2 border-white text-white bg-white/10 backdrop-blur-sm " +
                "hover:bg-pink-600 hover:text-white hover:border-pink-600 transition-colors duration-200"
              }
            >
              Venue Login
            </Button>
          </Link>
        </div>

        <div className="flex flex-wrap justify-center items-center gap-3 md:gap-6 text-sm md:text-base text-white/90">
          <span>Instant bookings</span>
          <span className="text-white/60">·</span>
          <span>Secure payments</span>
          <span className="text-white/60">·</span>
          <span>Live availability</span>
        </div>
      </div>
    </div>
  </div>
);

const IntroSection = () => (
  <Section className="relative bg-gradient-to-b from-white to-gray-50">
    <div className="max-w-5xl mx-auto text-center px-6">

      {/* Small Tagline */}
      <p className="text-sm font-semibold text-pink-600 tracking-wide uppercase mb-4">
        Designed for Growth
      </p>

      {/* Main Heading */}
      <h2 className="text-2xl md:text-2xl lg:text-5xl font-bold text-gray-900 leading-tight mb-6">
        Built for <span className="text-pink-600">venue owners</span>.<br />
        Simple for <span className="text-purple-600">organizers</span>.
      </h2>

      {/* Description */}
      <p className="text-lg md:text-xl text-gray-600 leading-relaxed max-w-3xl mx-auto">
        AHIBI helps venue owners list, manage, and book their spaces online —
        while making it effortless for organizers to discover the perfect venue.
      </p>

      {/* Divider Accent */}
      <div className="mt-8 flex justify-center">
        <div className="h-1 w-20 rounded-full bg-gradient-to-r from-pink-500 to-purple-500" />
      </div>

      {/* Secondary Line */}
      <p className="text-base md:text-lg text-gray-500 mt-6">
        No back-and-forth calls.  Everything in one place.
      </p>

    </div>
  </Section>
);


const FeaturesSection = () => (
  <Section className="relative bg-gradient-to-b from-gray-50 to-white">

    {/* Heading */}
    <div className="text-center mb-16">
      <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
        Why venues choose AHiBi
      </h2>
      <p className="text-gray-600 max-w-2xl mx-auto text-lg">
        Powerful tools designed to help venue owners get discovered, manage bookings,
        and grow revenue effortlessly.
      </p>
    </div>

    {/* Feature Grid */}
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-6xl mx-auto">
      {features.map((feature, index) => (
        <Card
          key={index}
          className="
            group
            border border-gray-100
            bg-white/70 backdrop-blur-sm
            shadow-md hover:shadow-2xl
            transition-all duration-300
            hover:-translate-y-2
            rounded-2xl
          "
        >
          <CardContent className="p-8">
            <div className="flex items-start gap-5">

              {/* Icon */}
              <div
                className="
                  p-4 rounded-2xl
                  bg-pink-100
                  group-hover:bg-pink-600
                  transition-all duration-300
                "
              >
                <feature.icon className="h-7 w-7 text-pink-600 group-hover:text-white transition-colors duration-300" />
              </div>

              {/* Text */}
              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  {feature.title}
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  {feature.text}
                </p>
              </div>

            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  </Section>
);

const HowItWorksSection = () => (
  <Section className="bg-white">
    <div className="text-center mb-12">
      <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
        How it works
      </h2>
    </div>

    <div className="max-w-4xl mx-auto space-y-8">
      {howItWorks.map((item, index) => (
        <div key={index} className="flex items-start gap-6">
          <div className="flex-shrink-0">
            <div className="w-12 h-12 rounded-full bg-pink-600 flex items-center justify-center text-white text-xl font-bold">
              {item.step}
            </div>
          </div>
          <div className="pt-1">
            <h3 className="text-2xl font-bold text-gray-900 mb-2">{item.title}</h3>
            <p className="text-lg text-gray-600">{item.description}</p>
          </div>
        </div>
      ))}
    </div>
  </Section>
);

const PopularVenuesList = ({ featuredVenues }: { featuredVenues: ReturnType<typeof toFeaturedVenueCard>[] }) => {
  if (featuredVenues.length === 0) return null;

  return (
    <Section className="bg-gray-50">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">Featured Venues</h2>
          <p className="text-gray-600">Venues already on AHiBi</p>
        </div>
        <Link href="/allVenues/list">
          <Button variant="link" className="text-pink-600 hover:text-pink-700 hidden md:flex">
            View all <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
              <CardContent className="p-5">
                <h3 className="font-semibold text-xl text-gray-900 mb-2">{venue.name}</h3>
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

      <div className="text-center mt-8">
        <Link href="/allVenues/list">
          <Button
            variant="outline"
            className="border-pink-600 text-pink-600 
             hover:bg-pink-600 hover:text-white 
             hover:border-pink-600
             transition-all duration-200"
          >
            View All Venues <ChevronRight className="h-4 w-4 ml-1" />
          </Button>

        </Link>
      </div>
    </Section>
  );
};

const OrganizerNote = () => (
  <Section className="bg-gradient-to-br from-purple-50 to-pink-50">
    <div className="max-w-4xl mx-auto">
      <Card className="border-0 shadow-lg">
        <CardContent className="p-8 md:p-10">
          <div className="flex items-start gap-6">
            <div className="p-4 rounded-xl bg-purple-100 flex-shrink-0">
              <Building2 className="h-8 w-8 text-purple-600" />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">
                Also host events & experiences
              </h3>
              <p className="text-lg text-gray-600 mb-4">
                Venues can also host events, workshops, and ticketed experiences through AHiBi Organizer.
              </p>
              <Link href="/allOrganizers">
                <Button
                  variant="outline"
                  className="
      border-purple-600 text-purple-600 bg-transparent
      hover:bg-purple-600 hover:text-white hover:border-purple-600
      transition-all duration-200
      group
    "
                >
                  Learn More
                  <ArrowRight className="h-4 w-4 ml-2 transition-transform duration-200 group-hover:translate-x-1" />
                </Button>
              </Link>

            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  </Section>
);

const FinalCTA = () => (
  <Section className="bg-gradient-to-br from-pink-600 to-purple-600">
    <div className="text-center max-w-3xl mx-auto">
      <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-6">
        Ready to list your venue?
      </h2>
      <p className="text-xl text-white/90 mb-8">
        Start accepting bookings online with AHiBi.
      </p>

      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <Link href="/venue/auth/signup">
          <Button
            size="lg"
            className="
        w-full sm:w-auto
        bg-white text-pink-600
        hover:bg-pink-600 hover:text-white
        font-semibold px-10 py-6 text-lg
        shadow-xl
        transition-all duration-200
        hover:scale-[1.03] active:scale-[0.98]
      "
          >
            List Your Venue
          </Button>
        </Link>

        <Link href="/venue/auth/login">
          <Button
            size="lg"
            variant="outline"
            className="
        w-full sm:w-auto
        border-2 border-white
        text-white
        bg-transparent
        hover:bg-white hover:text-pink-600
        font-semibold px-10 py-6 text-lg
        transition-all duration-200
        hover:scale-[1.03] active:scale-[0.98]
      "
          >
            Venue Login
          </Button>
        </Link>
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
    featuredVenues = venues.slice(0, 3).map(toFeaturedVenueCard);
  } catch {
    featuredVenues = [];
  }

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      <main>
        <Hero />
        <PopularVenuesList featuredVenues={featuredVenues} />
        <IntroSection />
        <FeaturesSection />
        <HowItWorksSection />
        <OrganizerNote />
        <FinalCTA />
      </main>

      <Footer />
    </div>
  );
}