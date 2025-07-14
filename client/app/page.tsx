"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Ticket,
  Users,
  Calendar,
  Building2,
  Music,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Clock,
  Star,
} from "lucide-react";
import Link from "next/link";
import Navbar from "./Navbar";
import Footer from "./Footer";

export default function HomePage() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);

  const featuredEvents = [
    {
      id: 1,
      title: "Summer Music Festival 2024",
      price: "₹1,500",
      date: "July 15, 2024",
      venue: "Central Park Arena, Mumbai",
      category: "Music",
      type: "Festival",
      setting: "Outdoor",
      image: "/images/carausel2.jpg?height=300&width=500",
      rating: 4.8,
      attendees: 2500,
    },
    {
      id: 2,
      title: "Stand-Up Comedy Night",
      price: "₹800",
      date: "July 20, 2024",
      venue: "Comedy Club Downtown, Delhi",
      category: "Comedy",
      type: "Indoor",
      setting: "Entertainment",
      image: "/images/carausel1.jpg?height=300&width=500",
      rating: 4.6,
      attendees: 150,
    },
    {
      id: 3,
      title: "Tech Conference 2024",
      price: "₹2,500",
      date: "July 25, 2024",
      venue: "Convention Center, Bangalore",
      category: "Technology",
      type: "Conference",
      setting: "Networking",
      image: "/images/carausel3.jpg?height=300&width=500",
      rating: 4.9,
      attendees: 1000,
    },
  ];

  const stats = [
    { number: "15+", label: "Events Hosted" },
    { number: "35,000+", label: "Tickets Sold" },
    { number: "10,000+", label: "Happy Users" },
  ];

  const roles = [
    {
      title: "Event Organizer",
      description: "Plan, promote, and manage your event from one dashboard.",
      icon: Calendar,
      href: "/organizer",
    },
    {
      title: "Artist",
      description: "Get discovered, manage gigs, and grow your brand.",
      icon: Music,
      href: "/artist",
    },
    {
      title: "Venue Owner",
      description:
        "List your space, set your schedule, and accept bookings seamlessly.",
      icon: Building2,
      href: "/venue",
    },
    {
      title: "Admin",
      description:
        "Access analytics, approve listings, and manage system-wide operations.",
      icon: Users,
      href: "/admin",
    },
  ];

  // Auto-play functionality
  useEffect(() => {
    if (!isAutoPlaying) return;

    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % featuredEvents.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [isAutoPlaying, featuredEvents.length]);

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % featuredEvents.length);
    setIsAutoPlaying(false);
    setTimeout(() => setIsAutoPlaying(true), 10000); // Resume auto-play after 10 seconds
  };

  const prevSlide = () => {
    setCurrentSlide(
      (prev) => (prev - 1 + featuredEvents.length) % featuredEvents.length
    );
    setIsAutoPlaying(false);
    setTimeout(() => setIsAutoPlaying(true), 10000); // Resume auto-play after 10 seconds
  };

  const goToSlide = (index: number) => {
    setCurrentSlide(index);
    setIsAutoPlaying(false);
    setTimeout(() => setIsAutoPlaying(true), 10000); // Resume auto-play after 10 seconds
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className=" sticky top-0 z-50">
        <Navbar />
      </header>

      {/* Hero Section */}
      <section className="py-12 md:py-20 bg-gradient-to-br from-primary/10 via-background to-secondary/10">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-8xl font-bold bg-gradient-to-r from-indigo-500 via-sky-400 to-emerald-300 bg-clip-text text-transparent">
            Click. Book. Go!
          </h1>

          <p className="text-xl text-muted-foreground mb-8 max-w-3xl mx-auto">
            Discover top events, book artists, list venues, and manage every
            detail<br/>
             — all in one powerful platform.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" asChild>
              <Link href="/events">
                Explore Events <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="/auth">Get Started</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Featured Events Carousel */}
      <section className="py-12 md:py-16">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Featured Events</h2>
            <p className="text-lg text-muted-foreground">
              Discover what's happening near you or nationwide.
            </p>
          </div>

          <div
            className="relative max-w-6xl mx-auto"
            onMouseEnter={() => setIsAutoPlaying(false)}
            onMouseLeave={() => setIsAutoPlaying(true)}
          >
            {/* Carousel Container */}
            <div className="overflow-hidden rounded-lg">
              <div
                className="flex transition-transform duration-200 ease-in-out"
                style={{ transform: `translateX(-${currentSlide * 100}%)` }}
              >
                {featuredEvents.map((event) => (
                  <div key={event.id} className="w-full flex-shrink-0">
                    <Card className="relative mx-2 h-[500px] md:h-[600px] overflow-hidden rounded-lg">
                      {/* Full Background Image */}
                      <img
                        src={event.image || "/images/carausel1.jpg"}
                        alt={event.title}
                        className="absolute inset-0 w-full h-full object-cover z-0"
                      />

                      {/* Top Badges */}
                      <div className="absolute top-4 left-4 z-10">
                        <Badge
                          variant="secondary"
                          className="bg-white/90 text-black"
                        >
                          {event.category}
                        </Badge>
                      </div>
                      <div className="absolute top-4 right-4 z-10">
                        <Badge
                          variant="default"
                          className="bg-primary text-white"
                        >
                          {event.price}
                        </Badge>
                      </div>

                      {/* Blurred Overlay Details */}
                      <div className="absolute bottom-0 left-0 right-0 z-10   text-white p-6 rounded-b-lg">
                        <h3 className="text-2xl font-bold mb-2">
                          {event.title}
                        </h3>

                        <div className="space-y-2 mb-4 text-sm text-gray-200">
                          <div className="flex items-center">
                            <Clock className="h-4 w-4 mr-2" />
                            <span>{event.date}</span>
                          </div>
                          <div className="flex items-center">
                            <MapPin className="h-4 w-4 mr-2" />
                            <span>{event.venue}</span>
                          </div>
                          <div className="flex items-center">
                            <Star className="h-4 w-4 mr-2 fill-yellow-400 text-yellow-400" />
                            <span>
                              {event.rating} • {event.attendees} attendees
                            </span>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2 mb-4">
                          <Badge variant="outline" className="text-white">
                            {event.type}
                          </Badge>
                          <Badge variant="outline" className="text-white">
                            {event.setting}
                          </Badge>
                        </div>

                        <Button className="w-full" asChild>
                          <Link href={`/events/${event.id}`}>Book Now</Link>
                        </Button>
                      </div>
                    </Card>
                  </div>
                ))}
              </div>
            </div>

            {/* Navigation Arrows */}
            <Button
              variant="outline"
              size="icon"
              className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-white/90 hover:bg-white"
              onClick={prevSlide}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-white/90 hover:bg-white"
              onClick={nextSlide}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>

            {/* Dots Indicator */}
            <div className="flex justify-center mt-6 space-x-2">
              {featuredEvents.map((_, index) => (
                <button
                  key={index}
                  className={`w-3 h-3 rounded-full transition-colors ${
                    index === currentSlide ? "bg-primary" : "bg-gray-300"
                  }`}
                  onClick={() => goToSlide(index)}
                />
              ))}
            </div>
          </div>

          <div className="text-center mt-8">
            <Button variant="outline" asChild>
              <Link href="/events">View All Events</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Join the Ahibi Ecosystem */}
      {/* <section className="py-12 md:py-16 bg-muted/50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">
              Join the Ahibi Ecosystem
            </h2>
            <p className="text-lg text-muted-foreground">
              Choose your role. We'll handle the rest.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {roles.map((role, index) => (
              <Card
                key={index}
                className="text-center hover:shadow-lg transition-shadow"
              >
                <CardHeader>
                  <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <role.icon className="h-8 w-8 text-primary" />
                  </div>
                  <CardTitle>{role.title}</CardTitle>
                  <CardDescription>{role.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button asChild className="w-full">
                    <Link href={role.href}>Get Started</Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section> */}

      {/* The Ahibi Impact */}
      <section className="py-12 md:py-16">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">The Ahibi Impact</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            {stats.map((stat, index) => (
              <div key={index}>
                <div className="text-4xl md:text-5xl font-bold text-primary mb-2">
                  {stat.number}
                </div>
                <div className="text-lg text-muted-foreground">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* About Ahibi */}
      {/* <section className="py-12 md:py-16 bg-muted/50">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl font-bold mb-6">About Ahibi</h2>
            <p className="text-lg text-muted-foreground mb-6">
              Ahibi is an innovative event management platform designed for
              today's creators, audiences, and venue partners.
            </p>
            <p className="text-lg text-muted-foreground mb-8">
              From ticketing to artist bookings, from venue listings to payments
              — we make every part of the event journey seamless, smart, and
              scalable.
            </p>
            <Button asChild>
              <Link href="/about">
                Learn More <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section> */}

      {/* Footer */}
      <Footer />
    </div>
  );
}
