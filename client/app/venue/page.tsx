"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Calendar,
  MapPin,
  Users,
  Car,
  Snowflake,
  Heart,
  UtensilsCrossed,
  Accessibility,
  Camera,
  Star,
} from "lucide-react"
import Image from "next/image"
import Footer from "../Footer"
import Navbar from "../Navbar"

export default function VenueDashboard() {
  const venueData = {
    name: "Grand Ballroom Mumbai",
    description: "Elegant ballroom perfect for weddings, corporate events, and celebrations.",
    location: "Bandra West, Mumbai",
    capacity: 500,
    basePrice: "₹50,000",
    rating: 4.6,
    totalBookings: 89,
    images: [
      "/placeholder.svg?height=300&width=400",
      "/placeholder.svg?height=300&width=400",
      "/placeholder.svg?height=300&width=400",
    ],
  }

  const facilities = [
    { id: "parking", label: "Parking Available", icon: Car, checked: true },
    { id: "ac", label: "AC Available", icon: Snowflake, checked: true },
    { id: "petFriendly", label: "Pet Friendly", icon: Heart, checked: false },
    { id: "catering", label: "Catering", icon: UtensilsCrossed, checked: true },
    { id: "accessible", label: "Wheelchair Accessible", icon: Accessibility, checked: true },
  ]

  const bookingRequests = [
    {
      id: 1,
      event: "Wedding Reception",
      organizer: "Sharma Family",
      date: "August 15, 2024",
      duration: "6 hours",
      guests: 300,
      offer: "₹75,000",
      status: "pending",
    },
    {
      id: 2,
      event: "Corporate Annual Meet",
      organizer: "Tech Solutions Ltd",
      date: "September 5, 2024",
      duration: "8 hours",
      guests: 200,
      offer: "₹60,000",
      status: "pending",
    },
  ]

  const upcomingBookings = [
    {
      id: 1,
      event: "Birthday Party",
      date: "July 20, 2024",
      organizer: "Patel Family",
      payment: "₹45,000",
      status: "confirmed",
    },
    {
      id: 2,
      event: "Product Launch",
      date: "July 28, 2024",
      organizer: "StartupXYZ",
      payment: "₹65,000",
      status: "confirmed",
    },
  ]

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60 sticky top-0 z-50">
        <Navbar/>
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold">Venue Dashboard</h1>
          <div className="flex items-center space-x-4">
            <Badge variant="secondary">Verified Venue</Badge>
            <Button variant="outline" size="sm">
              View Public Listing
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
        {/* Venue Profile Header */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h2 className="text-2xl font-bold mb-2">{venueData.name}</h2>
                    <div className="flex items-center space-x-4 text-sm text-muted-foreground mb-3">
                      <div className="flex items-center">
                        <Star className="h-4 w-4 mr-1 text-yellow-500" />
                        {venueData.rating} ({venueData.totalBookings} bookings)
                      </div>
                      <div className="flex items-center">
                        <MapPin className="h-4 w-4 mr-1" />
                        {venueData.location}
                      </div>
                      <div className="flex items-center">
                        <Users className="h-4 w-4 mr-1" />
                        Up to {venueData.capacity} guests
                      </div>
                    </div>
                    <p className="text-muted-foreground mb-4">{venueData.description}</p>
                    <div className="flex flex-wrap gap-2">
                      {facilities
                        .filter((f) => f.checked)
                        .map((facility) => (
                          <Badge key={facility.id} variant="secondary" className="flex items-center">
                            <facility.icon className="h-3 w-3 mr-1" />
                            {facility.label}
                          </Badge>
                        ))}
                    </div>
                  </div>
                  <Button variant="outline">
                    <Camera className="h-4 w-4 mr-1" />
                    Edit Photos
                  </Button>
                </div>
              </div>
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-2">
                  {venueData.images.map((image, index) => (
                    <Image
                      key={index}
                      src={image || "/placeholder.svg"}
                      alt={`Venue ${index + 1}`}
                      width={400}
                      height={300}
                      className="w-full h-20 object-cover rounded-lg"
                    />
                  ))}
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <p className="text-2xl font-bold text-primary">{venueData.basePrice}</p>
                  <p className="text-sm text-muted-foreground">Starting price per day</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="bookings" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="bookings">Bookings</TabsTrigger>
            <TabsTrigger value="calendar">Calendar</TabsTrigger>
            <TabsTrigger value="listing">Listing</TabsTrigger>
            <TabsTrigger value="earnings">Earnings</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="bookings" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Booking Requests */}
              <Card>
                <CardHeader>
                  <CardTitle>Booking Requests</CardTitle>
                  <CardDescription>New requests for your venue</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {bookingRequests.map((request) => (
                    <div key={request.id} className="p-4 border rounded-lg">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-semibold">{request.event}</h3>
                        <Badge variant="outline">{request.offer}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-1">by {request.organizer}</p>
                      <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground mb-3">
                        <p>
                          <Calendar className="h-4 w-4 inline mr-1" />
                          {request.date}
                        </p>
                        <p>
                          <Users className="h-4 w-4 inline mr-1" />
                          {request.guests} guests
                        </p>
                      </div>
                      <div className="flex space-x-2">
                        <Button size="sm" className="flex-1">
                          Accept
                        </Button>
                        <Button size="sm" variant="outline" className="flex-1 bg-transparent">
                          Counter Offer
                        </Button>
                        <Button size="sm" variant="outline">
                          Decline
                        </Button>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Upcoming Bookings */}
              <Card>
                <CardHeader>
                  <CardTitle>Upcoming Bookings</CardTitle>
                  <CardDescription>Your confirmed bookings</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {upcomingBookings.map((booking) => (
                    <div key={booking.id} className="p-4 border rounded-lg">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-semibold">{booking.event}</h3>
                        <Badge className="bg-green-100 text-green-800">{booking.status}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-1">by {booking.organizer}</p>
                      <p className="text-sm text-muted-foreground mb-1">
                        <Calendar className="h-4 w-4 inline mr-1" />
                        {booking.date}
                      </p>
                      <p className="text-sm font-medium text-green-600">Payment: {booking.payment}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="calendar">
            <Card>
              <CardHeader>
                <CardTitle>Availability Calendar</CardTitle>
                <CardDescription>Manage your venue availability</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-96 border rounded-lg flex items-center justify-center">
                  <p className="text-muted-foreground">Interactive calendar component would be implemented here</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="listing">
            <Card>
              <CardHeader>
                <CardTitle>Venue Listing</CardTitle>
                <CardDescription>Update your venue information</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="venueName">Venue Name</Label>
                    <Input id="venueName" defaultValue={venueData.name} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="capacity">Capacity</Label>
                    <Input id="capacity" type="number" defaultValue={venueData.capacity} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea id="description" defaultValue={venueData.description} rows={4} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="basePrice">Base Price (per day)</Label>
                    <Input id="basePrice" defaultValue={venueData.basePrice} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="location">Location</Label>
                    <Input id="location" defaultValue={venueData.location} />
                  </div>
                </div>
                <div className="space-y-4">
                  <Label>Facilities & Amenities</Label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {facilities.map((facility) => (
                      <div key={facility.id} className="flex items-center space-x-2">
                        <Checkbox id={facility.id} defaultChecked={facility.checked} />
                        <Label htmlFor={facility.id} className="flex items-center">
                          <facility.icon className="h-4 w-4 mr-2" />
                          {facility.label}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
                <Button>Save Changes</Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="earnings">
            <Card>
              <CardHeader>
                <CardTitle>Earnings & Payouts</CardTitle>
                <CardDescription>Track your venue income</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div className="p-4 border rounded-lg text-center">
                    <h3 className="font-semibold text-lg">This Month</h3>
                    <p className="text-3xl font-bold text-green-600">₹2,15,000</p>
                  </div>
                  <div className="p-4 border rounded-lg text-center">
                    <h3 className="font-semibold text-lg">Pending</h3>
                    <p className="text-3xl font-bold text-orange-600">₹85,000</p>
                  </div>
                  <div className="p-4 border rounded-lg text-center">
                    <h3 className="font-semibold text-lg">Total Earned</h3>
                    <p className="text-3xl font-bold">₹12,45,000</p>
                  </div>
                </div>
                <div className="border rounded-lg p-4">
                  <h3 className="font-semibold mb-4">Recent Transactions</h3>
                  <p className="text-center text-muted-foreground">Transaction history would be displayed here</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings">
            <Card>
              <CardHeader>
                <CardTitle>Venue Settings</CardTitle>
                <CardDescription>Manage your venue preferences</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <h3 className="font-semibold">Contact Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone Number</Label>
                      <Input id="phone" placeholder="+91 9876543210" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input id="email" type="email" placeholder="venue@example.com" />
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  <h3 className="font-semibold">Booking Preferences</h3>
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <Checkbox id="autoApprove" />
                      <Label htmlFor="autoApprove">Auto-approve bookings under base price</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox id="instantBooking" />
                      <Label htmlFor="instantBooking">Allow instant booking</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox id="notifications" defaultChecked />
                      <Label htmlFor="notifications">Email notifications for new requests</Label>
                    </div>
                  </div>
                </div>
                <Button>Save Settings</Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
      <Footer/>
    </div>
  )
}
