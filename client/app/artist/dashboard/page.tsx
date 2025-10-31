"use client";

import { useState, useEffect, useReducer, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createRoleAuthRedirectUrl } from "@/utils/redirectUtils";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import ArtistSidebar from "./components/ArtistSidebar";
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
  Facebook,
  Twitter,
  Music,
  Globe,
  CheckCircle,
  Loader2,
  User,
  Clock,
} from "lucide-react";
import Image from "next/image";
import Navbar from "@/app/Navbar";
import Footer from "@/app/Footer";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import GalleryManager from "@/components/artist/GalleryManager";
import AccoladesManager from "@/components/artist/AccoladesManager";
import TermsManager from "@/components/artist/TermsManager";
import AvailabilityCalendar from "@/components/artist/AvailabilityCalendar";
import { uploadProfilePicture, uploadPhoto, validateFile } from "@/lib/cloudinary";

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

interface MonthlyEarnings {
  month: string;
  earnings: number;
  bookings: number;
}

interface EarningsData {
  totalEarnings: number;
  advanceReceived: number;
  fullPaymentReceived: number;
  pendingAmount: number;
  totalBookings: number;
  monthlyEarnings: MonthlyEarnings[];
}

export default function ArtistDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<ArtistUser | null>(null);
  const [profile, setProfile] = useState<ArtistProfile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState('bookings');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [updatingProfile, setUpdatingProfile] = useState(false);
  const [profileUpdateMessage, setProfileUpdateMessage] = useState<string | null>(null);
  const [profileUpdateError, setProfileUpdateError] = useState<string | null>(null);
  const [uploadingCoverImage, setUploadingCoverImage] = useState(false);
  const [uploadingProfileImage, setUploadingProfileImage] = useState(false);

  // Fetch artist profile from backend
  useEffect(() => {
    const token = localStorage.getItem('artist_token');
    const userData = localStorage.getItem('artist_user');
    
    if (!token || !userData) {
      router.push(createRoleAuthRedirectUrl('artist'));
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

  const handleCoverImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const validationError = validateFile(file);
    if (validationError) {
      alert(validationError);
      return;
    }

    setUploadingCoverImage(true);
    try {
      const uploadedPhoto = await uploadPhoto(file, 'cover');

      // Update profile with new cover image
      const token = localStorage.getItem('artist_token');
      const response = await fetch('/api/artist/profile', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          coverImage: uploadedPhoto.url
        })
      });

      if (response.ok) {
        // Refresh profile data
        fetchArtistProfile(token!);
      } else {
        alert('Failed to update cover image');
      }
    } catch (error) {
      console.error('Error uploading cover image:', error);
      alert('Failed to upload cover image. Please try again.');
    } finally {
      setUploadingCoverImage(false);
    }
  };

  const handleProfileImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const validationError = validateFile(file);
    if (validationError) {
      alert(validationError);
      return;
    }

    setUploadingProfileImage(true);
    try {
      const uploadedPhoto = await uploadProfilePicture(file);

      // Update profile with new profile image
      const token = localStorage.getItem('artist_token');
      const response = await fetch('/api/artist/profile', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          profileImage: uploadedPhoto.url
        })
      });

      if (response.ok) {
        // Refresh profile data
        fetchArtistProfile(token!);
      } else {
        alert('Failed to update profile image');
      }
    } catch (error) {
      console.error('Error uploading profile image:', error);
      alert('Failed to upload profile image. Please try again.');
    } finally {
      setUploadingProfileImage(false);
    }
  };

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpdatingProfile(true);
    setProfileUpdateMessage(null);
    setProfileUpdateError(null);
    
    try {
      const formData = new FormData(e.target as HTMLFormElement);
      
      // Collect form data
      const updateData = {
        name: formData.get('name') || user?.name,
        city: formData.get('location') || profile?.location, // Map 'location' form field to 'city' backend field
        bio: formData.get('bio') || profile?.bio,
        basePrice: parseInt(formData.get('basePrice') as string) || profile?.basePrice,
        phone: formData.get('phone') || user?.phone,
        socialLinks: {
          instagram: (formData.get('instagram') as string) || undefined,
          youtube: (formData.get('youtube') as string) || undefined,
          facebook: (formData.get('facebook') as string) || undefined,
          twitter: (formData.get('twitter') as string) || undefined,
          spotify: (formData.get('spotify') as string) || undefined,
          website: (formData.get('website') as string) || undefined,
        }
      };

      const token = localStorage.getItem('artist_token');
      if (!token) {
        setProfileUpdateError('Authentication token not found. Please login again.');
        return;
      }

      // Update profile
      const response = await fetch('/api/artist/profile', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updateData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update profile');
      }

      const data = await response.json();
      
      // Update local profile state
      setProfile(prev => prev ? { ...prev, ...data.data.artist } : null);
      setProfileUpdateMessage('Profile updated successfully!');
      
    } catch (error) {
      console.error('Error updating profile:', error);
      setProfileUpdateError(error instanceof Error ? error.message : 'Failed to update profile');
    } finally {
      setUpdatingProfile(false);
    }
  };

  // State for bookings
  const [bookingRequests, setBookingRequests] = useState<BookingRequest[]>([]);
  const [loadingBookings, setLoadingBookings] = useState(false);

  // Fetch booking requests
  const fetchBookings = async () => {
    try {
      setLoadingBookings(true);
      const token = localStorage.getItem('artist_token');
      // Fetch all bookings (not just pending)
      const response = await fetch('/api/artist/bookings', {
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
  // Booking actions removed - payment automatically confirms bookings
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

  const renderContent = () => {
    switch (activeSection) {
      case 'bookings':
        return <BookingsContent bookingRequests={bookingRequests} handleBookingAction={handleBookingAction} loadingBookings={loadingBookings} />;
      case 'calendar':
        return <CalendarContent profile={profile} fetchArtistProfile={fetchArtistProfile} />;
      case 'gallery':
        return <GalleryContent profile={profile} fetchArtistProfile={fetchArtistProfile} />;
      case 'accolades':
        return <AccoladesContent profile={profile} fetchArtistProfile={fetchArtistProfile} />;
      case 'terms':
        return <TermsContent profile={profile} fetchArtistProfile={fetchArtistProfile} />;
      case 'earnings':
        return <EarningsContent />;
      case 'profile':
        return <ProfileContent 
          user={user} 
          profile={profile} 
          handleProfileUpdate={handleProfileUpdate}
          updatingProfile={updatingProfile}
          profileUpdateMessage={profileUpdateMessage}
          profileUpdateError={profileUpdateError}
          handleCoverImageUpload={handleCoverImageUpload}
          handleProfileImageUpload={handleProfileImageUpload}
          uploadingCoverImage={uploadingCoverImage}
          uploadingProfileImage={uploadingProfileImage}
          fetchArtistProfile={fetchArtistProfile}
        />;
      default:
        return <BookingsContent bookingRequests={bookingRequests} handleBookingAction={handleBookingAction} loadingBookings={loadingBookings} />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
     

      <div className="flex">
        {/* Sidebar */}
        <ArtistSidebar
          activeSection={activeSection}
          onSectionChange={setActiveSection}
          isOpen={sidebarOpen}
          onToggle={() => setSidebarOpen(!sidebarOpen)}
        />

        {/* Main Content */}
        <div className="flex-1 min-w-0 overflow-hidden">
          <div className="p-4 md:p-6 max-w-full">
            {/* Dynamic Content */}
            {renderContent()}
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}

// Content Components
const BookingsContent = ({ bookingRequests, handleBookingAction, loadingBookings }: any) => {
  const [selectedBooking, setSelectedBooking] = useState<any>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [loadingDetails, setLoadingDetails] = useState(false);

  const fetchBookingDetails = async (bookingId: string) => {
    try {
      setLoadingDetails(true);
      const token = localStorage.getItem('artist_token');
      const response = await fetch(`/api/artist/bookings/${bookingId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setSelectedBooking(data.data.booking);
        setShowDetails(true);
      }
    } catch (error) {
      console.error('Error fetching booking details:', error);
    } finally {
      setLoadingDetails(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (timeString: string) => {
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const getStatusBadge = (status: string, paymentStatus: string) => {
    if (status === 'confirmed' && paymentStatus === 'fully_paid') {
      return <Badge className="bg-green-500 text-white">Confirmed & Paid</Badge>;
    }
    if (status === 'pending') {
      return <Badge variant="outline" className="border-yellow-500 text-yellow-700">Payment Pending</Badge>;
    }
    if (status === 'cancelled') {
      return <Badge variant="destructive">Cancelled</Badge>;
    }
    return <Badge variant="secondary">{status}</Badge>;
  };

  return (
    <>
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              My Bookings
            </CardTitle>
            <CardDescription>
              All your booking requests and confirmed bookings
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingBookings ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
              </div>
            ) : bookingRequests.length > 0 ? (
              <div className="space-y-4">
                {bookingRequests.map((request: any) => (
                  <Card key={request._id} className="hover:shadow-lg transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex-1">
                          <h3 className="text-xl font-bold text-gray-900 mb-2">{request.event.name}</h3>
                          <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
                            <div className="flex items-center gap-1">
                              <User className="h-4 w-4" />
                              <span className="font-medium">{request.organizer?.name || 'Organizer'}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <DollarSign className="h-4 w-4" />
                              <span className="font-semibold text-purple-600">₹{request.booking?.finalAmount || request.booking?.requestedAmount || 0}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          {getStatusBadge(request.booking?.status, request.booking?.paymentStatus)}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                        <div className="flex items-start gap-2">
                          <Calendar className="h-5 w-5 text-purple-600 mt-0.5" />
                          <div>
                            <p className="text-xs text-gray-500">Event Date</p>
                            <p className="text-sm font-semibold">{formatDate(request.event.date)}</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-2">
                          <Clock className="h-5 w-5 text-purple-600 mt-0.5" />
                          <div>
                            <p className="text-xs text-gray-500">Time</p>
                            <p className="text-sm font-semibold">
                              {formatTime(request.event.startTime)} - {formatTime(request.event.endTime)}
                              {request.event.duration && ` (${request.event.duration}h)`}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-start gap-2">
                          <MapPin className="h-5 w-5 text-purple-600 mt-0.5" />
                          <div>
                            <p className="text-xs text-gray-500">Venue</p>
                            <p className="text-sm font-semibold">{request.event.venue.name}</p>
                            <p className="text-xs text-gray-500">{request.event.venue.city}</p>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-4 border-t">
                        <div className="text-sm text-gray-600">
                          <p className="capitalize">
                            <span className="font-medium">Event Type:</span> {request.event.eventType?.replace('_', ' ') || 'N/A'}
                          </p>
                          {request.contract?.organizerRequirements && (
                            <p className="text-xs text-gray-500 mt-1 line-clamp-1">
                              {request.contract.organizerRequirements}
                            </p>
                          )}
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => fetchBookingDetails(request._id)}
                          disabled={loadingDetails}
                          className="bg-purple-50 hover:bg-purple-100 text-purple-700 border-purple-200"
                        >
                          {loadingDetails ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Loading...
                            </>
                          ) : (
                            <>
                              <FileText className="h-4 w-4 mr-2" />
                              View Details
                            </>
                          )}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 text-lg">No bookings yet</p>
                <p className="text-gray-400 text-sm mt-2">Your bookings will appear here once organizers book you</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Booking Details Dialog */}
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Booking Details</DialogTitle>
            <DialogDescription>
              Complete information about this booking
            </DialogDescription>
          </DialogHeader>
          
          {selectedBooking && (
            <div className="space-y-6">
              {/* Header */}
              <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-4 rounded-lg border border-purple-200">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-2">{selectedBooking.event.name}</h3>
                    {selectedBooking.event.description && (
                      <p className="text-gray-600 text-sm">{selectedBooking.event.description}</p>
                    )}
                  </div>
                  <div className="text-right">
                    {getStatusBadge(selectedBooking.booking?.status, selectedBooking.booking?.paymentStatus)}
                    <p className="text-xs text-gray-500 mt-2">
                      Booking ID: {selectedBooking._id.slice(-8).toUpperCase()}
                    </p>
                  </div>
                </div>
              </div>

              {/* Event Details */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Event Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-500 mb-1">Event Date</p>
                      <p className="font-semibold flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        {formatDate(selectedBooking.event.date)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 mb-1">Event Type</p>
                      <p className="font-semibold capitalize">{selectedBooking.event.eventType?.replace('_', ' ') || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 mb-1">Time</p>
                      <p className="font-semibold flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        {formatTime(selectedBooking.event.startTime)} - {formatTime(selectedBooking.event.endTime)}
                        {selectedBooking.event.duration && ` (${selectedBooking.event.duration} hours)`}
                      </p>
                    </div>
                    {selectedBooking.event.expectedAudience && (
                      <div>
                        <p className="text-sm text-gray-500 mb-1">Expected Audience</p>
                        <p className="font-semibold">{selectedBooking.event.expectedAudience} people</p>
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Venue</p>
                    <div className="flex items-start gap-2">
                      <MapPin className="h-4 w-4 text-purple-600 mt-1" />
                      <div>
                        <p className="font-semibold">{selectedBooking.event.venue.name}</p>
                        <p className="text-sm text-gray-600">
                          {selectedBooking.event.venue.address}, {selectedBooking.event.venue.city}
                          {selectedBooking.event.venue.state && `, ${selectedBooking.event.venue.state}`}
                          {selectedBooking.event.venue.pincode && ` - ${selectedBooking.event.venue.pincode}`}
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Organizer Details */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Organizer Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Name</p>
                    <p className="font-semibold">{selectedBooking.organizer?.name || 'N/A'}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    {selectedBooking.organizer?.email && (
                      <div>
                        <p className="text-sm text-gray-500 mb-1">Email</p>
                        <p className="text-sm">{selectedBooking.organizer.email}</p>
                      </div>
                    )}
                    {selectedBooking.organizer?.phone && (
                      <div>
                        <p className="text-sm text-gray-500 mb-1">Phone</p>
                        <p className="text-sm">{selectedBooking.organizer.phone}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Payment Details */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Payment Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Booking Amount</span>
                    <span className="text-xl font-bold text-purple-600">
                      ₹{selectedBooking.booking?.finalAmount || selectedBooking.booking?.requestedAmount || 0}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Payment Status</span>
                    {getStatusBadge(selectedBooking.booking?.status, selectedBooking.booking?.paymentStatus)}
                  </div>
                  {selectedBooking.booking?.paymentDetails && (
                    <>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Payment Gateway</span>
                        <span className="text-sm capitalize">{selectedBooking.booking.paymentDetails.paymentGateway || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Transaction ID</span>
                        <span className="text-xs font-mono text-gray-700">{selectedBooking.booking.paymentDetails.paymentId || 'N/A'}</span>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Special Requirements */}
              {selectedBooking.contract?.organizerRequirements && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Special Requirements</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">
                      {selectedBooking.contract.organizerRequirements}
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* Timeline */}
              {selectedBooking.timeline && selectedBooking.timeline.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Booking Timeline</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {selectedBooking.timeline.map((entry: any, index: number) => (
                        <div key={index} className="flex items-start gap-3 pb-3 border-b last:border-0">
                          <div className="w-2 h-2 rounded-full bg-purple-600 mt-1.5"></div>
                          <div className="flex-1">
                            <p className="text-sm font-semibold">{entry.action}</p>
                            {entry.details && (
                              <p className="text-xs text-gray-500 mt-1">{entry.details}</p>
                            )}
                            <p className="text-xs text-gray-400 mt-1">
                              {new Date(entry.timestamp).toLocaleString('en-IN')}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

const CalendarContent = ({ profile, fetchArtistProfile }: any) => (
  <AvailabilityCalendar 
    onUpdate={() => {
      const token = localStorage.getItem('artist_token');
      if (token) fetchArtistProfile(token);
    }}
  />
);

const GalleryContent = ({ profile, fetchArtistProfile }: any) => (
  <GalleryManager 
    photos={profile?.gallery?.photos || []}
    videos={profile?.gallery?.videos || []}
    onUpdate={() => {
      const token = localStorage.getItem('artist_token');
      if (token) fetchArtistProfile(token);
    }}
  />
);

const AccoladesContent = ({ profile, fetchArtistProfile }: any) => (
  <AccoladesManager 
    accolades={profile?.accolades || []}
    onUpdate={() => {
      const token = localStorage.getItem('artist_token');
      if (token) fetchArtistProfile(token);
    }}
  />
);

const TermsContent = ({ profile, fetchArtistProfile }: any) => (
  profile && (
    <TermsManager 
      terms={profile.termsAndConditions || { content: '', lastUpdated: new Date().toISOString() }}
      cancellationPolicy={profile.cancellationPolicy || { advanceNotice: 24, refundPolicy: '', emergencyContact: '' }}
      onUpdate={() => {
        const token = localStorage.getItem('artist_token');
        if (token) fetchArtistProfile(token);
      }}
    />
  )
);

const EarningsContent = () => {
  const [earningsData, setEarningsData] = useState<EarningsData>({
    totalEarnings: 0,
    advanceReceived: 0,
    fullPaymentReceived: 0,
    pendingAmount: 0,
    totalBookings: 0,
    monthlyEarnings: []
  });
  const [paymentHistory, setPaymentHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch earnings data on component mount
  useEffect(() => {
    fetchEarningsData();
  }, []);

  const fetchEarningsData = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem('artist_token');
      if (!token) {
        setError('Authentication token not found. Please login again.');
        return;
      }

      // Fetch earnings summary
      const earningsResponse = await fetch('/api/artist/payments/earnings', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!earningsResponse.ok) {
        throw new Error('Failed to fetch earnings data');
      }

      const earningsResult = await earningsResponse.json();
      setEarningsData(earningsResult.data.summary);

      // Fetch payment history
      const historyResponse = await fetch('/api/artist/payments/history?page=1&limit=10', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (historyResponse.ok) {
        const historyResult = await historyResponse.json();
        setPaymentHistory(historyResult.data.paymentHistory || []);
      }

    } catch (error) {
      console.error('Error fetching earnings data:', error);
      setError(error instanceof Error ? error.message : 'Failed to load earnings data');
    } finally {
      setLoading(false);
    }
  };

  // Calculate this month's earnings
  const getThisMonthEarnings = (): number => {
    const currentDate = new Date();
    const currentMonth = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
    
    const monthlyData = earningsData.monthlyEarnings.find((month: MonthlyEarnings) => month.month === currentMonth);
    return monthlyData ? monthlyData.earnings : 0;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getPaymentStatusBadge = (status: string) => {
    switch (status) {
      case 'fully_paid':
        return <Badge className="bg-green-500 text-white">Fully Paid</Badge>;
      case 'advance_paid':
        return <Badge className="bg-yellow-500 text-white">Advance Paid</Badge>;
      case 'pending':
        return <Badge variant="outline" className="border-orange-500 text-orange-700">Payment Pending</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Earnings & Payouts</CardTitle>
          <CardDescription>Track your income and payment history</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Earnings & Payouts</CardTitle>
          <CardDescription>Track your income and payment history</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error Loading Data</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
          <Button 
            onClick={fetchEarningsData}
            className="mt-4"
            variant="outline"
          >
            Try Again
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Earnings Summary Cards */}
      <Card>
        <CardHeader>
          <CardTitle>Earnings & Payouts</CardTitle>
          <CardDescription>Track your income and payment history</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="p-4 border rounded-lg text-center bg-gradient-to-r from-green-50 to-green-100">
              <h3 className="font-semibold text-lg text-green-800">This Month</h3>
              <p className="text-3xl font-bold text-green-600">
                {formatCurrency(getThisMonthEarnings())}
              </p>
            </div>
            <div className="p-4 border rounded-lg text-center bg-gradient-to-r from-orange-50 to-orange-100">
              <h3 className="font-semibold text-lg text-orange-800">Pending</h3>
              <p className="text-3xl font-bold text-orange-600">
                {formatCurrency(earningsData.pendingAmount)}
              </p>
            </div>
            <div className="p-4 border rounded-lg text-center bg-gradient-to-r from-purple-50 to-purple-100">
              <h3 className="font-semibold text-lg text-purple-800">Total Earned</h3>
              <p className="text-3xl font-bold text-purple-600">
                {formatCurrency(earningsData.totalEarnings)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Transactions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Recent Transactions
          </CardTitle>
          <CardDescription>Your latest payment transactions</CardDescription>
        </CardHeader>
        <CardContent>
          {paymentHistory.length > 0 ? (
            <div className="space-y-4">
              {paymentHistory.slice(0, 5).map((transaction: any) => (
                <div key={transaction.bookingId} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h4 className="font-semibold text-gray-900">{transaction.eventName}</h4>
                      {getPaymentStatusBadge(transaction.paymentStatus)}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <span className="flex items-center gap-1">
                        <User className="h-4 w-4" />
                        {transaction.organizer?.name || 'Organizer'}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {formatDate(transaction.eventDate)}
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin className="h-4 w-4" />
                        {transaction.event?.venue?.name || 'Venue'}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-purple-600">
                      {formatCurrency(transaction.totalAmount)}
                    </p>
                    <p className="text-xs text-gray-500">
                      {transaction.transactions?.length || 0} transaction(s)
                    </p>
                  </div>
                </div>
              ))}
              
              {paymentHistory.length > 5 && (
                <div className="text-center pt-4">
                  <Button variant="outline" className="w-full">
                    View All Transactions
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-12">
              <DollarSign className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 text-lg">No transactions yet</p>
              <p className="text-gray-400 text-sm mt-2">
                Your payment transactions will appear here once bookings are completed
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Additional Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Payment Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Advance Payments</span>
                <span className="font-semibold text-green-600">{formatCurrency(earningsData.advanceReceived)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Full Payments</span>
                <span className="font-semibold text-blue-600">{formatCurrency(earningsData.fullPaymentReceived)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Pending Amount</span>
                <span className="font-semibold text-orange-600">{formatCurrency(earningsData.pendingAmount)}</span>
              </div>
              <hr className="my-3" />
              <div className="flex justify-between items-center font-bold">
                <span>Total Earnings</span>
                <span className="text-purple-600">{formatCurrency(earningsData.totalEarnings)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Booking Statistics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Total Bookings</span>
                <span className="font-semibold">{earningsData.totalBookings}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Completed Payments</span>
                <span className="font-semibold text-green-600">
                  {paymentHistory.filter((t: any) => t.paymentStatus === 'fully_paid').length}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Average Booking Value</span>
                <span className="font-semibold">
                  {earningsData.totalBookings > 0 
                    ? formatCurrency(Math.round(earningsData.totalEarnings / earningsData.totalBookings))
                    : formatCurrency(0)
                  }
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

const ProfileContent = ({ 
  user, 
  profile, 
  handleProfileUpdate,
  updatingProfile,
  profileUpdateMessage,
  profileUpdateError,
  handleCoverImageUpload,
  handleProfileImageUpload,
  uploadingCoverImage,
  uploadingProfileImage,
  fetchArtistProfile
}: any) => (
  <div className="space-y-6">
    {/* Artist Profile Header */}
    <Card>
      <div className="relative">
        <Image
          src={profile?.coverImage || profile?.gallery?.photos?.find((p: any) => p.isCoverImage)?.url || "/images/carausel1.jpg"}
          alt="Cover"
          width={800}
          height={300}
          className="w-full h-48 md:h-64 object-cover rounded-t-lg"
        />
        {/* <Button
          size="sm"
          variant="secondary"
          onClick={() => document.getElementById('cover-image-input-profile')?.click()}
          className="absolute top-4 right-4"
          disabled={uploadingCoverImage}
        >
          {uploadingCoverImage ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Camera className="h-4 w-4 mr-1" />
          )}
          {uploadingCoverImage ? 'Uploading...' : 'Change Cover'}
        </Button> */}
        <input
          id="cover-image-input-profile"
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleCoverImageUpload}
        />
      </div>
      <CardContent className="p-6">
        <div className="flex flex-col md:flex-row items-start md:items-center space-y-4 md:space-y-0 md:space-x-6">
          <div className="relative">
            <Avatar className="w-24 h-24 md:w-32 md:h-32">
              <AvatarImage
                src={profile?.profileImage || profile?.profilePic || profile?.gallery?.photos?.find((p: any) => p.isProfileImage)?.url || "/images/carausel1.jpg"}
                alt={user?.name || 'Profile'}
              />
              <AvatarFallback>{user?.name?.charAt(0)?.toUpperCase() || 'A'}</AvatarFallback>
            </Avatar>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => document.getElementById('profile-image-input-profile')?.click()}
              className="absolute -bottom-2 -right-2 h-8 w-8 rounded-full p-0"
              disabled={uploadingProfileImage}
            >
              {uploadingProfileImage ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Camera className="h-4 w-4" />
              )}
            </Button>
            <input
              id="profile-image-input-profile"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleProfileImageUpload}
            />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-2 gap-2">
              <h2 className="text-2xl md:text-3xl font-bold truncate">{user?.name || 'Artist Name'}</h2>
            </div>
            <div className="flex flex-wrap items-center gap-3 md:gap-4 text-sm md:text-base text-muted-foreground mb-3">
              {profile?.rating && typeof profile.rating === 'object' && 'average' in profile.rating && profile.rating.average > 0 && (
                <div className="flex items-center">
                  <Star className="h-4 w-4 md:h-5 md:w-5 mr-1 text-yellow-500 flex-shrink-0 fill-yellow-500" />
                  <span className="font-semibold">{profile.rating.average.toFixed(1)}</span>
                  <span className="ml-1 text-gray-500">({profile.rating.count || 0} reviews)</span>
                </div>
              )}
              <div className="flex items-center">
                <MapPin className="h-4 w-4 md:h-5 md:w-5 mr-1 flex-shrink-0 text-purple-600" />
                <span className="truncate font-medium">{profile?.city || profile?.location || 'Location not set'}</span>
              </div>
              <div className="flex items-center">
                <DollarSign className="h-4 w-4 md:h-5 md:w-5 mr-1 flex-shrink-0 text-green-600" />
                <span className="font-semibold">Starting from ₹{profile?.basePrice || 'Not set'}</span>
              </div>
            </div>
            <p className="text-sm md:text-base text-muted-foreground mb-3 break-words">{profile?.bio || 'No bio available'}</p>
            {(profile?.genres?.length > 0 || profile?.languages?.length > 0) && (
              <div className="flex flex-wrap gap-2 mb-3">
                {profile?.genres?.map((g: string) => (
                  <Badge key={g} variant="secondary" className="text-xs md:text-sm">
                    {g}
                  </Badge>
                ))}
                {profile?.languages?.map((l: string) => (
                  <Badge key={l} variant="outline" className="text-xs md:text-sm">
                    {l}
                  </Badge>
                ))}
              </div>
            )}
            {/* Additional Profile Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 pt-4 border-t">
              {user?.email && (
                <div>
                  <p className="text-xs text-gray-500 mb-1">Email</p>
                  <p className="text-sm font-medium">{user.email}</p>
                </div>
              )}
              {user?.phone && (
                <div>
                  <p className="text-xs text-gray-500 mb-1">Phone</p>
                  <p className="text-sm font-medium">{user.phone}</p>
                </div>
              )}
              {profile?.type && (
                <div>
                  <p className="text-xs text-gray-500 mb-1">Artist Type</p>
                  <p className="text-sm font-medium capitalize">{profile.type}</p>
                </div>
              )}
              {profile?.approvalStatus && (
                <div>
                  <p className="text-xs text-gray-500 mb-1">Account Status</p>
                  <Badge variant={profile.approvalStatus === 'approved' ? 'default' : 'secondary'}>
                    {profile.approvalStatus.charAt(0).toUpperCase() + profile.approvalStatus.slice(1)}
                  </Badge>
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>

    {/* Profile Settings Form */}
    <Card>
      <CardHeader>
        <CardTitle>Profile Settings</CardTitle>
        <CardDescription>
          Update your profile information
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
      {profileUpdateMessage && (
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertTitle className="text-green-800">Success</AlertTitle>
          <AlertDescription className="text-green-700">
            {profileUpdateMessage}
          </AlertDescription>
        </Alert>
      )}
      
      {profileUpdateError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{profileUpdateError}</AlertDescription>
        </Alert>
      )}
      
      <form onSubmit={handleProfileUpdate}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="name">Artist Name</Label>
            <Input id="name" name="name" defaultValue={user?.name} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="location">Location</Label>
            <Input id="location" name="location" defaultValue={profile?.location} />
          </div>
        </div>
        <div className="space-y-2 mt-4">
          <Label htmlFor="bio">Bio</Label>
          <Textarea id="bio" name="bio" defaultValue={profile?.bio} rows={4} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="basePrice">Base Price</Label>
            <Input id="basePrice" name="basePrice" defaultValue={profile?.basePrice?.toString()} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Phone</Label>
            <Input id="phone" name="phone" defaultValue={user?.phone} />
          </div>
        </div>
        <div className="space-y-4 mt-4">
          <Label>Social Links</Label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center space-x-2">
              <Instagram className="h-4 w-4" />
              <Input name="instagram" placeholder="Instagram URL" defaultValue={profile?.socialLinks?.instagram} />
            </div>
            <div className="flex items-center space-x-2">
              <Youtube className="h-4 w-4" />
              <Input name="youtube" placeholder="YouTube URL" defaultValue={profile?.socialLinks?.youtube} />
            </div>
            <div className="flex items-center space-x-2">
              <Facebook className="h-4 w-4" />
              <Input name="facebook" placeholder="Facebook URL" defaultValue={profile?.socialLinks?.facebook} />
            </div>
            <div className="flex items-center space-x-2">
              <Twitter className="h-4 w-4" />
              <Input name="twitter" placeholder="Twitter URL" defaultValue={profile?.socialLinks?.twitter} />
            </div>
            <div className="flex items-center space-x-2">
              <Music className="h-4 w-4" />
              <Input name="spotify" placeholder="Spotify URL" defaultValue={profile?.socialLinks?.spotify} />
            </div>
            <div className="flex items-center space-x-2">
              <Globe className="h-4 w-4" />
              <Input name="website" placeholder="Website URL" defaultValue={profile?.socialLinks?.website} />
            </div>
          </div>
        </div>
        <Button type="submit" className="mt-6" disabled={updatingProfile}>
          {updatingProfile ? 'Updating...' : 'Save Changes'}
        </Button>
      </form>
      </CardContent>
    </Card>
  </div>
);
