"use client";
import { useState, useEffect, useMemo } from "react";
import { useRouter, useParams } from 'next/navigation';
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  MapPin,
  Phone,
  Mail,
  Loader2,
  Share2,
  Building2,
  Globe,
  XCircle,
  Upload,
  Image as ImageIcon,
  Trash2,
  Facebook,
  Instagram,
  Twitter
} from "lucide-react";
import { toast } from "sonner";
import Navbar from "../../Navbar";
import Footer from "../../Footer";

// Types - Updated to match actual Venue model
interface VenueData {
  _id: string;
  name: string;
  businessName?: string;
  email: string;
  phone: string;
  address: {
    street?: string;
    city?: string;
    state?: string;
    pincode?: string;
    country?: string;
  };
  coordinates?: {
    latitude?: number;
    longitude?: number;
  };
  status: 'pending' | 'approved' | 'rejected';
  verificationDocuments?: string[];
  images?: Array<{
    public_id?: string;
    url: string;
    width?: number;
    height?: number;
    format?: string;
    size?: number;
    created_at?: string;
  }>;
  socialLinks?: {
    website?: string;
    facebook?: string;
    instagram?: string;
    twitter?: string;
  };
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
}

interface SpaceData {
  _id: string;
  name: string;
  description: string;
  tagline?: string;
  venueClassification: {
    venueTypes: string[];
    venueTypeOther?: string;
    indoorOutdoor: string;
  };
  address: {
    street: string;
    city: string;
    state: string;
    pincode: string;
    landmark?: string;
  };
  capacity: number;
  capacityDetails: {
    standingCapacity: number;
    seatingCapacity?: {
      theatreStyle?: number;
      roundTable?: number;
    };
    minimumBookingCapacity?: number;
  };
  pricing: {
    basePrice: number;
    hourlyRate?: number;
    halfDayRate?: number;
    fullDayRate?: number;
    cleaningFee?: number;
    securityDeposit?: number;
  };
  gallery: Array<{
    url: string;
    caption?: string;
    isMain?: boolean;
  }>;
  totalBookings: number;
  totalEarnings: number;
  rating: {
    average: number;
    count: number;
  };
  createdAt: string;
  updatedAt: string;
}

const slugifyVenueName = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const isMongoObjectId = (id: string) => {
  return /^[0-9a-fA-F]{24}$/.test(id);
};

const validateFile = (file: File, maxSize: number = 10 * 1024 * 1024): string | null => {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];

  if (!allowedTypes.includes(file.type)) {
    return 'Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed.';
  }

  if (file.size > maxSize) {
    return `File size too large. Maximum size is ${Math.round(maxSize / 1024 / 1024)}MB.`;
  }

  return null;
};

const getPrimaryVenueImage = (venue: SpaceData) => {
  // For SpaceData, use gallery
  const gallery = Array.isArray(venue.gallery) ? venue.gallery : [];
  const mainImage = gallery.find((img: any) => img?.isMain)?.url;
  const firstImage = gallery.find((img: any) => img?.url)?.url;
  return mainImage || firstImage || "";
};

const formatVenueType = (space: SpaceData) => {
  const venueTypes = space.venueClassification?.venueTypes || [];
  if (venueTypes.length === 0) return "Venue";
  
  // Format the venue type (replace underscores with spaces and capitalize)
  const formattedType = venueTypes[0]
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (l) => l.toUpperCase());
  
  return formattedType;
};

export default function VenueDetailPage() {
  const params = useParams();
  const venueId = decodeURIComponent((params.venueid as string) || "");
  const rawParam = (params.venueid as string) || "";

  const isIdRoute = useMemo(() => {
    try {
      return isMongoObjectId(decodeURIComponent(rawParam));
    } catch {
      return false;
    }
  }, [rawParam]);

  const [venueData, setVenueData] = useState<VenueData | null>(null);
  const [resolvedVenueId, setResolvedVenueId] = useState<string | null>(null);
  const [spaces, setSpaces] = useState<SpaceData[]>([]);
  const [similarVenues, setSimilarVenues] = useState<VenueData[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [isVenueOwner, setIsVenueOwner] = useState(false);
  const router = useRouter();

  const fetchSimilarVenues = async () => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const city = venueData?.address.city;
      const response = await fetch(`${apiUrl}/api/venues?city=${city || ''}&limit=8`);
      const data = await response.json();
      if (data.success) {
        const filtered = data.data.venues
          .filter((v: VenueData) => v._id !== venueId)
          .slice(0, 8);
        setSimilarVenues(filtered);
      }
    } catch (error) {
      console.error('Error fetching similar venues:', error);
    }
  };

  const fetchVenueSpaces = async () => {
    if (!resolvedVenueId) return;

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const response = await fetch(`${apiUrl}/api/venue/${resolvedVenueId}/spaces`);
      const data = await response.json();

      if (!data.success) {
        setSpaces([]);
        return;
      }

      setSpaces(data.data.spaces || []);
    } catch (error) {
      console.error('Error fetching venue spaces:', error);
      setSpaces([]);
    }
  };

  useEffect(() => {
    const fetchVenueData = async () => {
      setLoading(true);
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

        if (isIdRoute) {
          // Direct ID route
          const venueResponse = await fetch(`${apiUrl}/api/venue/${venueId}`);

          if (venueResponse.ok) {
            const venueData = await venueResponse.json();
            if (venueData.success && venueData.data.venue) {
              setVenueData(venueData.data.venue);
              setResolvedVenueId(venueData.data.venue._id);
              return;
            }
          }

          if (venueResponse.status === 404) {
            toast.error('Venue not found. Please check the URL or go back to venue listings.');
          } else {
            toast.error('Failed to load venue data.');
          }
        } else {
          // Handle venue name routes (non-ID routes)
          const listResponse = await fetch(`${apiUrl}/api/venue/`);
          const listData = await listResponse.json();

          if (!listData?.success) {
            toast.error('Failed to load venues');
            return;
          }

          const venues = (listData?.data?.venues || []) as Array<{ _id: string; name: string; businessName: string; managedByVenueId?: string | null }>;
          const targetSlug = slugifyVenueName(venueId);
          const parentMatch = venues.find(
            (v) => (v.managedByVenueId == null) && (slugifyVenueName(v.businessName || v.name) === targetSlug)
          );
          const anyMatch = venues.find((v) => slugifyVenueName(v.businessName || v.name) === targetSlug);
          const match = parentMatch || anyMatch;

          if (!match?._id) {
            toast.error('Venue not found. Please check the URL or go back to venue listings.');
            return;
          }

          const detailResponse = await fetch(`${apiUrl}/api/venue/${match._id}`);
          const detailData = await detailResponse.json();

          if (!detailResponse.ok) {
            if (detailResponse.status === 404) {
              toast.error('Venue not found. Please check the URL or go back to venue listings.');
            } else {
              toast.error(detailData?.message || 'Failed to load venue data.');
            }
            return;
          }

          if (detailData.success && detailData.data.venue) {
            setVenueData(detailData.data.venue);
            setResolvedVenueId(detailData.data.venue._id);
          } else {
            toast.error('Failed to load venue data.');
          }
        }
      } catch (error) {
        console.error('Fetch venue error:', error);
        toast.error('An error occurred while fetching venue data.');
      } finally {
        setLoading(false);
      }
    };

    fetchVenueData();
  }, [venueId, isIdRoute]);

  useEffect(() => {
    if (venueData && isIdRoute) {
      fetchSimilarVenues();
    }
  }, [venueData, isIdRoute]);

  useEffect(() => {
    if (venueData && resolvedVenueId) {
      fetchVenueSpaces();
    }
  }, [venueData, resolvedVenueId]);

  // Check if current user is the venue owner
  useEffect(() => {
    const checkVenueOwnership = async () => {
      const venueToken = localStorage.getItem('venueToken');
      if (!venueToken || !resolvedVenueId) {
        setIsVenueOwner(false);
        return;
      }

      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
        const response = await fetch(`${apiUrl}/api/venue/profile`, {
          headers: {
            'Authorization': `Bearer ${venueToken}`
          }
        });

        if (response.ok) {
          const data = await response.json();
          if (data.success && data.data.venue) {
            // Check if the logged-in venue ID matches the current venue ID
            const loggedInVenueId = data.data.venue.id || data.data.venue._id;
            setIsVenueOwner(loggedInVenueId === resolvedVenueId || loggedInVenueId.toString() === resolvedVenueId);
          }
        }
      } catch (error) {
        console.error('Error checking venue ownership:', error);
        setIsVenueOwner(false);
      }
    };

    checkVenueOwnership();
  }, [resolvedVenueId]);

  // Handle image upload
  const handleImageUpload = async (files: FileList) => {
    const validFiles = Array.from(files).filter(file => {
      const error = validateFile(file, 5 * 1024 * 1024); // 5MB limit
      if (error) {
        toast.error(error);
        return false;
      }
      return true;
    });

    if (validFiles.length === 0) return;

    setUploadingImages(true);
    try {
      const venueToken = localStorage.getItem('venueToken');
      if (!venueToken) {
        toast.error('Authentication required. Please log in as venue owner.');
        return;
      }

      const formData = new FormData();
      validFiles.forEach((file) => {
        formData.append('photos', file);
      });
      formData.append('folder', 'venue-images');
      formData.append('description', `Venue: ${venueData?.businessName || venueData?.name}`);

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const response = await fetch(`${apiUrl}/api/upload/multiple`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${venueToken}`
        },
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Upload failed');
      }

      const data = await response.json();
      if (data.success && data.data.photos) {
        // Update venue profile with new images
        const currentImages = venueData?.images || [];
        const updatedImages = [...currentImages, ...data.data.photos];

        // Update venue profile
        const updateResponse = await fetch(`${apiUrl}/api/venue/profile`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${venueToken}`
          },
          body: JSON.stringify({ images: updatedImages })
        });

        if (updateResponse.ok) {
          const updateData = await updateResponse.json();
          if (updateData.success) {
            setVenueData(prev => prev ? { ...prev, images: updatedImages } : null);
            toast.success(`${data.data.photos.length} image(s) uploaded successfully`);
          }
        } else {
          toast.error('Images uploaded but failed to update venue profile');
        }
      } else {
        throw new Error('Invalid response from server');
      }
    } catch (error) {
      console.error('Image upload error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to upload images');
    } finally {
      setUploadingImages(false);
    }
  };

  // Handle image deletion
  const handleImageDelete = async (publicId: string) => {
    try {
      const venueToken = localStorage.getItem('venueToken');
      if (!venueToken) {
        toast.error('Authentication required. Please log in as venue owner.');
        return;
      }

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

      // Delete from Cloudinary
      const deleteResponse = await fetch(`${apiUrl}/api/upload/${publicId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${venueToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!deleteResponse.ok) {
        const error = await deleteResponse.json();
        throw new Error(error.message || 'Delete failed');
      }

      // Update venue profile - remove deleted image
      const updatedImages = (venueData?.images || []).filter(img => img.public_id !== publicId);

      const updateResponse = await fetch(`${apiUrl}/api/venue/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${venueToken}`
        },
        body: JSON.stringify({ images: updatedImages })
      });

      if (updateResponse.ok) {
        setVenueData(prev => prev ? { ...prev, images: updatedImages } : null);
        toast.success('Image deleted successfully');
      } else {
        toast.error('Image deleted but failed to update venue profile');
      }
    } catch (error) {
      console.error('Image deletion error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to delete image');
    }
  };

  // Handle drag and drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleImageUpload(files);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-red-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading venue...</p>
        </div>
      </div>
    );
  }

  if (!loading && !venueData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <XCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Venue Not Found</h2>
          <p className="text-gray-600 mb-6">
            The venue you're looking for doesn't exist or has been removed.
          </p>
          <Button
            onClick={() => router.push('/allVenues')}
            className="bg-red-600 hover:bg-red-700"
          >
            Browse All Venues
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
        {/* Breadcrumb */}
        <div className="mb-4">
          <button
            onClick={() => router.push('/allVenues')}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to All Venues
          </button>
        </div>

        {/* Hero Section */}
        {venueData?.images && venueData.images.length > 0 ? (
          <div className="relative w-full aspect-[16/9] md:aspect-[21/9] overflow-hidden rounded-2xl bg-gray-200 group">
            <img
              src={venueData.images[0].url}
              alt={venueData.businessName || venueData.name}
              className="w-full h-full object-cover"
            />
          </div>
        ) : (
          <div className="relative w-full aspect-[16/9] md:aspect-[21/9] overflow-hidden rounded-2xl bg-gray-200">
            <div className="w-full h-full flex flex-col items-center justify-center">
              <Building2 className="h-16 w-16 text-gray-400 mb-2" />
              <p className="text-gray-500">No venue images available</p>
            </div>
          </div>
        )}

        {/* Hidden file input */}
        {isVenueOwner && (
          <input
            type="file"
            multiple
            accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
            onChange={(e) => e.target.files && handleImageUpload(e.target.files)}
            className="hidden"
            id="image-upload-hero"
          />
        )}



        {/* Hidden file input for gallery */}
        {isVenueOwner && (
          <input
            type="file"
            multiple
            accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
            onChange={(e) => e.target.files && handleImageUpload(e.target.files)}
            className="hidden"
            id="image-upload-gallery"
          />
        )}

        {/* Main Content Grid */}
        <div className="mt-6 lg:mt-8 grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
          {/* Left Column - Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Header */}
            <div>
              <h1 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-2">
                {venueData?.businessName || venueData?.name}
              </h1>

              <div className="flex items-center gap-3 text-sm text-gray-600 mb-4">
                <div className="flex items-center gap-1">
                  <MapPin className="h-4 w-4" />
                  <span>{venueData?.address.city}, {venueData?.address.state}</span>
                </div>
                
              </div>
            </div>



            {/* Available Spaces */}
            {spaces.length > 0 && (
              <div className="bg-card rounded-xl border border-surface-border p-6 shadow-sm animate-fade-in">
                <h2 className="text-lg font-semibold text-foreground mb-4">
                  Available Spaces ({spaces.length})
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {spaces.map((space) => {
                    const image = getPrimaryVenueImage(space);
                    const capacity = space.capacityDetails?.standingCapacity ?? space.capacity ?? 0;

                    return (
                      <button
                        key={space._id}
                        onClick={() => router.push(`/allVenues/${resolvedVenueId}/${space._id}`)}
                        className="group text-left w-full bg-card rounded-xl border border-surface-border shadow-sm overflow-hidden hover:shadow-md transition-shadow duration-200"
                      >
                        <div className="aspect-[16/10] overflow-hidden">
                          {image ? (
                            <img
                              src={image}
                              alt={space.name}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                          ) : (
                            <div className="w-full h-full bg-muted flex items-center justify-center">
                              <Building2 className="h-8 w-8 text-muted-foreground" />
                            </div>
                          )}
                        </div>
                        <div className="p-4">
                          <h3 className="font-medium text-foreground line-clamp-1 group-hover:text-primary transition-colors">
                            {space.name}
                          </h3>
                          <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                            {space.description}
                          </p>
                          <div className="flex items-center justify-between mt-3">
                            <div className="flex flex-col gap-1">
                              <span className="text-xs text-blue-600 font-medium bg-blue-50 px-2 py-1 rounded-full">
                                {formatVenueType(space)}
                              </span>
                              <span className="text-sm text-muted-foreground">
                                Upto {capacity} guests
                              </span>
                            </div>
                            <span className="text-sm font-semibold text-foreground">
                              ₹{space.pricing.basePrice.toLocaleString("en-IN")}
                            </span>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* About This Venue */}
            <div className="bg-card rounded-xl border border-surface-border p-6 shadow-sm animate-fade-in">
              <h2 className="text-lg font-semibold text-foreground mb-3">
                About this venue
              </h2>

              <p className="text-sm text-muted-foreground leading-relaxed mb-6">
                This venue is managed by {venueData?.name}.
              </p>

              {/* Contact Info */}
              <div className="space-y-3.5">
                {/* Address */}
                {venueData?.address.city && (
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                      `${venueData?.address.street || ''}, ${venueData?.address.city}, ${venueData?.address.state} ${venueData?.address.pincode || ''}`
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-start gap-3 text-sm text-foreground hover:text-primary transition-colors group"
                  >
                    <MapPin className="w-4 h-4 mt-0.5 text-muted-foreground group-hover:text-foreground flex-shrink-0" />
                    <span>
                      {venueData?.address.street && `${venueData.address.street}, `}
                      {venueData?.address.city}
                      {venueData?.address.state && `, ${venueData.address.state}`}
                      {venueData?.address.pincode && ` ${venueData.address.pincode}`}
                    </span>
                  </a>
                )}

                {/* Phone */}
                <a
                  href={`tel:${venueData?.phone}`}
                  className="flex items-center gap-3 text-sm text-foreground hover:text-primary transition-colors"
                >
                  <Phone className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  <span>{venueData?.phone}</span>
                </a>

                {/* Email */}
                <a
                  href={`mailto:${venueData?.email}`}
                  className="flex items-center gap-3 text-sm text-foreground hover:text-primary transition-colors"
                >
                  <Mail className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  <span>{venueData?.email}</span>
                </a>

                {/* Website */}
                {venueData?.socialLinks && venueData.socialLinks.website && (
                  <a
                    href={venueData.socialLinks.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 text-sm text-foreground hover:text-primary transition-colors"
                  >
                    <Globe className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    <span>{venueData.socialLinks.website}</span>
                  </a>
                )}
              </div>
            </div>
            {/* Venue Gallery */}
            <div className="mt-6">
              <h2 className="text-xl font-semibold text-foreground mb-4">
                Venue Gallery {venueData?.images && venueData.images.length > 0 && `(${venueData.images.length})`}
              </h2>

              {venueData?.images && venueData.images.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                  {venueData.images.map((image, index) => (
                    <div
                      key={image.public_id || index}
                      className="relative aspect-square rounded-lg overflow-hidden bg-gray-200 group"
                    >
                      <img
                        src={image.url}
                        alt={`${venueData.businessName || venueData.name} - Image ${index + 1}`}
                        className="w-full h-full object-cover cursor-pointer hover:opacity-90 transition-opacity"
                        onClick={() => {
                          // Open image in new tab
                          window.open(image.url, '_blank');
                        }}
                      />
                      {isVenueOwner && image.public_id && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm('Are you sure you want to delete this image?')) {
                              handleImageDelete(image.public_id!);
                            }
                          }}
                          className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-lg">
                  <ImageIcon className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-500">No venue images available</p>
                </div>
              )}
            </div>

            {/* Similar Venues */}
            {similarVenues.length > 0 && (
              <div className="bg-card rounded-xl border border-surface-border p-6 shadow-sm animate-fade-in">
                <h2 className="text-lg font-semibold text-foreground mb-4">
                  Similar Venues
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {similarVenues.map((venue) => {
                    const venueImage = venue.images && venue.images.length > 0
                      ? venue.images[0].url
                      : null;

                    return (
                      <button
                        key={venue._id}
                        onClick={() => router.push(`/allVenues/${venue._id}`)}
                        className="group text-left w-full bg-card rounded-xl border border-surface-border shadow-sm overflow-hidden hover:shadow-md transition-shadow duration-200"
                      >
                        <div className="aspect-[16/10] overflow-hidden bg-muted">
                          {venueImage ? (
                            <img
                              src={venueImage}
                              alt={venue.businessName || venue.name}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Building2 className="h-8 w-8 text-muted-foreground" />
                            </div>
                          )}
                        </div>
                        <div className="p-4">
                          <h3 className="font-medium text-foreground line-clamp-1 group-hover:text-primary transition-colors">
                            {venue.businessName || venue.name}
                          </h3>
                          <p className="text-sm text-muted-foreground mt-1">
                            {venue.address.city}, {venue.address.state}
                          </p>
                          
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Right Column - Booking & Info */}
          <div className="space-y-6">
            {/* Contact Card */}
            <div className="bg-card rounded-xl border border-surface-border p-6 shadow-sm">
              <h3 className="font-semibold text-foreground mb-4">Contact Venue</h3>
              <div className="space-y-4">
                <Button
                  onClick={() => window.open(`tel:${venueData?.phone}`)}
                  className="w-full"
                  size="lg"
                >
                  <Phone className="h-4 w-4 mr-2" />
                  Call Venue
                </Button>
                <Button
                  onClick={() => window.open(`mailto:${venueData?.email}`)}
                  variant="outline"
                  className="w-full"
                  size="lg"
                >
                  <Mail className="h-4 w-4 mr-2" />
                  Send Email
                </Button>
                {venueData?.socialLinks?.website && (
                  <Button
                    onClick={() => window.open(venueData?.socialLinks?.website)}
                    variant="outline"
                    className="w-full"
                    size="lg"
                  >
                    <Globe className="h-4 w-4 mr-2" />
                    Visit Website
                  </Button>
                )}
              </div>

              {/* Social Media Links */}
              {(venueData?.socialLinks?.facebook || venueData?.socialLinks?.instagram || venueData?.socialLinks?.twitter) && (
                <div className="mt-6 pt-6 border-t border-surface-border">
                  <h4 className="font-medium text-foreground mb-3">Follow Us</h4>
                  <div className="flex flex-wrap gap-3">
                    {venueData?.socialLinks?.facebook && (
                      <Button
                        onClick={() => window.open(venueData?.socialLinks?.facebook)}
                        variant="outline"
                        size="sm"
                        className="flex items-center gap-2 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-600 transition-colors"
                      >
                        <Facebook className="h-4 w-4" />
                        <span>Facebook</span>
                      </Button>
                    )}
                    {venueData?.socialLinks?.instagram && (
                      <Button
                        onClick={() => window.open(venueData?.socialLinks?.instagram)}
                        variant="outline"
                        size="sm"
                        className="flex items-center gap-2 hover:bg-pink-50 hover:border-pink-200 hover:text-pink-600 transition-colors"
                      >
                        <Instagram className="h-4 w-4" />
                        <span>Instagram</span>
                      </Button>
                    )}
                    {venueData?.socialLinks?.twitter && (
                      <Button
                        onClick={() => window.open(venueData?.socialLinks?.twitter)}
                        variant="outline"
                        size="sm"
                        className="flex items-center gap-2 hover:bg-sky-50 hover:border-sky-200 hover:text-sky-600 transition-colors"
                      >
                        <Twitter className="h-4 w-4" />
                        <span>Twitter</span>
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </div>


          </div>
        </div>

      <Footer />
    </div>
    </div>
  );

}