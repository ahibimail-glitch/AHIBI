"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Loader2,
  MapPin,
  Calendar as CalendarIcon,
  Share2,
  Clock,
  Ticket,
  ChevronDown,
  ChevronUp,
  ArrowLeft,
  Tag,
} from "lucide-react";

import { format } from "date-fns";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

import Navbar from "@/app/Navbar";
import Footer from "@/app/Footer";

interface TicketType {
  _id: string;
  name: string;
  price: number;
  quantity: number;
  sold: number;
  description: string;
  benefits?: string[];
  capacity: number;
}

interface DailyEvent {
  _id: string;
  title: string;
  description: string;
  banner: string;
  coverImage?: string;
  gallery: Array<{ url: string; caption: string }>;
  organizer: any;
  category: string;
  tags: string[];
  periodStartDate: string;
  periodEndDate: string;
  startTime: string;
  duration: {
    hours: number;
    minutes: number;
  };
  activeDates: string[];
  excludedDates: string[];
  ticketTypes: TicketType[];
  location: {
    address: string;
    city: string;
    state?: string;
    country?: string;
  };
  convenience: { percentage: number; fixedAmount: number };
  termsAndConditions?: string;
  isFreeEvent?: boolean;
  socialLinks?: {
    website?: string;
    facebook?: string;
    instagram?: string;
    twitter?: string;
    youtube?: string;
  };
}

interface DailyEventDetailPageProps {
  params: { id: string };
}

export default function DailyEventDetailPage({ params }: DailyEventDetailPageProps) {
  const router = useRouter();
  const [event, setEvent] = useState<DailyEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [descExpanded, setDescExpanded] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [venueOpen, setVenueOpen] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const fetchEvent = async () => {
      try {
        setLoading(true);
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/daily-events/${params.id}`, { 
          cache: "no-store" 
        });
        
        if (!res.ok) {
          if (res.status === 404) throw new Error("Daily event not found.");
          if (res.status === 403) throw new Error("This daily event is not available.");
          throw new Error(`HTTP error: ${res.status}`);
        }
        
        const data = await res.json();
        if (isMounted) setEvent(data);
      } catch (err) {
        if (isMounted) setError(err instanceof Error ? err.message : "Failed to load daily event");
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchEvent();

    return () => {
      isMounted = false;
    };
  }, [params.id]);

  const handleBuyNow = () => {
    const token = localStorage.getItem("token");
    if (!token) {
      toast.info("Please login to book tickets");
      router.push(`/auth?redirect=/events/daily/${params.id}/checkout`);
      return;
    }
    router.push(`/events/daily/${params.id}/checkout`);
  };

  const handleShare = async () => {
    try {
      const url = window.location.href;
      const nav = navigator as any;
      if (typeof nav?.share === "function") {
        await nav.share({ title: event?.title || "Daily Event", url });
        return;
      }
      if (nav?.clipboard?.writeText) {
        await nav.clipboard.writeText(url);
        toast.success("Link copied to clipboard");
        return;
      }
      toast.error("Sharing not supported on this device");
    } catch (err: any) {
      if (err?.name !== "AbortError") toast.error("Failed to share link");
    }
  };

  const getEventPriceRange = () => {
    if (!event) return "TBA";
    if (event.isFreeEvent) return "Free";
    if (!Array.isArray(event.ticketTypes) || event.ticketTypes.length === 0) return "TBA";
    
    const prices = event.ticketTypes.map(t => t.price).filter(p => typeof p === "number" && p > 0);
    if (prices.length === 0) return "Free";
    
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    return min === max ? `₹${min}` : `₹${min} – ₹${max}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center p-8 max-w-md mx-auto bg-white rounded-2xl shadow-lg">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Error</h2>
          <p className="text-gray-600 mb-6">{error || "Event not found"}</p>
          <Button onClick={() => router.push("/events/daily")}>
            Back to Daily Events
          </Button>
        </div>
      </div>
    );
  }

  const descriptionText = event.description || "";
  const shouldTruncate = descriptionText.length > 300;
  const displayedDescription = descExpanded || !shouldTruncate 
    ? descriptionText 
    : descriptionText.slice(0, 300) + "...";

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar />

      <main className="flex-1 pb-8">
        <div className="container mx-auto px-4 py-6">
          <Button asChild variant="ghost" size="sm" className="mb-4">
            <Link href="/events/daily">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Daily Events
            </Link>
          </Button>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <div className="relative w-full aspect-video rounded-2xl overflow-hidden shadow-lg">
                <img
                  src={event.banner}
                  alt={event.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-4 right-4">
                  <Badge className="bg-blue-600 text-white">Daily Event</Badge>
                </div>
              </div>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div className="flex-1">
                      <h1 className="text-3xl font-bold text-gray-900 mb-2">{event.title}</h1>
                      <Badge variant="secondary" className="mb-4">{event.category}</Badge>
                    </div>
                    <Button variant="outline" size="icon" onClick={handleShare}>
                      <Share2 className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <CalendarIcon className="h-5 w-5 text-gray-500 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="font-semibold text-gray-900">Event Period</p>
                        <p className="text-gray-600">
                          {format(new Date(event.periodStartDate), "MMMM d, yyyy")} - {format(new Date(event.periodEndDate), "MMMM d, yyyy")}
                        </p>
                        <p className="text-sm text-blue-600 mt-1">
                          {event.activeDates.length} active dates
                          {event.excludedDates.length > 0 && ` (${event.excludedDates.length} excluded)`}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <Clock className="h-5 w-5 text-gray-500 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="font-semibold text-gray-900">Time & Duration</p>
                        <p className="text-gray-600">
                          Starts at {event.startTime}
                        </p>
                        <p className="text-sm text-gray-500">
                          Duration: {event.duration.hours}h {event.duration.minutes}m
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <MapPin className="h-5 w-5 text-gray-500 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="font-semibold text-gray-900">Venue</p>
                        <p className="text-gray-600">{event.location.address}</p>
                        <p className="text-sm text-gray-500">
                          {event.location.city}
                          {event.location.state && `, ${event.location.state}`}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <Tag className="h-5 w-5 text-gray-500 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="font-semibold text-gray-900">Price Range</p>
                        <p className="text-gray-600">{getEventPriceRange()}</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <h2 className="text-xl font-bold text-gray-900 mb-4">About This Event</h2>
                  <div className="prose prose-sm max-w-none">
                    <p className="text-gray-700 whitespace-pre-wrap">{displayedDescription}</p>
                    {shouldTruncate && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDescExpanded(!descExpanded)}
                        className="mt-2"
                      >
                        {descExpanded ? (
                          <>
                            <ChevronUp className="h-4 w-4 mr-1" />
                            Show Less
                          </>
                        ) : (
                          <>
                            <ChevronDown className="h-4 w-4 mr-1" />
                            Read More
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>

              {event.activeDates && event.activeDates.length > 0 && (
                <Card>
                  <CardContent className="p-6">
                    <h2 className="text-xl font-bold text-gray-900 mb-4">Active Dates</h2>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                      {event.activeDates.sort((a, b) => new Date(a).getTime() - new Date(b).getTime()).map((date, index) => (
                        <div key={index} className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-center">
                          <p className="text-sm font-semibold text-blue-900">
                            {format(new Date(date), "MMM dd")}
                          </p>
                          <p className="text-xs text-blue-700">
                            {format(new Date(date), "EEEE")}
                          </p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {event.termsAndConditions && (
                <Card>
                  <CardContent className="p-6">
                    <Button
                      variant="ghost"
                      onClick={() => setShowTerms(!showTerms)}
                      className="w-full justify-between p-0 h-auto hover:bg-transparent"
                    >
                      <h2 className="text-xl font-bold text-gray-900">Terms & Conditions</h2>
                      {showTerms ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                    </Button>
                    {showTerms && (
                      <div className="mt-4 prose prose-sm max-w-none">
                        <p className="text-gray-700 whitespace-pre-wrap">{event.termsAndConditions}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>

            <div className="lg:col-span-1">
              <div className="sticky top-6">
                <Card>
                  <CardContent className="p-6">
                    <h3 className="text-lg font-bold text-gray-900 mb-4">Book Tickets</h3>
                    
                    {event.isFreeEvent ? (
                      <div className="mb-6">
                        <p className="text-3xl font-bold text-green-600">Free Entry</p>
                      </div>
                    ) : (
                      <div className="mb-6">
                        <p className="text-sm text-gray-600 mb-2">Starting from</p>
                        <p className="text-3xl font-bold text-gray-900">{getEventPriceRange()}</p>
                      </div>
                    )}

                    {event.ticketTypes && event.ticketTypes.length > 0 && (
                      <div className="space-y-3 mb-6">
                        {event.ticketTypes.map((ticket) => {
                          const available = ticket.quantity - ticket.sold;
                          const isAvailable = available > 0;

                          return (
                            <div key={ticket._id} className="border border-gray-200 rounded-lg p-3">
                              <div className="flex justify-between items-start mb-1">
                                <div>
                                  <p className="font-semibold text-gray-900">{ticket.name}</p>
                                  {ticket.description && (
                                    <p className="text-xs text-gray-600">{ticket.description}</p>
                                  )}
                                </div>
                                <p className="font-bold text-gray-900">₹{ticket.price}</p>
                              </div>
                              <p className="text-xs text-gray-500">
                                {isAvailable ? `${available} available` : "Sold out"}
                              </p>
                              {ticket.benefits && ticket.benefits.length > 0 && (
                                <ul className="mt-2 space-y-1">
                                  {ticket.benefits.map((benefit, idx) => (
                                    <li key={idx} className="text-xs text-gray-600 flex items-start gap-1">
                                      <span className="text-green-600">✓</span>
                                      {benefit}
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    <Button
                      onClick={handleBuyNow}
                      className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
                      size="lg"
                    >
                      <Ticket className="h-5 w-5 mr-2" />
                      {event.isFreeEvent ? "Register Now" : "Book Now"}
                    </Button>

                    {event.socialLinks && (
                      <div className="mt-6 pt-6 border-t border-gray-200">
                        <p className="text-sm font-semibold text-gray-900 mb-3">Follow Event</p>
                        <div className="flex gap-2">
                          {event.socialLinks.website && (
                            <Button asChild variant="outline" size="icon">
                              <a href={event.socialLinks.website} target="_blank" rel="noopener noreferrer">
                                <Share2 className="h-4 w-4" />
                              </a>
                            </Button>
                          )}
                          {event.socialLinks.facebook && (
                            <Button asChild variant="outline" size="icon">
                              <a href={event.socialLinks.facebook} target="_blank" rel="noopener noreferrer">
                                <Share2 className="h-4 w-4" />
                              </a>
                            </Button>
                          )}
                          {event.socialLinks.instagram && (
                            <Button asChild variant="outline" size="icon">
                              <a href={event.socialLinks.instagram} target="_blank" rel="noopener noreferrer">
                                <Share2 className="h-4 w-4" />
                              </a>
                            </Button>
                          )}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
