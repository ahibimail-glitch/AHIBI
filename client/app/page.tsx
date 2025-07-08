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
  Calendar,
  MapPin,
  Music,
  Building2,
  Users,
  Ticket,
  ArrowRight,
  User,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import Navbar from "./Navbar";
import Footer from "./Footer";

export default function HomePage() {
  const featuredEvents = [
    {
      id: 1,
      title: "Summer Music Festival 2024",
      date: "July 15, 2024",
      venue: "Central Park Arena",
      location: "Mumbai, India",
      price: "₹1,500",
      image: "/placeholder.svg?height=200&width=300",
      tags: ["Music", "Festival", "Outdoor"],
    },
    {
      id: 2,
      title: "Stand-up Comedy Night",
      date: "July 20, 2024",
      venue: "Comedy Club Downtown",
      location: "Delhi, India",
      price: "₹800",
      image: "/placeholder.svg?height=200&width=300",
      tags: ["Comedy", "Indoor", "Entertainment"],
    },
    {
      id: 3,
      title: "Tech Conference 2024",
      date: "July 25, 2024",
      venue: "Convention Center",
      location: "Bangalore, India",
      price: "₹2,500",
      image: "/placeholder.svg?height=200&width=300",
      tags: ["Technology", "Conference", "Networking"],
    },
  ];

  const userRoles = [
    {
      title: "Event Organizer",
      description:
        "Create and manage events, track bookings, and handle payments",
      icon: Calendar,
      href: "/organizer",
      color: "bg-blue-500",
    },
    {
      title: "Artist",
      description:
        "Showcase your talent, manage bookings, and connect with organizers",
      icon: Music,
      href: "/artist",
      color: "bg-purple-500",
    },
    {
      title: "Venue Owner",
      description: "List your venue, manage availability, and track bookings",
      icon: Building2,
      href: "/venue",
      color: "bg-green-500",
    },
    {
      title: "Admin",
      description: "Full system oversight, approvals, and analytics",
      icon: Users,
      href: "/admin",
      color: "bg-red-500",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <Navbar/>

      {/* Hero Section */}
      <section className="py-12 md:py-20 ">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            Next-Gen Event Management
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Discover events, book artists, manage venues, and create
            unforgettable experiences with Ahibi
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

      {/* Featured Events */}
      <section className="py-12 md:py-16">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-3xl font-bold">Featured Events</h2>
            <Button variant="outline" asChild>
              <Link href="/events">View All</Link>
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {featuredEvents.map((event) => (
              <Card
                key={event.id}
                className="overflow-hidden hover:shadow-lg transition-shadow"
              >
                <div className="relative">
                  <Image
                    src={event.image || "/placeholder.svg"}
                    alt={event.title}
                    width={300}
                    height={200}
                    className="w-full h-48 object-cover"
                  />
                  <div className="absolute top-4 left-4">
                    <Badge className="bg-white/90 text-black">
                      {event.price}
                    </Badge>
                  </div>
                </div>
                <CardHeader>
                  <CardTitle className="line-clamp-2">{event.title}</CardTitle>
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4 mr-1" />
                    {event.date}
                  </div>
                  <div className="flex items-center text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4 mr-1" />
                    {event.venue}, {event.location}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {event.tags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                  <Button className="w-full" asChild>
                    <Link href={`/events/${event.id}`}>Book Now</Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* User Roles */}
      <section className="py-12 md:py-16 bg-muted/50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Join as</h2>
            <p className="text-lg text-muted-foreground">
              Choose your role and start your journey with Ahibi
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {userRoles.map((role) => (
              <Card
                key={role.title}
                className="text-center hover:shadow-lg transition-shadow"
              >
                <CardHeader>
                  <div
                    className={`w-16 h-16 ${role.color} rounded-full flex items-center justify-center mx-auto mb-4`}
                  >
                    <role.icon className="h-8 w-8 text-white" />
                  </div>
                  <CardTitle>{role.title}</CardTitle>
                  <CardDescription>{role.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button className="w-full" asChild>
                    <Link href={role.href}>Get Started</Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-12 md:py-16">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-3xl md:text-4xl font-bold text-primary mb-2">
                10K+
              </div>
              <div className="text-muted-foreground">Events Hosted</div>
            </div>
            <div>
              <div className="text-3xl md:text-4xl font-bold text-primary mb-2">
                5K+
              </div>
              <div className="text-muted-foreground">Artists</div>
            </div>
            <div>
              <div className="text-3xl md:text-4xl font-bold text-primary mb-2">
                2K+
              </div>
              <div className="text-muted-foreground">Venues</div>
            </div>
            <div>
              <div className="text-3xl md:text-4xl font-bold text-primary mb-2">
                100K+
              </div>
              <div className="text-muted-foreground">Happy Users</div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <Footer/>
    </div>
  );
}
