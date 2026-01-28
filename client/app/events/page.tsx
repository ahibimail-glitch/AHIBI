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
import { Calendar, MapPin, Search, Heart, Loader2, Sparkles, Crown, Filter, X, Zap, Timer, ExternalLink, Gift, CheckCircle2, Percent, ShoppingBag, Clock, Star } from "lucide-react";
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
  const bookingCutoff = (() => {
    const raw = (event as any).bookingEndTime || event.endDate;
    if (!raw) return null;
    const dt = new Date(raw);
    if (isNaN(dt.getTime())) return null;
    return dt;
  })();
  const isBookingClosed = bookingCutoff ? new Date() > bookingCutoff : false;
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
        className="relative overflow-hidden bg-white border border-gray-200 rounded-xl transition-all duration-300 hover:shadow-xl"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div className="relative aspect-[2/3] overflow-hidden">
          <Image
            src={event.banner || "/placeholder.svg"}
            alt={event.title}
            fill
            className="object-contain transition-transform duration-500 group-hover:scale-105"
            sizes="(max-width: 768px) 50vw, (max-width: 1200px) 25vw, 20vw"
            priority={index < 10}
          />
          {event.isFeatured && (
            <div className="absolute top-2 right-2">
              <Badge className="bg-white/90 text-gray-900 border border-gray-200 text-[10px] px-2 py-0.5">
                Featured
              </Badge>
            </div>
          )}
          {/* <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/60 to-transparent" /> */}
        </div>

        <CardContent className="p-4">
          <h3 id={`event-title-${event._id}`} className="font-semibold text-sm sm:text-base text-gray-900 line-clamp-2">
            {event.title}
          </h3>
          <p className="text-xs sm:text-sm text-gray-500 mt-1 line-clamp-1">
            {(event.location?.address || '').trim() || ' '}
          </p>
          <p className="text-xs sm:text-sm text-gray-500 mt-0.5 line-clamp-1">
            {event.location?.city ? `${event.location.city}` : ' '}
          </p>
          <p className="text-xs sm:text-sm text-gray-500 mt-2">
            {getLowestPrice(event.ticketTypes)} onwards
          </p>
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
  const [backgroundImages, setBackgroundImages] = useState<Array<{ url: string; mobileUrl?: string }>>([]);
  const [loadingHeroImages, setLoadingHeroImages] = useState(true);
  const [isMobileViewport, setIsMobileViewport] = useState(false);

  const currentDate = new Date();

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/events?limit=1000`);

        if (!response.ok) throw new Error('Failed to fetch events');
        const data: EventsResponse = await response.json();
        setEvents(data.data.events);
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

  useEffect(() => {
    const updateViewport = () => {
      setIsMobileViewport(window.innerWidth < 640);
    };
    updateViewport();
    window.addEventListener('resize', updateViewport);
    return () => window.removeEventListener('resize', updateViewport);
  }, []);

  // Hero background images slideshow
  useEffect(() => {
    const fetchHeroImages = async () => {
      try {
        setLoadingHeroImages(true);
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/hero-images?active=true`);
        if (response.ok) {
          const data = await response.json();
          // Filter for events-related images or use all active images if no events-specific images exist
          const eventsImages = data.data.filter((img: any) => 
            img.title?.toLowerCase().includes('events') || 
            img.description?.toLowerCase().includes('events') ||
            img.type === 'events'
          );
          
          // If no events-specific images, use all active images
          const heroImages = eventsImages.length > 0 ? eventsImages : data.data;
          const mapped = heroImages.map((img: any) => ({
            url: img?.url,
            mobileUrl: img?.mobileUrl,
          }));
          setBackgroundImages(mapped);
        } else {
          // Fallback to hardcoded images if API fails
          const fallbackImages = [
            { url: "/images/carausel1.jpg" }
          ];
          setBackgroundImages(fallbackImages);
        }
      } catch (error) {
        console.error('Error fetching hero images:', error);
        // Fallback to hardcoded images
        const fallbackImages = [
          { url: "/images/carausel1.jpg" }
        ];
        setBackgroundImages(fallbackImages);
      } finally {
        setLoadingHeroImages(false);
      }
    };

    fetchHeroImages();
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
    const endDate = event.endDate ? new Date(event.endDate) : null;
    if (isNaN(startDate.getTime())) return false;
    if (!endDate) {
      // Treat events without endDate as same-day; show as current if same calendar day
      const startDay = new Date(startDate); startDay.setHours(0, 0, 0, 0);
      const today = new Date(currentDate); today.setHours(0, 0, 0, 0);
      return startDay.getTime() === today.getTime();
    }
    return startDate <= currentDate && endDate >= currentDate;
  });
  const pastEvents = filteredEvents.filter((event: Event) => {
    const endDate = event.endDate ? new Date(event.endDate) : null;
    if (endDate) return endDate < currentDate;
    // If no end date: consider past if startDate is before today (and not same day)
    const startDate = new Date(event.startDate);
    if (isNaN(startDate.getTime())) return false;
    const eventDay = new Date(startDate); eventDay.setHours(0, 0, 0, 0);
    const today = new Date(currentDate); today.setHours(0, 0, 0, 0);
    return eventDay < today;
  });
  const featuredEvents = events.filter((event: Event) => event.isFeatured);
  // Sort past events by latest date first (use endDate if available, otherwise startDate)
  const pastEventsSorted = [...pastEvents].sort((a: Event, b: Event) => {
    const aDate = new Date(a.endDate || a.startDate).getTime();
    const bDate = new Date(b.endDate || b.startDate).getTime();
    return bDate - aDate; // descending: latest first
  });

  const upcomingEventsSorted = [...upcomingEvents].sort((a: Event, b: Event) => {
    const aDate = new Date(a.startDate).getTime();
    const bDate = new Date(b.startDate).getTime();
    return aDate - bDate;
  });

  const currentEventsSorted = [...currentEvents].sort((a: Event, b: Event) => {
    const aDate = new Date(a.startDate).getTime();
    const bDate = new Date(b.startDate).getTime();
    return aDate - bDate;
  });

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
    <div className="min-h-screen flex flex-col bg-gray-50 scroll-smooth">
      <Navbar />
      <main className="flex-1">
        <section className="relative w-full bg-white">
          {loadingHeroImages ? (
            <div className="w-full h-[180px] sm:h-[250px] md:h-[350px] lg:h-[450px] bg-gray-200 animate-pulse" />
          ) : (
            <div className="relative w-full h-[180px] sm:h-[250px] md:h-[350px] lg:h-[450px] overflow-hidden">
              <Image
                src={
                  (isMobileViewport && backgroundImages[0]?.mobileUrl
                    ? backgroundImages[0].mobileUrl
                    : backgroundImages[0]?.url) || "/images/carausel1.jpg"
                }
                alt="Events Hero"
                fill
                className="object-cover"
                priority
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
            </div>
          )}
        </section>

        <section className="py-6 bg-gray-50">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
              <aside className="hidden lg:block">
                <div className="bg-white rounded-lg border border-gray-200 p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-gray-900">Filters</h3>
                    <Button variant="ghost" size="sm" className="text-xs" onClick={resetFilters}>
                      Clear
                    </Button>
                  </div>

                  <div className="space-y-4">
                    <div className="border border-gray-200 rounded-md p-3">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-gray-900">Date</p>
                        <Button variant="ghost" size="sm" className="text-xs" onClick={() => {}}>
                          Clear
                        </Button>
                      </div>
                      <div className="grid grid-cols-2 gap-2 mt-3">
                        <Button variant="outline" className="h-8 text-xs justify-center">Today</Button>
                        <Button variant="outline" className="h-8 text-xs justify-center">Tomorrow</Button>
                        <Button variant="outline" className="h-8 text-xs justify-center">This Weekend</Button>
                      </div>
                    </div>

                    <div className="border border-gray-200 rounded-md p-3">
                      <p className="text-sm font-medium text-gray-900 mb-2">Search</p>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                          placeholder="Search events..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="pl-9 bg-white border-gray-300 rounded-md text-sm"
                          aria-label="Search events"
                        />
                      </div>
                    </div>

                    <div className="border border-gray-200 rounded-md p-3">
                      <p className="text-sm font-medium text-gray-900 mb-2">City</p>
                      <Select value={selectedCity} onValueChange={setSelectedCity}>
                        <SelectTrigger className="bg-white border-gray-300 rounded-md text-sm">
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

                    <div className="border border-gray-200 rounded-md p-3">
                      <p className="text-sm font-medium text-gray-900 mb-2">Categories</p>
                      <Select value={selectedGenre} onValueChange={setSelectedGenre}>
                        <SelectTrigger className="bg-white border-gray-300 rounded-md text-sm">
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

                    <Button asChild variant="outline" className="w-full border-red-300 text-red-600 hover:bg-red-50">
                      <Link href="/allVenues">Browse by Venues</Link>
                    </Button>
                  </div>
                </div>
              </aside>

              <div>
                <div className="flex items-center justify-between gap-3 mb-4">
                  <div>
                    <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
                      Events in {selectedCity === 'all' ? 'India' : selectedCity}
                    </h1>
                  </div>
                  <div className="lg:hidden">
                    <Button
                      variant="outline"
                      className="bg-white border-gray-300 rounded-full text-gray-700 hover:bg-gray-100 transition-colors text-sm font-medium"
                      onClick={() => setIsFilterOpen(true)}
                    >
                      <Filter className="h-4 w-4 mr-2" />
                      Filters
                    </Button>
                  </div>
                </div>

                <div className="flex gap-2 flex-wrap mb-6">
                  {GENRES.slice(0, 5).map((genre) => (
                    <Button
                      key={genre}
                      variant={selectedGenre === genre ? 'default' : 'outline'}
                      className="h-8 rounded-full text-xs"
                      onClick={() => setSelectedGenre(selectedGenre === genre ? 'all' : genre)}
                    >
                      {genre}
                    </Button>
                  ))}
                </div>

                <section id="events" className="pb-6 space-y-10">
                  {!!currentEventsSorted.length && (
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg sm:text-xl font-bold text-gray-900">Live Events</h2>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
                        {currentEventsSorted.map((event, index) => (
                          <Link key={event._id} href={`/events/${event._id}`} className="block">
                            <EventCard event={event} index={index} />
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}

                  {!!upcomingEventsSorted.length && (
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg sm:text-xl font-bold text-gray-900">Upcoming Events</h2>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
                        {upcomingEventsSorted.map((event, index) => (
                          <Link key={event._id} href={`/events/${event._id}`} className="block">
                            <EventCard event={event} index={index} />
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}

                  {!!pastEventsSorted.length && (
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg sm:text-xl font-bold text-gray-900">Past Events</h2>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
                        {pastEventsSorted.map((event, index) => (
                          <Link key={event._id} href={`/events/${event._id}`} className="block">
                            <EventCard event={event} index={index} />
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}

                  {!currentEventsSorted.length && !upcomingEventsSorted.length && !pastEventsSorted.length && (
                    <div className="text-center py-16 text-gray-600">No Events Found</div>
                  )}
                </section>
              </div>
            </div>

            {/* Mobile: Centered Filter Modal */}
            <AnimatePresence>
              {isFilterOpen && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center lg:hidden p-4"
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
      </main>
      <Footer />
    </div>
  );
}
