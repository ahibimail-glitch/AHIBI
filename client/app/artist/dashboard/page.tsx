"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Calendar,
  DollarSign,
  Star,
  MapPin,
  Instagram,
  Youtube,
  Edit,
  Camera,
  Play,
  AlertCircle,
  Award,
  FileText,
} from "lucide-react";
import Image from "next/image";
import Navbar from "@/app/Navbar";
import Footer from "@/app/Footer";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import GalleryManager from "@/components/artist/GalleryManager";
import AccoladesManager from "@/components/artist/AccoladesManager";
import TermsManager from "@/components/artist/TermsManager";
import AvailabilityCalendar from "@/components/artist/AvailabilityCalendar";

interface ArtistUser {
  _id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  status: string;
}

// Local types to match GalleryManager and AccoladesManager expectations
interface Photo {
  _id: string;
  url: string;
  caption: string;
  isProfileImage: boolean;
  isCoverImage: boolean;
}

interface Video {
  _id: string;
  url: string;
  thumbnail: string;
  caption: string;
  platform: string;
}

interface Accolade {
  _id: string;
  title: string;
  description: string;
  year: number;
  organization: string;
  certificate?: string;
}

interface ArtistProfile {
  _id: string;
  user: string;
  type: string;
  bio: string;
  genres: string[];
  languages: string[];
  basePrice: number;
  location: string;
  approvalStatus: 'pending' | 'approved' | 'rejected';
  rejectionReason?: string;
  profileImage?: string;
  coverImage?: string;
  socialLinks?: {
    instagram?: string;
    youtube?: string;
    [key: string]: string | undefined;
  };
  rating?: {
    average: number;
    count: number;
  };
  totalBookings?: number;
  // Optional extended fields used by dashboard tabs
  gallery?: {
    photos: Photo[];
    videos: Video[];
  };
  accolades?: Accolade[];
  termsAndConditions?: {
    content: string;
    lastUpdated: string; // ISO date string
  };
  cancellationPolicy?: {
    advanceNotice: number;
    refundPolicy: string;
    emergencyContact: string;
  };
}

interface BookingRequest {
  _id: string;
  event: {
    name: string;
    date: string;
    venue: {
      name: string;
      address: string;
    };
  };
  organizer: {
    name: string;
    email: string;
  };
  booking: {
    requestedAmount: number;
    status: string;
  };
  createdAt: string;
}

export default function ArtistDashboard() {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<ArtistUser | null>(null);
  const [profile, setProfile] = useState<ArtistProfile | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Fetch artist profile from backend
  useEffect(() => {
    const token = localStorage.getItem('artist_token');
    const userData = localStorage.getItem('artist_user');
    
    if (!token || !userData) {
      router.push('/artist/auth/login');
      return;
    }

    // Parse user data from localStorage
    try {
      const parsedUser = JSON.parse(userData);
      setUser(parsedUser);
      
      // Fetch artist profile
      fetchArtistProfile(token);
      // Fetch bookings
      fetchBookings();
    } catch (error) {
      console.error('Error parsing user data:', error);
      setError('Error loading user data. Please login again.');
      setLoading(false);
    }
  }, [router]);

  const fetchArtistProfile = async (token: string) => {
    try {
      const response = await fetch('/api/artist/profile', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch artist profile');
      }

      const data = await response.json();
      setProfile(data.data.artist);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching artist profile:', error);
      setError('Error loading profile data');
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('artist_token');
    localStorage.removeItem('artist_user');
    router.push('/artist/auth/login');
  };

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsEditing(false);
    
    // Implementation for profile update would go here
    // This would make a PUT request to /api/artist/profile
  };

  // State for bookings
  const [bookingRequests, setBookingRequests] = useState<BookingRequest[]>([]);
  const [loadingBookings, setLoadingBookings] = useState(false);

  // Fetch booking requests
  const fetchBookings = async () => {
    try {
      setLoadingBookings(true);
      const token = localStorage.getItem('artist_token');
      const response = await fetch('/api/artist/bookings?status=pending', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setBookingRequests(data.data.bookings || []);
      }
    } catch (error) {
      console.error('Error fetching bookings:', error);
    } finally {
      setLoadingBookings(false);
    }
  };

  // Handle booking actions
  const handleBookingAction = async (bookingId: string, action: 'accept' | 'decline', counterOffer?: { amount: number, message: string }) => {
    try {
      const token = localStorage.getItem('artist_token');
      let endpoint = `/api/artist/bookings/${bookingId}/${action}`;
      let body = {};

      if (action === 'decline') {
        const reason = prompt('Please provide a reason for declining:');
        if (!reason) return;
        body = { reason };
      } else if (counterOffer) {
        endpoint = `/api/artist/bookings/${bookingId}/counter-offer`;
        body = counterOffer;
      }

      const response = await fetch(endpoint, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      });

      if (response.ok) {
        fetchBookings(); // Refresh bookings
      }
    } catch (error) {
      console.error(`Error ${action}ing booking:`, error);
    }
  };

  const upcomingEvents = [
    {
      id: 1,
      event: "Summer Music Festival",
      date: "July 15, 2024",
      venue: "Central Park Arena",
      payment: "₹35,000",
      status: "confirmed",
    },
    {
      id: 2,
      event: "Birthday Bash",
      date: "July 20, 2024",
      venue: "Private Villa",
      payment: "₹28,000",
      status: "confirmed",
    },
  ];

  const gallery = [
    {
      type: "image",
      src: "/images/carausel1.jpg?height=200&width=300",
      title: "Live Performance 1",
    },
    {
      type: "image",
      src: "/images/carausel1.jpg?height=200&width=300",
      title: "Studio Session",
    },
    {
      type: "video",
      src: "/images/carausel1.jpg?height=200&width=300",
      title: "Performance Video",
    },
    {
      type: "image",
      src: "/images/carausel1.jpg?height=200&width=300",
      title: "Event Setup",
    },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-400 via-white to-purple-400 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Error</CardTitle>
          </CardHeader>
          <CardContent>
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
            <Button 
              className="w-full mt-4" 
              onClick={() => router.push('/artist/auth/login')}
            >
              Back to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Handle approval status
  if (user && profile && profile.approvalStatus === 'pending') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Account Pending Approval</CardTitle>
          </CardHeader>
          <CardContent>
            <Alert className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Pending Approval</AlertTitle>
              <AlertDescription>
                Your artist account is currently under review by our admin team. 
                You'll receive a notification once your account is approved.
              </AlertDescription>
            </Alert>
            <div className="flex justify-between">
              <Button variant="outline" onClick={handleLogout}>
                Logout
              </Button>
              <Button onClick={() => window.location.reload()}>
                Check Status
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Handle rejection status
  if (user && profile && profile.approvalStatus === 'rejected') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Account Rejected</CardTitle>
          </CardHeader>
          <CardContent>
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Application Rejected</AlertTitle>
              <AlertDescription>
                {profile.rejectionReason || 'Your artist account application has been rejected. Please contact support for more information.'}
              </AlertDescription>
            </Alert>
            <Button className="w-full" onClick={handleLogout}>
              Logout
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60 sticky top-0 z-50">
        <Navbar />
      </header>
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Artist Dashboard</h1>
        <div className="flex items-center space-x-4">
          <Badge variant="secondary">Verified Artist</Badge>
          <Button variant="outline" size="sm">
            View Public Profile
          </Button>
          <Button variant="outline" size="sm" onClick={handleLogout}>
            Logout
          </Button>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        {/* Artist Profile Header */}
        <Card className="mb-6">
          <div className="relative">
            <Image
              src={profile?.coverImage || "/images/carausel1.jpg"}
              alt="Cover"
              width={800}
              height={300}
              className="w-full h-48 md:h-64 object-cover rounded-t-lg"
            />
            <Button
              size="sm"
              variant="secondary"
              className="absolute top-4 right-4"
            >
              <Camera className="h-4 w-4 mr-1" />
              Change Cover
            </Button>
          </div>
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row items-start md:items-center space-y-4 md:space-y-0 md:space-x-6">
              <div className="relative">
                <Avatar className="w-24 h-24">
                  <AvatarImage
                    src={profile?.profileImage || "/images/carausel1.jpg"}
                  />
                  <AvatarFallback>{user?.name?.charAt(0) || 'A'}</AvatarFallback>
                </Avatar>
                <Button
                  size="sm"
                  variant="secondary"
                  className="absolute -bottom-2 -right-2 h-8 w-8 rounded-full p-0"
                >
                  <Camera className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-2xl font-bold">{user?.name}</h2>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsEditing(!isEditing)}
                  >
                    <Edit className="h-4 w-4 mr-1" />
                    Edit Profile
                  </Button>
                </div>
                <div className="flex items-center space-x-4 text-sm text-muted-foreground mb-3">
                  {profile?.rating && typeof profile.rating === 'object' && 'average' in profile.rating && profile.rating.average > 0 && (
                    <div className="flex items-center">
                      <Star className="h-4 w-4 mr-1 text-yellow-500" />
                      {profile.rating.average.toFixed(1)} ({profile.rating.count || 0} reviews)
                    </div>
                  )}
                  <div className="flex items-center">
                    <MapPin className="h-4 w-4 mr-1" />
                    {profile?.location || 'Location not set'}
                  </div>
                  <div className="flex items-center">
                    <DollarSign className="h-4 w-4 mr-1" />
                    Starting from ₹{profile?.basePrice || 'Not set'}
                  </div>
                </div>
                <p className="text-muted-foreground mb-3">{profile?.bio || 'No bio available'}</p>
                <div className="flex flex-wrap gap-2">
                  {profile?.genres?.map((g) => (
                    <Badge key={g} variant="secondary">
                      {g}
                    </Badge>
                  ))}
                  {profile?.languages?.map((l) => (
                    <Badge key={l} variant="outline">
                      {l}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="bookings" className="space-y-6">
          <TabsList className="grid w-full grid-cols-7">
            <TabsTrigger value="bookings">Bookings</TabsTrigger>
            <TabsTrigger value="calendar">Calendar</TabsTrigger>
            <TabsTrigger value="gallery">Gallery</TabsTrigger>
            <TabsTrigger value="accolades">Accolades</TabsTrigger>
            <TabsTrigger value="terms">Terms</TabsTrigger>
            <TabsTrigger value="earnings">Earnings</TabsTrigger>
            <TabsTrigger value="profile">Profile</TabsTrigger>
          </TabsList>

          <TabsContent value="bookings" className="space-y-6">
            <div className="space-y-4">
              {/* Booking Requests */}
              <Card>
                <CardHeader>
                  <CardTitle>Booking Requests</CardTitle>
                  <CardDescription>
                    New requests waiting for your response
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {bookingRequests.length > 0 ? (
                    bookingRequests.map((request) => (
                      <div key={request._id} className="p-4 border rounded-lg">
                        <div className="flex justify-between items-start mb-2">
                          <h3 className="font-semibold">{request.event.name}</h3>
                          <Badge variant="outline">₹{request.booking.requestedAmount}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-1">
                          by {request.organizer.name}
                        </p>
                        <p className="text-sm text-muted-foreground mb-1">
                          <Calendar className="h-4 w-4 inline mr-1" />
                          {new Date(request.event.date).toLocaleDateString()}
                        </p>
                        <p className="text-sm text-muted-foreground mb-3">
                          <MapPin className="h-4 w-4 inline mr-1" />
                          {request.event.venue.name}
                        </p>
                        <div className="flex space-x-2">
                          <Button 
                            size="sm" 
                            className="flex-1"
                            onClick={() => handleBookingAction(request._id, 'accept')}
                          >
                            Accept
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1 bg-transparent"
                            onClick={() => {
                              const amount = prompt('Enter counter offer amount:');
                              const message = prompt('Add a message (optional):');
                              if (amount) {
                                handleBookingAction(request._id, 'accept', {
                                  amount: parseInt(amount),
                                  message: message || ''
                                });
                              }
                            }}
                          >
                            Counter Offer
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleBookingAction(request._id, 'decline')}
                          >
                            Decline
                          </Button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      No booking requests yet
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Upcoming Events */}
              {/* <Card>
                <CardHeader>
                  <CardTitle>Upcoming Events</CardTitle>
                  <CardDescription>Your confirmed performances</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {upcomingEvents.length > 0 ? (
                    upcomingEvents.map((event) => (
                      <div key={event.id} className="p-4 border rounded-lg">
                        <div className="flex justify-between items-start mb-2">
                          <h3 className="font-semibold">{event.event}</h3>
                          <Badge className="bg-green-100 text-green-800">
                            {event.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-1">
                          <Calendar className="h-4 w-4 inline mr-1" />
                          {event.date}
                        </p>
                        <p className="text-sm text-muted-foreground mb-1">
                          <MapPin className="h-4 w-4 inline mr-1" />
                          {event.venue}
                        </p>
                        <p className="text-sm font-medium text-green-600">
                          Payment: {event.payment}
                        </p>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      No upcoming events
                    </div>
                  )}
                </CardContent>
              </Card> */}
            </div>
          </TabsContent>

          <TabsContent value="calendar">
            <AvailabilityCalendar 
              onUpdate={() => {
                const token = localStorage.getItem('artist_token');
                if (token) fetchArtistProfile(token);
              }}
            />
          </TabsContent>

          <TabsContent value="gallery">
            <GalleryManager 
              photos={profile?.gallery?.photos || []}
              videos={profile?.gallery?.videos || []}
              onUpdate={() => {
                const token = localStorage.getItem('artist_token');
                if (token) fetchArtistProfile(token);
              }}
            />
          </TabsContent>

          <TabsContent value="accolades">
            <AccoladesManager 
              accolades={profile?.accolades || []}
              onUpdate={() => {
                const token = localStorage.getItem('artist_token');
                if (token) fetchArtistProfile(token);
              }}
            />
          </TabsContent>

          <TabsContent value="terms" className="space-y-6">
            {profile && (
              <TermsManager 
                terms={profile.termsAndConditions || { content: '', lastUpdated: new Date().toISOString() }}
                cancellationPolicy={profile.cancellationPolicy || { advanceNotice: 24, refundPolicy: '', emergencyContact: '' }}
                onUpdate={() => {
                  const token = localStorage.getItem('artist_token');
                  if (token) fetchArtistProfile(token);
                }}
              />
            )}
          </TabsContent>

          <TabsContent value="earnings">
            <Card>
              <CardHeader>
                <CardTitle>Earnings & Payouts</CardTitle>
                <CardDescription>
                  Track your income and payment history
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div className="p-4 border rounded-lg text-center">
                    <h3 className="font-semibold text-lg">This Month</h3>
                    <p className="text-3xl font-bold text-green-600">
                      ₹1,25,000
                    </p>
                  </div>
                  <div className="p-4 border rounded-lg text-center">
                    <h3 className="font-semibold text-lg">Pending</h3>
                    <p className="text-3xl font-bold text-orange-600">
                      ₹45,000
                    </p>
                  </div>
                  <div className="p-4 border rounded-lg text-center">
                    <h3 className="font-semibold text-lg">Total Earned</h3>
                    <p className="text-3xl font-bold">₹8,75,000</p>
                  </div>
                </div>
                <div className="border rounded-lg p-4">
                  <h3 className="font-semibold mb-4">Recent Transactions</h3>
                  <p className="text-center text-muted-foreground">
                    Transaction history would be displayed here
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="profile">
            <Card>
              <CardHeader>
                <CardTitle>Profile Settings</CardTitle>
                <CardDescription>
                  Update your profile information
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <form onSubmit={handleProfileUpdate}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Artist Name</Label>
                      <Input id="name" defaultValue={user?.name} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="location">Location</Label>
                      <Input id="location" defaultValue={profile?.location} />
                    </div>
                  </div>
                  <div className="space-y-2 mt-4">
                    <Label htmlFor="bio">Bio</Label>
                    <Textarea id="bio" defaultValue={profile?.bio} rows={4} />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                    <div className="space-y-2">
                      <Label htmlFor="basePrice">Base Price</Label>
                      <Input id="basePrice" defaultValue={profile?.basePrice?.toString()} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone</Label>
                      <Input id="phone" defaultValue={user?.phone} />
                    </div>
                  </div>
                  <div className="space-y-4 mt-4">
                    <Label>Social Links</Label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="flex items-center space-x-2">
                        <Instagram className="h-4 w-4" />
                        <Input placeholder="Instagram URL" defaultValue={profile?.socialLinks?.instagram} />
                      </div>
                      <div className="flex items-center space-x-2">
                        <Youtube className="h-4 w-4" />
                        <Input placeholder="YouTube URL" defaultValue={profile?.socialLinks?.youtube} />
                      </div>
                    </div>
                  </div>
                  <Button type="submit" className="mt-6">Save Changes</Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
      <Footer />
    </div>
  );
}
