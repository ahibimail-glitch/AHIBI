"use client";

import { useState, useEffect } from "react";
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
  Music,
  Image as ImageIcon,
  LogOut,
  Facebook,
  Twitter,
  Globe,
  Phone,
  Mail,
  User,
  Users,
  Music2,
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Image from "next/image";
import Navbar from "@/app/Navbar";
import Footer from "@/app/Footer";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import GalleryManager from "@/components/artist/GalleryManager";
import AccoladesManager from "@/components/artist/AccoladesManager";
import TermsManager from "@/components/artist/TermsManager";
import AvailabilityCalendar from "@/components/artist/AvailabilityCalendar";
import KakiMarketingBanner from "@/components/KakiMarketingBanner";

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
  name?: string;
  stageName?: string;
  gender?: string;
  email?: string;
  phone?: string;
  emergencyContact?: string;
  city?: string;
  type: string;
  bio?: string;
  shortBio?: string;
  longBio?: string;
  genres: string[];
  artistCategories?: string[];
  languages: string[];
  basePrice?: number;
  location?: string;
  profilePic?: string;
  profileImage?: string;
  coverImage?: string;
  approvalStatus: 'pending' | 'approved' | 'rejected';
  rejectionReason?: string;
  performanceRegions?: string[];
  eventTypes?: string[];
  eventTypesOther?: string;
  audienceVibe?: string[];
  performanceDurations?: string[];
  performanceDurationOther?: string;
  performanceFormats?: string[];
  performanceFormatsOther?: string;
  feeRange?: {
    min?: number;
    max?: number;
  };
  socialLinks?: {
    instagram?: string;
    youtube?: string;
    spotify?: string;
    facebook?: string;
    twitter?: string;
    website?: string;
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

// --- Helper component for sidebar buttons ---
interface SidebarButtonProps {
  icon: React.ElementType;
  label: string;
  active: boolean;
  onClick?: () => void;
}

const SidebarButton = ({ icon: Icon, label, active, ...props }: SidebarButtonProps) => (
  <Button
    variant={active ? "secondary" : "ghost"}
    className="w-full justify-start"
    {...props}
  >
    <Icon className="mr-2 h-4 w-4" />
    {label}
  </Button>
);

export default function ArtistDashboard() {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<ArtistUser | null>(null);
  const [profile, setProfile] = useState<ArtistProfile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [activeView, setActiveView] = useState("bookings");
  const [formState, setFormState] = useState({
    gender: '',
    showEventTypesOther: false,
    showPerformanceDurationOther: false,
    showPerformanceFormatsOther: false,
  });
  const [uploadingImage, setUploadingImage] = useState<'profile' | 'cover' | null>(null);

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

  // Initialize form state when profile loads
  useEffect(() => {
    if (profile) {
      setFormState({
        gender: profile.gender || '',
        showEventTypesOther: profile.eventTypes?.includes('others') || false,
        showPerformanceDurationOther: profile.performanceDurations?.includes('other') || false,
        showPerformanceFormatsOther: profile.performanceFormats?.includes('other') || false,
      });
    }
  }, [profile]);

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
      if (data.data && data.data.artist) {
        const artistData = data.data.artist;
        // Extract profile and cover images from gallery if not directly set
        if (!artistData.profileImage && artistData.gallery?.photos) {
          const profilePhoto = artistData.gallery.photos.find((p: Photo) => p.isProfileImage);
          if (profilePhoto) {
            artistData.profileImage = profilePhoto.url;
            artistData.profilePic = profilePhoto.url;
          }
        }
        if (!artistData.coverImage && artistData.gallery?.photos) {
          const coverPhoto = artistData.gallery.photos.find((p: Photo) => p.isCoverImage);
          if (coverPhoto) {
            artistData.coverImage = coverPhoto.url;
          }
        }
        setProfile(artistData);
        // Also update user state if needed
        if (artistData.name || artistData.email) {
          setUser(prev => prev ? {
            ...prev,
            name: artistData.name || prev.name,
            email: artistData.email || prev.email,
            phone: artistData.phone || prev.phone,
          } : null);
        }
      }
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

  const handleImageUpload = async (file: File, type: 'profile' | 'cover') => {
    try {
      setUploadingImage(type);
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', 'artists');
      formData.append('documentType', 'image');

      const uploadResponse = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });

      if (!uploadResponse.ok) {
        throw new Error('Upload failed');
      }

      const uploadData = await uploadResponse.json();
      const imageUrl = uploadData.url;

      // Update profile with new image
      const token = localStorage.getItem('artist_token');
      if (!token) {
        setError('Not authenticated');
        return;
      }

      const updateData: any = {};
      if (type === 'profile') {
        updateData.profileImage = imageUrl;
        updateData.profilePic = imageUrl;
      } else {
        updateData.coverImage = imageUrl;
      }

      const response = await fetch('/api/artist/profile', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updateData)
      });

      if (response.ok) {
        const data = await response.json();
        if (data.data && data.data.artist) {
          setProfile(data.data.artist);
        }
        await fetchArtistProfile(token);
        setSuccessMessage(`${type === 'profile' ? 'Profile' : 'Cover'} image updated successfully!`);
        setTimeout(() => setSuccessMessage(null), 5000);
      } else {
        const errorData = await response.json();
        setError(errorData.message || `Failed to update ${type} image`);
      }
    } catch (error) {
      console.error(`Error uploading ${type} image:`, error);
      setError(`Error uploading ${type} image. Please try again.`);
    } finally {
      setUploadingImage(null);
    }
  };

  const handleProfileUpdate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    try {
      const token = localStorage.getItem('artist_token');
      if (!token) {
        setError('Not authenticated');
        return;
      }

      // Helper function to clean empty strings
      const cleanValue = (value: string | null): string | undefined => {
        return value && value.trim() !== '' ? value.trim() : undefined;
      };

      // Collect all form data and clean empty strings
      const updateData: any = {};
      
      const name = cleanValue(formData.get('name') as string);
      const stageName = cleanValue(formData.get('stageName') as string);
      const email = cleanValue(formData.get('email') as string);
      const phone = cleanValue(formData.get('phone') as string);
      const emergencyContact = cleanValue(formData.get('emergencyContact') as string);
      const city = cleanValue(formData.get('city') as string);
      const shortBio = cleanValue(formData.get('shortBio') as string);
      const longBio = cleanValue(formData.get('longBio') as string);
      
      if (name) updateData.name = name;
      if (stageName) updateData.stageName = stageName;
      if (email) updateData.email = email;
      if (phone) updateData.phone = phone;
      if (emergencyContact) updateData.emergencyContact = emergencyContact;
      if (city) updateData.city = city;
      if (shortBio) updateData.shortBio = shortBio;
      if (longBio) updateData.longBio = longBio;

      // Handle numeric fields
      const basePrice = formData.get('basePrice') as string;
      if (basePrice && basePrice.trim() !== '') {
        updateData.basePrice = parseFloat(basePrice);
      }

      const feeMin = formData.get('feeMin') as string;
      const feeMax = formData.get('feeMax') as string;
      if (feeMin || feeMax) {
        updateData.feeRange = {};
        if (feeMin && feeMin.trim() !== '') {
          updateData.feeRange.min = parseFloat(feeMin);
        }
        if (feeMax && feeMax.trim() !== '') {
          updateData.feeRange.max = parseFloat(feeMax);
        }
      }

      // Handle social links
      const socialLinks: any = {};
      const instagram = cleanValue(formData.get('instagram') as string);
      const youtube = cleanValue(formData.get('youtube') as string);
      const spotify = cleanValue(formData.get('spotify') as string);
      const facebook = cleanValue(formData.get('facebook') as string);
      const twitter = cleanValue(formData.get('twitter') as string);
      const website = cleanValue(formData.get('website') as string);
      
      if (instagram) socialLinks.instagram = instagram;
      if (youtube) socialLinks.youtube = youtube;
      if (spotify) socialLinks.spotify = spotify;
      if (facebook) socialLinks.facebook = facebook;
      if (twitter) socialLinks.twitter = twitter;
      if (website) socialLinks.website = website;
      
      if (Object.keys(socialLinks).length > 0) {
        updateData.socialLinks = socialLinks;
      }

      // Handle optional text fields
      const eventTypesOther = cleanValue(formData.get('eventTypesOther') as string);
      const performanceDurationOther = cleanValue(formData.get('performanceDurationOther') as string);
      const performanceFormatsOther = cleanValue(formData.get('performanceFormatsOther') as string);
      
      if (eventTypesOther) updateData.eventTypesOther = eventTypesOther;
      if (performanceDurationOther) updateData.performanceDurationOther = performanceDurationOther;
      if (performanceFormatsOther) updateData.performanceFormatsOther = performanceFormatsOther;

      // Handle arrays from checkboxes
      const performanceRegions = Array.from(formData.getAll('performanceRegions') as string[]);
      const eventTypes = Array.from(formData.getAll('eventTypes') as string[]);
      const audienceVibe = Array.from(formData.getAll('audienceVibe') as string[]);
      const performanceDurations = Array.from(formData.getAll('performanceDurations') as string[]);
      const performanceFormats = Array.from(formData.getAll('performanceFormats') as string[]);
      const artistCategories = Array.from(formData.getAll('artistCategories') as string[]);

      if (performanceRegions.length > 0) updateData.performanceRegions = performanceRegions;
      if (eventTypes.length > 0) updateData.eventTypes = eventTypes;
      if (audienceVibe.length > 0) updateData.audienceVibe = audienceVibe;
      if (performanceDurations.length > 0) updateData.performanceDurations = performanceDurations;
      if (performanceFormats.length > 0) updateData.performanceFormats = performanceFormats;
      if (artistCategories.length > 0) updateData.artistCategories = artistCategories;

      // Add gender from formState
      if (formState.gender) updateData.gender = formState.gender;

      console.log('Sending profile update:', updateData);

      const response = await fetch('/api/artist/profile', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updateData)
      });

      console.log('Profile update response status:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('Profile update response data:', data);
        // Update profile state with the response
        if (data.data && data.data.artist) {
          const artistData = data.data.artist;
          // Extract profile and cover images from gallery if not directly set
          if (!artistData.profileImage && artistData.gallery?.photos) {
            const profilePhoto = artistData.gallery.photos.find((p: Photo) => p.isProfileImage);
            if (profilePhoto) {
              artistData.profileImage = profilePhoto.url;
              artistData.profilePic = profilePhoto.url;
            }
          }
          if (!artistData.coverImage && artistData.gallery?.photos) {
            const coverPhoto = artistData.gallery.photos.find((p: Photo) => p.isCoverImage);
            if (coverPhoto) {
              artistData.coverImage = coverPhoto.url;
            }
          }
          setProfile(artistData);
          // Update user state if name or email changed
          if (artistData.name || artistData.email) {
            setUser(prev => prev ? {
              ...prev,
              name: artistData.name || prev.name,
              email: artistData.email || prev.email,
              phone: artistData.phone || prev.phone,
            } : null);
          }
        }
        // Refresh profile data to ensure we have the latest
        await fetchArtistProfile(token);
        setIsEditing(false);
        setError(null); // Clear any previous errors
        setSuccessMessage('Profile updated successfully!');
        // Clear success message after 5 seconds
        setTimeout(() => setSuccessMessage(null), 5000);
      } else {
        const errorData = await response.json();
        console.error('Profile update error:', errorData);
        setError(errorData.message || 'Failed to update profile');
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      setError('Error updating profile. Please try again.');
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
    switch (activeView) {
      case "bookings":
        return (
          <div className="space-y-6">
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
          </div>
        );
      case "calendar":
        return (
          <AvailabilityCalendar 
            onUpdate={() => {
              const token = localStorage.getItem('artist_token');
              if (token) fetchArtistProfile(token);
            }}
          />
        );
      case "gallery":
        return (
          <GalleryManager 
            photos={profile?.gallery?.photos || []}
            videos={profile?.gallery?.videos || []}
            onUpdate={() => {
              const token = localStorage.getItem('artist_token');
              if (token) fetchArtistProfile(token);
            }}
          />
        );
      case "accolades":
        return (
          <AccoladesManager 
            accolades={profile?.accolades || []}
            onUpdate={() => {
              const token = localStorage.getItem('artist_token');
              if (token) fetchArtistProfile(token);
            }}
          />
        );
      case "terms":
        return (
          <div className="space-y-6">
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
          </div>
        );
      case "earnings":
        return (
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
        );
      case "profile":
        return (
          <div className="space-y-6">
            {/* Artist Profile Header - Show when not editing */}
            {!isEditing && (
              <Card>
              <div className="relative">
                <Image
                  src={profile?.coverImage || profile?.gallery?.photos?.find(p => p.isCoverImage)?.url || "/images/carausel1.jpg"}
                  alt="Cover"
                  width={800}
                  height={300}
                  className="w-full h-48 md:h-64 object-cover rounded-t-lg"
                />
                <label className="absolute top-4 right-4">
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleImageUpload(file, 'cover');
                    }}
                    disabled={uploadingImage === 'cover'}
                  />
                  <Button
                    size="sm"
                    variant="secondary"
                    type="button"
                    disabled={uploadingImage === 'cover'}
                    asChild
                  >
                    <span>
                      <Camera className="h-4 w-4 mr-1" />
                      {uploadingImage === 'cover' ? 'Uploading...' : 'Change Cover'}
                    </span>
                  </Button>
                </label>
              </div>
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row items-start md:items-center space-y-4 md:space-y-0 md:space-x-6">
                  <div className="relative">
                    <Avatar className="w-24 h-24">
                      <AvatarImage
                        src={profile?.profilePic || profile?.profileImage || profile?.gallery?.photos?.find(p => p.isProfileImage)?.url || "/images/carausel1.jpg"}
                      />
                      <AvatarFallback>{user?.name?.charAt(0) || 'A'}</AvatarFallback>
                    </Avatar>
                    <label className="absolute -bottom-2 -right-2">
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleImageUpload(file, 'profile');
                        }}
                        disabled={uploadingImage === 'profile'}
                      />
                      <Button
                        size="sm"
                        variant="secondary"
                        type="button"
                        className="h-8 w-8 rounded-full p-0"
                        disabled={uploadingImage === 'profile'}
                        asChild
                      >
                        <span>
                          <Camera className="h-4 w-4" />
                        </span>
                      </Button>
                    </label>
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
                        {profile?.city || 'Location not set'}
                      </div>
                      <div className="flex items-center">
                        <DollarSign className="h-4 w-4 mr-1" />
                        Starting from ₹{profile?.feeRange?.min || 'Not set'}
                      </div>
                    </div>
                    <p className="text-muted-foreground mb-3">{profile?.shortBio || 'No bio available'}</p>
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
            )}

            {/* Profile Form - Show when editing */}
            {isEditing && (
            <Card>
              <CardHeader>
                <CardTitle>Profile Settings</CardTitle>
                <CardDescription>
                  Update your complete profile information
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <form onSubmit={handleProfileUpdate} className="space-y-6">
                  {/* Personal Information */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold border-b pb-2">Personal Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="name">Full Name *</Label>
                        <Input id="name" name="name" defaultValue={user?.name || profile?.name} required />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="stageName">Stage Name</Label>
                        <Input id="stageName" name="stageName" defaultValue={profile?.stageName} placeholder="Your stage/performance name" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="gender">Gender</Label>
                        <Select 
                          value={formState.gender || profile?.gender || ''} 
                          onValueChange={(value) => setFormState({...formState, gender: value})}
                        >
                          <SelectTrigger id="gender">
                            <SelectValue placeholder="Select gender" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="male">Male</SelectItem>
                            <SelectItem value="female">Female</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                            <SelectItem value="prefer-not-to-say">Prefer not to say</SelectItem>
                          </SelectContent>
                        </Select>
                        <input type="hidden" name="gender" value={formState.gender || profile?.gender || ''} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="city">City *</Label>
                        <Input id="city" name="city" defaultValue={profile?.city} required />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email">Email Address *</Label>
                        <Input id="email" name="email" type="email" defaultValue={user?.email || profile?.email} required />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="phone">Phone Number *</Label>
                        <Input id="phone" name="phone" type="tel" defaultValue={user?.phone || profile?.phone} required />
                      </div>
                      <div className="space-y-2 md:col-span-2">
                        <Label htmlFor="emergencyContact">Emergency Contact</Label>
                        <Input id="emergencyContact" name="emergencyContact" type="tel" defaultValue={profile?.emergencyContact || profile?.cancellationPolicy?.emergencyContact} placeholder="Emergency contact number" />
                      </div>
                    </div>
                  </div>

                  {/* Performance Regions */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold border-b pb-2">Where can you perform?</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {['within-state', 'northeast', 'pan-india', 'international'].map((region) => (
                        <div key={region} className="flex items-center space-x-2">
                          <Checkbox
                            id={`region-${region}`}
                            name="performanceRegions"
                            value={region}
                            defaultChecked={profile?.performanceRegions?.includes(region)}
                          />
                          <Label htmlFor={`region-${region}`} className="font-normal cursor-pointer">
                            {region === 'within-state' ? 'Within State' :
                             region === 'northeast' ? 'Anywhere in Northeast' :
                             region === 'pan-india' ? 'Pan-India' :
                             'International'}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Artist Category */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold border-b pb-2">Artist Category</h3>
                    <div className="space-y-2">
                      <Label>Select your categories (can select multiple)</Label>
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                        {['Singer', 'Performer', 'Musician', 'DJ', 'Comedian', 'Dancer', 'Band','Orchestra', 'Magician', 'Speaker', 'Instrumentalist', 'MC/Host', 'Other'].map((category) => (
                          <div key={category} className="flex items-center space-x-2">
                            <Checkbox
                              id={`category-${category}`}
                              name="artistCategories"
                              value={category.toLowerCase()}
                              defaultChecked={profile?.artistCategories?.includes(category.toLowerCase()) || profile?.type?.toLowerCase() === category.toLowerCase()}
                            />
                            <Label htmlFor={`category-${category}`} className="font-normal cursor-pointer text-sm">
                              {category}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Bio Sections */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold border-b pb-2">Bio</h3>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="shortBio">Short Bio (Max 200 characters)</Label>
                        <Textarea
                          id="shortBio"
                          name="shortBio"
                          rows={3}
                          maxLength={200}
                          defaultValue={profile?.shortBio || profile?.bio}
                          placeholder="A brief description about yourself"
                        />
                        <p className="text-xs text-muted-foreground">Used for previews and listings</p>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="longBio">Longer Bio (Max 2000 characters)</Label>
                        <Textarea
                          id="longBio"
                          name="longBio"
                          rows={6}
                          maxLength={2000}
                          defaultValue={profile?.longBio || profile?.bio}
                          placeholder="A detailed description about your background, experience, and style"
                        />
                        <p className="text-xs text-muted-foreground">Full profile description</p>
                      </div>
                    </div>
                  </div>

                  {/* Type of Events */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold border-b pb-2">Type of Events You Do</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {[
                        { value: 'concerts', label: 'Concerts' },
                        { value: 'festivals', label: 'Festivals' },
                        { value: 'private-parties-weddings', label: 'Private Parties / Weddings' },
                        { value: 'cafes-restaurants', label: 'Cafés / Restaurants' },
                        { value: 'corporate-events', label: 'Corporate Events' },
                        { value: 'church-community-events', label: 'Church / Community Events' },
                        { value: 'college-events', label: 'College Events' },
                        { value: 'cultural', label: 'Cultural' },
                        { value: 'others', label: 'Others' },
                      ].map((eventType) => (
                        <div key={eventType.value} className="flex items-center space-x-2">
                          <Checkbox
                            id={`event-${eventType.value}`}
                            name="eventTypes"
                            value={eventType.value}
                            defaultChecked={profile?.eventTypes?.includes(eventType.value)}
                            onCheckedChange={(checked) => {
                              if (eventType.value === 'others' && checked) {
                                setFormState({...formState, showEventTypesOther: true});
                              } else if (eventType.value === 'others' && !checked) {
                                setFormState({...formState, showEventTypesOther: false});
                              }
                            }}
                          />
                          <Label htmlFor={`event-${eventType.value}`} className="font-normal cursor-pointer">
                            {eventType.label}
                          </Label>
                        </div>
                      ))}
                    </div>
                    {(formState.showEventTypesOther || profile?.eventTypes?.includes('others')) && (
                      <div className="space-y-2 mt-2">
                        <Label htmlFor="eventTypesOther">Please Specify Other Event Types</Label>
                        <Input id="eventTypesOther" name="eventTypesOther" defaultValue={profile?.eventTypesOther} placeholder="Specify other event types" />
                      </div>
                    )}
                  </div>

                  {/* Audience Vibe */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold border-b pb-2">Audience Vibe</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {[
                        { value: 'family-friendly', label: 'Family-friendly' },
                        { value: 'corporate-clean', label: 'Corporate clean' },
                        { value: 'party-nightlife', label: 'Party / Nightlife' },
                        { value: 'youth-campus-energy', label: 'Youth / Campus energy' },
                        { value: 'cultural-traditional', label: 'Cultural & traditional' },
                        { value: 'luxury-premium-events', label: 'Luxury / Premium events' },
                      ].map((vibe) => (
                        <div key={vibe.value} className="flex items-center space-x-2">
                          <Checkbox
                            id={`vibe-${vibe.value}`}
                            name="audienceVibe"
                            value={vibe.value}
                            defaultChecked={profile?.audienceVibe?.includes(vibe.value)}
                          />
                          <Label htmlFor={`vibe-${vibe.value}`} className="font-normal cursor-pointer">
                            {vibe.label}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Performance Duration */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold border-b pb-2">Performance Duration Options</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {[
                        { value: '20-mins', label: '20 Mins' },
                        { value: '30-mins', label: '30 Mins' },
                        { value: '45-mins', label: '45 Mins' },
                        { value: '1-hour', label: '1 Hour' },
                        { value: '2-hours', label: '2 Hours' },
                        { value: '3-hours', label: '3 Hours' },
                        { value: 'full-day', label: 'Full Day' },
                        { value: 'other', label: 'Other' },
                      ].map((duration) => (
                        <div key={duration.value} className="flex items-center space-x-2">
                          <Checkbox
                            id={`duration-${duration.value}`}
                            name="performanceDurations"
                            value={duration.value}
                            defaultChecked={profile?.performanceDurations?.includes(duration.value)}
                            onCheckedChange={(checked) => {
                              if (duration.value === 'other' && checked) {
                                setFormState({...formState, showPerformanceDurationOther: true});
                              } else if (duration.value === 'other' && !checked) {
                                setFormState({...formState, showPerformanceDurationOther: false});
                              }
                            }}
                          />
                          <Label htmlFor={`duration-${duration.value}`} className="font-normal cursor-pointer text-sm">
                            {duration.label}
                          </Label>
                        </div>
                      ))}
                    </div>
                    {(formState.showPerformanceDurationOther || profile?.performanceDurations?.includes('other')) && (
                      <div className="space-y-2 mt-2">
                        <Label htmlFor="performanceDurationOther">Specify Other Duration</Label>
                        <Input id="performanceDurationOther" name="performanceDurationOther" defaultValue={profile?.performanceDurationOther} placeholder="e.g., 1.5 hours, Custom duration" />
                      </div>
                    )}
                  </div>

                  {/* Performance Formats */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold border-b pb-2">Performance Formats / Packages</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {[
                        { value: 'solo', label: 'Solo' },
                        { value: 'group-band', label: 'Group / Band' },
                        { value: 'duo', label: 'Duo' },
                        { value: 'trio', label: 'Trio' },
                        { value: 'dj-set', label: 'DJ set' },
                        { value: 'dj-live-percussion', label: 'DJ + Live percussion' },
                        { value: 'host-dj', label: 'Host + DJ' },
                        { value: 'with-dancers', label: 'With dancers' },
                        { value: 'other', label: 'Other' },
                      ].map((format) => (
                        <div key={format.value} className="flex items-center space-x-2">
                          <Checkbox
                            id={`format-${format.value}`}
                            name="performanceFormats"
                            value={format.value}
                            defaultChecked={profile?.performanceFormats?.includes(format.value)}
                            onCheckedChange={(checked) => {
                              if (format.value === 'other' && checked) {
                                setFormState({...formState, showPerformanceFormatsOther: true});
                              } else if (format.value === 'other' && !checked) {
                                setFormState({...formState, showPerformanceFormatsOther: false});
                              }
                            }}
                          />
                          <Label htmlFor={`format-${format.value}`} className="font-normal cursor-pointer">
                            {format.label}
                          </Label>
                        </div>
                      ))}
                    </div>
                    {(formState.showPerformanceFormatsOther || profile?.performanceFormats?.includes('other')) && (
                      <div className="space-y-2 mt-2">
                        <Label htmlFor="performanceFormatsOther">Specify Other Format</Label>
                        <Input id="performanceFormatsOther" name="performanceFormatsOther" defaultValue={profile?.performanceFormatsOther} placeholder="Specify other performance format" />
                      </div>
                    )}
                  </div>

                  {/* Fee Range */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold border-b pb-2">Typical Fee Range</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="feeMin">Minimum Fee (₹)</Label>
                        <Input id="feeMin" name="feeMin" type="number" defaultValue={profile?.feeRange?.min?.toString() || profile?.basePrice?.toString()} placeholder="Minimum fee" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="feeMax">Maximum Fee (₹)</Label>
                        <Input id="feeMax" name="feeMax" type="number" defaultValue={profile?.feeRange?.max?.toString()} placeholder="Maximum fee" />
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">Provide a range for your typical performance fees</p>
                  </div>

                  {/* Social Links */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold border-b pb-2">Social Links</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="instagram" className="flex items-center gap-2">
                          <Instagram className="h-4 w-4" />
                          Instagram
                        </Label>
                        <Input id="instagram" name="instagram" type="url" defaultValue={profile?.socialLinks?.instagram} placeholder="https://instagram.com/yourhandle" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="youtube" className="flex items-center gap-2">
                          <Youtube className="h-4 w-4" />
                          YouTube
                        </Label>
                        <Input id="youtube" name="youtube" type="url" defaultValue={profile?.socialLinks?.youtube} placeholder="https://youtube.com/yourchannel" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="spotify" className="flex items-center gap-2">
                          <Music2 className="h-4 w-4" />
                          Spotify
                        </Label>
                        <Input id="spotify" name="spotify" type="url" defaultValue={profile?.socialLinks?.spotify} placeholder="https://open.spotify.com/artist/..." />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="facebook" className="flex items-center gap-2">
                          <Facebook className="h-4 w-4" />
                          Facebook
                        </Label>
                        <Input id="facebook" name="facebook" type="url" defaultValue={profile?.socialLinks?.facebook} placeholder="https://facebook.com/yourpage" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="twitter" className="flex items-center gap-2">
                          <Twitter className="h-4 w-4" />
                          Twitter
                        </Label>
                        <Input id="twitter" name="twitter" type="url" defaultValue={profile?.socialLinks?.twitter} placeholder="https://twitter.com/yourhandle" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="website" className="flex items-center gap-2">
                          <Globe className="h-4 w-4" />
                          Website
                        </Label>
                        <Input id="website" name="website" type="url" defaultValue={profile?.socialLinks?.website} placeholder="https://yourwebsite.com" />
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end gap-4 pt-4 border-t">
                    <Button type="button" variant="outline" onClick={() => setIsEditing(false)}>
                      Cancel
                    </Button>
                    <Button type="submit">
                      Save Changes
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
            )}

            {/* View Mode - Show profile info when not editing */}
            {!isEditing && (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Profile Information</CardTitle>
                      <CardDescription>
                        View your profile details
                      </CardDescription>
                    </div>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setIsEditing(true);
                        setSuccessMessage(null);
                        setError(null);
                      }}
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Edit Profile
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  {successMessage && (
                    <Alert className="bg-green-50 border-green-200">
                      <AlertCircle className="h-4 w-4 text-green-600" />
                      <AlertDescription className="text-green-800">{successMessage}</AlertDescription>
                    </Alert>
                  )}
                  
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold border-b pb-2">Personal Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label className="text-muted-foreground">Full Name</Label>
                        <p className="font-medium">{user?.name || profile?.name || 'Not set'}</p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">Stage Name</Label>
                        <p className="font-medium">{profile?.stageName || 'Not set'}</p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">Gender</Label>
                        <p className="font-medium capitalize">{profile?.gender || 'Not set'}</p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">City</Label>
                        <p className="font-medium">{profile?.city || 'Not set'}</p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">Email</Label>
                        <p className="font-medium">{user?.email || profile?.email || 'Not set'}</p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">Phone</Label>
                        <p className="font-medium">{user?.phone || profile?.phone || 'Not set'}</p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">Emergency Contact</Label>
                        <p className="font-medium">{profile?.emergencyContact || 'Not set'}</p>
                      </div>
                    </div>
                  </div>

                  {profile?.shortBio && (
                    <div className="space-y-2">
                      <h3 className="text-lg font-semibold border-b pb-2">Short Bio</h3>
                      <p className="text-sm">{profile.shortBio}</p>
                    </div>
                  )}
                  
                  {profile?.longBio && (
                    <div className="space-y-2">
                      <h3 className="text-lg font-semibold border-b pb-2">Long Bio</h3>
                      <p className="text-sm whitespace-pre-wrap">{profile.longBio}</p>
                    </div>
                  )}

                  {profile?.performanceRegions && profile.performanceRegions.length > 0 && (
                    <div className="space-y-2">
                      <h3 className="text-lg font-semibold border-b pb-2">Performance Regions</h3>
                      <div className="flex flex-wrap gap-2">
                        {profile.performanceRegions.map((region) => (
                          <Badge key={region} variant="secondary">
                            {region === 'within-state' ? 'Within State' :
                             region === 'northeast' ? 'Northeast' :
                             region === 'pan-india' ? 'Pan-India' :
                             'International'}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {profile?.artistCategories && profile.artistCategories.length > 0 && (
                    <div className="space-y-2">
                      <h3 className="text-lg font-semibold border-b pb-2">Artist Categories</h3>
                      <div className="flex flex-wrap gap-2">
                        {profile.artistCategories.map((cat) => (
                          <Badge key={cat} variant="outline">{cat}</Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {profile?.eventTypes && profile.eventTypes.length > 0 && (
                    <div className="space-y-2">
                      <h3 className="text-lg font-semibold border-b pb-2">Event Types</h3>
                      <div className="flex flex-wrap gap-2">
                        {profile.eventTypes.map((type) => (
                          <Badge key={type} variant="secondary">{type.replace(/-/g, ' ')}</Badge>
                        ))}
                      </div>
                      {profile.eventTypesOther && (
                        <p className="text-sm text-muted-foreground mt-2">Other: {profile.eventTypesOther}</p>
                      )}
                    </div>
                  )}

                  {profile?.audienceVibe && profile.audienceVibe.length > 0 && (
                    <div className="space-y-2">
                      <h3 className="text-lg font-semibold border-b pb-2">Audience Vibe</h3>
                      <div className="flex flex-wrap gap-2">
                        {profile.audienceVibe.map((vibe) => (
                          <Badge key={vibe} variant="outline">{vibe.replace(/-/g, ' ')}</Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {profile?.performanceDurations && profile.performanceDurations.length > 0 && (
                    <div className="space-y-2">
                      <h3 className="text-lg font-semibold border-b pb-2">Performance Durations</h3>
                      <div className="flex flex-wrap gap-2">
                        {profile.performanceDurations.map((duration) => (
                          <Badge key={duration} variant="secondary">{duration.replace(/-/g, ' ')}</Badge>
                        ))}
                      </div>
                      {profile.performanceDurationOther && (
                        <p className="text-sm text-muted-foreground mt-2">Other: {profile.performanceDurationOther}</p>
                      )}
                    </div>
                  )}

                  {profile?.performanceFormats && profile.performanceFormats.length > 0 && (
                    <div className="space-y-2">
                      <h3 className="text-lg font-semibold border-b pb-2">Performance Formats</h3>
                      <div className="flex flex-wrap gap-2">
                        {profile.performanceFormats.map((format) => (
                          <Badge key={format} variant="outline">{format.replace(/-/g, ' ')}</Badge>
                        ))}
                      </div>
                      {profile.performanceFormatsOther && (
                        <p className="text-sm text-muted-foreground mt-2">Other: {profile.performanceFormatsOther}</p>
                      )}
                    </div>
                  )}

                  <div className="space-y-2">
                    <h3 className="text-lg font-semibold border-b pb-2">Fee Range</h3>
                    <p className="font-medium">
                      {profile?.feeRange?.min && profile?.feeRange?.max 
                        ? `₹${profile.feeRange.min.toLocaleString()} - ₹${profile.feeRange.max.toLocaleString()}`
                        : profile?.basePrice 
                        ? `₹${profile.basePrice.toLocaleString()}`
                        : 'Not set'}
                    </p>
                  </div>

                  {profile?.socialLinks && Object.values(profile.socialLinks).some(link => link) && (
                    <div className="space-y-2">
                      <h3 className="text-lg font-semibold border-b pb-2">Social Links</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {profile.socialLinks.instagram && (
                          <div className="flex items-center gap-2">
                            <Instagram className="h-4 w-4" />
                            <a href={profile.socialLinks.instagram} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-sm">
                              Instagram
                            </a>
                          </div>
                        )}
                        {profile.socialLinks.youtube && (
                          <div className="flex items-center gap-2">
                            <Youtube className="h-4 w-4" />
                            <a href={profile.socialLinks.youtube} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-sm">
                              YouTube
                            </a>
                          </div>
                        )}
                        {profile.socialLinks.spotify && (
                          <div className="flex items-center gap-2">
                            <Music2 className="h-4 w-4" />
                            <a href={profile.socialLinks.spotify} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-sm">
                              Spotify
                            </a>
                          </div>
                        )}
                        {profile.socialLinks.facebook && (
                          <div className="flex items-center gap-2">
                            <Facebook className="h-4 w-4" />
                            <a href={profile.socialLinks.facebook} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-sm">
                              Facebook
                            </a>
                          </div>
                        )}
                        {profile.socialLinks.twitter && (
                          <div className="flex items-center gap-2">
                            <Twitter className="h-4 w-4" />
                            <a href={profile.socialLinks.twitter} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-sm">
                              Twitter
                            </a>
                          </div>
                        )}
                        {profile.socialLinks.website && (
                          <div className="flex items-center gap-2">
                            <Globe className="h-4 w-4" />
                            <a href={profile.socialLinks.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-sm">
                              Website
                            </a>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        );
      default:
        return (
          <div className="space-y-6">
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
          </div>
        );
    }
  };

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-pink-400 via-white to-purple-400">
      {/* --- Sidebar --- */}
      <aside className="w-64 bg-white/80 backdrop-blur-sm border-r border-gray-200 fixed h-full flex flex-col p-4 shadow-sm z-10 overflow-y-auto">
        <div className="flex items-center space-x-3 mb-6 px-2">
          <div className="w-10 h-10 bg-gradient-to-br from-pink-600 to-purple-600 rounded-xl flex items-center justify-center">
            <Music className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900">Ahibi Artist</h2>
            <p className="text-xs text-gray-600">Artist Dashboard</p>
          </div>
        </div>

        <nav className="flex flex-col space-y-2">
          <SidebarButton 
            icon={Calendar} 
            label="Bookings" 
            active={activeView === "bookings"} 
            onClick={() => setActiveView("bookings")} 
          />
          <SidebarButton 
            icon={Calendar} 
            label="Calendar" 
            active={activeView === "calendar"} 
            onClick={() => setActiveView("calendar")} 
          />
          <SidebarButton 
            icon={ImageIcon} 
            label="Gallery" 
            active={activeView === "gallery"} 
            onClick={() => setActiveView("gallery")} 
          />
          <SidebarButton 
            icon={Award} 
            label="Accolades" 
            active={activeView === "accolades"} 
            onClick={() => setActiveView("accolades")} 
          />
          <SidebarButton 
            icon={FileText} 
            label="Terms" 
            active={activeView === "terms"} 
            onClick={() => setActiveView("terms")} 
          />
          <SidebarButton 
            icon={DollarSign} 
            label="Earnings" 
            active={activeView === "earnings"} 
            onClick={() => setActiveView("earnings")} 
          />
          <SidebarButton 
            icon={Edit} 
            label="Profile" 
            active={activeView === "profile"} 
            onClick={() => setActiveView("profile")} 
          />
        </nav>

        <div className="mt-auto">
          <Card className="bg-pink-50 border-pink-200">
            <CardContent className="pt-6">
              <h4 className="font-bold text-pink-800">Need Help?</h4>
              <p className="text-xs text-pink-700 mt-1">Check our documentation or contact support.</p>
              <Button size="sm" className="w-full mt-3 bg-gradient-to-r from-pink-600 to-purple-600 hover:opacity-90">
                Get Support
              </Button>
            </CardContent>
          </Card>
          <Button
            variant="outline"
            size="sm"
            className="w-full mt-3"
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </Button>
        </div>
      </aside>

      {/* --- Main Content --- */}
      <main className="flex-1 ml-64 bg-gradient-to-br from-pink-50 to-purple-50">
        <div className="p-8">
          {/* Kaki Marketing Banner */}
          <div className="mb-6">
            <KakiMarketingBanner platform="artist" />
          </div>
          {renderContent()}
        </div>
      </main>
    </div>
  );
}
