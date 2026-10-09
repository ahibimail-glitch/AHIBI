"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
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
import { Calendar, MapPin, Search, Loader2, Clock, ArrowLeft } from "lucide-react";
import Link from "next/link";
import Navbar from "../../Navbar";
import Footer from "../../Footer";
import { format } from "date-fns";

interface DailyEvent {
  _id: string;
  title: string;
  description: string;
  banner: string;
  category: string;
  periodStartDate: string;
  periodEndDate: string;
  startTime: string;
  duration: {
    hours: number;
    minutes: number;
  };
  activeDates: string[];
  excludedDates: string[];
  location: {
    address: string;
    city: string;
    state?: string;
  };
  ticketTypes: any[];
  isFreeEvent: boolean;
  slug: string;
}

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

const getLowestPrice = (ticketTypes: { price: number }[] = []): string => {
  if (!ticketTypes || ticketTypes.length === 0) return 'Free';
  const prices = ticketTypes.map(t => t.price);
  const minPrice = Math.min(...prices);
  return minPrice === 0 ? 'Free' : `₹${minPrice.toFixed(2)}`;
};

const DailyEventCard = ({ event, index = 0 }: { event: DailyEvent; index?: number }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.05 }}
      className="relative w-full"
    >
      <Card className="w-full overflow-hidden rounded-xl bg-white border-0 shadow-none">
        <div className="relative aspect-[2/3] w-full overflow-hidden rounded-xl">
          <img
            src={event.banner || "/placeholder.svg"}
            alt={event.title}
            loading={index < 8 ? "eager" : "lazy"}
            className="w-full h-full object-cover rounded-xl"
          />
          <div className="absolute bottom-0 left-0 right-0 bg-black/90 py-1 px-2">
            <p className="text-[10px] text-white text-center font-medium truncate">
              {event.startTime} • {event.duration.hours}h {event.duration.minutes}m
            </p>
          </div>
          <div className="absolute top-2 right-2">
            <Badge className="bg-blue-600 text-white text-[10px]">Daily</Badge>
          </div>
        </div>

        <div className="px-1 pt-2 pb-1">
          <h3 className="text-[14px] font-semibold text-gray-900 leading-snug line-clamp-1">
            {event.title}
          </h3>

          <p className="text-[12px] text-gray-500 mt-0.5 line-clamp-1">
            {event.category || "Event"}{event.location?.city ? ` | ${event.location.city}` : ""}
          </p>

          <p className="text-[11px] text-gray-400 mt-1">
            {event.periodStartDate && event.periodEndDate ? (
              <>
                {format(new Date(event.periodStartDate), "MMM dd")} - {format(new Date(event.periodEndDate), "MMM dd, yyyy")}
              </>
            ) : (
              "Date TBA"
            )}
          </p>

          <p className="text-[11px] text-blue-600 font-medium mt-1">
            {event.activeDates?.length || 0} active dates
          </p>
        </div>
      </Card>
    </motion.div>
  );
};

export default function DailyEventsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCity, setSelectedCity] = useState("all");
  const [selectedGenre, setSelectedGenre] = useState("all");
  const [dailyEvents, setDailyEvents] = useState<DailyEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDailyEvents = async () => {
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/daily-events?limit=1000`);

        if (!response.ok) throw new Error('Failed to fetch daily events');
        const data = await response.json();
        setDailyEvents(data.data.dailyEvents || []);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load daily events';
        console.error('Error fetching daily events:', errorMessage);
        setError(errorMessage);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDailyEvents();
  }, []);

  const resetFilters = () => {
    setSearchQuery("");
    setSelectedCity("all");
    setSelectedGenre("all");
  };

  const hasActiveFilters = searchQuery !== "" || selectedCity !== "all" || selectedGenre !== "all";

  const filteredEvents = dailyEvents.filter((event: DailyEvent) => {
    const matchesSearch = event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (event.description || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCity = selectedCity === "all" || event.location?.city?.toLowerCase() === selectedCity.toLowerCase();
    const matchesGenre = selectedGenre === "all" || event.category?.toLowerCase() === selectedGenre.toLowerCase();
    return matchesSearch && matchesCity && matchesGenre;
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
          <p className="text-lg font-semibold text-gray-800">Loading Daily Events...</p>
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
          <Button
            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-6 py-3 rounded-full"
            onClick={() => window.location.reload()}
          >
            Try Again
          </Button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar />
      <main className="flex-1">
        <section className="py-8 bg-gradient-to-br from-blue-50 to-purple-50">
          <div className="container mx-auto px-4">
            <div className="flex items-center gap-4 mb-6">
              <Button asChild variant="ghost" size="sm">
                <Link href="/events">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Events
                </Link>
              </Button>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">Daily Events</h1>
            <p className="text-gray-600">Recurring events happening throughout the month</p>
          </div>
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
                      <p className="text-sm font-medium text-gray-900 mb-2">Search</p>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                          placeholder="Search daily events..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="pl-9 bg-white border-gray-300 rounded-md text-sm"
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
                  </div>
                </div>
              </aside>

              <div>
                <div className="flex items-center justify-between gap-3 mb-4">
                  <div>
                    <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
                      Daily Events in {selectedCity === 'all' ? 'India' : selectedCity}
                    </h2>
                  </div>
                  {hasActiveFilters && (
                    <Button
                      variant="ghost"
                      className="h-9 px-3 rounded-full text-gray-700 hover:bg-gray-100 transition-colors text-sm font-medium"
                      onClick={resetFilters}
                    >
                      Clear
                    </Button>
                  )}
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

                {filteredEvents.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
                    {filteredEvents.map((event, index) => (
                      <Link key={event._id} href={`/events/daily/${event._id}`} className="block">
                        <DailyEventCard event={event} index={index} />
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-16">
                    <Calendar className="h-16 w-16 mx-auto text-gray-300 mb-4" />
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">No Daily Events Found</h3>
                    <p className="text-gray-600 mb-6">
                      {hasActiveFilters
                        ? "Try adjusting your filters to see more events"
                        : "Check back soon for new daily events"}
                    </p>
                    {hasActiveFilters && (
                      <Button onClick={resetFilters} variant="outline">
                        Clear Filters
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
