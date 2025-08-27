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
import { Calendar, MapPin, Search, Heart, Loader2, Star, Sparkles, Crown } from "lucide-react";
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

const GENRES = ['Music',
  'Comedy',
  'Theatre',
  'Dance',
  'Food',
  'Art',
  'Sports',
  'Business',
  'Education',
  'Other'];

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

// Premium Event card component with luxury styling
interface EventCardProps {
  event: Event;
  index?: number;
}

const EventCard: React.FC<EventCardProps> = ({ event, index = 0 }) => {
  const isPastEvent = new Date(event.endDate) < new Date();
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div 
      className="group relative"
      style={{
        animationDelay: `${index * 100}ms`
      }}
    >
      {/* Luxury glow effect */}
      <div className="absolute -inset-0.5 bg-gradient-to-r from-pink-600 via-purple-600 to-blue-600 rounded-2xl blur opacity-0 group-hover:opacity-20 transition duration-1000 group-hover:duration-200 animate-tilt"></div>
      
      <Card 
        className="relative overflow-hidden bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl hover:bg-white/20 transition-all duration-700 h-full flex flex-col shadow-2xl hover:shadow-purple-500/25"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div className="relative">
          <AspectRatio ratio={16 / 9} className="relative overflow-hidden rounded-t-2xl">
            <Image
              src={event.banner || "/placeholder.svg"}
              alt={event.title}
              fill
              className={`object-cover transition-transform duration-700 ${isHovered ? 'scale-110' : 'scale-100'}`}
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              priority={false}
            />
            
            {/* Premium overlay gradient */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-60"></div>
            <div className="absolute inset-0 bg-gradient-to-br from-purple-600/30 to-pink-600/30 opacity-40"></div>
            
            {/* Floating elements */}
            <div className="absolute top-4 right-4 flex gap-2">
              {event.isFeatured && (
                <div className="bg-gradient-to-r from-yellow-400 to-orange-500 p-2 rounded-full shadow-lg">
                  <Crown className="h-4 w-4 text-white" />
                </div>
              )}
              <Button 
                size="icon" 
                variant="ghost" 
                className="rounded-full bg-white/20 backdrop-blur-sm hover:bg-white/30 border border-white/30 transition-all duration-300"
              >
                <Heart className="h-4 w-4 text-white group-hover:text-pink-400 transition-colors" />
              </Button>
            </div>

            {/* Premium category badge */}
            <div className="absolute top-4 left-4">
              <Badge className="bg-gradient-to-r from-purple-600 to-pink-600 text-white border-0 px-3 py-1 text-xs font-semibold tracking-wide shadow-lg backdrop-blur-sm">
                <Sparkles className="h-3 w-3 mr-1" />
                {event.category}
              </Badge>
            </div>

            {/* Title with premium styling */}
            <div className="absolute bottom-0 left-0 right-0 p-6">
              <h3 className="text-2xl font-bold text-white mb-2 line-clamp-2 tracking-tight">
                {event.title}
              </h3>
              <div className="flex items-center gap-2">
                <div className="h-px bg-gradient-to-r from-purple-400 to-pink-400 flex-1"></div>
                <Star className="h-4 w-4 text-yellow-400 fill-current" />
                <div className="h-px bg-gradient-to-r from-pink-400 to-purple-400 flex-1"></div>
              </div>
            </div>
          </AspectRatio>
        </div>

        <CardContent className="p-6 flex-1 flex flex-col bg-gradient-to-br from-slate-900/90 to-slate-800/90 backdrop-blur-xl">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3 text-sm text-slate-300">
              <div className="flex items-center gap-2 bg-white/10 px-3 py-1 rounded-full backdrop-blur-sm">
                <Calendar className="h-4 w-4 flex-shrink-0 text-purple-400" />
                <span className="font-medium">{formatDate(event.startDate)}</span>
              </div>
              <div className="w-1 h-1 bg-purple-400 rounded-full"></div>
              <span className="font-medium text-slate-200">{formatTime(event.startDate)}</span>
            </div>
          </div>

          <div className="mt-auto space-y-4">
            <div className="flex items-start gap-3">
              <MapPin className="h-5 w-5 flex-shrink-0 text-pink-400 mt-0.5" />
              <div className="text-sm text-slate-300 line-clamp-2 leading-relaxed">
                <span className="font-semibold text-slate-200">{event.location?.city}</span>
                <br />
                <span className="text-xs">{event.location?.address}</span>
              </div>
            </div>

            {/* Premium pricing display */}
            <div className="bg-gradient-to-r from-purple-600/20 to-pink-600/20 p-4 rounded-xl border border-purple-500/20 backdrop-blur-sm">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-xs text-slate-400 mb-1">Starting from</p>
                  <p className="text-xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                    {getLowestPrice(event.ticketTypes)}
                  </p>
                </div>
                {isPastEvent ? (
                  <Button 
                    size="sm" 
                    disabled
                    className="bg-slate-700/50 text-slate-400 cursor-not-allowed hover:bg-slate-700/50"
                  >
                    Past Event
                  </Button>
                ) : (
                  <Button 
                    asChild 
                    size="sm"
                    className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold px-6 py-2 rounded-full transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-purple-500/25"
                  >
                    <Link href={event._id === "6899cb7215438afd622a7646" ? "/events/FC25" : `/events/${event._id}`}>
                      Experience Now
                    </Link>
                  </Button>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default function EventsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCity, setSelectedCity] = useState("all");
  const [selectedGenre, setSelectedGenre] = useState("all");
  const [events, setEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Get current date in user's timezone
  const currentDate = new Date();

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/events`);
        if (!response.ok) {
          throw new Error('Failed to fetch events');
        }
        const data: EventsResponse = await response.json();
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

  // Filter events by search and filters
  const filteredEvents = events.filter((event: Event) => {
    const matchesSearch = event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (event.description || '').toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCity = selectedCity === "all" ||
      (event.location?.city?.toLowerCase() === selectedCity.toLowerCase());

    const matchesGenre = selectedGenre === "all" ||
      (event.category?.toLowerCase() === selectedGenre.toLowerCase());

    return matchesSearch && matchesCity && matchesGenre;
  });

  // Categorize events based on their dates
  const upcomingEvents = filteredEvents.filter((event: Event) => {
    const startDate = new Date(event.startDate);
    return startDate > currentDate;
  });

  const currentEvents = filteredEvents.filter((event: Event) => {
    const startDate = new Date(event.startDate);
    const endDate = new Date(event.endDate);
    return startDate <= currentDate && endDate >= currentDate;
  });

  const pastEvents = filteredEvents.filter((event: Event) => {
    const endDate = new Date(event.endDate);
    return endDate < currentDate;
  });

  // Featured events should be filtered from the original events array
  const featuredEvents = events.filter((event: Event) => event.isFeatured);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        <div className="flex flex-col items-center gap-6">
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full blur-xl opacity-50"></div>
            <Loader2 className="h-12 w-12 animate-spin text-white relative z-10" />
          </div>
          <div className="text-center">
            <p className="text-xl font-semibold text-white mb-2">Curating Premium Experiences</p>
            <p className="text-slate-300">Please wait while we prepare something extraordinary...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        <div className="text-center p-8 max-w-md mx-auto">
          <div className="bg-red-500/20 backdrop-blur-xl rounded-2xl p-8 border border-red-500/30">
            <h2 className="text-2xl font-bold text-red-400 mb-4">Something went wrong</h2>
            <p className="text-slate-300 mb-6">{error}</p>
            <Button
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold px-8 py-3 rounded-full transition-all duration-300"
              onClick={() => window.location.reload()}
            >
              Try Again
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (filteredEvents.length === 0) {
    return (
      <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        <Navbar />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center p-8 max-w-md mx-auto">
            <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-8 border border-white/20">
              <h2 className="text-2xl font-bold text-white mb-4">No Premium Events Found</h2>
              <p className="text-slate-300 mb-6">We couldn't find any events matching your refined criteria.</p>
              <Button
                onClick={() => {
                  setSearchQuery("");
                  setSelectedCity("all");
                  setSelectedGenre("all");
                }}
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold px-8 py-3 rounded-full transition-all duration-300"
              >
                Clear Filters
              </Button>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <Navbar />
      <main className="flex-1">
        {/* Ultra Premium Hero Section */}
        <section className="relative overflow-hidden">
          {/* Animated background elements */}
          <div className="absolute inset-0">
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/30 rounded-full blur-3xl animate-pulse"></div>
            <div className="absolute top-3/4 right-1/4 w-96 h-96 bg-pink-500/30 rounded-full blur-3xl animate-pulse" style={{animationDelay: '1s'}}></div>
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-500/20 rounded-full blur-3xl animate-pulse" style={{animationDelay: '2s'}}></div>
          </div>
          
          <div className="relative z-10 py-32 px-4">
            <div className="container mx-auto text-center">
              {/* <div className="mb-6">
                <Badge className="bg-gradient-to-r from-yellow-400 to-orange-500 text-black px-4 py-2 text-sm font-bold tracking-wide mb-6">
                  <Crown className="h-4 w-4 mr-2" />
                  PREMIUM COLLECTION
                </Badge>
              </div> */}
              
              <h1 className="text-7xl md:text-8xl font-black mb-8 tracking-tighter">
                <span className="bg-gradient-to-r from-white via-purple-200 to-pink-200 bg-clip-text text-transparent">
                  Discover
                </span>
                <br />
                <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-purple-400 bg-clip-text text-transparent">
                  Extraordinary
                </span>
                <br />
                <span className="bg-gradient-to-r from-pink-400 via-purple-400 to-blue-400 bg-clip-text text-transparent">
                  Events
                </span>
              </h1>
              
              <p className="text-2xl md:text-3xl text-slate-300 mb-12 max-w-4xl mx-auto leading-relaxed">
                Curated experiences that transcend the ordinary. 
                <span className="text-transparent bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text"> Connect with world-class talent.</span>
              </p>

              <div className="flex items-center justify-center gap-4 mb-8">
                <div className="h-px bg-gradient-to-r from-transparent via-purple-400 to-transparent w-24"></div>
                <Sparkles className="h-8 w-8 text-purple-400" />
                <div className="h-px bg-gradient-to-r from-transparent via-purple-400 to-transparent w-24"></div>
              </div>
            </div>
          </div>
        </section>

        {/* Premium Search and Filter Section */}
        <section className="py-16 relative">
          <div className="container mx-auto px-4">
            <div className="max-w-6xl mx-auto">
              <div className="bg-white/5 backdrop-blur-2xl rounded-3xl p-8 border border-white/10 shadow-2xl">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-purple-400" />
                    <Input
                      placeholder="Search premium events..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-12 bg-white/10 border-white/20 text-white placeholder:text-slate-400 rounded-2xl h-14 text-lg backdrop-blur-sm focus:bg-white/20 transition-all duration-300"
                    />
                  </div>
                  
                  <Select value={selectedCity} onValueChange={setSelectedCity}>
                    <SelectTrigger className="bg-white/10 border-white/20 text-white rounded-2xl h-14 text-lg backdrop-blur-sm hover:bg-white/20 transition-all duration-300">
                      <SelectValue placeholder="Select City" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800/95 backdrop-blur-xl border-white/20 rounded-2xl">
                      <SelectItem value="all" className="text-white hover:bg-white/10">All Cities</SelectItem>
                      {CITIES.map((city) => (
                        <SelectItem key={city} value={city} className="text-white hover:bg-white/10">{city}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  <Select value={selectedGenre} onValueChange={setSelectedGenre}>
                    <SelectTrigger className="bg-white/10 border-white/20 text-white rounded-2xl h-14 text-lg backdrop-blur-sm hover:bg-white/20 transition-all duration-300">
                      <SelectValue placeholder="Select Category" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800/95 backdrop-blur-xl border-white/20 rounded-2xl">
                      <SelectItem value="all" className="text-white hover:bg-white/10">All Categories</SelectItem>
                      {GENRES.map((genre) => (
                        <SelectItem key={genre} value={genre} className="text-white hover:bg-white/10">{genre}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Events Sections */}
        <section className="pb-20">
          <div className="container mx-auto px-4">
            {/* Featured Events */}
            {featuredEvents.length > 0 && (
              <div className="mb-20">
                <div className="text-center mb-12">
                  <h2 className="text-5xl font-bold mb-4">
                    <span className="bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent">
                      Crown Collection
                    </span>
                  </h2>
                  <div className="flex items-center justify-center gap-4">
                    <div className="h-px bg-gradient-to-r from-transparent via-yellow-400 to-transparent w-32"></div>
                    <Crown className="h-8 w-8 text-yellow-400" />
                    <div className="h-px bg-gradient-to-r from-transparent via-yellow-400 to-transparent w-32"></div>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 animate-fade-in">
                  {featuredEvents.map((event, index) => (
                    <EventCard key={event._id} event={event} index={index} />
                  ))}
                </div>
              </div>
            )}

            {/* Current Events */}
            {currentEvents.length > 0 && (
              <div className="mb-20">
                <div className="text-center mb-12">
                  <h2 className="text-4xl font-bold mb-4">
                    <span className="bg-gradient-to-r from-green-400 to-blue-500 bg-clip-text text-transparent">
                      Live Experiences
                    </span>
                  </h2>
                  <p className="text-slate-300 text-lg">Currently happening now</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {currentEvents.map((event, index) => (
                    <EventCard key={event._id} event={event} index={index} />
                  ))}
                </div>
              </div>
            )}

            {/* Upcoming Events */}
            {upcomingEvents.length > 0 && (
              <div className="mb-20">
                <div className="text-center mb-12">
                  <h2 className="text-4xl font-bold mb-4">
                    <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                      Future Experiences
                    </span>
                  </h2>
                  <p className="text-slate-300 text-lg">Anticipate the extraordinary</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {upcomingEvents.map((event, index) => (
                    <EventCard key={event._id} event={event} index={index} />
                  ))}
                </div>
              </div>
            )}

            {/* Past Events */}
            {pastEvents.length > 0 && (
              <div className="mb-20">
                <div className="text-center mb-12">
                  <h2 className="text-4xl font-bold mb-4">
                    <span className="bg-gradient-to-r from-slate-400 to-slate-300 bg-clip-text text-transparent">
                      Legacy Collection
                    </span>
                  </h2>
                  <p className="text-slate-400 text-lg">Cherished memories</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {pastEvents.map((event, index) => (
                    <EventCard key={event._id} event={event} index={index} />
                  ))}
                </div>
              </div>
            )}

            {/* No Events Found */}
            {!upcomingEvents.length && !currentEvents.length && !pastEvents.length && (
              <div className="text-center py-20">
                <div className="bg-white/5 backdrop-blur-xl rounded-3xl p-12 border border-white/10 max-w-2xl mx-auto">
                  <h3 className="text-3xl font-bold text-white mb-4">No Premium Events Found</h3>
                  <p className="text-slate-300 mb-8 text-lg">Refine your search to discover extraordinary experiences</p>
                  <Button
                    className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold px-12 py-4 rounded-full transition-all duration-300 text-lg"
                    onClick={() => {
                      setSearchQuery("");
                      setSelectedCity("all");
                      setSelectedGenre("all");
                    }}
                  >
                    Clear All Filters
                  </Button>
                </div>
              </div>
            )}
          </div>
        </section>
      </main>
      <Footer />
      
      {/* Custom styles for animations */}
      <style jsx>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        @keyframes tilt {
          0%, 50%, 100% { transform: rotate(0deg); }
          25% { transform: rotate(1deg); }
          75% { transform: rotate(-1deg); }
        }
        
        .animate-fade-in {
          animation: fade-in 0.6s ease-out forwards;
        }
        
        .animate-tilt {
          animation: tilt 10s infinite linear;
        }
      `}</style>
    </div>
  );
}