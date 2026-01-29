"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { createRoleAuthRedirectUrl } from "@/utils/redirectUtils";
import { 
  Star, MapPin, Phone, Mail, Instagram, Youtube, 
  Calendar, Clock, Award, Play, Image as ImageIcon,
  Music, Users, ChevronLeft, Share2, Heart, ExternalLink,
  CheckCircle, Sparkles, Globe, Facebook, Twitter
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
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

// Skeleton Components
const HeroSkeleton = () => (
  <div className="animate-pulse">
    <div className="h-48 sm:h-64 lg:h-80 bg-gray-200" />
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-16 sm:-mt-20 relative z-10">
      <div className="flex flex-col sm:flex-row gap-4 sm:gap-6">
        <div className="w-28 h-28 sm:w-36 sm:h-36 lg:w-44 lg:h-44 rounded-2xl bg-gray-300 border-4 border-white shadow-xl" />
        <div className="flex-1 pt-2 sm:pt-8">
          <div className="h-8 bg-gray-300 rounded w-48 mb-3" />
          <div className="h-5 bg-gray-200 rounded w-32 mb-4" />
          <div className="flex gap-2">
            <div className="h-6 w-20 bg-gray-200 rounded-full" />
            <div className="h-6 w-24 bg-gray-200 rounded-full" />
          </div>
        </div>
      </div>
    </div>
  </div>
);

const CardSkeleton = () => (
  <div className="animate-pulse bg-white rounded-2xl p-6 shadow-sm">
    <div className="h-6 bg-gray-200 rounded w-32 mb-4" />
    <div className="space-y-3">
      <div className="h-4 bg-gray-100 rounded w-full" />
      <div className="h-4 bg-gray-100 rounded w-5/6" />
      <div className="h-4 bg-gray-100 rounded w-4/6" />
    </div>
  </div>
);

const GallerySkeleton = () => (
  <div className="animate-pulse">
    <div className="flex gap-3 overflow-hidden">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="flex-shrink-0 w-40 h-40 sm:w-48 sm:h-48 bg-gray-200 rounded-xl" />
      ))}
    </div>
  </div>
);

export default function PublicArtistProfile() {
  const params = useParams();
  const router = useRouter();
  const artistId = params.artistId as string;
  const [artist, setArtist] = useState<Artist | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isOrganizerLoggedIn, setIsOrganizerLoggedIn] = useState(false);
  const [showBookingDialog, setShowBookingDialog] = useState(false);
  const [bioExpanded, setBioExpanded] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isSaved, setIsSaved] = useState(false);

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

  const handleShare = useCallback(async () => {
    if (navigator.share && artist) {
      try {
        await navigator.share({
          title: `${artist.name} - Artist Profile`,
          text: `Check out ${artist.name} on Ahibi!`,
          url: window.location.href,
        });
      } catch (err) {
        navigator.clipboard.writeText(window.location.href);
      }
    } else {
      navigator.clipboard.writeText(window.location.href);
    }
  }, [artist]);

  const handleBookingClick = () => {
    if (isOrganizerLoggedIn) {
      setShowBookingDialog(true);
    } else {
      window.location.href = createRoleAuthRedirectUrl('organizer');
    }
  };

  // Loading State with Skeletons
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <HeroSkeleton />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <CardSkeleton />
              <GallerySkeleton />
            </div>
            <div className="hidden lg:block">
              <CardSkeleton />
            </div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  // Error State
  if (error || !artist) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-2xl mx-auto px-4 py-20 text-center">
          <div className="w-20 h-20 mx-auto mb-6 bg-gray-100 rounded-full flex items-center justify-center">
            <Users className="w-10 h-10 text-gray-400" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-3">Artist Not Found</h1>
          <p className="text-gray-600 mb-8">{error || "The artist you're looking for doesn't exist or has been removed."}</p>
          <Button 
            onClick={() => router.back()}
            variant="outline"
            className="min-h-[44px]"
          >
            <ChevronLeft className="w-4 h-4 mr-2" />
            Go Back
          </Button>
        </div>
        <Footer />
      </div>
    );
  }

  const coverImage = artist.gallery?.photos?.find(photo => photo.isCoverImage)?.url || "/images/carausel1.jpg";
  const profileImage = artist.gallery?.photos?.find(photo => photo.isProfileImage)?.url || artist.profilePic;
  const galleryPhotos = artist.gallery?.photos?.filter(p => !p.isProfileImage && !p.isCoverImage) || [];
  const hasGallery = galleryPhotos.length > 0 || (artist.gallery?.videos?.length ?? 0) > 0;
  const bioTruncateLength = 200;
  const shouldTruncateBio = artist.bio && artist.bio.length > bioTruncateLength;
  const startingPrice = typeof artist.basePrice === "number" ? artist.basePrice : Number(artist.basePrice);
  const hasStartingPrice = Number.isFinite(startingPrice) && startingPrice > 0;
  const startingPriceLabel = hasStartingPrice ? startingPrice.toLocaleString() : "On request";
  const artistForBooking = {
    ...artist,
    basePrice: hasStartingPrice ? startingPrice : 0,
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      {/* Hero Section */}
      <section className="relative">
        {/* Cover Image */}
        <div className="h-52 sm:h-64 lg:h-80 relative overflow-hidden">
          <Image
            src={coverImage}
            alt={`${artist.name} cover`}
            fill
            priority
            className="object-cover"
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
          
          {/* Back Button - Mobile */}
          <button 
            onClick={() => router.back()}
            className="absolute top-3 left-3 z-20 w-9 h-9 sm:w-10 sm:h-10 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-lg hover:bg-white transition-colors"
            aria-label="Go back"
          >
            <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5 text-gray-700" />
          </button>
          
          {/* Action Buttons - Top Right */}
          <div className="absolute top-3 right-3 z-20 flex gap-2">
            <button 
              onClick={handleShare}
              className="w-9 h-9 sm:w-10 sm:h-10 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-lg hover:bg-white transition-colors"
              aria-label="Share"
            >
              <Share2 className="w-4 h-4 sm:w-5 sm:h-5 text-gray-700" />
            </button>
            <button 
              onClick={() => setIsSaved(!isSaved)}
              className="w-9 h-9 sm:w-10 sm:h-10 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-lg hover:bg-white transition-colors"
              aria-label="Save"
            >
              <Heart className={`w-4 h-4 sm:w-5 sm:h-5 ${isSaved ? 'fill-red-500 text-red-500' : 'text-gray-700'}`} />
            </button>
          </div>
        </div>
        
        {/* Profile Info */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-14 sm:-mt-20 relative z-10">
          <div className="bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80 rounded-3xl shadow-sm ring-1 ring-black/5 p-4 sm:p-0 sm:bg-transparent sm:backdrop-blur-none sm:shadow-none sm:ring-0">
            <div className="flex flex-col sm:flex-row gap-4 sm:gap-6">
            {/* Profile Image */}
            <div className="relative flex-shrink-0 -mt-10 sm:mt-0 mx-auto sm:mx-0">
              <div className="w-24 h-24 sm:w-36 sm:h-36 lg:w-44 lg:h-44 rounded-2xl overflow-hidden border-4 border-white shadow-xl bg-white">
                {profileImage ? (
                  <Image
                    src={profileImage}
                    alt={artist.name}
                    fill
                    className="object-cover"
                    sizes="(max-width: 640px) 112px, (max-width: 1024px) 144px, 176px"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                    <span className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white">
                      {artist.name.charAt(0)}
                    </span>
                  </div>
                )}
              </div>
              {artist.rating && artist.rating.average >= 4.5 && (
                <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-gradient-to-r from-amber-400 to-orange-500 rounded-full flex items-center justify-center shadow-lg">
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
              )}
            </div>
            
            {/* Artist Info */}
            <div className="flex-1 pt-1 sm:pt-8 lg:pt-12">
              <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                <div>
                  <h1 className="mt-8 text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-1">
                    {artist.name}
                  </h1>
                  <p className="text-base sm:text-lg text-gray-600 mb-3">{artist.type}</p>
                  
                  {/* Quick Stats */}
                  <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-sm text-gray-600">
                    <span className="flex items-center gap-1.5">
                      <MapPin className="w-4 h-4 text-gray-400" />
                      {artist.city}
                    </span>
                    {artist.rating && artist.rating.count > 0 && (
                      <span className="flex items-center gap-1.5">
                        <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                        <span className="font-medium text-gray-900">{artist.rating.average.toFixed(1)}</span>
                        <span className="text-gray-400">({artist.rating.count})</span>
                      </span>
                    )}
                    {artist.totalBookings && artist.totalBookings > 0 && (
                      <span className="flex items-center gap-1.5">
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        {artist.totalBookings}+ bookings
                      </span>
                    )}
                  </div>
                </div>
                
                {/* Desktop CTA - Hidden on Mobile */}
                <div className="hidden lg:flex flex-col items-end gap-2">
                  <div className="text-right mt-8 mb-2">
                    <p className="text-sm text-gray-500">Starting from</p>
                    <p className="text-2xl font-bold text-gray-900">{hasStartingPrice ? `₹${startingPriceLabel}` : startingPriceLabel}</p>
                  </div>
                  <Button 
                    size="lg" 
                    onClick={handleBookingClick}
                    className="bg-violet-600 hover:bg-violet-700 text-white min-h-[48px] px-8 rounded-xl shadow-lg shadow-violet-200 transition-all hover:shadow-xl hover:shadow-violet-300"
                  >
                    <Calendar className="w-5 h-5 mr-2" />
                    {isOrganizerLoggedIn ? 'Book Now' : 'Login to Book'}
                  </Button>
                </div>
              </div>
              
              {/* Tags */}
              <div className="flex flex-wrap gap-2 mt-4">
                {artist.genres?.map((genre) => (
                  <Badge 
                    key={genre} 
                    className="bg-violet-50 text-violet-700 hover:bg-violet-100 border-0 rounded-full px-3 py-1 text-xs sm:text-sm font-medium"
                  >
                    {genre}
                  </Badge>
                ))}
                {artist.languages?.map((lang) => (
                  <Badge 
                    key={lang} 
                    variant="outline"
                    className="border-gray-200 text-gray-600 hover:bg-gray-50 rounded-full px-3 py-1 text-xs sm:text-sm"
                  >
                    {lang}
                  </Badge>
                ))}
              </div>
            </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
          {/* Left Column - Main Content */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* About Section */}
            <section className="bg-white rounded-2xl p-5 sm:p-6 shadow-sm">
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4">About</h2>
              <div className="text-gray-600 leading-relaxed">
                {artist.bio ? (
                  <>
                    <p>
                      {bioExpanded || !shouldTruncateBio 
                        ? artist.bio 
                        : `${artist.bio.slice(0, bioTruncateLength)}...`}
                    </p>
                    {shouldTruncateBio && (
                      <button 
                        onClick={() => setBioExpanded(!bioExpanded)}
                        className="text-violet-600 font-medium mt-2 hover:text-violet-700 transition-colors"
                      >
                        {bioExpanded ? 'Show less' : 'Read more'}
                      </button>
                    )}
                  </>
                ) : (
                  <p className="text-gray-400 italic">No biography available.</p>
                )}
              </div>
              
              {/* Highlights */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-6 pt-6 border-t border-gray-100">
                <div className="text-center sm:text-left">
                  <p className="text-xs uppercase tracking-wider text-gray-400 mb-1">Specialization</p>
                  <p className="font-medium text-gray-900">{artist.type}</p>
                </div>
                <div className="text-center sm:text-left">
                  <p className="text-xs uppercase tracking-wider text-gray-400 mb-1">Base Price</p>
                  <p className="font-medium text-green-600">{hasStartingPrice ? `₹${startingPriceLabel}` : startingPriceLabel}</p>
                </div>
                <div className="text-center sm:text-left col-span-2 sm:col-span-1">
                  <p className="text-xs uppercase tracking-wider text-gray-400 mb-1">Location</p>
                  <p className="font-medium text-gray-900">{artist.city}</p>
                </div>
              </div>
            </section>

            {/* Gallery Section */}
            {hasGallery && (
              <section className="bg-white rounded-2xl p-5 sm:p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg sm:text-xl font-semibold text-gray-900 flex items-center gap-2">
                    <ImageIcon className="w-5 h-5 text-gray-400" />
                    Gallery
                  </h2>
                  {galleryPhotos.length > 4 && (
                    <button className="text-sm text-violet-600 font-medium hover:text-violet-700">
                      See all ({galleryPhotos.length})
                    </button>
                  )}
                </div>
                
                {/* Photos - Horizontal Scroll on Mobile, Grid on Desktop */}
                {galleryPhotos.length > 0 && (
                  <div className="lg:hidden -mx-5 px-5">
                    <div className="flex gap-3 overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-hide">
                      {galleryPhotos.map((photo, index) => (
                        <button 
                          key={index}
                          onClick={() => setSelectedImage(photo.url)}
                          className="flex-shrink-0 w-40 h-40 sm:w-48 sm:h-48 rounded-xl overflow-hidden snap-start focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2"
                        >
                          <Image
                            src={photo.url}
                            alt={photo.caption || `Photo ${index + 1}`}
                            width={200}
                            height={200}
                            className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                          />
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Desktop Grid */}
                {galleryPhotos.length > 0 && (
                  <div className="hidden lg:grid grid-cols-4 gap-3">
                    {galleryPhotos.slice(0, 8).map((photo, index) => (
                      <button 
                        key={index}
                        onClick={() => setSelectedImage(photo.url)}
                        className="relative aspect-square rounded-xl overflow-hidden focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2 group"
                      >
                        <Image
                          src={photo.url}
                          alt={photo.caption || `Photo ${index + 1}`}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-300"
                          sizes="(max-width: 1024px) 25vw, 200px"
                        />
                        {index === 7 && galleryPhotos.length > 8 && (
                          <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                            <span className="text-white font-semibold">+{galleryPhotos.length - 8}</span>
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                )}
                
                {/* Videos */}
                {artist.gallery?.videos && artist.gallery.videos.length > 0 && (
                  <div className="mt-6 pt-6 border-t border-gray-100">
                    <h3 className="text-base font-medium text-gray-900 mb-4 flex items-center gap-2">
                      <Play className="w-4 h-4 text-gray-400" />
                      Videos
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {artist.gallery.videos.map((video, index) => (
                        <a 
                          key={index}
                          href={video.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="group relative aspect-video rounded-xl overflow-hidden bg-gray-100"
                        >
                          <Image
                            src={video.thumbnail}
                            alt={video.caption || `Video ${index + 1}`}
                            fill
                            className="object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                          <div className="absolute inset-0 bg-black/30 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                            <div className="w-14 h-14 bg-white/90 rounded-full flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                              <Play className="w-6 h-6 text-gray-900 ml-1" />
                            </div>
                          </div>
                          {video.caption && (
                            <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/80 to-transparent">
                              <p className="text-white text-sm font-medium truncate">{video.caption}</p>
                            </div>
                          )}
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </section>
            )}

            {/* Accolades Section */}
            {artist.accolades && artist.accolades.length > 0 && (
              <section className="bg-white rounded-2xl p-5 sm:p-6 shadow-sm">
                <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Award className="w-5 h-5 text-amber-500" />
                  Awards & Recognition
                </h2>
                <div className="space-y-4">
                  {artist.accolades.map((accolade, index) => (
                    <div 
                      key={index} 
                      className="flex gap-4 p-4 bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl"
                    >
                      <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl flex items-center justify-center shadow-lg shadow-amber-200/50">
                        <Award className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900">{accolade.title}</h3>
                        <p className="text-sm text-gray-600">{accolade.organization} • {accolade.year}</p>
                        {accolade.description && (
                          <p className="text-sm text-gray-500 mt-1">{accolade.description}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Contact Section - Mobile Only in Main Flow */}
            <section className="lg:hidden bg-white rounded-2xl p-5 sm:p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Contact</h2>
              <div className="space-y-3">
                <a href={`tel:${artist.phone}`} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                  <div className="w-10 h-10 bg-violet-100 rounded-xl flex items-center justify-center">
                    <Phone className="w-5 h-5 text-violet-600" />
                  </div>
                  <span className="text-gray-700">{artist.phone}</span>
                </a>
                <a href={`mailto:${artist.email}`} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                  <div className="w-10 h-10 bg-violet-100 rounded-xl flex items-center justify-center">
                    <Mail className="w-5 h-5 text-violet-600" />
                  </div>
                  <span className="text-gray-700 truncate">{artist.email}</span>
                </a>
              </div>
              
              {/* Social Links */}
              {artist.socialLinks && Object.values(artist.socialLinks).some(v => v) && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <p className="text-sm text-gray-500 mb-3">Follow</p>
                  <div className="flex flex-wrap gap-2">
                    {artist.socialLinks.instagram && (
                      <a href={artist.socialLinks.instagram} target="_blank" rel="noopener noreferrer"
                        className="w-11 h-11 bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400 rounded-xl flex items-center justify-center hover:scale-105 transition-transform">
                        <Instagram className="w-5 h-5 text-white" />
                      </a>
                    )}
                    {artist.socialLinks.youtube && (
                      <a href={artist.socialLinks.youtube} target="_blank" rel="noopener noreferrer"
                        className="w-11 h-11 bg-red-600 rounded-xl flex items-center justify-center hover:scale-105 transition-transform">
                        <Youtube className="w-5 h-5 text-white" />
                      </a>
                    )}
                    {artist.socialLinks.facebook && (
                      <a href={artist.socialLinks.facebook} target="_blank" rel="noopener noreferrer"
                        className="w-11 h-11 bg-blue-600 rounded-xl flex items-center justify-center hover:scale-105 transition-transform">
                        <Facebook className="w-5 h-5 text-white" />
                      </a>
                    )}
                    {artist.socialLinks.twitter && (
                      <a href={artist.socialLinks.twitter} target="_blank" rel="noopener noreferrer"
                        className="w-11 h-11 bg-sky-500 rounded-xl flex items-center justify-center hover:scale-105 transition-transform">
                        <Twitter className="w-5 h-5 text-white" />
                      </a>
                    )}
                    {artist.socialLinks.spotify && (
                      <a href={artist.socialLinks.spotify} target="_blank" rel="noopener noreferrer"
                        className="w-11 h-11 bg-green-500 rounded-xl flex items-center justify-center hover:scale-105 transition-transform">
                        <Music className="w-5 h-5 text-white" />
                      </a>
                    )}
                    {artist.socialLinks.website && (
                      <a href={artist.socialLinks.website} target="_blank" rel="noopener noreferrer"
                        className="w-11 h-11 bg-gray-700 rounded-xl flex items-center justify-center hover:scale-105 transition-transform">
                        <Globe className="w-5 h-5 text-white" />
                      </a>
                    )}
                  </div>
                </div>
              )}
            </section>
          </div>
          
          {/* Right Column - Sticky Booking Card (Desktop) */}
          <div className="hidden lg:block">
            <div className="sticky top-24 space-y-6">
              {/* Booking Card */}
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <div className="mb-6">
                  <p className="text-sm text-gray-500">Starting from</p>
                  <p className="text-3xl font-bold text-gray-900">{hasStartingPrice ? `₹${startingPriceLabel}` : startingPriceLabel}</p>
                </div>
                
                <Button 
                  size="lg" 
                  onClick={handleBookingClick}
                  className="w-full bg-violet-600 hover:bg-violet-700 text-white min-h-[52px] rounded-xl shadow-lg shadow-violet-200 transition-all hover:shadow-xl hover:shadow-violet-300 text-base font-semibold"
                >
                  <Calendar className="w-5 h-5 mr-2" />
                  {isOrganizerLoggedIn ? 'Book This Artist' : 'Login to Book'}
                </Button>
                
                <p className="text-center text-xs text-gray-400 mt-3">
                  You won't be charged yet
                </p>
                
                <div className="mt-6 pt-6 border-t border-gray-100 space-y-3 text-sm">
                  <div className="flex items-center gap-2 text-gray-600">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span>Free cancellation within 24hrs</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span>Secure booking process</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span>Verified artist profile</span>
                  </div>
                </div>
              </div>
              
              {/* Contact Card */}
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <h3 className="font-semibold text-gray-900 mb-4">Contact Information</h3>
                <div className="space-y-3">
                  <a href={`tel:${artist.phone}`} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                    <Phone className="w-5 h-5 text-violet-600" />
                    <span className="text-gray-700">{artist.phone}</span>
                  </a>
                  <a href={`mailto:${artist.email}`} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                    <Mail className="w-5 h-5 text-violet-600" />
                    <span className="text-gray-700 truncate text-sm">{artist.email}</span>
                  </a>
                </div>
                
                {/* Social Links */}
                {artist.socialLinks && Object.values(artist.socialLinks).some(v => v) && (
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <p className="text-sm text-gray-500 mb-3">Social Links</p>
                    <div className="flex flex-wrap gap-2">
                      {artist.socialLinks.instagram && (
                        <a href={artist.socialLinks.instagram} target="_blank" rel="noopener noreferrer"
                          className="w-10 h-10 bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400 rounded-lg flex items-center justify-center hover:scale-105 transition-transform">
                          <Instagram className="w-4 h-4 text-white" />
                        </a>
                      )}
                      {artist.socialLinks.youtube && (
                        <a href={artist.socialLinks.youtube} target="_blank" rel="noopener noreferrer"
                          className="w-10 h-10 bg-red-600 rounded-lg flex items-center justify-center hover:scale-105 transition-transform">
                          <Youtube className="w-4 h-4 text-white" />
                        </a>
                      )}
                      {artist.socialLinks.facebook && (
                        <a href={artist.socialLinks.facebook} target="_blank" rel="noopener noreferrer"
                          className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center hover:scale-105 transition-transform">
                          <Facebook className="w-4 h-4 text-white" />
                        </a>
                      )}
                      {artist.socialLinks.twitter && (
                        <a href={artist.socialLinks.twitter} target="_blank" rel="noopener noreferrer"
                          className="w-10 h-10 bg-sky-500 rounded-lg flex items-center justify-center hover:scale-105 transition-transform">
                          <Twitter className="w-4 h-4 text-white" />
                        </a>
                      )}
                      {artist.socialLinks.spotify && (
                        <a href={artist.socialLinks.spotify} target="_blank" rel="noopener noreferrer"
                          className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center hover:scale-105 transition-transform">
                          <Music className="w-4 h-4 text-white" />
                        </a>
                      )}
                      {artist.socialLinks.website && (
                        <a href={artist.socialLinks.website} target="_blank" rel="noopener noreferrer"
                          className="w-10 h-10 bg-gray-700 rounded-lg flex items-center justify-center hover:scale-105 transition-transform">
                          <Globe className="w-4 h-4 text-white" />
                        </a>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Mobile Sticky CTA */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 px-4 py-3 safe-area-inset-bottom">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs text-gray-500">Starting from</p>
            <p className="text-xl font-bold text-gray-900">{hasStartingPrice ? `₹${startingPriceLabel}` : startingPriceLabel}</p>
          </div>
          <Button 
            size="lg" 
            onClick={handleBookingClick}
            className="bg-violet-600 hover:bg-violet-700 text-white min-h-[48px] px-8 rounded-xl flex-shrink-0"
          >
            <Calendar className="w-5 h-5 mr-2" />
            {isOrganizerLoggedIn ? 'Book Now' : 'Login to Book'}
          </Button>
        </div>
      </div>

      {/* Add padding at bottom for sticky CTA on mobile */}
      <div className="lg:hidden h-24" />

      <Footer />

      {/* Booking Dialog */}
      <Dialog open={showBookingDialog} onOpenChange={setShowBookingDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl">Book {artist.name}</DialogTitle>
            <DialogDescription>
              Select a date and time to book this artist for your event.
            </DialogDescription>
          </DialogHeader>
          <PublicBookingCalendar artistId={artist._id} artist={artistForBooking} />
        </DialogContent>
      </Dialog>

      {/* Image Lightbox */}
      <Dialog open={!!selectedImage} onOpenChange={() => setSelectedImage(null)}>
        <DialogContent className="max-w-4xl p-0 bg-black/95 border-0">
          {selectedImage && (
            <div className="relative aspect-square sm:aspect-video w-full">
              <Image
                src={selectedImage}
                alt="Gallery image"
                fill
                className="object-contain"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
