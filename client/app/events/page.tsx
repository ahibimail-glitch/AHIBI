"use client";

import { useState, useEffect } from "react";
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
import { Calendar, MapPin, Search, Heart, Loader2 } from "lucide-react";
import Image from "next/image";
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
];

const GENRES = ["Music", "Comedy", "Technology", "Food", "Art", "Dance"];

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

// Event card component
interface EventCardProps {
  event: Event;
}

const EventCard: React.FC<EventCardProps> = ({ event }) => (
  <Card className="overflow-hidden hover:shadow-lg transition-shadow h-full flex flex-col">
    <div className="relative h-48">
      <Image
        src={event.banner || "/placeholder.svg"}
        alt={event.title}
        fill
        className="object-fill"
        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        priority={false}
      />
      <div className="absolute top-2 right-2">
        <Button size="icon" variant="ghost" className="rounded-full bg-white/90 hover:bg-white">
          <Heart className="h-5 w-5 text-gray-700" />
        </Button>
      </div>
      <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
        <Badge variant="secondary" className="mb-2">
          {event.category}
        </Badge>
        <h3 className="text-xl font-bold text-white line-clamp-1">{event.title}</h3>
      </div>
    </div>
    <CardContent className="p-4 flex-1 flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Calendar className="h-4 w-4 flex-shrink-0" />
          <span>{formatDate(event.startDate)}</span>
          <span>•</span>
          <span>{formatTime(event.startDate)}</span>
        </div>
        <Badge variant="outline" className="bg-green-100 text-green-800 whitespace-nowrap">
          {event.attendees || 0} Going
        </Badge>
      </div>
      <div className="mt-auto">
        <div className="flex items-center gap-2 text-sm text-gray-600 mb-3">
          <MapPin className="h-4 w-4 flex-shrink-0 text-gray-500" />
          <span className="line-clamp-1">
            {event.location?.city}, {event.location?.address}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium">
            Only {getLowestPrice(event.ticketTypes)}
          </span>
          <Button asChild size="sm">
            <Link href={`/events/${event.slug || event._id}`}>
              View Details
            </Link>
          </Button>
        </div>
      </div>
    </CardContent>
  </Card>
);

export default function EventsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCity, setSelectedCity] = useState("all");
  const [selectedGenre, setSelectedGenre] = useState("all");
  const [events, setEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const response = await fetch('/api/events');
        if (!response.ok) {
          throw new Error('Failed to fetch events');
        }
        const data: EventsResponse = await response.json();
        console.log(data.data.events);
        setEvents(data.data.events || []);
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

  const filteredEvents = events.filter((event) => {
    const matchesSearch = event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (event.description || '').toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCity = selectedCity === "all" ||
      (event.location?.city?.toLowerCase() === selectedCity.toLowerCase());

    const matchesGenre = selectedGenre === "all" ||
      (event.category?.toLowerCase() === selectedGenre.toLowerCase());

    return matchesSearch && matchesCity && matchesGenre;
  });

  const featuredEvents = filteredEvents.filter((event) => event.isFeatured);
  const regularEvents = filteredEvents.filter((event) => !event.isFeatured);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
          <p className="text-gray-600">Loading events...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-red-600 mb-2">Error loading events</h2>
          <p className="text-gray-600">{error}</p>
          <Button
            className="mt-4"
            onClick={() => window.location.reload()}
          >
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  if (filteredEvents.length === 0) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center p-6 max-w-md mx-auto">
            <h2 className="text-xl font-semibold text-gray-800 mb-2">No Events Found</h2>
            <p className="text-gray-600 mb-4">We couldn't find any events matching your criteria.</p>
            <Button
              onClick={() => {
                setSearchQuery("");
                setSelectedCity("all");
                setSelectedGenre("all");
              }}
              variant="outline"
            >
              Clear Filters
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1">
        {/* Hero Section */}
        <section className="bg-gradient-to-r from-blue-600 to-purple-600 text-white py-16">
          <div className="container mx-auto px-4 text-center">
            <h1 className="text-4xl md:text-6xl font-bold mb-4">Discover Amazing Artists</h1>
            <p className="text-xl md:text-2xl text-white/90 mb-8">Connect with talented performers for your next event</p>
          </div>
        </section>

        {/* Events Section */}
        <section className="py-12">
          <div className="container mx-auto px-4">
            {featuredEvents.length > 0 && (
              <div className="mb-12">
                <h2 className="text-2xl font-bold mb-6">Featured Events</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {featuredEvents.map((event) => (
                    <EventCard key={event._id} event={event} />
                  ))}
                </div>
              </div>
            )}

            <div className="mb-8 flex justify-between items-center">
              <h2 className="text-2xl font-bold">
                {featuredEvents.length > 0 ? 'More Events' : 'All Events'}
              </h2>
              <p className="text-gray-600">{filteredEvents.length} events found</p>
            </div>

            {regularEvents.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {regularEvents.map((event) => (
                  <EventCard key={event._id} event={event} />
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <h3 className="text-xl font-medium text-gray-700 mb-2">No events found</h3>
                <p className="text-gray-500 mb-6">Try adjusting your search or filters</p>
                <Button
                  variant="outline"
                  onClick={() => {
                    setSearchQuery("");
                    setSelectedCity("all");
                    setSelectedGenre("all");
                  }}
                >
                  Clear Filters
                </Button>
              </div>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
