"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { 
  Star, MapPin, Phone, Mail, Instagram, Youtube, 
  Calendar, Clock, Award, Play, Image as ImageIcon,
  Music, Users, DollarSign, CheckCircle, XCircle
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import Image from "next/image";
import Navbar from "@/app/Navbar";
import Footer from "@/app/Footer";
import PublicBookingCalendar from "@/components/artist/PublicBookingCalendar";

interface Artist {
  _id: string;
  name: string;
  email: string;
  phone: string;
  city: string;
  bio: string;
  genres: string[];
  languages: string[];
  type: string;
  basePrice: number;
  profilePic?: string;
  gallery?: {
    photos: Array<{
      url: string;
      caption: string;
      isProfileImage: boolean;
      isCoverImage: boolean;
    }>;
    videos: Array<{
      url: string;
      thumbnail: string;
      caption: string;
      platform: string;
    }>;
  };
  accolades: Array<{
    title: string;
    description: string;
    year: number;
    organization: string;
    certificate?: string;
  }>;
  socialLinks?: {
    instagram?: string;
    youtube?: string;
    spotify?: string;
    facebook?: string;
    twitter?: string;
    website?: string;
  };
  rating?: {
    average: number;
    count: number;
  };
  totalBookings?: number;
  totalEarnings?: number;
}

export default function PublicArtistProfile() {
  const params = useParams();
  const artistId = params.artistId as string;
  const [artist, setArtist] = useState<Artist | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isOrganizerLoggedIn, setIsOrganizerLoggedIn] = useState(false);
  const [showBookingDialog, setShowBookingDialog] = useState(false);

  useEffect(() => {
    fetchArtistProfile();
    checkOrganizerAuth();
  }, [artistId]);

  const fetchArtistProfile = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/artist/public/${artistId}`);
      
      if (!response.ok) {
        throw new Error('Artist not found');
      }

      const data = await response.json();
      setArtist(data.data.artist);
    } catch (error) {
      console.error('Error fetching artist profile:', error);
      setError('Artist not found or unavailable');
    } finally {
      setLoading(false);
    }
  };

  const checkOrganizerAuth = () => {
    const token = localStorage.getItem('organizer_token');
    setIsOrganizerLoggedIn(!!token);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-400 via-white to-purple-400 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading artist profile...</p>
        </div>
      </div>
    );
  }

  if (error || !artist) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-16 text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Artist Not Found</h1>
          <p className="text-gray-600 mb-8">{error}</p>
          <Button onClick={() => window.history.back()}>Go Back</Button>
        </div>
        <Footer />
      </div>
    );
  }

  const coverImage = artist.gallery?.photos?.find(photo => photo.isCoverImage)?.url || "/images/carausel1.jpg";
  const profileImage = artist.gallery?.photos?.find(photo => photo.isProfileImage)?.url || artist.profilePic;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      {/* Hero Section */}
      <div className="relative">
        <div className="h-64 md:h-80 bg-gradient-to-r from-pink-500 to-purple-600 relative overflow-hidden">
          <Image
            src={coverImage}
            alt="Cover"
            fill
            className="object-cover opacity-50"
          />
          <div className="absolute inset-0 bg-black bg-opacity-40" />
        </div>
        
        <div className="container mx-auto px-4 relative -mt-16">
          <div className="flex flex-col md:flex-row items-start md:items-end space-y-4 md:space-y-0 md:space-x-6">
            <Avatar className="w-32 h-32 border-4 border-white shadow-lg">
              <AvatarImage src={profileImage} />
              <AvatarFallback className="text-2xl">{artist.name.charAt(0)}</AvatarFallback>
            </Avatar>
            
            <div className="flex-1 text-white md:text-gray-900 md:bg-white md:p-6 md:rounded-lg md:shadow-lg">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4">
                <div>
                  <h1 className="text-3xl font-bold mb-2">{artist.name}</h1>
                  <p className="text-lg opacity-90 md:opacity-70 mb-2">{artist.type}</p>
                  <div className="flex items-center space-x-4 text-sm">
                    <span className="flex items-center">
                      <MapPin className="h-4 w-4 mr-1" />
                      {artist.city}
                    </span>
                    {artist.rating && (
                      <span className="flex items-center">
                        <Star className="h-4 w-4 mr-1 text-yellow-500 fill-current" />
                        {artist.rating.average} ({artist.rating.count} reviews)
                      </span>
                    )}
                    {artist.totalBookings && (
                      <span className="flex items-center">
                        <Users className="h-4 w-4 mr-1" />
                        {artist.totalBookings} bookings
                      </span>
                    )}
                  </div>
                </div>
                
                <div className="mt-4 md:mt-0 flex flex-col items-start md:items-end space-y-2">
                  <div className="text-2xl font-bold text-green-400 md:text-green-600">
                    Starting from ₹{artist.basePrice}
                  </div>
                  {isOrganizerLoggedIn && (
                    <Dialog open={showBookingDialog} onOpenChange={setShowBookingDialog}>
                      <DialogTrigger asChild>
                        <Button size="lg" className="bg-pink-600 hover:bg-pink-700">
                          <Calendar className="h-4 w-4 mr-2" />
                          Book Now
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle>Book {artist.name}</DialogTitle>
                          <DialogDescription>
                            Select a date and time to book this artist for your event.
                          </DialogDescription>
                        </DialogHeader>
                        <PublicBookingCalendar artistId={artist._id} artist={artist} />
                      </DialogContent>
                    </Dialog>
                  )}
                  {!isOrganizerLoggedIn && (
                    <Button size="lg" onClick={() => window.location.href = '/organizer/auth/login'}>
                      Login to Book
                    </Button>
                  )}
                </div>
              </div>
              
              <div className="flex flex-wrap gap-2">
                {artist.genres.map((genre) => (
                  <Badge key={genre} variant="secondary" className="bg-pink-100 text-pink-800">
                    {genre}
                  </Badge>
                ))}
                {artist.languages.map((lang) => (
                  <Badge key={lang} variant="outline" className="border-pink-300 text-pink-700">
                    {lang}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        <Tabs defaultValue="about" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="about">About</TabsTrigger>
            <TabsTrigger value="gallery">Gallery</TabsTrigger>
            <TabsTrigger value="accolades">Accolades</TabsTrigger>
            <TabsTrigger value="contact">Contact</TabsTrigger>
            {isOrganizerLoggedIn && <TabsTrigger value="booking">Booking</TabsTrigger>}
          </TabsList>

          <TabsContent value="about">
            <Card>
              <CardHeader>
                <CardTitle>About {artist.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700 leading-relaxed mb-6">
                  {artist.bio || 'No biography available.'}
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <h3 className="font-semibold mb-2">Specialization</h3>
                    <p className="text-gray-600">{artist.type}</p>
                  </div>
                  <div>
                    <h3 className="font-semibold mb-2">Base Price</h3>
                    <p className="text-green-600 font-medium">₹{artist.basePrice}</p>
                  </div>
                  <div>
                    <h3 className="font-semibold mb-2">Location</h3>
                    <p className="text-gray-600">{artist.city}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="gallery">
            <div className="space-y-6">
              {/* Photos */}
              {artist.gallery?.photos && artist.gallery.photos.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <ImageIcon className="h-5 w-5 mr-2" />
                      Photos
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                      {artist.gallery.photos.map((photo, index) => (
                        <div key={index} className="relative aspect-square rounded-lg overflow-hidden">
                          <Image
                            src={photo.url}
                            alt={photo.caption || `Photo ${index + 1}`}
                            fill
                            className="object-cover hover:scale-105 transition-transform cursor-pointer"
                          />
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Videos */}
              {artist.gallery?.videos && artist.gallery.videos.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Play className="h-5 w-5 mr-2" />
                      Videos
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {artist.gallery.videos.map((video, index) => (
                        <div key={index} className="space-y-2">
                          <div className="relative aspect-video rounded-lg overflow-hidden">
                            <Image
                              src={video.thumbnail}
                              alt={video.caption || `Video ${index + 1}`}
                              fill
                              className="object-cover"
                            />
                            <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30">
                              <Play className="h-12 w-12 text-white" />
                            </div>
                          </div>
                          {video.caption && (
                            <p className="text-sm text-gray-600">{video.caption}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="accolades">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Award className="h-5 w-5 mr-2" />
                  Awards & Recognition
                </CardTitle>
              </CardHeader>
              <CardContent>
                {artist.accolades && artist.accolades.length > 0 ? (
                  <div className="space-y-4">
                    {artist.accolades.map((accolade, index) => (
                      <div key={index} className="border-l-4 border-pink-500 pl-4">
                        <h3 className="font-semibold">{accolade.title}</h3>
                        <p className="text-gray-600 text-sm">{accolade.organization} • {accolade.year}</p>
                        {accolade.description && (
                          <p className="text-gray-700 mt-1">{accolade.description}</p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500">No accolades listed yet.</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="contact">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Contact Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <Phone className="h-5 w-5 text-gray-500" />
                    <span>{artist.phone}</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Mail className="h-5 w-5 text-gray-500" />
                    <span>{artist.email}</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <MapPin className="h-5 w-5 text-gray-500" />
                    <span>{artist.city}</span>
                  </div>
                </CardContent>
              </Card>

              {artist.socialLinks && (
                <Card>
                  <CardHeader>
                    <CardTitle>Social Media</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {artist.socialLinks.instagram && (
                      <a 
                        href={artist.socialLinks.instagram} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center space-x-3 text-pink-600 hover:text-pink-700"
                      >
                        <Instagram className="h-5 w-5" />
                        <span>Instagram</span>
                      </a>
                    )}
                    {artist.socialLinks.youtube && (
                      <a 
                        href={artist.socialLinks.youtube} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center space-x-3 text-red-600 hover:text-red-700"
                      >
                        <Youtube className="h-5 w-5" />
                        <span>YouTube</span>
                      </a>
                    )}
                    {artist.socialLinks.website && (
                      <a 
                        href={artist.socialLinks.website} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center space-x-3 text-blue-600 hover:text-blue-700"
                      >
                        <Music className="h-5 w-5" />
                        <span>Website</span>
                      </a>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {isOrganizerLoggedIn && (
            <TabsContent value="booking">
              <Card>
                <CardHeader>
                  <CardTitle>Book {artist.name}</CardTitle>
                  <CardDescription>
                    Select available dates and times to book this artist for your event.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <PublicBookingCalendar artistId={artist._id} artist={artist} />
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>
      </div>

      <Footer />
    </div>
  );
}
