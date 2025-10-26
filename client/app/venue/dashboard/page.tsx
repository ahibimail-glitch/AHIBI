"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
  MoreVertical,
  CheckCircle,
  Clock,
  DollarSign,
  Loader2,
  Music,
  Zap,
  Shield,
  Wifi,
  XCircle,
} from "lucide-react";
import Image from "next/image";
import Footer from "@/app/Footer";
import Navbar from "@/app/Navbar";
import { toast } from "sonner";
import { format } from "date-fns";
import { useVenueAuth } from "@/hooks/useVenueAuth";

export default function VenueDashboard() {
  const router = useRouter();
  const { user, loading: authLoading } = useVenueAuth();
  const [loading, setLoading] = useState(true);
  const [venueData, setVenueData] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [bookings, setBookings] = useState<any[]>([]);
  const [upcomingBookings, setUpcomingBookings] = useState<any[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/venue/auth/login');
      return;
    }
    if (user) {
      fetchVenueData();
      fetchStats();
      fetchBookings();
    }
  }, [user, authLoading]);

  const fetchVenueData = async () => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const response = await fetch(`${apiUrl}/api/venue/profile`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('venueToken')}`
        }
      });
      const data = await response.json();
      if (data.success) {
        setVenueData(data.data.venue);
      }
    } catch (error) {
      console.error('Error fetching venue data:', error);
      toast.error('Failed to load venue data');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const response = await fetch(`${apiUrl}/api/venue/manager/stats`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('venueToken')}`
        }
      });
      const data = await response.json();
      if (data.success) {
        setStats(data.data.stats);
        setUpcomingBookings(data.data.upcomingBookings);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchBookings = async () => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const response = await fetch(`${apiUrl}/api/venue/manager/bookings`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('venueToken')}`
        }
      });
      const data = await response.json();
      if (data.success) {
        setBookings(data.data.bookings);
      }
    } catch (error) {
      console.error('Error fetching bookings:', error);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const response = await fetch(`${apiUrl}/api/venue/manager/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('venueToken')}`
        },
        body: JSON.stringify(venueData)
      });
      const data = await response.json();
      if (data.success) {
        toast.success('Profile updated successfully');
        setVenueData(data.data.venue);
      } else {
        toast.error(data.message || 'Failed to update profile');
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleBookingAction = async (bookingId: string, status: string, reason?: string) => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const response = await fetch(`${apiUrl}/api/venue/manager/bookings/${bookingId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('venueToken')}`
        },
        body: JSON.stringify({ status, rejectionReason: reason })
      });
      const data = await response.json();
      if (data.success) {
        toast.success(`Booking ${status} successfully`);
        fetchBookings();
        fetchStats();
      } else {
        toast.error(data.message || 'Failed to update booking');
      }
    } catch (error) {
      console.error('Error updating booking:', error);
      toast.error('Failed to update booking');
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-muted/40 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!venueData) {
    return (
      <div className="min-h-screen bg-muted/40 flex items-center justify-center">
        <p>Failed to load venue data</p>
      </div>
    );
  }
  const facilities = [
    { id: "parking", label: "Parking Available", icon: Car },
    { id: "ac", label: "AC Available", icon: Snowflake },
    { id: "petFriendly", label: "Pet Friendly", icon: Heart },
    { id: "catering", label: "Catering", icon: UtensilsCrossed },
    { id: "accessible", label: "Wheelchair Accessible", icon: Accessibility },
    { id: "wifi", label: "WiFi", icon: Wifi },
    { id: "soundSystem", label: "Sound System", icon: Music },
    { id: "lighting", label: "Lighting", icon: Zap },
    { id: "security", label: "Security", icon: Shield },
    { id: "alcohol", label: "Alcohol Allowed", icon: Star },
  ];

  const pendingBookings = bookings.filter(b => b.status === 'pending');
  const confirmedBookings = bookings.filter(b => b.status === 'confirmed');

  return (
    <div className="min-h-screen bg-muted/40">
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <Navbar />
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <h1 className="text-3xl font-bold tracking-tight">
            Venue Dashboard
          </h1>
          <div className="flex items-center space-x-4">
            <Badge variant="secondary" className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              Verified Venue
            </Badge>
            <Button variant="outline" size="sm">
              View Public Listing
            </Button>
          </div>
        </div>

        {/* Venue Profile Header */}
        <Card className="mb-8 overflow-hidden">
          <div className="grid grid-cols-1 md:grid-cols-2">
            <div className="p-6">
              <div className="flex items-center space-x-4 text-sm text-muted-foreground mb-3">
                <div className="flex items-center">
                  <Star className="h-4 w-4 mr-1.5 text-yellow-500 fill-yellow-500" />
                  <span className="font-medium text-foreground">
                    {venueData.rating?.average || 0}
                  </span>
                  ({stats?.totalBookings || 0} bookings)
                </div>
                <div className="flex items-center">
                  <MapPin className="h-4 w-4 mr-1.5" />
                  {venueData.address?.city}, {venueData.address?.state}
                </div>
                <div className="flex items-center">
                  <Users className="h-4 w-4 mr-1.5" />
                  Up to {venueData.capacity} guests
                </div>
              </div>
              <h2 className="text-3xl font-bold mb-3">{venueData.name}</h2>
              <p className="text-muted-foreground mb-4">
                {venueData.description}
              </p>
              <div className="flex flex-wrap gap-2">
                {facilities
                  .filter((f) => venueData.facilities?.[f.id])
                  .map((facility) => (
                    <Badge
                      key={facility.id}
                      variant="secondary"
                      className="flex items-center"
                    >
                      <facility.icon className="h-3.5 w-3.5 mr-1.5" />
                      {facility.label}
                    </Badge>
                  ))}
              </div>
            </div>
            <div className="relative min-h-[250px] md:min-h-0">
              {venueData.gallery && venueData.gallery.length > 0 ? (
                <Image
                  src={venueData.gallery[0].url || "/images/placeholder.jpg"}
                  alt={venueData.name}
                  fill
                  className="object-cover"
                />
              ) : (
                <div className="w-full h-full bg-muted flex items-center justify-center">
                  <Camera className="h-12 w-12 text-muted-foreground" />
                </div>
              )}
              <Button
                variant="secondary"
                size="sm"
                className="absolute top-4 right-4"
                onClick={() => toast.info('Photo upload feature coming soon')}
              >
                <Camera className="h-4 w-4 mr-2" />
                Edit Photos
              </Button>
            </div>
          </div>
        </Card>

        <Tabs defaultValue="bookings">
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-5 mb-6">
            <TabsTrigger value="bookings">Bookings</TabsTrigger>
            <TabsTrigger value="calendar">Calendar</TabsTrigger>
            <TabsTrigger value="listing">Listing Details</TabsTrigger>
            <TabsTrigger value="earnings">Earnings</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="bookings">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Booking Requests</CardTitle>
                  <CardDescription>
                    Review and respond to new requests for your venue.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {pendingBookings.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No pending booking requests
                    </div>
                  ) : (
                    pendingBookings.map((request) => (
                      <Card key={request._id}>
                        <CardHeader className="pb-3">
                          <div className="flex justify-between items-start">
                            <CardTitle className="text-lg">
                              {request.eventType || 'Event Booking'}
                            </CardTitle>
                            <Badge variant="outline" className="text-base">
                              ₹{request.pricing.totalAmount}
                            </Badge>
                          </div>
                          <CardDescription>
                            by {request.user?.name || 'Guest'}
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                          <div className="flex items-center text-muted-foreground">
                            <Calendar className="h-4 w-4 mr-2" />
                            <span>{format(new Date(request.bookingDate), 'PPP')}</span>
                          </div>
                          <div className="flex items-center text-muted-foreground">
                            <Users className="h-4 w-4 mr-2" />
                            <span>{request.guestCount} guests</span>
                          </div>
                          <div className="flex items-center text-muted-foreground">
                            <Clock className="h-4 w-4 mr-2" />
                            <span>{request.startTime} - {request.endTime}</span>
                          </div>
                          <div className="flex items-center text-muted-foreground">
                            <span className="font-medium">{request.duration}h duration</span>
                          </div>
                        </CardContent>
                        <CardFooter className="flex space-x-2">
                          <Button 
                            size="sm" 
                            className="flex-1"
                            onClick={() => handleBookingAction(request._id, 'confirmed')}
                          >
                            Accept
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                            onClick={() => {
                              const reason = prompt('Enter rejection reason:');
                              if (reason) handleBookingAction(request._id, 'rejected', reason);
                            }}
                          >
                            Decline
                          </Button>
                        </CardFooter>
                      </Card>
                    ))
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Upcoming Bookings</CardTitle>
                  <CardDescription>
                    Your confirmed and scheduled events.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {upcomingBookings.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No upcoming bookings
                    </div>
                  ) : (
                    upcomingBookings.map((booking) => (
                      <div
                        key={booking._id}
                        className="p-4 border rounded-lg flex items-start gap-4 border-l-4 border-green-500 bg-background"
                      >
                        <div className="bg-green-100 p-2 rounded-full">
                           <CheckCircle className="h-5 w-5 text-green-600" />
                        </div>
                        <div className="flex-1">
                          <div className="flex justify-between items-start">
                             <h3 className="font-semibold">{booking.eventType || 'Event'}</h3>
                             <p className="text-sm font-medium text-green-600">
                               ₹{booking.pricing.totalAmount}
                             </p>
                          </div>
                           <p className="text-sm text-muted-foreground">by {booking.user?.name || 'Guest'}</p>
                           <p className="text-sm text-muted-foreground mt-1 flex items-center">
                             <Calendar className="h-4 w-4 inline mr-2" />
                             {format(new Date(booking.bookingDate), 'PPP')}
                           </p>
                           <p className="text-sm text-muted-foreground flex items-center">
                             <Clock className="h-4 w-4 inline mr-2" />
                             {booking.startTime} - {booking.endTime}
                           </p>
                        </div>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="calendar">
            <Card>
              <CardHeader>
                <CardTitle>Availability Calendar</CardTitle>
                <CardDescription>
                  Manage your venue's schedule and block out dates.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[500px] border rounded-lg flex items-center justify-center bg-background">
                  <p className="text-muted-foreground">
                    Interactive calendar component would be implemented here
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="listing">
            <Card>
              <CardHeader>
                <CardTitle>Venue Listing Details</CardTitle>
                <CardDescription>
                  Update the public information about your venue.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-8">
                <div className="space-y-4">
                   <h3 className="text-lg font-medium">Core Details</h3>
                   <Separator />
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     <div className="space-y-2">
                       <Label htmlFor="venueName">Venue Name</Label>
                       <Input id="venueName" defaultValue={venueData.name} />
                     </div>
                     <div className="space-y-2">
                       <Label htmlFor="capacity">Capacity (Max Guests)</Label>
                       <Input
                         id="capacity"
                         type="number"
                         defaultValue={venueData.capacity}
                       />
                     </div>
                   </div>
                   <div className="space-y-2">
                     <Label htmlFor="description">Description</Label>
                     <Textarea
                       id="description"
                       defaultValue={venueData.description}
                       rows={5}
                     />
                   </div>
                </div>

                <div className="space-y-4">
                   <h3 className="text-lg font-medium">Location & Pricing</h3>
                   <Separator />
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     <div className="space-y-2">
                       <Label htmlFor="location">Location</Label>
                       <Input id="location" defaultValue={venueData.location} />
                     </div>
                     <div className="space-y-2">
                       <Label htmlFor="basePrice">Base Price (per day)</Label>
                       <Input id="basePrice" defaultValue={venueData.basePrice} />
                     </div>
                   </div>
                </div>
                
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Facilities & Amenities</h3>
                  <Separator />
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {facilities.map((facility) => (
                      <div
                        key={facility.id}
                        className="flex items-center space-x-3"
                      >
                        <Checkbox
                          id={facility.id}
                          defaultChecked={facility.checked}
                        />
                        <Label
                          htmlFor={facility.id}
                          className="font-normal flex items-center cursor-pointer"
                        >
                          <facility.icon className="h-4 w-4 mr-2 text-muted-foreground" />
                          {facility.label}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                 <Button>Save Changes</Button>
              </CardFooter>
            </Card>
          </TabsContent>

          <TabsContent value="earnings">
            <Card>
              <CardHeader>
                <CardTitle>Earnings & Payouts</CardTitle>
                <CardDescription>Track your income and manage payouts.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">
                        This Month's Earnings
                      </CardTitle>
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-green-600">₹{stats?.totalRevenue || 0}</div>
                      <p className="text-xs text-muted-foreground">
                        Total revenue earned
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">
                        Total Bookings
                      </CardTitle>
                      <CheckCircle className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{stats?.totalBookings || 0}</div>
                      <p className="text-xs text-muted-foreground">
                        All time bookings
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">This Month</CardTitle>
                       <Calendar className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{stats?.monthlyBookings || 0}</div>
                      <p className="text-xs text-muted-foreground">
                        Bookings this month
                      </p>
                    </CardContent>
                  </Card>
                </div>
                <h3 className="font-semibold mb-4 text-lg">Recent Transactions</h3>
                <Card>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Event</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow>
                        <TableCell colSpan={4} className="h-24 text-center">
                          No recent transactions.
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </Card>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings">
            <Card>
              <CardHeader>
                <CardTitle>Venue Settings</CardTitle>
                <CardDescription>
                  Manage your contact details and booking preferences.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-8">
                 <div className="space-y-4">
                  <h3 className="font-medium">Contact Information</h3>
                  <Separator/>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="phone">Contact Phone</Label>
                      <Input id="phone" placeholder="+91 9876543210" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Contact Email</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="contact@grandballroom.com"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="font-medium">Booking Preferences</h3>
                  <Separator />
                  <div className="space-y-3">
                    <div className="flex items-center space-x-3">
                      <Checkbox id="instantBooking" />
                      <Label htmlFor="instantBooking" className="font-normal">
                        Allow instant booking for available dates
                      </Label>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Checkbox id="notifications" defaultChecked />
                      <Label htmlFor="notifications" className="font-normal">
                        Email notifications for new booking requests
                      </Label>
                    </div>
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                 <Button>Save Settings</Button>
              </CardFooter>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
      <Footer />
    </div>
  );
}