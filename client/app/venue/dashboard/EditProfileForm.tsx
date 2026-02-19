'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Save, X, Edit2, Building, Mail, Phone, User, MapPin, Upload, Image as ImageIcon, Trash2, Globe, Facebook, Instagram, Twitter, Shield } from 'lucide-react';

interface CloudinaryPhoto {
  public_id: string;
  url: string;
  width: number;
  height: number;
  format: string;
  size: number;
  created_at: string;
}

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

interface VenueData {
  id: string;
  name: string;
  email: string;
  phone: string;
  businessName: string;
  status: string;
  isVerified: boolean;
  isActive: boolean;
  createdAt: string;
  images?: CloudinaryPhoto[];
  address?: {
    street?: string;
    city?: string;
    state?: string;
    pincode?: string;
    country?: string;
  };
  contactPerson?: {
    name?: string;
    phone?: string;
    email?: string;
  };
  socialLinks?: {
    website?: string;
    facebook?: string;
    instagram?: string;
    twitter?: string;
  };
}

interface EditProfileFormProps {
  venue: VenueData | null;
  onUpdate: () => void;
}

export default function EditProfileForm({ venue, onUpdate }: EditProfileFormProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [venueImages, setVenueImages] = useState<CloudinaryPhoto[]>(venue?.images || []);

  // Sync venueImages when venue prop changes
  useEffect(() => {
    if (venue) {
      // Always sync images from venue prop, even if empty array
      setVenueImages(Array.isArray(venue.images) ? venue.images : []);
    }
  }, [venue?.id, venue?.images?.length]);

  const [formData, setFormData] = useState({
    name: venue?.name || '',
    businessName: venue?.businessName || '',
    email: venue?.email || '',
    phone: venue?.phone || '',
    address: {
      street: venue?.address?.street || '',
      city: venue?.address?.city || '',
      state: venue?.address?.state || '',
      pincode: venue?.address?.pincode || '',
      country: venue?.address?.country || 'India'
    },
    socialLinks: {
      website: venue?.socialLinks?.website || '',
      facebook: venue?.socialLinks?.facebook || '',
      instagram: venue?.socialLinks?.instagram || '',
      twitter: venue?.socialLinks?.twitter || ''
    }
  });

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
      // Use venue token for venue image uploads
      const venueToken = localStorage.getItem('venueToken');
      if (!venueToken) {
        toast.error('Authentication required. Please log in again.');
        return;
      }

      const formData = new FormData();
      validFiles.forEach((file) => {
        formData.append('photos', file);
      });
      formData.append('folder', 'venue-images');
      formData.append('description', `Venue: ${venue?.businessName || venue?.name}`);

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
        setVenueImages(prev => [...prev, ...data.data.photos]);
        toast.success(`${data.data.photos.length} image(s) uploaded successfully`);
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
      // Use venue token for venue image deletion
      const venueToken = localStorage.getItem('venueToken');
      if (!venueToken) {
        toast.error('Authentication required. Please log in again.');
        return;
      }

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const response = await fetch(`${apiUrl}/api/upload/${publicId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${venueToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Delete failed');
      }

      setVenueImages(prev => prev.filter(img => img.public_id !== publicId));
      toast.success('Image deleted successfully');
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

  const handleInputChange = (field: string, value: string) => {
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...(prev[parent as keyof typeof prev] as any),
          [child]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [field]: value
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Create a clean data object
      const cleanedData: any = {};

      // Add basic fields only if they have values
      if (formData.name.trim()) cleanedData.name = formData.name.trim();
      if (formData.businessName.trim()) cleanedData.businessName = formData.businessName.trim();
      if (formData.email.trim()) cleanedData.email = formData.email.trim();
      if (formData.phone.trim()) cleanedData.phone = formData.phone.trim();

      // Handle address fields - only include non-empty fields
      const addressFields: any = {};
      if (formData.address.street.trim()) addressFields.street = formData.address.street.trim();
      if (formData.address.city.trim()) addressFields.city = formData.address.city.trim();
      if (formData.address.state.trim()) addressFields.state = formData.address.state.trim();
      if (formData.address.pincode.trim()) addressFields.pincode = formData.address.pincode.trim();
      if (formData.address.country.trim()) addressFields.country = formData.address.country.trim();

      if (Object.keys(addressFields).length > 0) {
        cleanedData.address = addressFields;
      }

      // Add images if they exist
      if (venueImages.length > 0) {
        cleanedData.images = venueImages;
      }

      // Add social links if they have values
      const socialLinksFields: any = {};
      if (formData.socialLinks.website.trim()) socialLinksFields.website = formData.socialLinks.website.trim();
      if (formData.socialLinks.facebook.trim()) socialLinksFields.facebook = formData.socialLinks.facebook.trim();
      if (formData.socialLinks.instagram.trim()) socialLinksFields.instagram = formData.socialLinks.instagram.trim();
      if (formData.socialLinks.twitter.trim()) socialLinksFields.twitter = formData.socialLinks.twitter.trim();

      if (Object.keys(socialLinksFields).length > 0) {
        cleanedData.socialLinks = socialLinksFields;
      }

      // Debug logging
      console.log('Original formData:', formData);
      console.log('Cleaned data being sent:', cleanedData);

      const token = localStorage.getItem('venueToken');
      const response = await fetch('/api/venue/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(cleanedData)
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Profile updated successfully!');
        setIsEditing(false);
        onUpdate();
      } else {
        console.error('Backend response:', data);
        toast.error(data.message || 'Failed to update profile');
      }
    } catch (error) {
      console.error('Update profile error:', error);
      toast.error('Failed to update profile');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      name: venue?.name || '',
      businessName: venue?.businessName || '',
      email: venue?.email || '',
      phone: venue?.phone || '',
      address: {
        street: venue?.address?.street || '',
        city: venue?.address?.city || '',
        state: venue?.address?.state || '',
        pincode: venue?.address?.pincode || '',
        country: venue?.address?.country || 'India'
      },
      socialLinks: {
        website: venue?.socialLinks?.website || '',
        facebook: venue?.socialLinks?.facebook || '',
        instagram: venue?.socialLinks?.instagram || '',
        twitter: venue?.socialLinks?.twitter || ''
      }
    });
    setVenueImages(venue?.images || []);
    setIsEditing(false);
  };

  if (!isEditing) {
    return (
      <div className="space-y-6">
        {/* Profile Header */}
        <div className="bg-white/80 backdrop-blur-sm rounded-lg border p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <User className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Venue Settings</h2>
                <p className="text-sm text-gray-600">Update your venue profile and business information</p>
              </div>
            </div>
            <Button
              onClick={() => setIsEditing(true)}
              className="bg-green-600 hover:bg-green-700 text-white px-4 sm:px-6 py-2 rounded-lg transition-colors"
            >
              <Edit2 className="h-4 w-4 mr-2" />
              Edit Profile
            </Button>
          </div>
        </div>

        {/* Profile Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Basic Information Card */}
          <Card className="bg-white/80 backdrop-blur-sm border hover:shadow-md transition-all duration-200">
            <CardHeader className="pb-4">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Building className="h-4 w-4 text-blue-600" />
                </div>
                <CardTitle className="text-lg text-gray-900">Basic Information</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-500 mb-1">Business Name</p>
                <p className="font-semibold text-gray-900">{venue?.businessName || 'Not set'}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-500 mb-1">Contact Name</p>
                <p className="font-semibold text-gray-900">{venue?.name || 'Not set'}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-500 mb-1">Email Address</p>
                <p className="font-semibold text-gray-900">{venue?.email}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-500 mb-1">Phone Number</p>
                <p className="font-semibold text-gray-900">{venue?.phone}</p>
              </div>
            </CardContent>
          </Card>

          {/* Address Information Card */}
          <Card className="bg-white/80 backdrop-blur-sm border hover:shadow-md transition-all duration-200">
            <CardHeader className="pb-4">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                  <MapPin className="h-4 w-4 text-purple-600" />
                </div>
                <CardTitle className="text-lg text-gray-900">Address Information</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-500 mb-1">Street Address</p>
                <p className="font-semibold text-gray-900">{venue?.address?.street || 'Not set'}</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-500 mb-1">City</p>
                  <p className="font-semibold text-gray-900">{venue?.address?.city || 'Not set'}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-500 mb-1">State</p>
                  <p className="font-semibold text-gray-900">{venue?.address?.state || 'Not set'}</p>
                </div>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-500 mb-1">Pincode</p>
                <p className="font-semibold text-gray-900">{venue?.address?.pincode || 'Not set'}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Social Media Links Card */}
        <Card className="bg-white/80 backdrop-blur-sm border hover:shadow-md transition-all duration-200">
          <CardHeader className="pb-4">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-pink-100 rounded-lg flex items-center justify-center">
                <Globe className="h-4 w-4 text-pink-600" />
              </div>
              <CardTitle className="text-lg text-gray-900">Social Media Links</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-gray-50 rounded-lg p-4 hover:bg-gray-100 transition-colors">
                <div className="flex items-center space-x-2 mb-2">
                  <Globe className="h-4 w-4 text-blue-600" />
                  <p className="text-sm text-gray-500">Website</p>
                </div>
                {venue?.socialLinks?.website ? (
                  <a
                    href={venue.socialLinks.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 underline text-sm font-medium break-all"
                  >
                    {venue.socialLinks.website}
                  </a>
                ) : (
                  <p className="text-gray-400 text-sm">Not set</p>
                )}
              </div>

              <div className="bg-gray-50 rounded-lg p-4 hover:bg-gray-100 transition-colors">
                <div className="flex items-center space-x-2 mb-2">
                  <Facebook className="h-4 w-4 text-blue-600" />
                  <p className="text-sm text-gray-500">Facebook</p>
                </div>
                {venue?.socialLinks?.facebook ? (
                  <a
                    href={venue.socialLinks.facebook}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 underline text-sm font-medium break-all"
                  >
                    {venue.socialLinks.facebook}
                  </a>
                ) : (
                  <p className="text-gray-400 text-sm">Not set</p>
                )}
              </div>

              <div className="bg-gray-50 rounded-lg p-4 hover:bg-gray-100 transition-colors">
                <div className="flex items-center space-x-2 mb-2">
                  <Instagram className="h-4 w-4 text-pink-600" />
                  <p className="text-sm text-gray-500">Instagram</p>
                </div>
                {venue?.socialLinks?.instagram ? (
                  <a
                    href={venue.socialLinks.instagram}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-pink-600 hover:text-pink-800 underline text-sm font-medium break-all"
                  >
                    {venue.socialLinks.instagram}
                  </a>
                ) : (
                  <p className="text-gray-400 text-sm">Not set</p>
                )}
              </div>

              <div className="bg-gray-50 rounded-lg p-4 hover:bg-gray-100 transition-colors">
                <div className="flex items-center space-x-2 mb-2">
                  <Twitter className="h-4 w-4 text-blue-400" />
                  <p className="text-sm text-gray-500">Twitter</p>
                </div>
                {venue?.socialLinks?.twitter ? (
                  <a
                    href={venue.socialLinks.twitter}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:text-blue-600 underline text-sm font-medium break-all"
                  >
                    {venue.socialLinks.twitter}
                  </a>
                ) : (
                  <p className="text-gray-400 text-sm">Not set</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Venue Images Card */}
        <Card className="bg-white/80 backdrop-blur-sm border hover:shadow-md transition-all duration-200">
          <CardHeader className="pb-4">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                <ImageIcon className="h-4 w-4 text-orange-600" />
              </div>
              <CardTitle className="text-lg text-gray-900">Venue Images</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {venueImages.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
                {venueImages.map((image) => (
                  <div key={image.public_id} className="aspect-square rounded-lg overflow-hidden bg-gray-100 group">
                    <img
                      src={image.url}
                      alt="Venue image"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-lg bg-gray-50">
                <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                  <ImageIcon className="h-8 w-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No venue images</h3>
                <p className="text-gray-600">Upload images to showcase your venue to customers</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Account Status Card */}
        <Card className="bg-gradient-to-r from-green-50 to-blue-50 border-green-200">
          <CardHeader className="pb-4">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center">
                <Shield className="h-4 w-4 text-white" />
              </div>
              <CardTitle className="text-lg text-gray-900">Account Status</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className="flex items-center space-x-3">
                <span className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-medium ${venue?.status === 'approved' || venue?.status === 'active'
                    ? 'bg-green-100 text-green-800 border border-green-200'
                    : venue?.status === 'pending'
                      ? 'bg-yellow-100 text-yellow-800 border border-yellow-200'
                      : 'bg-red-100 text-red-800 border border-red-200'
                  }`}>
                  {venue?.status === 'approved' || venue?.status === 'active' ? '✓ Active' :
                    venue?.status === 'pending' ? '⏳ Pending' :
                      venue?.status || 'Unknown'}
                </span>
                {venue?.isVerified && (
                  <span className="inline-flex items-center px-4 py-2 rounded-full text-sm font-medium bg-blue-100 text-blue-800 border border-blue-200">
                    ✓ Verified
                  </span>
                )}
              </div>
              <div className="text-sm text-gray-600">
                {venue?.status === 'approved' || venue?.status === 'active'
                  ? 'Your venue is active and ready to accept bookings'
                  : venue?.status === 'pending'
                    ? 'Your venue is under review by our team'
                    : 'Please contact support for assistance'}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Edit Form Header */}
      <div className="bg-white/80 backdrop-blur-sm rounded-lg border p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <Edit2 className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Edit Profile</h2>
              <p className="text-sm text-gray-600">Update your venue and business information</p>
            </div>
          </div>
          <div className="flex space-x-2">
            <Button
              variant="outline"
              onClick={handleCancel}
              className="border-gray-300 hover:border-gray-400"
            >
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isLoading}
              className="bg-green-600 hover:bg-green-700 text-white px-4 sm:px-6 py-2 rounded-lg transition-colors"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Edit Form Content */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <div>
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <Building className="h-5 w-5 mr-2" />
            Basic Information
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">Contact Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                minLength={2}
                maxLength={50}
                placeholder="Enter contact name"
              />
            </div>

            <div>
              <Label htmlFor="businessName">Business Name</Label>
              <Input
                id="businessName"
                value={formData.businessName}
                onChange={(e) => handleInputChange('businessName', e.target.value)}
                minLength={2}
                maxLength={100}
                placeholder="Enter business name"
              />
            </div>

            <div>
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                placeholder="Enter email address"
              />
            </div>

            <div>
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                pattern="[6-9][0-9]{9}"
                placeholder="9876543210"
              />
            </div>
          </div>
        </div>

        {/* Address Information */}
        <div>
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <MapPin className="h-5 w-5 mr-2" />
            Address Information
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <Label htmlFor="street">Street Address</Label>
              <Input
                id="street"
                value={formData.address.street}
                onChange={(e) => handleInputChange('address.street', e.target.value)}
                placeholder="123, Main Street"
              />
            </div>

            <div>
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                value={formData.address.city}
                onChange={(e) => handleInputChange('address.city', e.target.value)}
                maxLength={50}
                placeholder="Enter city"
              />
            </div>

            <div>
              <Label htmlFor="state">State</Label>
              <Input
                id="state"
                value={formData.address.state}
                onChange={(e) => handleInputChange('address.state', e.target.value)}
                maxLength={50}
                placeholder="Enter state"
              />
            </div>

            <div>
              <Label htmlFor="pincode">Pincode</Label>
              <Input
                id="pincode"
                value={formData.address.pincode}
                onChange={(e) => handleInputChange('address.pincode', e.target.value)}
                pattern="[0-9]{6}"
                placeholder="110001"
              />
            </div>

            <div>
              <Label htmlFor="country">Country</Label>
              <Input
                id="country"
                value={formData.address.country}
                onChange={(e) => handleInputChange('address.country', e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Social Media Links */}
        <div>
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <Globe className="h-5 w-5 mr-2" />
            Social Media Links
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="website">Website</Label>
              <Input
                id="website"
                type="url"
                value={formData.socialLinks.website}
                onChange={(e) => handleInputChange('socialLinks.website', e.target.value)}
                placeholder="https://yourwebsite.com"
              />
            </div>

            <div>
              <Label htmlFor="facebook">Facebook</Label>
              <Input
                id="facebook"
                type="url"
                value={formData.socialLinks.facebook}
                onChange={(e) => handleInputChange('socialLinks.facebook', e.target.value)}
                placeholder="https://facebook.com/yourpage"
              />
            </div>

            <div>
              <Label htmlFor="instagram">Instagram</Label>
              <Input
                id="instagram"
                type="url"
                value={formData.socialLinks.instagram}
                onChange={(e) => handleInputChange('socialLinks.instagram', e.target.value)}
                placeholder="https://instagram.com/yourprofile"
              />
            </div>

            <div>
              <Label htmlFor="twitter">Twitter</Label>
              <Input
                id="twitter"
                type="url"
                value={formData.socialLinks.twitter}
                onChange={(e) => handleInputChange('socialLinks.twitter', e.target.value)}
                placeholder="https://twitter.com/yourhandle"
              />
            </div>
          </div>
        </div>

        {/* Venue Images */}
        <div>
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <ImageIcon className="h-5 w-5 mr-2" />
            Venue Images
          </h3>

          {/* Upload Area */}
          <div
            className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors"
            onDragOver={handleDragOver}
            onDrop={handleDrop}
          >
            <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <div className="space-y-2">
              <p className="text-lg font-medium text-gray-900">
                Upload venue images
              </p>
              <p className="text-sm text-gray-500">
                Drag and drop images here, or click to select files
              </p>
              <p className="text-xs text-gray-400">
                Supported formats: JPEG, PNG, GIF, WebP (Max 5MB per file)
              </p>
            </div>
            <input
              type="file"
              multiple
              accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
              onChange={(e) => e.target.files && handleImageUpload(e.target.files)}
              className="hidden"
              id="image-upload"
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => document.getElementById('image-upload')?.click()}
              disabled={uploadingImages}
              className="mt-4"
            >
              {uploadingImages ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600 mr-2"></div>
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Select Images
                </>
              )}
            </Button>
          </div>

          {/* Image Gallery */}
          {venueImages.length > 0 && (
            <div className="mt-6">
              <h4 className="text-md font-medium mb-3">Current Images ({venueImages.length})</h4>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {venueImages.map((image) => (
                  <div key={image.public_id} className="relative group">
                    <div className="aspect-square rounded-lg overflow-hidden bg-gray-100">
                      <img
                        src={image.url}
                        alt="Venue image"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => handleImageDelete(image.public_id)}
                      className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                    <div className="mt-1 text-xs text-gray-500 truncate">
                      {image.format.toUpperCase()} • {Math.round(image.size / 1024)}KB
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end space-x-2 pt-4 border-t">
          <Button type="button" variant="outline" onClick={handleCancel}>
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            {isLoading ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </form>
    </div>


  );
}
