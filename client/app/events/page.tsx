"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar, MapPin, Search, Heart, Loader2, Sparkles, Crown, Filter, X, Zap, Timer, ExternalLink, Gift, CheckCircle2, Percent, ShoppingBag } from "lucide-react";
import Image from "next/image";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import Link from "next/link";
import Navbar from "../Navbar";
import Footer from "../Footer";
import { Event, EventsResponse } from "@/types/event";


const CITIES = [
  "Mumbai",
  "Delhi",
  "Bangalore",
  "Pune",
  "Chennai",
  "Hyderabad",
  "Dimapur",
  "Guwahati",
  "Kohima",
  "Shillong",
  "Silchar",
  "Tezpur",
];

const GENRES = ['Music', 'Comedy', 'Theatre', 'Dance', 'Food', 'Art', 'Sports', 'Business', 'Education', 'Other'];

// Format date for display
const formatDate = (dateString: string | Date): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

// Format time for display
const formatTime = (dateString: string | Date): string => {
  const date = new Date(dateString);
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });
};

// Get the lowest ticket price
const getLowestPrice = (ticketTypes: { price: number }[] = []): string => {
  if (!ticketTypes || ticketTypes.length === 0) return 'Free';
  const prices = ticketTypes.map(t => t.price);
  const minPrice = Math.min(...prices);
  return minPrice === 0 ? 'Free' : `₹${minPrice.toFixed(2)}`;
};

// Event Card Component
interface EventCardProps {
  event: Event;
  index?: number;
}

const EventCard: React.FC<EventCardProps> = ({ event, index = 0 }) => {
  const isPastEvent = new Date(event.endDate) < new Date();
  const [isHovered, setIsHovered] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      className="group relative"
      role="article"
      aria-labelledby={`event-title-${event._id}`}
    >
      <div className="absolute -inset-1 bg-gradient-to-r from-blue-300 via-purple-300 to-pink-300 rounded-2xl blur-lg opacity-0 group-hover:opacity-50 transition-opacity duration-500"></div>

      <Card
        className="relative overflow-hidden bg-white border border-gray-200 rounded-2xl transition-all duration-300 hover:shadow-2xl"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div className="relative">
          <AspectRatio ratio={16 / 9}>
            <Image
              src={event.banner || "/placeholder.svg"}
              alt={event.title}
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-105"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              priority={index < 3}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-70 transition-opacity duration-300 group-hover:opacity-50"></div>
            <div className="absolute top-4 right-4 flex gap-2">
              {event.isFeatured && (
                <motion.div
                  whileHover={{ scale: 1.1 }}
                  className="bg-gradient-to-r from-yellow-400 to-orange-400 p-2 rounded-full shadow-lg"
                >
                  <Crown className="h-4 w-4 text-white" />
                </motion.div>
              )}
              <Button
                size="icon"
                variant="ghost"
                className="rounded-full bg-white/90 hover:bg-white border border-gray-200 shadow-sm transition-all duration-300"
                aria-label="Add to favorites"
              >
                <Heart className={`h-4 w-4 transition-colors ${isHovered ? 'text-pink-500 fill-pink-500' : 'text-gray-600'}`} />
              </Button>
            </div>
            <div className="absolute top-4 left-4">
              <Badge className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-3 py-1 text-xs font-semibold shadow-md">
                <Sparkles className="h-3 w-3 mr-1" />
                {event.category}
              </Badge>
            </div>
            <div className="absolute bottom-0 left-0 right-0 p-6">
              <h3 id={`event-title-${event._id}`} className="text-xl md:text-2xl font-bold text-white mb-2 line-clamp-2">
                {event.title}
              </h3>
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: "100%" }}
                transition={{ duration: 0.8 }}
                className="h-px bg-gradient-to-r from-blue-400 to-purple-400"
              />
            </div>
          </AspectRatio>
        </div>
        <CardContent className="p-6 flex-1 flex flex-col bg-white">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <div className="flex items-center gap-2 bg-gray-100 px-3 py-1 rounded-full">
                <Calendar className="h-4 w-4 text-blue-500" />
                <span className="font-medium">{formatDate(event.startDate)}</span>
              </div>
              <div className="w-1 h-1 bg-blue-500 rounded-full"></div>
              <span className="font-medium">{formatTime(event.startDate)}</span>
            </div>
          </div>
          <div className="mt-auto space-y-4">
            <div className="flex items-start gap-3">
              <MapPin className="h-5 w-5 text-purple-500 mt-0.5" />
              <div className="text-sm text-gray-700">
                <span className="font-semibold text-gray-800">{event.location?.city}</span>
                <br />
                <span className="text-xs text-gray-500">{event.location?.address}</span>
              </div>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-xs text-gray-500">Starting from</p>
                  <p className="text-lg font-bold text-gray-800">{getLowestPrice(event.ticketTypes)}</p>
                </div>
                {isPastEvent ? (
                  <Button
                    size="sm"
                    disabled
                    className="bg-gray-200 text-gray-500 cursor-not-allowed"
                  >
                    Past Event
                  </Button>
                ) : (
                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <Button
                      asChild
                      size="sm"
                      className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold px-6 py-2 rounded-full shadow-md"
                    >
                      <Link href={
                        event._id === "6899cb7215438afd622a7646" ? "/events/FC25" :
                          event._id === "68bfd326f3f63bc4934ff5ef" ? "/annie-musical/details" :
                            `/events/${event._id}`
                      }>
                        View Details
                      </Link>
                    </Button>
                  </motion.div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default function EventsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCity, setSelectedCity] = useState("all");
  const [selectedGenre, setSelectedGenre] = useState("all");
  const [events, setEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const currentDate = new Date();

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/events`);

        if (!response.ok) throw new Error('Failed to fetch events');
        const data: EventsResponse = await response.json();
        const filteredEvents = (data.data.events || []).filter(
          (event) => event._id !== '68dac96e8d5dd14f277d5b1a'
        );
        setEvents(filteredEvents);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load events';
        console.error('Error fetching events:', errorMessage);
        setError(errorMessage);
      } finally {
        setIsLoading(false);
      }
    };

    fetchEvents();
  }, []);

  const resetFilters = () => {
    setSearchQuery("");
    setSelectedCity("all");
    setSelectedGenre("all");
    setIsFilterOpen(false);
  };

  const hasActiveFilters = searchQuery !== "" || selectedCity !== "all" || selectedGenre !== "all";

  const filteredEvents = events.filter((event: Event) => {
    const matchesSearch = event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (event.description || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCity = selectedCity === "all" || event.location?.city?.toLowerCase() === selectedCity.toLowerCase();
    const matchesGenre = selectedGenre === "all" || event.category?.toLowerCase() === selectedGenre.toLowerCase();
    return matchesSearch && matchesCity && matchesGenre;
  });

  const upcomingEvents = filteredEvents.filter((event: Event) => new Date(event.startDate) > currentDate);
  const currentEvents = filteredEvents.filter((event: Event) => {
    const startDate = new Date(event.startDate);
    const endDate = new Date(event.endDate);
    return startDate <= currentDate && endDate >= currentDate;
  });
  const pastEvents = filteredEvents.filter((event: Event) => new Date(event.endDate) < currentDate);
  const featuredEvents = events.filter((event: Event) => event.isFeatured);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center gap-4"
        >
          <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
          <p className="text-lg font-semibold text-gray-800">Loading Events...</p>
        </motion.div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center p-8 max-w-md mx-auto bg-white rounded-2xl shadow-lg"
        >
          <h2 className="text-2xl font-bold text-red-600 mb-4">Something went wrong</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-6 py-3 rounded-full"
              onClick={() => window.location.reload()}
            >
              Try Again
            </Button>
          </motion.div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar />
      <main className="flex-1">
        <section className="relative w-full aspect-[16/9] overflow-hidden">
          <motion.div
            initial={{ scale: 1.2 }}
            animate={{ scale: 1 }}
            transition={{ duration: 10, ease: "easeOut" }}
            className="absolute inset-0"
          >
            {/* Desktop Image */}
            <Image
              src="/images/iyaz-live.jpg"
              alt="Event Background"
              fill
              className="object-cover hidden sm:block"
              priority
            />

            {/* Mobile Image */}
            <Image
              src="/images/iyaz-live.jpg"
              alt="Event Background Mobile"
              fill
              className="object-cover block sm:hidden"
              priority
            />

            <div className="absolute inset-0 bg-gradient-to-b from-black/30 to-black/60"></div>
          </motion.div>

          {/* BOOK NOW button at bottom */}
          <div className="absolute inset-0 z-10 flex items-end justify-center pb-12 sm:pb-20">
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="text-center"
            >
              <Link href="/events/68c2c33eb6ef88c76f50ce7c">
                <Button
                  size="lg"
                  className="
    bg-gradient-to-r from-blue-600 to-purple-600 
    hover:from-blue-700 hover:to-purple-700 
    text-white font-semibold 
    px-8 py-3 rounded-full shadow-lg
    text-base sm:text-lg        /* smaller font on small screens */
    px-5 py-2.5 sm:px-8 sm:py-3 /* smaller padding on small screens */
  "
                >
                  BOOK NOW
                </Button>

              </Link>
            </motion.div>
          </div>
        </section>



        {/* Filter Section */}
        <section className="py-3 bg-white/90 backdrop-blur-md shadow-sm sticky top-0 z-20">
          <div className="container mx-auto px-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5 }}
              className="flex items-center justify-between gap-2"
            >
              {/* Mobile: Filter Button */}
              <div className="flex-1 sm:hidden relative">
                <Button
                  variant="outline"
                  className="w-full bg-white border-gray-300 rounded-full py-2.5 text-gray-700 hover:bg-gray-100 transition-colors text-sm font-medium"
                  onClick={() => setIsFilterOpen(true)}
                >
                  <Filter className="h-4 w-4 mr-2" />
                  Filters
                  {hasActiveFilters && (
                    <span className="absolute -top-1 -right-1 h-4 w-4 bg-blue-500 rounded-full" />
                  )}
                </Button>
              </div>

              {/* Desktop: Inline Filters */}
              <div className="hidden sm:flex items-center gap-2 flex-1">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search events..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 pr-10 py-2.5 bg-white border-gray-300 rounded-full focus:ring-2 focus:ring-blue-300 focus:border-blue-300 text-sm shadow-sm transition-all"
                    aria-label="Search events"
                  />
                  {searchQuery && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 text-gray-400 hover:text-gray-600"
                      onClick={() => setSearchQuery("")}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                <Select value={selectedCity} onValueChange={setSelectedCity}>
                  <SelectTrigger className="py-2.5 px-4 bg-white border-gray-300 rounded-full focus:ring-2 focus:ring-blue-300 focus:border-blue-300 text-sm w-[160px] shadow-sm transition-all">
                    <MapPin className="h-4 w-4 mr-2 text-gray-400" />
                    <SelectValue placeholder="City" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-gray-300 rounded-xl shadow-lg max-h-60 overflow-y-auto">
                    <SelectItem value="all">All Cities</SelectItem>
                    {CITIES.map((city) => (
                      <SelectItem key={city} value={city}>{city}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={selectedGenre} onValueChange={setSelectedGenre}>
                  <SelectTrigger className="py-2.5 px-4 bg-white border-gray-300 rounded-full focus:ring-2 focus:ring-blue-300 focus:border-blue-300 text-sm w-[160px] shadow-sm transition-all">
                    <Sparkles className="h-4 w-4 mr-2 text-gray-400" />
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-gray-300 rounded-xl shadow-lg max-h-60 overflow-y-auto">
                    <SelectItem value="all">All Categories</SelectItem>
                    {GENRES.map((genre) => (
                      <SelectItem key={genre} value={genre}>{genre}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  className="bg-white border-gray-300 rounded-full py-2 px-4 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                  onClick={resetFilters}
                >
                  <X className="h-4 w-4 mr-2" />
                  Reset
                </Button>
              </div>
            </motion.div>

            {/* Mobile: Centered Filter Modal */}
            <AnimatePresence>
              {isFilterOpen && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center sm:hidden p-4"
                  onClick={(e) => {
                    if (e.target === e.currentTarget) setIsFilterOpen(false);
                  }}
                >
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.8, opacity: 0 }}
                    transition={{ type: "spring", damping: 20, stiffness: 300 }}
                    className="bg-white rounded-2xl w-full max-w-md p-5 max-h-[80vh] overflow-y-auto shadow-xl"
                  >
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-semibold text-gray-900">Filter Events</h3>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setIsFilterOpen(false)}
                        aria-label="Close filters"
                        className="text-gray-600 hover:text-gray-800"
                      >
                        <X className="h-5 w-5" />
                      </Button>
                    </div>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-semibold text-gray-900 mb-1.5">Search</label>
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                          <Input
                            placeholder="Search events..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10 pr-10 py-2.5 bg-gray-50 border-gray-300 rounded-full text-sm focus:ring-2 focus:ring-blue-300 focus:border-blue-300 shadow-sm"
                            aria-label="Search events"
                          />
                          {searchQuery && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="absolute right-3 top-1/2 -translate-y-1/2 h-6 w-6 text-gray-400 hover:text-gray-600"
                              onClick={() => setSearchQuery("")}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-900 mb-1.5">City</label>
                        <Select value={selectedCity} onValueChange={setSelectedCity}>
                          <SelectTrigger className="py-2.5 px-4 bg-gray-50 border-gray-300 rounded-full text-sm focus:ring-2 focus:ring-blue-300 focus:border-blue-300 shadow-sm">
                            <MapPin className="h-4 w-4 mr-2 text-gray-400" />
                            <SelectValue placeholder="Select City" />
                          </SelectTrigger>
                          <SelectContent className="bg-white border-gray-300 rounded-xl shadow-lg max-h-60 overflow-y-auto">
                            <SelectItem value="all">All Cities</SelectItem>
                            {CITIES.map((city) => (
                              <SelectItem key={city} value={city}>{city}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-900 mb-1.5">Category</label>
                        <Select value={selectedGenre} onValueChange={setSelectedGenre}>
                          <SelectTrigger className="py-2.5 px-4 bg-gray-50 border-gray-300 rounded-full text-sm focus:ring-2 focus:ring-blue-300 focus:border-blue-300 shadow-sm">
                            <Sparkles className="h-4 w-4 mr-2 text-gray-400" />
                            <SelectValue placeholder="Select Category" />
                          </SelectTrigger>
                          <SelectContent className="bg-white border-gray-300 rounded-xl shadow-lg max-h-60 overflow-y-auto">
                            <SelectItem value="all">All Categories</SelectItem>
                            {GENRES.map((genre) => (
                              <SelectItem key={genre} value={genre}>{genre}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex gap-2 pt-2">
                        <Button
                          variant="outline"
                          className="flex-1 border-gray-300 rounded-full py-2.5 text-gray-700 hover:bg-gray-100 text-sm font-medium"
                          onClick={resetFilters}
                        >
                          Clear Filters
                        </Button>
                        <Button
                          className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-full py-2.5 text-sm font-medium"
                          onClick={() => setIsFilterOpen(false)}
                        >
                          Apply Filters
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </section>
        {/* Melita Exclusive Offer */}
        <div className="space-y-4 sm:space-y-6">
          {/* First Card - Pink-Purple Theme */}
          <div className="bg-gradient-to-r from-pink-100 via-purple-100 to-indigo-100 rounded-lg p-3 sm:p-4 shadow-md border border-purple-200 relative overflow-hidden text-sm sm:text-base">
            {/* Background Pattern */}
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-2 right-2 text-purple-300">
                <Sparkles className="h-6 w-6 sm:h-8 sm:w-8" />
              </div>
              <div className="absolute bottom-2 left-2 text-pink-300">
                <Gift className="h-5 w-5 sm:h-6 sm:w-6" />
              </div>
            </div>

            <div className="relative z-10 flex flex-col sm:flex-row items-center sm:items-center gap-3 sm:gap-4">
              {/* Left: Logo */}
              <div className="flex-shrink-0">
                <div className="bg-white rounded-lg p-2 sm:p-3 shadow border border-purple-100 flex items-center gap-2">
                  <div className="bg-gradient-to-r from-purple-500 to-pink-500 rounded p-1 sm:p-2">
                    <ShoppingBag className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 text-sm sm:text-base">Melita</h3>
                    <p className="text-purple-600 text-xs sm:text-sm">Premium Skincare</p>
                  </div>
                </div>
              </div>

              {/* Center: Offer */}
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-1">
                  <Badge className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-2 py-0.5 text-xs font-semibold flex items-center gap-1">
                    <Percent className="h-3 w-3" /> EXCLUSIVE OFFER
                  </Badge>
                  <Badge variant="outline" className="border-purple-300 text-purple-700 px-2 py-0.5 text-xs">
                    Limited Time
                  </Badge>
                </div>

                <h4 className="font-bold text-gray-900 text-sm sm:text-base leading-snug">
                  Get Premium Skincare with Your Ahibi Fest Ticket!
                </h4>
                <p className="text-gray-700 leading-snug">
                  Book your ticket and get <span className="font-semibold text-purple-700">exclusive discounts</span> on
                  Melita's premium collection.
                </p>
              </div>

              {/* Right: CTA */}
              <div className="flex-shrink-0 w-full sm:w-auto">
                <Link href="/melita" className="block">
                  <Button
                    size="sm"
                    className="w-full sm:w-auto bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold px-4 py-2 rounded-lg shadow hover:shadow-md transition transform hover:scale-105 text-xs sm:text-sm"
                  >
                    <Gift className="h-3 w-3 sm:h-4 mr-1" /> Explore Melita
                  </Button>
                </Link>
              </div>
            </div>

            {/* Bottom */}
            <div className="mt-2 border-t border-purple-200 pt-2 flex flex-col sm:flex-row items-start sm:items-center justify-between text-xs sm:text-sm text-gray-600 gap-1 sm:gap-2">
              <div className="flex items-center gap-1">
                <Timer className="h-3 w-3 text-purple-500" /> Limited time offer for attendees
              </div>
              <div className="flex items-center gap-1 text-purple-700 font-semibold">
                <Zap className="h-3 w-3" /> 50% OFF ON AHIBI FEST TICKETS
              </div>
            </div>
          </div>

          {/* Second Card - Pink-Orange Theme */}
          <div className="bg-gradient-to-r from-pink-50 via-orange-50 to-yellow-50 rounded-lg p-3 sm:p-4 shadow-md border border-orange-200 relative overflow-hidden text-sm sm:text-base">
            {/* Background Pattern */}
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-2 right-2 text-orange-300">
                <Sparkles className="h-6 w-6 sm:h-8 sm:w-8" />
              </div>
              <div className="absolute bottom-2 left-2 text-pink-300">
                <Gift className="h-5 w-5 sm:h-6 sm:w-6" />
              </div>
            </div>

            <div className="relative z-10 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-6">
              {/* Madame Logo */}
              <img
                src="/images/Madame_(clothing).svg.png"
                alt="Madame"
                className="h-14 sm:h-16 w-auto object-contain drop-shadow-md"
              />
              {/* Center: Offer */}
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-1">
                  <Badge className="bg-gradient-to-r from-pink-500 to-orange-500 text-white px-2 py-0.5 text-xs font-semibold flex items-center gap-1">
                    <Percent className="h-3 w-3" /> EXCLUSIVE VOUCHER
                  </Badge>
                  <Badge variant="outline" className="border-orange-300 bold text-orange-700 px-2 py-0.5 text-xs">
                    Limited Time
                  </Badge>
                </div>

                <h4 className="font-bold text-gray-900 text-sm sm:text-base leading-snug">
                  Buy Ahibi Fest Tickets Worth ₹4,000 and above and Get ₹2,000 Madame Shopping Vouchers!
                </h4>
                <p className="text-gray-700 leading-snug">
                  Redeem your voucher exclusively at <span className="font-semibold text-pink-700">Madame Store, Dimapur</span>. Contact <span className="font-semibold text-indigo-600">8730986585</span> to claim.
                </p>
              </div>

              {/* Right: CTA */}
              <div className="flex-shrink-0 w-full sm:w-auto">
                <Link href="/events/68c2c33eb6ef88c76f50ce7c" className="block">
                  <Button
                    size="sm"
                    className="w-full sm:w-auto bg-gradient-to-r from-pink-600 to-orange-500 hover:from-pink-700 hover:to-orange-600 text-white font-semibold px-4 py-2 rounded-lg shadow hover:shadow-md transition transform hover:scale-105 text-xs sm:text-sm"
                  >
                    <Gift className="h-3 w-3 sm:h-4 mr-1" /> Claim Your Voucher
                  </Button>
                </Link>
              </div>
            </div>

            {/* Bottom */}
            <div className="mt-2 border-t border-orange-200 pt-2 flex flex-col sm:flex-row items-start sm:items-center justify-between text-xs sm:text-sm text-gray-600 gap-1 sm:gap-2">
              <div className="flex items-center gap-1">
                <Timer className="h-3 w-3 text-orange-500" /> Limited time offer for festival attendees
              </div>
              <div className="flex items-center gap-1 text-orange-700 font-semibold">
                <Zap className="h-3 w-3" /> Get ₹2,500 Madame Shopping Voucher
              </div>
            </div>
          </div>
        </div>


        <section className="py-12">
          <div className="container mx-auto px-4">
            <AnimatePresence>
              {/* {featuredEvents.length > 0 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="mb-16"
                >
                  <div className="text-center mb-8">
                    <h2 className="text-3xl md:text-4xl font-bold text-gray-800">
                      Featured Events
                    </h2>
                    <div className="h-1 w-24 bg-gradient-to-r from-yellow-400 to-orange-400 mx-auto mt-2 rounded-full" />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {featuredEvents.map((event, index) => (
                      <EventCard key={event._id} event={event} index={index} />
                    ))}
                  </div>
                </motion.div>
              )} */}
              {currentEvents.length > 0 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="mb-16"
                >
                  <div className="text-center mb-8">
                    <h2 className="text-3xl md:text-4xl font-bold text-gray-800">
                      Live Now
                    </h2>
                    <div className="h-1 w-24 bg-gradient-to-r from-green-400 to-blue-400 mx-auto mt-2 rounded-full" />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {currentEvents.map((event, index) => (
                      <EventCard key={event._id} event={event} index={index} />
                    ))}
                  </div>
                </motion.div>
              )}
              {upcomingEvents.length > 0 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="mb-16"
                >
                  <div className="text-center mb-8">
                    <h2 className="text-3xl md:text-4xl font-bold text-gray-800">
                      Upcoming Events
                    </h2>
                    <div className="h-1 w-24 bg-gradient-to-r from-blue-400 to-purple-400 mx-auto mt-2 rounded-full" />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {upcomingEvents.map((event, index) => (
                      <EventCard key={event._id} event={event} index={index} />
                    ))}
                  </div>
                </motion.div>
              )}
              {pastEvents.length > 0 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="mb-16"
                >
                  <div className="text-center mb-8">
                    <h2 className="text-3xl md:text-4xl font-bold text-gray-800">
                      Past Events
                    </h2>
                    <div className="h-1 w-24 bg-gradient-to-r from-gray-400 to-gray-600 mx-auto mt-2 rounded-full" />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {pastEvents.map((event, index) => (
                      <EventCard key={event._id} event={event} index={index} />
                    ))}
                  </div>
                </motion.div>
              )}
              {!upcomingEvents.length && !currentEvents.length && !pastEvents.length && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center py-16"
                >
                  <div className="bg-white rounded-2xl p-8 max-w-lg mx-auto shadow-lg">
                    <h3 className="text-2xl font-bold text-gray-800 mb-4">No Events Found</h3>
                    <p className="text-gray-600 mb-6">Try adjusting your filters to find more events.</p>
                    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                      <Button
                        className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-6 py-3 rounded-full"
                        onClick={resetFilters}
                      >
                        Clear Filters
                      </Button>
                    </motion.div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}