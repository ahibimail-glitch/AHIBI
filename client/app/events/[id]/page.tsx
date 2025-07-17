"use client"

import type React from "react"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Calendar,
  MapPin,
  Users,
  Clock,
  Share2,
  Heart,
  Star,
  Car,
  Snowflake,
  UtensilsCrossed,
  Accessibility,
  Phone,
  Mail,
  ExternalLink,
  Ticket,
} from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import Navbar from "@/app/Navbar"
import Footer from "@/app/Footer"

type EventDetailPageProps = {
  params: { id: string }
}

export default function EventDetailPage({ params }: EventDetailPageProps) {
  const [selectedTicketType, setSelectedTicketType] = useState("general")
  const [ticketQuantity, setTicketQuantity] = useState(1)

  // Mock event data - in real app, this would be fetched based on params.id
  const event = {
    id: 1,
    title: "Summer Music Festival 2024",
    description:
      "The biggest music festival of the year featuring top artists from around the world. Experience three days of non-stop music, food, and entertainment in the heart of Mumbai.",
    longDescription:
      "Join us for an unforgettable weekend of music, food, and fun at the Summer Music Festival 2024. This year's lineup features over 50 artists across multiple stages, including headliners from various genres. From electronic dance music to indie rock, there's something for everyone. The festival also features local food vendors, art installations, and interactive experiences.",
    date: "July 15-17, 2024",
    time: "6:00 PM - 2:00 AM",
    venue: {
      name: "Central Park Arena",
      address: "Bandra West, Mumbai, Maharashtra 400050",
      capacity: 5000,
      facilities: [
        { icon: Car, label: "Parking Available" },
        { icon: Snowflake, label: "AC Available" },
        { icon: UtensilsCrossed, label: "Food & Beverages" },
        { icon: Accessibility, label: "Wheelchair Accessible" },
      ],
      rating: 4.6,
      contact: {
        phone: "+91 98765 43210",
        email: "info@centralparkarenamumbai.com",
      },
    },
    location: "Mumbai, India",
    images: [
      "/images/carausel1.jpg?height=400&width=600",
      "/images/carausel1.jpg?height=400&width=600",
      "/images/carausel1.jpg?height=400&width=600",
      "/images/carausel1.jpg?height=400&width=600",
    ],
    tags: ["Music", "Festival", "Outdoor", "Multi-day"],
    organizer: {
      name: "MusicEvents Pro",
      avatar: "/images/carausel1.jpg?height=50&width=50",
      rating: 4.8,
      eventsOrganized: 25,
      contact: {
        phone: "+91 87654 32109",
        email: "contact@musiceventspro.com",
      },
    },
    artists: [
      {
        name: "DJ Rhythm",
        genre: "Electronic",
        image: "/images/carausel1.jpg?height=100&width=100",
        rating: 4.8,
      },
      {
        name: "The Rock Band",
        genre: "Rock",
        image: "/images/carausel1.jpg?height=100&width=100",
        rating: 4.6,
      },
      {
        name: "Indie Collective",
        genre: "Indie",
        image: "/images/carausel1.jpg?height=100&width=100",
        rating: 4.7,
      },
    ],
    ticketTypes: [
      {
        id: "general",
        name: "General Admission",
        price: 1500,
        originalPrice: 2000,
        description: "Access to all stages and general areas",
        available: 450,
        total: 500,
        perks: ["All stages access", "Festival map", "Water stations"],
      },
      {
        id: "vip",
        name: "VIP Experience",
        price: 3500,
        originalPrice: 4000,
        description: "Premium experience with exclusive perks",
        available: 45,
        total: 50,
        perks: ["Front stage access", "VIP lounge", "Complimentary drinks", "Meet & greet"],
      },
      {
        id: "premium",
        name: "Premium Package",
        price: 2500,
        originalPrice: 3000,
        description: "Enhanced experience with additional benefits",
        available: 120,
        total: 150,
        perks: ["Priority entry", "Premium viewing area", "Festival merchandise"],
      },
    ],
    attendees: 1250,
    totalCapacity: 5000,
    highlights: [
      "50+ Artists across 5 stages",
      "Local food vendors and craft beer",
      "Art installations and interactive experiences",
      "Eco-friendly festival with sustainability focus",
      "Free shuttle service from major metro stations",
    ],
  }

  const selectedTicket = event.ticketTypes.find((t) => t.id === selectedTicketType)
  const totalPrice = selectedTicket ? selectedTicket.price * ticketQuantity : 0

  const relatedEvents = [
    {
      id: 2,
      title: "Jazz Night Under Stars",
      date: "July 22, 2024",
      price: "₹800",
      image: "/images/carausel1.jpg?height=150&width=200",
    },
    {
      id: 3,
      title: "Electronic Music Showcase",
      date: "August 5, 2024",
      price: "₹1,200",
      image: "/images/carausel1.jpg?height=150&width=200",
    },
    {
      id: 4,
      title: "Indie Rock Festival",
      date: "August 12, 2024",
      price: "₹1,800",
      image: "/images/carausel1.jpg?height=150&width=200",
    },
  ]

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60 sticky top-0 z-50">
        {/* <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Button variant="outline" asChild>
            <Link href="/events">← Back to Events</Link>
          </Button>
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm">
              <Heart className="h-4 w-4 mr-1" />
              Save
            </Button>
            <Button variant="outline" size="sm">
              <Share2 className="h-4 w-4 mr-1" />
              Share
            </Button>
          </div>
        </div> */}
        <Navbar/>
      </header>

      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Hero Image */}
            <div className="relative">
              <Image
                src={event.images[0] || "/images/carausel1.jpg"}
                alt={event.title}
                width={600}
                height={400}
                className="w-full h-64 md:h-96 object-cover rounded-lg"
              />
              <div className="absolute top-4 left-4">
                <Badge className="bg-gradient-to-r from-primary to-secondary text-white">Featured Event</Badge>
              </div>
            </div>

            {/* Event Info */}
            <div>
              <h1 className="text-3xl md:text-4xl font-bold mb-4">{event.title}</h1>
              <div className="flex flex-wrap gap-2 mb-6">
                {event.tags.map((tag) => (
                  <Badge key={tag} variant="secondary">
                    {tag}
                  </Badge>
                ))}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div className="flex items-center text-muted-foreground">
                  <Calendar className="h-5 w-5 mr-3" />
                  <div>
                    <p className="font-medium text-foreground">{event.date}</p>
                    <p className="text-sm">{event.time}</p>
                  </div>
                </div>
                <div className="flex items-center text-muted-foreground">
                  <MapPin className="h-5 w-5 mr-3" />
                  <div>
                    <p className="font-medium text-foreground">{event.venue.name}</p>
                    <p className="text-sm">{event.location}</p>
                  </div>
                </div>
                <div className="flex items-center text-muted-foreground">
                  <Users className="h-5 w-5 mr-3" />
                  <div>
                    <p className="font-medium text-foreground">{event.attendees.toLocaleString()} attending</p>
                    <p className="text-sm">of {event.totalCapacity.toLocaleString()} capacity</p>
                  </div>
                </div>
                <div className="flex items-center text-muted-foreground">
                  <Clock className="h-5 w-5 mr-3" />
                  <div>
                    <p className="font-medium text-foreground">3 Days</p>
                    <p className="text-sm">Multi-day event</p>
                  </div>
                </div>
              </div>

              <p className="text-muted-foreground mb-4">{event.description}</p>
              <p className="text-foreground">{event.longDescription}</p>
            </div>

            {/* Event Highlights */}
            <Card>
              <CardHeader>
                <CardTitle>Event Highlights</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {event.highlights.map((highlight, index) => (
                    <li key={index} className="flex items-start">
                      <div className="w-2 h-2 bg-primary rounded-full mt-2 mr-3 flex-shrink-0"></div>
                      <span>{highlight}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            {/* Artists */}
            <Card>
              <CardHeader>
                <CardTitle>Featured Artists</CardTitle>
                <CardDescription>Performing at this event</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {event.artists.map((artist, index) => (
                    <div key={index} className="flex items-center space-x-3 p-3 border rounded-lg">
                      <Image
                        src={artist.image || "/images/carausel1.jpg"}
                        alt={artist.name}
                        width={100}
                        height={100}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                      <div className="flex-1">
                        <h3 className="font-semibold">{artist.name}</h3>
                        <p className="text-sm text-muted-foreground">{artist.genre}</p>
                        <div className="flex items-center mt-1">
                          <Star className="h-3 w-3 text-yellow-500 mr-1" />
                          <span className="text-xs">{artist.rating}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Venue Details */}
            <Card>
              <CardHeader>
                <CardTitle>Venue Information</CardTitle>
                <CardDescription>{event.venue.name}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <p className="font-medium mb-2">Address</p>
                    <p className="text-muted-foreground">{event.venue.address}</p>
                  </div>

                  <div>
                    <p className="font-medium mb-2">Facilities</p>
                    <div className="flex flex-wrap gap-2">
                      {event.venue.facilities.map((facility, index) => (
                        <Badge key={index} variant="outline" className="flex items-center">
                          <facility.icon className="h-3 w-3 mr-1" />
                          {facility.label}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <Star className="h-4 w-4 text-yellow-500 mr-1" />
                      <span className="font-medium">{event.venue.rating}</span>
                      <span className="text-muted-foreground ml-1">venue rating</span>
                    </div>
                    <div className="flex space-x-2">
                      <Button variant="outline" size="sm">
                        <MapPin className="h-4 w-4 mr-1" />
                        View Map
                      </Button>
                      <Button variant="outline" size="sm">
                        <ExternalLink className="h-4 w-4 mr-1" />
                        Venue Details
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Organizer Info */}
            <Card>
              <CardHeader>
                <CardTitle>Event Organizer</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-4">
                  <Avatar className="w-16 h-16">
                    <AvatarImage src={event.organizer.avatar || "/images/carausel1.jpg"} />
                    <AvatarFallback>ME</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg">{event.organizer.name}</h3>
                    <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                      <div className="flex items-center">
                        <Star className="h-4 w-4 text-yellow-500 mr-1" />
                        {event.organizer.rating} rating
                      </div>
                      <span>{event.organizer.eventsOrganized} events organized</span>
                    </div>
                    <div className="flex items-center space-x-4 mt-2">
                      <Button variant="outline" size="sm">
                        <Phone className="h-4 w-4 mr-1" />
                        Contact
                      </Button>
                      <Button variant="outline" size="sm">
                        <Mail className="h-4 w-4 mr-1" />
                        Message
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Booking Sidebar */}
          <div className="space-y-6">
            <Card className="sticky top-24">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Ticket className="h-5 w-5 mr-2" />
                  Book Tickets
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Ticket Types */}
                <div>
                  <Label className="text-sm font-medium mb-3 block">Select Ticket Type</Label>
                  <div className="space-y-3">
                    {event.ticketTypes.map((ticket) => (
                      <div
                        key={ticket.id}
                        className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                          selectedTicketType === ticket.id
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-primary/50"
                        }`}
                        onClick={() => setSelectedTicketType(ticket.id)}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="font-semibold">{ticket.name}</h3>
                          <div className="text-right">
                            <p className="font-bold">₹{ticket.price.toLocaleString()}</p>
                            {ticket.originalPrice > ticket.price && (
                              <p className="text-sm text-muted-foreground line-through">
                                ₹{ticket.originalPrice.toLocaleString()}
                              </p>
                            )}
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">{ticket.description}</p>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">
                            {ticket.available} of {ticket.total} available
                          </span>
                          <div className="w-16 bg-gray-200 rounded-full h-1">
                            <div
                              className="bg-primary h-1 rounded-full"
                              style={{ width: `${(ticket.available / ticket.total) * 100}%` }}
                            ></div>
                          </div>
                        </div>
                        {selectedTicketType === ticket.id && (
                          <div className="mt-3 pt-3 border-t">
                            <p className="text-sm font-medium mb-2">Includes:</p>
                            <ul className="text-xs text-muted-foreground space-y-1">
                              {ticket.perks.map((perk, index) => (
                                <li key={index} className="flex items-center">
                                  <div className="w-1 h-1 bg-primary rounded-full mr-2"></div>
                                  {perk}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Quantity Selector */}
                <div>
                  <Label className="text-sm font-medium mb-2 block">Quantity</Label>
                  <div className="flex items-center space-x-3">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setTicketQuantity(Math.max(1, ticketQuantity - 1))}
                      disabled={ticketQuantity <= 1}
                    >
                      -
                    </Button>
                    <span className="font-medium w-8 text-center">{ticketQuantity}</span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setTicketQuantity(Math.min(10, ticketQuantity + 1))}
                      disabled={ticketQuantity >= 10}
                    >
                      +
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Maximum 10 tickets per booking</p>
                </div>

                <Separator />

                {/* Price Summary */}
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>
                      Subtotal ({ticketQuantity} ticket{ticketQuantity > 1 ? "s" : ""})
                    </span>
                    <span>₹{totalPrice.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>Convenience fee</span>
                    <span>₹{Math.round(totalPrice * 0.025).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>Taxes</span>
                    <span>₹{Math.round(totalPrice * 0.18).toLocaleString()}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between font-bold text-lg">
                    <span>Total</span>
                    <span>₹{Math.round(totalPrice * 1.205).toLocaleString()}</span>
                  </div>
                </div>

                <Button className="w-full" size="lg" asChild>
                  <Link href={`/booking/${event.id}?ticket=${selectedTicketType}&quantity=${ticketQuantity}`}>
                    Proceed to Payment
                  </Link>
                </Button>

                <p className="text-xs text-muted-foreground text-center">Secure payment powered by Razorpay</p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Related Events */}
        <section className="mt-12">
          <h2 className="text-2xl font-bold mb-6">You might also like</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {relatedEvents.map((relatedEvent) => (
              <Card key={relatedEvent.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                <Image
                  src={relatedEvent.image || "/images/carausel1.jpg"}
                  alt={relatedEvent.title}
                  width={200}
                  height={150}
                  className="w-full h-32 object-cover"
                />
                <CardContent className="p-4">
                  <h3 className="font-semibold mb-2 line-clamp-2">{relatedEvent.title}</h3>
                  <p className="text-sm text-muted-foreground mb-2">{relatedEvent.date}</p>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-primary">{relatedEvent.price}</span>
                    <Button size="sm" variant="outline" asChild>
                      <Link href={`/events/${relatedEvent.id}`}>View</Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      </div>
      <Footer/>
    </div>
  )
}

function Label({
  children,
  className,
  ...props
}: { children: React.ReactNode; className?: string; [key: string]: any }) {
  return (
    <label
      className={`text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 ${className || ""}`}
      {...props}
    >
      {children}
    </label>
  )
}
