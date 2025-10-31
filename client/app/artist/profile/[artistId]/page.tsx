"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { createRoleAuthRedirectUrl } from "@/utils/redirectUtils";
import { 
  Star, MapPin, Phone, Mail, Instagram, Youtube, 
  Calendar, Clock, Award, Play, Image as ImageIcon,
  Music, Users, DollarSign, CheckCircle, XCircle,
  Facebook, Twitter, Globe, ExternalLink, Check, Sparkles,
  FileText
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
  termsAndConditions?: {
    content: string;
    lastUpdated: string;
  };
  cancellationPolicy?: {
    advanceNotice: number;
    refundPolicy: string;
    emergencyContact?: string;
  };
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
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-slate-200 border-t-purple-600 mx-auto"></div>
            <Sparkles className="h-6 w-6 text-purple-600 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
          </div>
          <p className="mt-6 text-slate-600 font-medium">Loading profile...</p>
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
      <Navbar />
      
      {/* Enhanced Hero Section */}
      <div className="relative">
        <div className="h-72 md:h-96 relative overflow-hidden">
          <Image
            src={coverImage}
            alt="Cover"
            fill
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-white via-transparent to-transparent" />
        </div>
        
        <div className="container mx-auto px-4 md:px-8 lg:px-12">
          <div className="relative -mt-24 md:-mt-32">
            <div className="bg-white rounded-2xl shadow-2xl border border-slate-200/50 overflow-hidden">
              <div className="p-6 md:p-8 lg:p-10">
                <div className="flex flex-col md:flex-row items-start gap-6 md:gap-8">
                  {/* Profile Picture */}
                  <div className="relative group">
                    <div className="absolute -inset-1 bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl blur opacity-25 group-hover:opacity-40 transition duration-300"></div>
                    <Avatar className="relative w-32 h-32 md:w-40 md:h-40 border-4 border-white shadow-xl">
                      <AvatarImage src={profileImage} className="object-cover" />
                      <AvatarFallback className="text-3xl bg-gradient-to-br from-purple-100 to-pink-100 text-purple-700">
                        {artist.name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                  
                  {/* Artist Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h1 className="text-3xl md:text-4xl font-bold text-slate-900 tracking-tight">
                            {artist.name}
                          </h1>
                          {artist.rating && artist.rating.average >= 4.5 && (
                            <div className="flex items-center gap-1 px-2 py-1 bg-amber-50 border border-amber-200 rounded-full">
                              <Sparkles className="h-3.5 w-3.5 text-amber-600 fill-amber-600" />
                              <span className="text-xs font-semibold text-amber-700">Top Rated</span>
                            </div>
                          )}
                        </div>
                        
                        <p className="text-lg text-slate-600 font-medium mb-3">{artist.type}</p>
                        
                        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-slate-600 mb-4">
                          <span className="flex items-center gap-1.5">
                            <MapPin className="h-4 w-4 text-slate-400" />
                            <span className="font-medium">{artist.city}</span>
                          </span>
                          {artist.rating && (
                            <span className="flex items-center gap-1.5">
                              <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
                              <span className="font-semibold text-slate-900">{artist.rating.average}</span>
                              <span className="text-slate-500">({artist.rating.count} reviews)</span>
                            </span>
                          )}
                          {artist.totalBookings && (
                            <span className="flex items-center gap-1.5">
                              <Users className="h-4 w-4 text-slate-400" />
                              <span><strong className="text-slate-900">{artist.totalBookings}</strong> events</span>
                            </span>
                          )}
                        </div>
                        
                        {/* Tags */}
                        <div className="flex flex-wrap gap-2 mb-4">
                          {artist.genres.slice(0, 3).map((genre) => (
                            <Badge 
                              key={genre} 
                              className="bg-gradient-to-r from-purple-50 to-pink-50 text-purple-700 border border-purple-200 hover:from-purple-100 hover:to-pink-100 px-3 py-1"
                            >
                              {genre}
                            </Badge>
                          ))}
                          {artist.languages.slice(0, 2).map((lang) => (
                            <Badge 
                              key={lang} 
                              variant="outline" 
                              className="border-slate-300 text-slate-700 hover:bg-slate-50 px-3 py-1"
                            >
                              {lang}
                            </Badge>
                          ))}
                        </div>

                        {/* Social Links - Horizontal */}
                        {artist.socialLinks && Object.keys(artist.socialLinks).length > 0 && (
                          <div className="flex items-center gap-2">
                            {artist.socialLinks.instagram && (
                              <a 
                                href={artist.socialLinks.instagram} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="p-2 rounded-lg bg-slate-50 hover:bg-gradient-to-br hover:from-purple-50 hover:to-pink-50 border border-slate-200 hover:border-pink-200 transition-all duration-200"
                                title="Instagram"
                              >
                                <Instagram className="h-4 w-4 text-slate-600 hover:text-pink-600" />
                              </a>
                            )}
                            {artist.socialLinks.youtube && (
                              <a 
                                href={artist.socialLinks.youtube} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="p-2 rounded-lg bg-slate-50 hover:bg-red-50 border border-slate-200 hover:border-red-200 transition-all duration-200"
                                title="YouTube"
                              >
                                <Youtube className="h-4 w-4 text-slate-600 hover:text-red-600" />
                              </a>
                            )}
                            {artist.socialLinks.spotify && (
                              <a 
                                href={artist.socialLinks.spotify} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="p-2 rounded-lg bg-slate-50 hover:bg-green-50 border border-slate-200 hover:border-green-200 transition-all duration-200"
                                title="Spotify"
                              >
                                <Music className="h-4 w-4 text-slate-600 hover:text-green-600" />
                              </a>
                            )}
                            {artist.socialLinks.facebook && (
                              <a 
                                href={artist.socialLinks.facebook} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="p-2 rounded-lg bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-200 transition-all duration-200"
                                title="Facebook"
                              >
                                <Facebook className="h-4 w-4 text-slate-600 hover:text-blue-600" />
                              </a>
                            )}
                            {artist.socialLinks.twitter && (
                              <a 
                                href={artist.socialLinks.twitter} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="p-2 rounded-lg bg-slate-50 hover:bg-sky-50 border border-slate-200 hover:border-sky-200 transition-all duration-200"
                                title="Twitter"
                              >
                                <Twitter className="h-4 w-4 text-slate-600 hover:text-sky-600" />
                              </a>
                            )}
                            {artist.socialLinks.website && (
                              <a 
                                href={artist.socialLinks.website} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="p-2 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 hover:border-slate-300 transition-all duration-200"
                                title="Website"
                              >
                                <Globe className="h-4 w-4 text-slate-600" />
                              </a>
                            )}
                          </div>
                        )}
                      </div>
                      
                      {/* Booking Section */}
                      <div className="flex flex-col items-start lg:items-end gap-3">
                        <div className="text-right">
                          <p className="text-sm text-slate-500 font-medium mb-1">Starting from</p>
                          <p className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                            ₹{artist.basePrice?.toLocaleString() || 'Not set'}
                          </p>
                        </div>
                        {isOrganizerLoggedIn && (
                          <Dialog open={showBookingDialog} onOpenChange={setShowBookingDialog}>
                            <DialogTrigger asChild>
                              <Button 
                                size="lg" 
                                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white shadow-lg shadow-purple-500/30 hover:shadow-xl hover:shadow-purple-500/40 transition-all duration-200"
                              >
                                <Calendar className="h-4 w-4 mr-2" />
                                Book This Artist
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
                          <Button 
                            size="lg" 
                            onClick={() => window.location.href = createRoleAuthRedirectUrl('organizer')}
                            className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white shadow-lg shadow-purple-500/30"
                          >
                            Login to Book
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 md:px-8 lg:px-12 py-12">
        <Tabs defaultValue="about" className="space-y-8">
          <TabsList className="inline-flex h-12 items-center justify-start rounded-xl bg-white border border-slate-200 p-1 shadow-sm w-full md:w-auto overflow-x-auto">
            <TabsTrigger 
              value="about"
              className="rounded-lg px-6 data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600 data-[state=active]:to-pink-600 data-[state=active]:text-white data-[state=active]:shadow-md"
            >
              About
            </TabsTrigger>
            <TabsTrigger 
              value="gallery"
              className="rounded-lg px-6 data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600 data-[state=active]:to-pink-600 data-[state=active]:text-white data-[state=active]:shadow-md"
            >
              Gallery
            </TabsTrigger>
            <TabsTrigger 
              value="accolades"
              className="rounded-lg px-6 data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600 data-[state=active]:to-pink-600 data-[state=active]:text-white data-[state=active]:shadow-md"
            >
              Awards
            </TabsTrigger>
            <TabsTrigger 
              value="terms"
              className="rounded-lg px-6 data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600 data-[state=active]:to-pink-600 data-[state=active]:text-white data-[state=active]:shadow-md"
            >
              Terms
            </TabsTrigger>
            <TabsTrigger 
              value="contact"
              className="rounded-lg px-6 data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600 data-[state=active]:to-pink-600 data-[state=active]:text-white data-[state=active]:shadow-md"
            >
              Contact
            </TabsTrigger>
            {isOrganizerLoggedIn && (
              <TabsTrigger 
                value="booking"
                className="rounded-lg px-6 data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600 data-[state=active]:to-pink-600 data-[state=active]:text-white data-[state=active]:shadow-md"
              >
                Booking
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="about" className="space-y-6">
            <Card className="border-slate-200 shadow-md">
              <CardHeader className="border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
                <CardTitle className="text-2xl">About {artist.name}</CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <p className="text-slate-700 leading-relaxed text-lg mb-8">
                  {artist.bio || 'No biography available.'}
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="p-5 rounded-xl bg-gradient-to-br from-purple-50 to-pink-50 border border-purple-100">
                    <p className="text-sm font-medium text-slate-600 mb-2">Specialization</p>
                    <p className="text-lg font-semibold text-slate-900">{artist.type}</p>
                  </div>
                  <div className="p-5 rounded-xl bg-gradient-to-br from-green-50 to-emerald-50 border border-green-100">
                    <p className="text-sm font-medium text-slate-600 mb-2">Base Price</p>
                    <p className="text-lg font-bold text-green-700">₹{artist.basePrice?.toLocaleString() || 'Not set'}</p>
                  </div>
                  <div className="p-5 rounded-xl bg-gradient-to-br from-blue-50 to-sky-50 border border-blue-100">
                    <p className="text-sm font-medium text-slate-600 mb-2">Location</p>
                    <p className="text-lg font-semibold text-slate-900">{artist.city}</p>
                  </div>
                </div>

                {/* Additional Info Grid */}
                <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                      <Music className="h-5 w-5 text-purple-600" />
                      Genres
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {artist.genres?.slice(0, 3).map((genre) => (
                        <Badge 
                          key={genre} 
                          variant="secondary"
                          className="bg-slate-100 text-slate-700 hover:bg-slate-200"
                        >
                          {genre}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                      <Globe className="h-5 w-5 text-purple-600" />
                      Languages
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {artist.languages?.slice(0, 2).map((lang) => (
                        <Badge 
                          key={lang} 
                          variant="secondary"
                          className="bg-slate-100 text-slate-700 hover:bg-slate-200"
                        >
                          {lang}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="gallery" className="space-y-6">
            {artist.gallery?.photos && artist.gallery.photos.length > 0 && (
              <Card className="border-slate-200 shadow-md">
                <CardHeader className="border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
                  <CardTitle className="flex items-center gap-2 text-xl">
                    <ImageIcon className="h-5 w-5 text-purple-600" />
                    Photo Gallery
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {artist.gallery?.photos?.map((photo, index) => (
                      <div 
                        key={index} 
                        className="group relative aspect-square rounded-xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 cursor-pointer"
                      >
                        <Image
                          src={photo.url}
                          alt={photo.caption || `Photo ${index + 1}`}
                          fill
                          className="object-cover group-hover:scale-110 transition-transform duration-500"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {artist.gallery?.videos && artist.gallery.videos.length > 0 && (
              <Card className="border-slate-200 shadow-md">
                <CardHeader className="border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
                  <CardTitle className="flex items-center gap-2 text-xl">
                    <Play className="h-5 w-5 text-purple-600" />
                    Video Showcase
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {artist.gallery?.videos?.map((video, index) => (
                      <div key={index} className="space-y-3">
                        <div className="group relative aspect-video rounded-xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 cursor-pointer">
                          <Image
                            src={video.thumbnail}
                            alt={video.caption || `Video ${index + 1}`}
                            fill
                            className="object-cover"
                          />
                          <div className="absolute inset-0 flex items-center justify-center bg-black/40 group-hover:bg-black/50 transition-colors">
                            <div className="p-4 rounded-full bg-white/90 group-hover:bg-white group-hover:scale-110 transition-all duration-300">
                              <Play className="h-8 w-8 text-purple-600 fill-purple-600" />
                            </div>
                          </div>
                        </div>
                        {video.caption && (
                          <p className="text-sm text-slate-600 font-medium">{video.caption}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="accolades">
            <Card className="border-slate-200 shadow-md">
              <CardHeader className="border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
                <CardTitle className="flex items-center gap-2 text-xl">
                  <Award className="h-5 w-5 text-purple-600" />
                  Awards & Recognition
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                {artist.accolades && artist.accolades.length > 0 ? (
                  <div className="space-y-4">
                    {artist.accolades?.map((accolade, index) => (
                      <div 
                        key={index} 
                        className="relative pl-6 pb-6 border-l-2 border-purple-200 last:border-l-0 last:pb-0"
                      >
                        <div className="absolute -left-2 top-0 w-4 h-4 rounded-full bg-gradient-to-br from-purple-600 to-pink-600 border-2 border-white shadow-md" />
                        <div className="bg-gradient-to-br from-slate-50 to-white border border-slate-200 rounded-xl p-5 hover:shadow-md transition-shadow">
                          <h3 className="text-lg font-bold text-slate-900 mb-1">{accolade.title}</h3>
                          <p className="text-sm text-slate-600 font-medium mb-2">
                            {accolade.organization} • {accolade.year}
                          </p>
                          {accolade.description && (
                            <p className="text-slate-700 leading-relaxed">{accolade.description}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Award className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                    <p className="text-slate-500">No awards listed yet.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="terms" className="space-y-6">
            <div className="space-y-6">
              {/* Terms and Conditions */}
              {artist.termsAndConditions && (
                <Card className="border-slate-200 shadow-md">
                  <CardHeader className="border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
                    <CardTitle className="flex items-center gap-2 text-xl">
                      <FileText className="h-5 w-5 text-purple-600" />
                      Terms & Conditions
                    </CardTitle>
                    {artist.termsAndConditions.lastUpdated && (
                      <CardDescription className="text-slate-600">
                        Last updated: {new Date(artist.termsAndConditions.lastUpdated).toLocaleDateString()}
                      </CardDescription>
                    )}
                  </CardHeader>
                  <CardContent className="pt-6">
                    <div className="prose prose-slate max-w-none">
                      <div className="text-slate-700 leading-relaxed whitespace-pre-line">
                        {artist.termsAndConditions.content || 'No terms and conditions specified.'}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Cancellation Policy */}
              {artist.cancellationPolicy && (
                <Card className="border-slate-200 shadow-md">
                  <CardHeader className="border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
                    <CardTitle className="flex items-center gap-2 text-xl">
                      <Clock className="h-5 w-5 text-purple-600" />
                      Cancellation Policy
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-6 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-4 rounded-xl bg-gradient-to-br from-blue-50 to-sky-50 border border-blue-100">
                        <p className="text-sm font-medium text-slate-600 mb-1">Advance Notice Required</p>
                        <p className="text-lg font-semibold text-slate-900">
                          {artist.cancellationPolicy.advanceNotice || '24'} hours
                        </p>
                      </div>
                      <div className="p-4 rounded-xl bg-gradient-to-br from-green-50 to-emerald-50 border border-green-100">
                        <p className="text-sm font-medium text-slate-600 mb-1">Refund Policy</p>
                        <p className="text-lg font-semibold text-slate-900">
                          {artist.cancellationPolicy.refundPolicy || 'As per terms'}
                        </p>
                      </div>
                    </div>
                    
                    {artist.cancellationPolicy.emergencyContact && (
                      <div className="p-4 rounded-xl bg-gradient-to-br from-purple-50 to-pink-50 border border-purple-100">
                        <p className="text-sm font-medium text-slate-600 mb-1">Emergency Contact</p>
                        <p className="text-lg font-semibold text-slate-900">
                          {artist.cancellationPolicy.emergencyContact}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {(!artist.termsAndConditions && !artist.cancellationPolicy) && (
                <Card className="border-slate-200 shadow-md">
                  <CardContent className="pt-6">
                    <div className="text-center py-12">
                      <FileText className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                      <p className="text-slate-500">Terms and conditions not available yet.</p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="contact">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="border-slate-200 shadow-md">
                <CardHeader className="border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
                  <CardTitle className="text-xl">Get In Touch</CardTitle>
                </CardHeader>
                <CardContent className="pt-6 space-y-4">
                  <a 
                    href={`tel:${artist.phone}`}
                    className="flex items-center gap-4 p-4 rounded-xl bg-gradient-to-br from-blue-50 to-sky-50 border border-blue-100 hover:shadow-md transition-all group"
                  >
                    <div className="p-3 rounded-lg bg-white shadow-sm group-hover:scale-110 transition-transform">
                      <Phone className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-xs text-slate-600 font-medium mb-0.5">Phone</p>
                      <p className="font-semibold text-slate-900">{artist.phone}</p>
                    </div>
                  </a>
                  <a 
                    href={`mailto:${artist.email}`}
                    className="flex items-center gap-4 p-4 rounded-xl bg-gradient-to-br from-purple-50 to-pink-50 border border-purple-100 hover:shadow-md transition-all group"
                  >
                    <div className="p-3 rounded-lg bg-white shadow-sm group-hover:scale-110 transition-transform">
                      <Mail className="h-5 w-5 text-purple-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-slate-600 font-medium mb-0.5">Email</p>
                      <p className="font-semibold text-slate-900 truncate">{artist.email}</p>
                    </div>
                  </a>
                  <div className="flex items-center gap-4 p-4 rounded-xl bg-gradient-to-br from-green-50 to-emerald-50 border border-green-100">
                    <div className="p-3 rounded-lg bg-white shadow-sm">
                      <MapPin className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <p className="text-xs text-slate-600 font-medium mb-0.5">Location</p>
                      <p className="font-semibold text-slate-900">{artist.city}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {artist.socialLinks && Object.keys(artist.socialLinks).length > 0 && (
                <Card className="border-slate-200 shadow-md">
                  <CardHeader className="border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
                    <CardTitle className="text-xl">Connect Online</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-6">
                    <div className="space-y-3">
                      {artist.socialLinks.instagram && (
                        <a 
                          href={artist.socialLinks.instagram} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-br from-pink-50 to-rose-50 border border-pink-200 hover:shadow-md hover:scale-[1.02] transition-all group"
                        >
                          <div className="flex items-center gap-3">
                            <div className="p-2.5 rounded-lg bg-white shadow-sm">
                              <Instagram className="h-5 w-5 text-pink-600" />
                            </div>
                            <span className="font-semibold text-slate-900">Instagram</span>
                          </div>
                          <ExternalLink className="h-4 w-4 text-pink-500 group-hover:translate-x-1 transition-transform" />
                        </a>
                      )}
                      
                      {artist.socialLinks.youtube && (
                        <a 
                          href={artist.socialLinks.youtube} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-br from-red-50 to-rose-50 border border-red-200 hover:shadow-md hover:scale-[1.02] transition-all group"
                        >
                          <div className="flex items-center gap-3">
                            <div className="p-2.5 rounded-lg bg-white shadow-sm">
                              <Youtube className="h-5 w-5 text-red-600" />
                            </div>
                            <span className="font-semibold text-slate-900">YouTube</span>
                          </div>
                          <ExternalLink className="h-4 w-4 text-red-500 group-hover:translate-x-1 transition-transform" />
                        </a>
                      )}
                      
                      {artist.socialLinks.spotify && (
                        <a 
                          href={artist.socialLinks.spotify} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 hover:shadow-md hover:scale-[1.02] transition-all group"
                        >
                          <div className="flex items-center gap-3">
                            <div className="p-2.5 rounded-lg bg-white shadow-sm">
                              <Music className="h-5 w-5 text-green-600" />
                            </div>
                            <span className="font-semibold text-slate-900">Spotify</span>
                          </div>
                          <ExternalLink className="h-4 w-4 text-green-500 group-hover:translate-x-1 transition-transform" />
                        </a>
                      )}
                      
                      {artist.socialLinks.facebook && (
                        <a 
                          href={artist.socialLinks.facebook} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-br from-blue-50 to-sky-50 border border-blue-200 hover:shadow-md hover:scale-[1.02] transition-all group"
                        >
                          <div className="flex items-center gap-3">
                            <div className="p-2.5 rounded-lg bg-white shadow-sm">
                              <Facebook className="h-5 w-5 text-blue-600" />
                            </div>
                            <span className="font-semibold text-slate-900">Facebook</span>
                          </div>
                          <ExternalLink className="h-4 w-4 text-blue-500 group-hover:translate-x-1 transition-transform" />
                        </a>
                      )}
                      
                      {artist.socialLinks.twitter && (
                        <a 
                          href={artist.socialLinks.twitter} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-br from-sky-50 to-blue-50 border border-sky-200 hover:shadow-md hover:scale-[1.02] transition-all group"
                        >
                          <div className="flex items-center gap-3">
                            <div className="p-2.5 rounded-lg bg-white shadow-sm">
                              <Twitter className="h-5 w-5 text-sky-600" />
                            </div>
                            <span className="font-semibold text-slate-900">Twitter</span>
                          </div>
                          <ExternalLink className="h-4 w-4 text-sky-500 group-hover:translate-x-1 transition-transform" />
                        </a>
                      )}
                      
                      {artist.socialLinks.website && (
                        <a 
                          href={artist.socialLinks.website} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-br from-slate-50 to-gray-50 border border-slate-200 hover:shadow-md hover:scale-[1.02] transition-all group"
                        >
                          <div className="flex items-center gap-3">
                            <div className="p-2.5 rounded-lg bg-white shadow-sm">
                              <Globe className="h-5 w-5 text-slate-600" />
                            </div>
                            <span className="font-semibold text-slate-900">Website</span>
                          </div>
                          <ExternalLink className="h-4 w-4 text-slate-500 group-hover:translate-x-1 transition-transform" />
                        </a>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {isOrganizerLoggedIn && (
            <TabsContent value="booking">
              <Card className="border-slate-200 shadow-md">
                <CardHeader className="border-b border-slate-100 bg-gradient-to-r from-purple-50 via-pink-50 to-white">
                  <CardTitle className="text-xl">Book {artist.name}</CardTitle>
                  <CardDescription className="text-slate-600">
                    Select available dates and times to book this artist for your event.
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
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