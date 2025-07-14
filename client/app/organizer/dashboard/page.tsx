"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Calendar,
  MapPin,
  Users,
  DollarSign,
  Plus,
  Edit,
  Eye,
  QrCode,
  BarChart3,
  Ticket,
  Music,
  Building2,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import Navbar from "@/app/Navbar";
import Footer from "@/app/Footer";


export default function OrganizerDashboard() {
  const [activeTab, setActiveTab] = useState("events");

  const myEvents = [
    {
      id: 1,
      title: "Summer Music Festival 2024",
      date: "July 15, 2024",
      venue: "Central Park Arena",
      status: "approved",
      ticketsSold: 450,
      totalTickets: 500,
      revenue: "₹6,75,000",
      image: "/images/carausel1.jpg?height=200&width=300",
    },
    {
      id: 2,
      title: "Tech Conference 2024",
      date: "August 20, 2024",
      venue: "Convention Center",
      status: "pending",
      ticketsSold: 120,
      totalTickets: 300,
      revenue: "₹3,00,000",
      image: "/images/carausel1.jpg?height=200&width=300",
    },
    {
      id: 3,
      title: "Comedy Night Special",
      date: "September 5, 2024",
      venue: "Comedy Club Downtown",
      status: "draft",
      ticketsSold: 0,
      totalTickets: 150,
      revenue: "₹0",
      image: "/images/carausel1.jpg?height=200&width=300",
    },
  ];

  const availableArtists = [
    {
      id: 1,
      name: "DJ Rhythm",
      genre: "Electronic",
      price: "₹25,000",
      rating: 4.8,
      image: "/images/carausel1.jpg?height=100&width=100",
    },
    {
      id: 2,
      name: "The Rock Band",
      genre: "Rock",
      price: "₹40,000",
      rating: 4.6,
      image: "/images/carausel1.jpg?height=100&width=100",
    },
    {
      id: 3,
      name: "Stand-up Star",
      genre: "Comedy",
      price: "₹15,000",
      rating: 4.9,
      image: "/images/carausel1.jpg?height=100&width=100",
    },
  ];

  const availableVenues = [
    {
      id: 1,
      name: "Grand Ballroom Mumbai",
      location: "Bandra West",
      capacity: 500,
      price: "₹50,000",
      rating: 4.6,
      image: "/images/carausel1.jpg?height=100&width=150",
    },
    {
      id: 2,
      name: "Open Air Amphitheater",
      location: "Juhu Beach",
      capacity: 1000,
      price: "₹75,000",
      rating: 4.4,
      image: "/images/carausel1.jpg?height=100&width=150",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60 sticky top-0 z-50">
        <Navbar />
      </header>
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Organizer Dashboard</h1>
        <div className="flex items-center space-x-4">
          <Badge variant="secondary">Event Organizer</Badge>
          <Button asChild>
            <Link href="/organizer/create-event">
              <Plus className="h-4 w-4 mr-1" />
              Create Event
            </Link>
          </Button>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Events</p>
                  <p className="text-2xl font-bold">12</p>
                </div>
                <Calendar className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Tickets Sold</p>
                  <p className="text-2xl font-bold">2,456</p>
                </div>
                <Ticket className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Revenue</p>
                  <p className="text-2xl font-bold">₹18,45,000</p>
                </div>
                <DollarSign className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Avg Rating</p>
                  <p className="text-2xl font-bold">4.7</p>
                </div>
                <BarChart3 className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="space-y-6"
        >
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="events">My Events</TabsTrigger>
            <TabsTrigger value="artists">Find Artists</TabsTrigger>
            <TabsTrigger value="venues">Find Venues</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="events" className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">My Events</h2>
              <Button asChild>
                <Link href="/organizer/create-event">
                  <Plus className="h-4 w-4 mr-1" />
                  Create New Event
                </Link>
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {myEvents.map((event) => (
                <Card key={event.id} className="overflow-hidden">
                  <div className="relative">
                    <Image
                      src={event.image || "/images/carausel1.jpg"}
                      alt={event.title}
                      width={300}
                      height={200}
                      className="w-full h-48 object-cover"
                    />
                    <Badge
                      className={`absolute top-4 right-4 ${
                        event.status === "approved"
                          ? "bg-green-500"
                          : event.status === "pending"
                          ? "bg-yellow-500"
                          : "bg-gray-500"
                      }`}
                    >
                      {event.status}
                    </Badge>
                  </div>
                  <CardHeader>
                    <CardTitle className="line-clamp-2">
                      {event.title}
                    </CardTitle>
                    <div className="space-y-1 text-sm text-muted-foreground">
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 mr-1" />
                        {event.date}
                      </div>
                      <div className="flex items-center">
                        <MapPin className="h-4 w-4 mr-1" />
                        {event.venue}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <span>Tickets Sold</span>
                        <span className="font-medium">
                          {event.ticketsSold}/{event.totalTickets}
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-primary h-2 rounded-full"
                          style={{
                            width: `${
                              (event.ticketsSold / event.totalTickets) * 100
                            }%`,
                          }}
                        ></div>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-lg font-bold text-green-600">
                          {event.revenue}
                        </span>
                        <div className="flex space-x-2">
                          <Button size="sm" variant="outline">
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="outline">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="outline">
                            <QrCode className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="artists" className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Find Artists</h2>
              <div className="flex space-x-2">
                <Select>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Genre" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Genres</SelectItem>
                    <SelectItem value="music">Music</SelectItem>
                    <SelectItem value="comedy">Comedy</SelectItem>
                    <SelectItem value="dance">Dance</SelectItem>
                  </SelectContent>
                </Select>
                <Input placeholder="Search artists..." className="w-64" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {availableArtists.map((artist) => (
                <Card key={artist.id}>
                  <CardContent className="p-6">
                    <div className="flex items-center space-x-4 mb-4">
                      <Image
                        src={artist.image || "/images/carausel1.jpg"}
                        alt={artist.name}
                        width={100}
                        height={100}
                        className="w-16 h-16 rounded-full object-cover"
                      />
                      <div className="flex-1">
                        <h3 className="font-semibold">{artist.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {artist.genre}
                        </p>
                        <div className="flex items-center mt-1">
                          <span className="text-sm">⭐ {artist.rating}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-lg font-bold">{artist.price}</span>
                      <div className="flex space-x-2">
                        <Button size="sm" variant="outline">
                          View Profile
                        </Button>
                        <Button size="sm">
                          <Music className="h-4 w-4 mr-1" />
                          Book Now
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="venues" className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Find Venues</h2>
              <div className="flex space-x-2">
                <Select>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Capacity" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Sizes</SelectItem>
                    <SelectItem value="small">Under 100</SelectItem>
                    <SelectItem value="medium">100-500</SelectItem>
                    <SelectItem value="large">500+</SelectItem>
                  </SelectContent>
                </Select>
                <Input placeholder="Search venues..." className="w-64" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {availableVenues.map((venue) => (
                <Card key={venue.id}>
                  <CardContent className="p-6">
                    <div className="flex space-x-4">
                      <Image
                        src={venue.image || "/images/carausel1.jpg"}
                        alt={venue.name}
                        width={150}
                        height={100}
                        className="w-24 h-16 rounded-lg object-cover"
                      />
                      <div className="flex-1">
                        <h3 className="font-semibold mb-1">{venue.name}</h3>
                        <div className="space-y-1 text-sm text-muted-foreground">
                          <div className="flex items-center">
                            <MapPin className="h-4 w-4 mr-1" />
                            {venue.location}
                          </div>
                          <div className="flex items-center">
                            <Users className="h-4 w-4 mr-1" />
                            Up to {venue.capacity} guests
                          </div>
                          <div className="flex items-center">
                            <span>⭐ {venue.rating}</span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between mt-3">
                          <span className="text-lg font-bold">
                            {venue.price}
                          </span>
                          <div className="flex space-x-2">
                            <Button size="sm" variant="outline">
                              View Details
                            </Button>
                            <Button size="sm">
                              <Building2 className="h-4 w-4 mr-1" />
                              Book Now
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="analytics">
            <Card>
              <CardHeader>
                <CardTitle>Event Analytics</CardTitle>
                <CardDescription>
                  Performance insights for your events
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                  <div className="p-4 border rounded-lg text-center">
                    <h3 className="font-semibold text-lg">Total Revenue</h3>
                    <p className="text-3xl font-bold text-green-600">
                      ₹18,45,000
                    </p>
                    <p className="text-sm text-muted-foreground">
                      +25% from last month
                    </p>
                  </div>
                  <div className="p-4 border rounded-lg text-center">
                    <h3 className="font-semibold text-lg">Avg Ticket Price</h3>
                    <p className="text-3xl font-bold">₹1,250</p>
                    <p className="text-sm text-muted-foreground">
                      +5% increase
                    </p>
                  </div>
                  <div className="p-4 border rounded-lg text-center">
                    <h3 className="font-semibold text-lg">Conversion Rate</h3>
                    <p className="text-3xl font-bold">68%</p>
                    <p className="text-sm text-muted-foreground">
                      Above average
                    </p>
                  </div>
                  <div className="p-4 border rounded-lg text-center">
                    <h3 className="font-semibold text-lg">Repeat Customers</h3>
                    <p className="text-3xl font-bold">32%</p>
                    <p className="text-sm text-muted-foreground">
                      Growing steadily
                    </p>
                  </div>
                </div>
                <div className="h-64 border rounded-lg flex items-center justify-center">
                  <p className="text-muted-foreground">
                    Analytics charts and graphs would be implemented here
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
      <Footer />
    </div>
  );
}
