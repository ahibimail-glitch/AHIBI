"use client";

import { useState, useEffect, useRef } from "react";
import { useDashboard } from "../dashboard-context";
import Image from "next/image";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Star,
  MapPin,
  DollarSign,
  Edit,
  Camera,
  Instagram,
  Youtube,
  Music2,
  Facebook,
  Twitter,
  Globe,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { uploadToVercelBlob } from "@/lib/vercelBlob";

const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024;
const MAX_IMAGE_SIZE_LABEL = "10MB";

export default function ProfilePage() {
  const { user, profile, fetchArtistProfile, setSuccessMessage, setError, successMessage } = useDashboard();
  const [isEditing, setIsEditing] = useState(false);
  const [uploadingImage, setUploadingImage] = useState<'profile' | 'cover' | null>(null);
  const [imageUploadError, setImageUploadError] = useState<string | null>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const profileInputRef = useRef<HTMLInputElement>(null);
  const [formState, setFormState] = useState({
    gender: '',
    showEventTypesOther: false,
    showPerformanceDurationOther: false,
    showPerformanceFormatsOther: false,
  });

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

  const handleImageUpload = async (file: File, type: 'profile' | 'cover') => {
    const inputRef = type === 'cover' ? coverInputRef : profileInputRef;

    if (!file.type.startsWith('image/')) {
      setImageUploadError('Please select a valid image file');
      if (inputRef.current) inputRef.current.value = '';
      return;
    }

    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      setImageUploadError(`Image must be smaller than ${MAX_IMAGE_SIZE_LABEL}`);
      if (inputRef.current) inputRef.current.value = '';
      return;
    }

    try {
      setUploadingImage(type);
      setImageUploadError(null);

      const uploadData = await uploadToVercelBlob(file, 'artists', 'image');
      const imageUrl = uploadData.url;

      if (!imageUrl) {
        throw new Error('Upload failed: no image URL returned');
      }

      const token = localStorage.getItem('artist_token');
      if (!token) {
        setImageUploadError('Not authenticated');
        return;
      }

      const updateData: Record<string, string> = {};
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
        await fetchArtistProfile();
        setSuccessMessage(`${type === 'profile' ? 'Profile' : 'Cover'} image updated successfully!`);
        setTimeout(() => setSuccessMessage(null), 5000);
      } else {
        const errorData = await response.json().catch((): { message?: string } | null => null);
        setImageUploadError(errorData?.message || `Failed to update ${type} image`);
      }
    } catch (error) {
      console.error(`Error uploading ${type} image:`, error);
      setImageUploadError(error instanceof Error ? error.message : `Error uploading ${type} image. Please try again.`);
    } finally {
      setUploadingImage(null);
      if (inputRef.current) inputRef.current.value = '';
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

      const cleanValue = (value: string | null): string | undefined => {
        return value && value.trim() !== '' ? value.trim() : undefined;
      };

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

      const basePrice = formData.get('basePrice') as string;
      if (basePrice && basePrice.trim() !== '') {
        updateData.basePrice = parseFloat(basePrice);
      }

      const feeMin = formData.get('feeMin') as string;
      const feeMax = formData.get('feeMax') as string;
      if (feeMin || feeMax) {
        updateData.feeRange = {};
        if (feeMin && feeMin.trim() !== '') updateData.feeRange.min = parseFloat(feeMin);
        if (feeMax && feeMax.trim() !== '') updateData.feeRange.max = parseFloat(feeMax);
      }

      const socialLinks: any = {};
      const instagram = cleanValue(formData.get('instagram') as string);
      const youtube = cleanValue(formData.get('youtube') as string);
      const spotify = cleanValue(formData.get('spotify') as string);
      const appleMusic = cleanValue(formData.get('appleMusic') as string);
      const youtubeMusic = cleanValue(formData.get('youtubeMusic') as string);
      const soundCloud = cleanValue(formData.get('soundCloud') as string);
      const facebook = cleanValue(formData.get('facebook') as string);
      const twitter = cleanValue(formData.get('twitter') as string);
      const website = cleanValue(formData.get('website') as string);
      
      if (instagram) socialLinks.instagram = instagram;
      if (youtube) socialLinks.youtube = youtube;
      if (spotify) socialLinks.spotify = spotify;
      if (appleMusic) socialLinks.appleMusic = appleMusic;
      if (youtubeMusic) socialLinks.youtubeMusic = youtubeMusic;
      if (soundCloud) socialLinks.soundCloud = soundCloud;
      if (facebook) socialLinks.facebook = facebook;
      if (twitter) socialLinks.twitter = twitter;
      if (website) socialLinks.website = website;
      
      if (Object.keys(socialLinks).length > 0) {
        updateData.socialLinks = socialLinks;
      }

      const eventTypesOther = cleanValue(formData.get('eventTypesOther') as string);
      const performanceDurationOther = cleanValue(formData.get('performanceDurationOther') as string);
      const performanceFormatsOther = cleanValue(formData.get('performanceFormatsOther') as string);
      
      if (eventTypesOther) updateData.eventTypesOther = eventTypesOther;
      if (performanceDurationOther) updateData.performanceDurationOther = performanceDurationOther;
      if (performanceFormatsOther) updateData.performanceFormatsOther = performanceFormatsOther;

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

      if (formState.gender) updateData.gender = formState.gender;

      const response = await fetch('/api/artist/profile', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updateData)
      });

      if (response.ok) {
        await fetchArtistProfile();
        setIsEditing(false);
        setError(null);
        setSuccessMessage('Profile updated successfully!');
        setTimeout(() => setSuccessMessage(null), 5000);
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Failed to update profile');
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      setError('Error updating profile. Please try again.');
    }
  };

  const coverImageSrc =
    profile?.coverImage ||
    profile?.gallery?.photos?.find((p) => p.isCoverImage)?.url ||
    "/images/carausel1.jpg";
  const profileImageSrc =
    profile?.profilePic ||
    profile?.profileImage ||
    profile?.gallery?.photos?.find((p) => p.isProfileImage)?.url ||
    "/images/carausel1.jpg";
  const isExternalImage = (src: string) => src.startsWith("http");

  return (
    <div className="space-y-6">
      {/* Profile Header - Show when not editing */}
      {!isEditing && (
        <Card>
          <div className="relative">
            <Image
              src={coverImageSrc}
              alt="Cover"
              width={800}
              height={300}
              unoptimized={isExternalImage(coverImageSrc)}
              className="w-full h-48 md:h-64 object-cover rounded-t-lg"
            />
            {uploadingImage === 'cover' && (
              <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center rounded-t-lg z-10">
                <Loader2 className="h-8 w-8 animate-spin text-white" />
                <p className="mt-2 text-sm text-white font-medium">Uploading cover...</p>
              </div>
            )}
            <label className="absolute top-4 right-4 z-20 flex flex-col items-end gap-1">
              <input
                ref={coverInputRef}
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
                  {uploadingImage === 'cover' ? (
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  ) : (
                    <Camera className="h-4 w-4 mr-1" />
                  )}
                  {uploadingImage === 'cover' ? 'Uploading...' : 'Change Cover'}
                </span>
              </Button>
              <span className="text-[11px] text-white/90 drop-shadow-sm">
                Max size {MAX_IMAGE_SIZE_LABEL}
              </span>
            </label>
          </div>
          {imageUploadError && (
            <div className="px-6 pt-4">
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{imageUploadError}</AlertDescription>
              </Alert>
            </div>
          )}
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row items-start md:items-center space-y-4 md:space-y-0 md:space-x-6">
              <div className="relative">
                <Avatar className="w-24 h-24">
                  <AvatarImage src={profileImageSrc} />
                  <AvatarFallback>{user?.name?.charAt(0) || 'A'}</AvatarFallback>
                </Avatar>
                {uploadingImage === 'profile' && (
                  <div className="absolute inset-0 bg-black/50 rounded-full flex flex-col items-center justify-center z-10">
                    <Loader2 className="h-6 w-6 animate-spin text-white" />
                  </div>
                )}
                <label className="absolute -bottom-2 -right-2 z-20 flex flex-col items-center gap-1">
                  <input
                    ref={profileInputRef}
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
                      {uploadingImage === 'profile' ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Camera className="h-4 w-4" />
                      )}
                    </span>
                  </Button>
                  <span className="text-[10px] mt-4 text-muted-foreground whitespace-nowrap">
                    Max {MAX_IMAGE_SIZE_LABEL}
                  </span>
                </label>
              </div>
              <div className="flex-1">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-2">
                  <h2 className="text-xl sm:text-2xl font-bold">{user?.name}</h2>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full sm:w-auto"
                    onClick={() => setIsEditing(!isEditing)}
                  >
                    <Edit className="h-4 w-4 mr-1" />
                    Edit Profile
                  </Button>
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground mb-3">
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
                    <Badge key={g} variant="secondary">{g}</Badge>
                  ))}
                  {profile?.languages?.map((l) => (
                    <Badge key={l} variant="outline">{l}</Badge>
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
            <CardDescription>Update your complete profile information</CardDescription>
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
                         region === 'pan-india' ? 'Pan-India' : 'International'}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Artist Category */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold border-b pb-2">Artist Category</h3>
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
                <h3 className="text-lg font-semibold border-b pb-2">Social & Streaming Links</h3>
                <p className="text-sm text-muted-foreground">
                  Streaming links also appear in your EPK section. Manage them in EPK & Tech Rider for the best visibility.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="instagram" className="flex items-center gap-2">
                      <Instagram className="h-4 w-4" /> Instagram
                    </Label>
                    <Input id="instagram" name="instagram" type="url" defaultValue={profile?.socialLinks?.instagram} placeholder="https://instagram.com/yourhandle" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="youtube" className="flex items-center gap-2">
                      <Youtube className="h-4 w-4" /> YouTube
                    </Label>
                    <Input id="youtube" name="youtube" type="url" defaultValue={profile?.socialLinks?.youtube} placeholder="https://youtube.com/yourchannel" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="spotify" className="flex items-center gap-2">
                      <Music2 className="h-4 w-4" /> Spotify
                    </Label>
                    <Input id="spotify" name="spotify" type="url" defaultValue={profile?.socialLinks?.spotify} placeholder="https://open.spotify.com/artist/..." />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="appleMusic" className="flex items-center gap-2">
                      <Music2 className="h-4 w-4" /> Apple Music
                    </Label>
                    <Input id="appleMusic" name="appleMusic" type="url" defaultValue={profile?.socialLinks?.appleMusic} placeholder="https://music.apple.com/..." />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="youtubeMusic" className="flex items-center gap-2">
                      <Music2 className="h-4 w-4" /> YouTube Music
                    </Label>
                    <Input id="youtubeMusic" name="youtubeMusic" type="url" defaultValue={profile?.socialLinks?.youtubeMusic} placeholder="https://music.youtube.com/..." />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="soundCloud" className="flex items-center gap-2">
                      <Music2 className="h-4 w-4" /> SoundCloud
                    </Label>
                    <Input id="soundCloud" name="soundCloud" type="url" defaultValue={profile?.socialLinks?.soundCloud} placeholder="https://soundcloud.com/..." />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="facebook" className="flex items-center gap-2">
                      <Facebook className="h-4 w-4" /> Facebook
                    </Label>
                    <Input id="facebook" name="facebook" type="url" defaultValue={profile?.socialLinks?.facebook} placeholder="https://facebook.com/yourpage" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="twitter" className="flex items-center gap-2">
                      <Twitter className="h-4 w-4" /> Twitter
                    </Label>
                    <Input id="twitter" name="twitter" type="url" defaultValue={profile?.socialLinks?.twitter} placeholder="https://twitter.com/yourhandle" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="website" className="flex items-center gap-2">
                      <Globe className="h-4 w-4" /> Website
                    </Label>
                    <Input id="website" name="website" type="url" defaultValue={profile?.socialLinks?.website} placeholder="https://yourwebsite.com" />
                  </div>
                </div>
              </div>

              <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-4 border-t">
                <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={() => setIsEditing(false)}>
                  Cancel
                </Button>
                <Button type="submit" className="w-full sm:w-auto">Save Changes</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* View Mode - Show profile info when not editing */}
      {!isEditing && (
        <Card>
          <CardHeader>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle>Profile Information</CardTitle>
                <CardDescription>View your profile details</CardDescription>
              </div>
              <Button
                variant="outline"
                className="w-full sm:w-auto"
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
                       region === 'pan-india' ? 'Pan-India' : 'International'}
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
                      <a href={profile.socialLinks.instagram} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-sm">Instagram</a>
                    </div>
                  )}
                  {profile.socialLinks.youtube && (
                    <div className="flex items-center gap-2">
                      <Youtube className="h-4 w-4" />
                      <a href={profile.socialLinks.youtube} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-sm">YouTube</a>
                    </div>
                  )}
                  {profile.socialLinks.spotify && (
                    <div className="flex items-center gap-2">
                      <Music2 className="h-4 w-4" />
                      <a href={profile.socialLinks.spotify} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-sm">Spotify</a>
                    </div>
                  )}
                  {profile.socialLinks.appleMusic && (
                    <div className="flex items-center gap-2">
                      <Music2 className="h-4 w-4" />
                      <a href={profile.socialLinks.appleMusic} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-sm">Apple Music</a>
                    </div>
                  )}
                  {profile.socialLinks.youtubeMusic && (
                    <div className="flex items-center gap-2">
                      <Music2 className="h-4 w-4" />
                      <a href={profile.socialLinks.youtubeMusic} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-sm">YouTube Music</a>
                    </div>
                  )}
                  {profile.socialLinks.soundCloud && (
                    <div className="flex items-center gap-2">
                      <Music2 className="h-4 w-4" />
                      <a href={profile.socialLinks.soundCloud} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-sm">SoundCloud</a>
                    </div>
                  )}
                  {profile.socialLinks.facebook && (
                    <div className="flex items-center gap-2">
                      <Facebook className="h-4 w-4" />
                      <a href={profile.socialLinks.facebook} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-sm">Facebook</a>
                    </div>
                  )}
                  {profile.socialLinks.twitter && (
                    <div className="flex items-center gap-2">
                      <Twitter className="h-4 w-4" />
                      <a href={profile.socialLinks.twitter} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-sm">Twitter</a>
                    </div>
                  )}
                  {profile.socialLinks.website && (
                    <div className="flex items-center gap-2">
                      <Globe className="h-4 w-4" />
                      <a href={profile.socialLinks.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-sm">Website</a>
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
}
