'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { ArrowLeft, Save, Upload, X, Plus, Trash2, Image as ImageIcon } from 'lucide-react';

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

interface SpaceFormData {
  // Basic Info
  name: string;
  description: string;
  tagline: string;
  
  // Classification
  venueClassification: {
    venueTypes: string[];
    venueTypeOther: string;
    indoorOutdoor: string;
  };
  
  // Address
  address: {
    street: string;
    city: string;
    state: string;
    pincode: string;
    landmark: string;
    googleMapsLink: string;
    directions: string;
  };
  
  // Capacity
  capacity: number;
  capacityDetails: {
    standingCapacity: number;
    seatingCapacity: {
      theatreStyle: number;
      roundTable: number;
    };
    minimumBookingCapacity: number;
    peakSeasonRates: string;
    offSeasonRates: string;
    advanceBookingDays: number;
  };
  
  // Parking & Accessibility
  parking: {
    carCapacity: number;
    twoWheelerAvailable: boolean;
  };
  accessibility: {
    wheelchairAccess: boolean;
    liftElevator: boolean;
    nearbyTransport: {
      airport: boolean;
      railwayStation: boolean;
      taxiService: boolean;
    };
  };
  
  // Facilities
  facilities: {
    [key: string]: boolean;
  };
  
  // Pricing
  pricing: {
    basePrice: number;
    hourlyRate: number;
    halfDayRate: number;
    fullDayRate: number;
    cleaningFee: number;
    securityDeposit: number;
    rentalIncludes: string[];
    otherEquipmentDetails: string;
    securityDepositRequired: boolean;
    cancellationPolicy: {
      refundable: boolean;
      timeFrame: string;
      deductionPercentage: number;
    };
  };
  
  // Contact
  contactInfo: {
    phone: string;
    email: string;
    website: string;
  };
  
  // Terms
  terms: {
    cancellationPolicy: string;
    additionalRules: string;
  };
  
  // Policies
  policies: {
    operatingHours: {
      startTime: string;
      endTime: string;
    };
    noiseRestrictions: string;
    smokingPolicy: string;
    alcoholServingPermission: boolean;
    requiredPermissions: string;
    eventTypeRestrictions: string;
  };
}

interface VenueData {
  id: string;
  name: string;
  email: string;
  phone: string;
  businessName: string;
  status: string;
  isVerified: boolean;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    pincode?: string;
  };
}

const venueTypeOptions = [
  { value: 'restaurant_cafe_lounge', label: 'Restaurant/Cafe/Lounge' },
  { value: 'banquet_hall', label: 'Banquet Hall' },
  { value: 'event_hall_multipurpose', label: 'Event Hall/Multipurpose' },
  { value: 'auditorium_convention_centre', label: 'Auditorium/Convention Centre' },
  { value: 'resort_hotel_event_space', label: 'Resort/Hotel Event Space' },
  { value: 'outdoor_venue', label: 'Outdoor Venue' },
  { value: 'rooftop_venue', label: 'Rooftop Venue' },
  { value: 'sports_complex', label: 'Sports Complex' },
  { value: 'conference_meeting_room', label: 'Conference/Meeting Room' },
  { value: 'wedding_venue', label: 'Wedding Venue' },
  { value: 'others', label: 'Others' }
];

const facilityOptions = [
  { key: 'parking', label: 'Parking' },
  { key: 'ac', label: 'Air Conditioning' },
  { key: 'petFriendly', label: 'Pet Friendly' },
  { key: 'catering', label: 'Catering' },
  { key: 'accessible', label: 'Wheelchair Accessible' },
  { key: 'wifi', label: 'WiFi' },
  { key: 'soundSystem', label: 'Sound System' },
  { key: 'lighting', label: 'Lighting' },
  { key: 'security', label: 'Security' },
  { key: 'alcohol', label: 'Alcohol Service' }
];

const rentalIncludesOptions = [
  { value: 'space_only', label: 'Space Only' },
  { value: 'chairs_tables', label: 'Chairs & Tables' },
  { value: 'basic_lighting', label: 'Basic Lighting' },
  { value: 'sound_system', label: 'Sound System' },
  { value: 'cleaning_staff', label: 'Cleaning Staff' },
  { value: 'generator_backup_power', label: 'Generator Backup Power' },
  { value: 'other_equipment', label: 'Other Equipment' }
];

export default function CreateSpaceForm({ venue, onClose }: { venue: VenueData; onClose: () => void }) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [currentTab, setCurrentTab] = useState('basic');
  const [gallery, setGallery] = useState<CloudinaryPhoto[]>([]);
  const [uploadingImages, setUploadingImages] = useState(false);
  
  const [formData, setFormData] = useState<SpaceFormData>({
    // Basic Info
    name: '',
    description: '',
    tagline: '',
    
    // Classification
    venueClassification: {
      venueTypes: [],
      venueTypeOther: '',
      indoorOutdoor: ''
    },
    
    // Address - Pre-fill from venue
    address: {
      street: venue.address?.street || '',
      city: venue.address?.city || '',
      state: venue.address?.state || '',
      pincode: venue.address?.pincode || '',
      landmark: '',
      googleMapsLink: '',
      directions: ''
    },
    
    // Capacity
    capacity: 0,
    capacityDetails: {
      standingCapacity: 0,
      seatingCapacity: {
        theatreStyle: 0,
        roundTable: 0
      },
      minimumBookingCapacity: 0,
      peakSeasonRates: '',
      offSeasonRates: '',
      advanceBookingDays: 7
    },
    
    // Parking & Accessibility
    parking: {
      carCapacity: 0,
      twoWheelerAvailable: false
    },
    accessibility: {
      wheelchairAccess: false,
      liftElevator: false,
      nearbyTransport: {
        airport: false,
        railwayStation: false,
        taxiService: false
      }
    },
    
    // Facilities
    facilities: facilityOptions.reduce((acc, facility) => ({
      ...acc,
      [facility.key]: false
    }), {}),
    
    // Pricing
    pricing: {
      basePrice: 0,
      hourlyRate: 0,
      halfDayRate: 0,
      fullDayRate: 0,
      cleaningFee: 0,
      securityDeposit: 0,
      rentalIncludes: [],
      otherEquipmentDetails: '',
      securityDepositRequired: false,
      cancellationPolicy: {
        refundable: false,
        timeFrame: '',
        deductionPercentage: 0
      }
    },
    
    // Contact - Pre-fill from venue
    contactInfo: {
      phone: venue.phone || '',
      email: venue.email || '',
      website: ''
    },
    
    // Terms
    terms: {
      cancellationPolicy: '',
      additionalRules: ''
    },
    
    // Policies
    policies: {
      operatingHours: {
        startTime: '09:00',
        endTime: '23:00'
      },
      noiseRestrictions: '',
      smokingPolicy: 'not_allowed',
      alcoholServingPermission: false,
      requiredPermissions: '',
      eventTypeRestrictions: ''
    }
  });

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleNestedInputChange = (parent: string, field: string, value: any) => {
    setFormData(prev => {
      const parentObj = prev[parent as keyof SpaceFormData];
      if (typeof parentObj === 'object' && parentObj !== null) {
        return {
          ...prev,
          [parent]: {
            ...parentObj,
            [field]: value
          }
        };
      }
      return prev;
    });
  };

  const handleFacilityToggle = (facility: string) => {
    setFormData(prev => ({
      ...prev,
      facilities: {
        ...prev.facilities,
        [facility]: !prev.facilities[facility]
      }
    }));
  };

  const handleVenueTypeToggle = (type: string) => {
    setFormData(prev => ({
      ...prev,
      venueClassification: {
        ...prev.venueClassification,
        venueTypes: prev.venueClassification.venueTypes.includes(type)
          ? prev.venueClassification.venueTypes.filter(t => t !== type)
          : [...prev.venueClassification.venueTypes, type]
      }
    }));
  };

  const handleRentalIncludesToggle = (item: string) => {
    setFormData(prev => ({
      ...prev,
      pricing: {
        ...prev.pricing,
        rentalIncludes: prev.pricing.rentalIncludes.includes(item)
          ? prev.pricing.rentalIncludes.filter(i => i !== item)
          : [...prev.pricing.rentalIncludes, item]
      }
    }));
  };

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
      // Use venue token for space image uploads
      const venueToken = localStorage.getItem('venueToken');
      if (!venueToken) {
        toast.error('Authentication required. Please log in again.');
        return;
      }

      const formData = new FormData();
      validFiles.forEach((file) => {
        formData.append('photos', file);
      });
      formData.append('folder', 'space-images');
      formData.append('description', `Space images for ${venue.businessName || venue.name}`);

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
        setGallery(prev => [...prev, ...data.data.photos]);
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
      // Use venue token for space image deletion
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

      setGallery(prev => prev.filter(img => img.public_id !== publicId));
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const token = localStorage.getItem('venueToken');
      if (!token) {
        toast.error('Authentication required');
        return;
      }

      // Ensure venueId is valid
      const venueId = venue?.id;
      if (!venueId) {
        toast.error('Venue information is missing. Please refresh the page.');
        return;
      }

      // Validate that venue details are complete before allowing space creation
      if (!venue.name || !venue.businessName || !venue.email || !venue.phone) {
        toast.error('Please complete your venue details (name, business name, email, and phone) before creating spaces.');
        return;
      }

      if (!venue.address || !venue.address.city || !venue.address.state || !venue.address.pincode) {
        toast.error('Please complete your venue address details (city, state, and pincode) before creating spaces.');
        return;
      }

      const payload = {
        ...formData,
        venueId: String(venueId), // Ensure it's a string
        gallery
      };

      const response = await fetch('/api/venue/spaces', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Space created successfully!');
        onClose();
        router.refresh();
      } else {
        // Handle validation errors specifically
        if (data.errors && Array.isArray(data.errors)) {
          data.errors.forEach((error: any) => {
            toast.error(error.msg || error.message || 'Validation error');
          });
        } else {
          toast.error(data.message || 'Failed to create space');
        }
      }
    } catch (error) {
      console.error('Create space error:', error);
      toast.error('Failed to create space');
    } finally {
      setIsLoading(false);
    }
  };

  const renderTabContent = () => {
    switch (currentTab) {
      case 'basic':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="name">Space Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder="Enter space name"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tagline">Tagline</Label>
                <Input
                  id="tagline"
                  value={formData.tagline}
                  onChange={(e) => handleInputChange('tagline', e.target.value)}
                  placeholder="Enter tagline (optional)"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="Describe your space in detail..."
                rows={4}
                required
              />
            </div>

            <div className="space-y-4">
              <Label>Venue Type *</Label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {venueTypeOptions.map((type) => (
                  <div key={type.value} className="flex items-center space-x-2">
                    <Checkbox
                      id={type.value}
                      checked={formData.venueClassification.venueTypes.includes(type.value)}
                      onCheckedChange={() => handleVenueTypeToggle(type.value)}
                    />
                    <Label htmlFor={type.value} className="text-sm">{type.label}</Label>
                  </div>
                ))}
              </div>
              {formData.venueClassification.venueTypes.includes('others') && (
                <div className="space-y-2">
                  <Label htmlFor="venueTypeOther">Other Venue Type</Label>
                  <Input
                    id="venueTypeOther"
                    value={formData.venueClassification.venueTypeOther}
                    onChange={(e) => handleNestedInputChange('venueClassification', 'venueTypeOther', e.target.value)}
                    placeholder="Specify other venue type"
                  />
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="indoorOutdoor">Indoor/Outdoor *</Label>
                <Select
                  value={formData.venueClassification.indoorOutdoor}
                  onValueChange={(value) => handleNestedInputChange('venueClassification', 'indoorOutdoor', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="indoor">Indoor</SelectItem>
                    <SelectItem value="outdoor">Outdoor</SelectItem>
                    <SelectItem value="hybrid">Indoor & Outdoor</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        );

      case 'capacity':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <Label htmlFor="capacity">Total Capacity *</Label>
                <Input
                  id="capacity"
                  type="number"
                  value={formData.capacity}
                  onChange={(e) => handleInputChange('capacity', parseInt(e.target.value) || 0)}
                  placeholder="0"
                  min="1"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="standingCapacity">Standing Capacity *</Label>
                <Input
                  id="standingCapacity"
                  type="number"
                  value={formData.capacityDetails.standingCapacity}
                  onChange={(e) => handleNestedInputChange('capacityDetails', 'standingCapacity', parseInt(e.target.value) || 0)}
                  placeholder="0"
                  min="1"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="minimumBookingCapacity">Min Booking Capacity</Label>
                <Input
                  id="minimumBookingCapacity"
                  type="number"
                  value={formData.capacityDetails.minimumBookingCapacity}
                  onChange={(e) => handleNestedInputChange('capacityDetails', 'minimumBookingCapacity', parseInt(e.target.value) || 0)}
                  placeholder="0"
                  min="1"
                />
              </div>
            </div>

            <div className="space-y-4">
              <Label>Seating Capacity</Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="theatreStyle">Theatre Style</Label>
                  <Input
                    id="theatreStyle"
                    type="number"
                    value={formData.capacityDetails.seatingCapacity.theatreStyle}
                    onChange={(e) => handleNestedInputChange('capacityDetails', 'seatingCapacity', {
                      ...formData.capacityDetails.seatingCapacity,
                      theatreStyle: parseInt(e.target.value) || 0
                    })}
                    placeholder="0"
                    min="0"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="roundTable">Round Table</Label>
                  <Input
                    id="roundTable"
                    type="number"
                    value={formData.capacityDetails.seatingCapacity.roundTable}
                    onChange={(e) => handleNestedInputChange('capacityDetails', 'seatingCapacity', {
                      ...formData.capacityDetails.seatingCapacity,
                      roundTable: parseInt(e.target.value) || 0
                    })}
                    placeholder="0"
                    min="0"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="advanceBookingDays">Advance Booking (Days) *</Label>
                <Input
                  id="advanceBookingDays"
                  type="number"
                  value={formData.capacityDetails.advanceBookingDays}
                  onChange={(e) => handleNestedInputChange('capacityDetails', 'advanceBookingDays', parseInt(e.target.value) || 0)}
                  placeholder="7"
                  min="0"
                  required
                />
              </div>
            </div>
          </div>
        );

      case 'pricing':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="space-y-2">
                <Label htmlFor="basePrice">Base Price *</Label>
                <Input
                  id="basePrice"
                  type="number"
                  value={formData.pricing.basePrice}
                  onChange={(e) => handleNestedInputChange('pricing', 'basePrice', parseFloat(e.target.value) || 0)}
                  placeholder="0"
                  min="0"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="hourlyRate">Hourly Rate</Label>
                <Input
                  id="hourlyRate"
                  type="number"
                  value={formData.pricing.hourlyRate}
                  onChange={(e) => handleNestedInputChange('pricing', 'hourlyRate', parseFloat(e.target.value) || 0)}
                  placeholder="0"
                  min="0"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="halfDayRate">Half Day Rate</Label>
                <Input
                  id="halfDayRate"
                  type="number"
                  value={formData.pricing.halfDayRate}
                  onChange={(e) => handleNestedInputChange('pricing', 'halfDayRate', parseFloat(e.target.value) || 0)}
                  placeholder="0"
                  min="0"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fullDayRate">Full Day Rate</Label>
                <Input
                  id="fullDayRate"
                  type="number"
                  value={formData.pricing.fullDayRate}
                  onChange={(e) => handleNestedInputChange('pricing', 'fullDayRate', parseFloat(e.target.value) || 0)}
                  placeholder="0"
                  min="0"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="cleaningFee">Cleaning Fee</Label>
                <Input
                  id="cleaningFee"
                  type="number"
                  value={formData.pricing.cleaningFee}
                  onChange={(e) => handleNestedInputChange('pricing', 'cleaningFee', parseFloat(e.target.value) || 0)}
                  placeholder="0"
                  min="0"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="securityDeposit">Security Deposit</Label>
                <Input
                  id="securityDeposit"
                  type="number"
                  value={formData.pricing.securityDeposit}
                  onChange={(e) => handleNestedInputChange('pricing', 'securityDeposit', parseFloat(e.target.value) || 0)}
                  placeholder="0"
                  min="0"
                />
              </div>
            </div>

            <div className="space-y-4">
              <Label>Rental Includes</Label>
              <div className="flex flex-wrap gap-3">
                {rentalIncludesOptions.map((item) => (
                  <Badge
                    key={item.value}
                    variant={formData.pricing.rentalIncludes.includes(item.value) ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => handleRentalIncludesToggle(item.value)}
                  >
                    {item.label}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        );

      case 'facilities':
        return (
          <div className="space-y-6">
            <div className="space-y-4">
              <Label>Basic Facilities</Label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {facilityOptions.map((facility) => (
                  <div key={facility.key} className="flex items-center space-x-2">
                    <Checkbox
                      id={facility.key}
                      checked={formData.facilities[facility.key]}
                      onCheckedChange={() => handleFacilityToggle(facility.key)}
                    />
                    <Label htmlFor={facility.key} className="text-sm">{facility.label}</Label>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="carCapacity">Car Parking Capacity *</Label>
                <Input
                  id="carCapacity"
                  type="number"
                  value={formData.parking.carCapacity}
                  onChange={(e) => handleNestedInputChange('parking', 'carCapacity', parseInt(e.target.value) || 0)}
                  placeholder="0"
                  min="0"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="twoWheelerAvailable" className="flex items-center space-x-2">
                  <Checkbox
                    id="twoWheelerAvailable"
                    checked={formData.parking.twoWheelerAvailable}
                    onCheckedChange={(checked) => handleNestedInputChange('parking', 'twoWheelerAvailable', checked)}
                  />
                  <span>Two Wheeler Parking Available</span>
                </Label>
              </div>
            </div>

            <div className="space-y-4">
              <Label>Accessibility Features</Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="wheelchairAccess"
                    checked={formData.accessibility.wheelchairAccess}
                    onCheckedChange={(checked) => handleNestedInputChange('accessibility', 'wheelchairAccess', checked)}
                  />
                  <Label htmlFor="wheelchairAccess" className="text-sm">Wheelchair Access</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="liftElevator"
                    checked={formData.accessibility.liftElevator}
                    onCheckedChange={(checked) => handleNestedInputChange('accessibility', 'liftElevator', checked)}
                  />
                  <Label htmlFor="liftElevator" className="text-sm">Lift/Elevator</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="airport"
                    checked={formData.accessibility.nearbyTransport.airport}
                    onCheckedChange={(checked) => handleNestedInputChange('accessibility', 'nearbyTransport', {
                      ...formData.accessibility.nearbyTransport,
                      airport: checked
                    })}
                  />
                  <Label htmlFor="airport" className="text-sm">Near Airport</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="railwayStation"
                    checked={formData.accessibility.nearbyTransport.railwayStation}
                    onCheckedChange={(checked) => handleNestedInputChange('accessibility', 'nearbyTransport', {
                      ...formData.accessibility.nearbyTransport,
                      railwayStation: checked
                    })}
                  />
                  <Label htmlFor="railwayStation" className="text-sm">Near Railway Station</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="taxiService"
                    checked={formData.accessibility.nearbyTransport.taxiService}
                    onCheckedChange={(checked) => handleNestedInputChange('accessibility', 'nearbyTransport', {
                      ...formData.accessibility.nearbyTransport,
                      taxiService: checked
                    })}
                  />
                  <Label htmlFor="taxiService" className="text-sm">Taxi Service Available</Label>
                </div>
              </div>
            </div>
          </div>
        );

      case 'gallery':
        return (
          <div className="space-y-6">
            <div>
              <Label className="text-lg font-semibold mb-4 flex items-center">
                <ImageIcon className="h-5 w-5 mr-2" />
                Space Images
              </Label>
              
              {/* Upload Area */}
              <div
                className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors"
                onDragOver={handleDragOver}
                onDrop={handleDrop}
              >
                <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <div className="space-y-2">
                  <p className="text-lg font-medium text-gray-900">
                    Upload space images
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
              {gallery.length > 0 && (
                <div className="mt-6">
                  <h4 className="text-md font-medium mb-3">Current Images ({gallery.length})</h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {gallery.map((image) => (
                      <div key={image.public_id} className="relative group">
                        <div className="aspect-square rounded-lg overflow-hidden bg-gray-100">
                          <img
                            src={image.url}
                            alt="Space image"
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
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button type="button" variant="ghost" onClick={onClose}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <div>
                <h2 className="text-2xl font-bold">Create New Space</h2>
                <p className="text-gray-600">Add a new space to {venue.name}</p>
              </div>
            </div>
            <Button type="submit" form="create-space-form" disabled={isLoading}>
              <Save className="h-4 w-4 mr-2" />
              {isLoading ? 'Creating...' : 'Create Space'}
            </Button>
          </div>
        </div>

        <form id="create-space-form" onSubmit={handleSubmit} className="p-6">
          <Tabs value={currentTab} onValueChange={setCurrentTab} className="w-full">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="basic">Basic Info</TabsTrigger>
              <TabsTrigger value="capacity">Capacity</TabsTrigger>
              <TabsTrigger value="pricing">Pricing</TabsTrigger>
              <TabsTrigger value="facilities">Facilities</TabsTrigger>
              <TabsTrigger value="gallery">Gallery</TabsTrigger>
            </TabsList>

            <div className="mt-6">
              {renderTabContent()}
            </div>
          </Tabs>
        </form>
      </div>
    </div>
  );
}
