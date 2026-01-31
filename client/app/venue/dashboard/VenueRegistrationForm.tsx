"use client";

import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, Upload, X } from "lucide-react";

interface VenueFormData {
  ownerDetails: {
    fullName: string;
    primaryContact: string;
    alternateContact: string;
    email: string;
    businessName: string;
    designation: string;
    businessRegistrationNumber: string;
    gstNumber: string;
  };
  venueClassification: {
    venueTypes: string[];
    venueTypeOther: string;
    indoorOutdoor: string;
    operationMode: string;
  };
  address: {
    street: string;
    city: string;
    state: string;
    pincode: string;
    landmark: string;
    googleMapsLink: string;
    directions: string;
  };
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
  capacityDetails: {
    standingCapacity: number;
    seatingCapacity: {
      theatreStyle: number;
      roundTable: number;
    };
    minimumBookingCapacity: number;
    multipleEventsPerDay: boolean;
    timeSlots: string[];
    peakSeasonRates: string;
    offSeasonRates: string;
    advanceBookingDays: number;
  };
  pricing: {
    basePrice: number;
    rentalIncludes: string[];
    otherEquipmentDetails: string;
    securityDepositRequired: boolean;
    paymentModes: string[];
    cancellationPolicy: {
      refundable: boolean;
      timeFrame: string;
      deductionPercentage: number;
    };
  };
  amenities: {
    [key: string]: {
      available: boolean;
      description?: string;
    };
  };
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
  addOnServices: {
    [key: string]: {
      available: boolean;
      description?: string;
    };
  };
  documents: {
    venueImages: Array<{ url: string; caption: string; isMain: boolean }>;
    venueVideoTour: { url: string };
    menuCards: Array<{ url: string; name: string }>;
    rateCard: { url: string };
    businessLicense: Array<{ url: string; name: string }>;
  };
  authorizations: {
    publicListingAuthorized: boolean;
    onlineBookingEnabled: boolean;
    preferredCommunication: string;
    informationAccuracyConfirmed: boolean;
  };
}

interface VenueRegistrationFormProps {
  initialData?: Partial<VenueFormData>;
  onSubmit: (data: VenueFormData) => Promise<void>;
  loading?: boolean;
}

export default function VenueRegistrationForm({ 
  initialData, 
  onSubmit, 
  loading = false 
}: VenueRegistrationFormProps) {
  const [formData, setFormData] = useState<VenueFormData>({
    ownerDetails: {
      fullName: "",
      primaryContact: "",
      alternateContact: "",
      email: "",
      businessName: "",
      designation: "",
      businessRegistrationNumber: "",
      gstNumber: "",
      ...initialData?.ownerDetails
    },
    venueClassification: {
      venueTypes: [],
      venueTypeOther: "",
      indoorOutdoor: "",
      operationMode: "",
      ...initialData?.venueClassification
    },
    address: {
      street: "",
      city: "",
      state: "",
      pincode: "",
      landmark: "",
      googleMapsLink: "",
      directions: "",
      ...initialData?.address
    },
    parking: {
      carCapacity: 0,
      twoWheelerAvailable: false,
      ...initialData?.parking
    },
    accessibility: {
      wheelchairAccess: false,
      liftElevator: false,
      nearbyTransport: {
        airport: false,
        railwayStation: false,
        taxiService: false
      },
      ...initialData?.accessibility
    },
    capacityDetails: {
      standingCapacity: 0,
      seatingCapacity: {
        theatreStyle: 0,
        roundTable: 0
      },
      minimumBookingCapacity: 0,
      multipleEventsPerDay: false,
      timeSlots: [],
      peakSeasonRates: "",
      offSeasonRates: "",
      advanceBookingDays: 0,
      ...initialData?.capacityDetails
    },
    pricing: {
      basePrice: 0,
      rentalIncludes: [],
      otherEquipmentDetails: "",
      securityDepositRequired: false,
      paymentModes: [],
      cancellationPolicy: {
        refundable: false,
        timeFrame: "",
        deductionPercentage: 0
      },
      ...initialData?.pricing
    },
    amenities: {
      stage: { available: false, description: "" },
      airConditioning: { available: false, description: "" },
      inHouseCatering: { available: false, description: "" },
      cateringFlexibility: { available: false, description: "" },
      lightingSystem: { available: false, description: "" },
      professionalSoundSystem: { available: false, description: "" },
      ledScreenProjection: { available: false, description: "" },
      wifiAvailability: { available: false, description: "" },
      dressingRooms: { available: false, description: "" },
      changingRooms: { available: false, description: "" },
      powerBackup: { available: false, description: "" },
      securityCctv: { available: false, description: "" },
      alcoholPermission: { available: false, description: "" },
      liveMusicPermission: { available: false, description: "" },
      sportsEquipment: { available: false, description: "" },
      accommodation: { available: false, description: "" },
      decorationServices: { available: false, description: "" },
      valetService: { available: false, description: "" },
      ...initialData?.amenities
    },
    policies: {
      operatingHours: {
        startTime: "",
        endTime: ""
      },
      noiseRestrictions: "",
      smokingPolicy: "",
      alcoholServingPermission: false,
      requiredPermissions: "",
      eventTypeRestrictions: "",
      ...initialData?.policies
    },
    addOnServices: {
      cateringPackages: { available: false, description: "" },
      eventManagementServices: { available: false, description: "" },
      vendorTieUps: { available: false, description: "" },
      photographyDecorPackages: { available: false, description: "" },
      accommodationBundle: { available: false, description: "" },
      specialDiscounts: { available: false, description: "" },
      ...initialData?.addOnServices
    },
    documents: {
      venueImages: [],
      venueVideoTour: { url: "" },
      menuCards: [],
      rateCard: { url: "" },
      businessLicense: [],
      ...initialData?.documents
    },
    authorizations: {
      publicListingAuthorized: false,
      onlineBookingEnabled: false,
      preferredCommunication: "email",
      informationAccuracyConfirmed: false,
      ...initialData?.authorizations
    }
  });

  const [currentStep, setCurrentStep] = useState(1);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const venueTypes = [
    { value: "restaurant_cafe_lounge", label: "Restaurant / Café / Lounge" },
    { value: "banquet_hall", label: "Banquet Hall" },
    { value: "event_hall_multipurpose", label: "Event Hall (Multipurpose)" },
    { value: "auditorium_convention_centre", label: "Auditorium / Convention Centre" },
    { value: "resort_hotel_event_space", label: "Resort / Hotel with event space" },
    { value: "outdoor_venue", label: "Outdoor Venue (Open Field / Stadium / Park)" },
    { value: "rooftop_venue", label: "Rooftop Venue" },
    { value: "sports_complex", label: "Sports Complex (Indoor / Outdoor)" },
    { value: "conference_meeting_room", label: "Conference / Meeting Room" },
    { value: "wedding_venue", label: "Wedding Venue" },
    { value: "others", label: "Others" }
  ];

  const rentalIncludes = [
    { value: "space_only", label: "Space only" },
    { value: "chairs_tables", label: "Chairs & Tables" },
    { value: "basic_lighting", label: "Basic Lighting" },
    { value: "sound_system", label: "Sound System" },
    { value: "cleaning_staff", label: "Cleaning Staff" },
    { value: "generator_backup_power", label: "Generator / Backup Power" },
    { value: "other_equipment", label: "Other equipment" }
  ];

  const paymentModes = [
    { value: "online", label: "Online" },
    { value: "cash", label: "Cash" },
    { value: "bank_transfer", label: "Bank Transfer" },
    { value: "upi", label: "UPI" },
    { value: "card_payment", label: "Card Payment" }
  ];

  const timeSlots = [
    { value: "full_day", label: "Full day" },
    { value: "half_day", label: "Half day" },
    { value: "hourly", label: "Hourly booking" }
  ];

  const handleInputChange = (section: string, field: string, value: any, subField?: string) => {
    setFormData(prev => ({
      ...prev,
      [section]: {
        ...prev[section as keyof VenueFormData],
        [field]: subField ? {
          ...(prev[section as keyof VenueFormData] as any)[field],
          [subField]: value
        } : value
      }
    }));
  };

  const handleCheckboxChange = (section: string, field: string, value: string, checked: boolean) => {
    setFormData(prev => {
      const currentArray = (prev[section as keyof VenueFormData] as any)[field] || [];
      const newArray = checked 
        ? [...currentArray, value]
        : currentArray.filter((item: string) => item !== value);
      
      return {
        ...prev,
        [section]: {
          ...prev[section as keyof VenueFormData],
          [field]: newArray
        }
      };
    });
  };

  const handleFileUpload = async (files: FileList, category: string) => {
    setUploading(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const uploadedFiles: Array<{ url: string; name: string; caption: string; isMain: boolean }> = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const formData = new FormData();
        formData.append('photo', file);
        formData.append('folder', 'venues');

        const response = await fetch(`${apiUrl}/api/upload`, {
          method: 'POST',
          body: formData
        });

        const data = await response.json();
        if (data.status === 'success') {
          const url = data.data.photo.secure_url || data.data.photo.url;
          uploadedFiles.push({
            url,
            name: file.name,
            caption: "",
            isMain: i === 0
          });
        }
      }

      // Update form data with uploaded files
      setFormData(prev => ({
        ...prev,
        documents: {
          ...prev.documents,
          [category]: category === 'venueImages' ? uploadedFiles : (uploadedFiles[0] || { url: '' })
        }
      }));

      toast.success('Files uploaded successfully');
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload files');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.authorizations.informationAccuracyConfirmed) {
      toast.error('Please confirm that all information provided is accurate');
      return;
    }

    try {
      await onSubmit(formData);
      toast.success('Venue information saved successfully');
    } catch (error) {
      console.error('Submit error:', error);
      toast.error('Failed to save venue information');
    }
  };

  const nextStep = () => {
    if (currentStep < 8) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <Card>
            <CardHeader>
              <CardTitle>Venue Owner Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="fullName">Full Name (as per official records) *</Label>
                  <Input
                    id="fullName"
                    value={formData.ownerDetails.fullName}
                    onChange={(e) => handleInputChange('ownerDetails', 'fullName', e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="primaryContact">Primary Contact Number *</Label>
                  <Input
                    id="primaryContact"
                    value={formData.ownerDetails.primaryContact}
                    onChange={(e) => handleInputChange('ownerDetails', 'primaryContact', e.target.value)}
                    pattern="[0-9]{10}"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="alternateContact">Alternate Contact Number</Label>
                  <Input
                    id="alternateContact"
                    value={formData.ownerDetails.alternateContact}
                    onChange={(e) => handleInputChange('ownerDetails', 'alternateContact', e.target.value)}
                    pattern="[0-9]{10}"
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email Address *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.ownerDetails.email}
                    onChange={(e) => handleInputChange('ownerDetails', 'email', e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="businessName">Business Name / Venue Name *</Label>
                  <Input
                    id="businessName"
                    value={formData.ownerDetails.businessName}
                    onChange={(e) => handleInputChange('ownerDetails', 'businessName', e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="designation">Designation / Role *</Label>
                  <Input
                    id="designation"
                    value={formData.ownerDetails.designation}
                    onChange={(e) => handleInputChange('ownerDetails', 'designation', e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="businessRegistrationNumber">Business Registration Number</Label>
                  <Input
                    id="businessRegistrationNumber"
                    value={formData.ownerDetails.businessRegistrationNumber}
                    onChange={(e) => handleInputChange('ownerDetails', 'businessRegistrationNumber', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="gstNumber">GST Number</Label>
                  <Input
                    id="gstNumber"
                    value={formData.ownerDetails.gstNumber}
                    onChange={(e) => handleInputChange('ownerDetails', 'gstNumber', e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        );

      case 2:
        return (
          <Card>
            <CardHeader>
              <CardTitle>Venue Classification</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label>What type of venue is this? (Multiple choice) *</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
                  {venueTypes.map((type) => (
                    <div key={type.value} className="flex items-center space-x-2">
                      <Checkbox
                        id={type.value}
                        checked={formData.venueClassification.venueTypes.includes(type.value)}
                        onCheckedChange={(checked) => 
                          handleCheckboxChange('venueClassification', 'venueTypes', type.value, checked as boolean)
                        }
                      />
                      <Label htmlFor={type.value} className="text-sm">{type.label}</Label>
                    </div>
                  ))}
                </div>
                {formData.venueClassification.venueTypes.includes('others') && (
                  <div className="mt-4">
                    <Label htmlFor="venueTypeOther">Please specify other venue type</Label>
                    <Input
                      id="venueTypeOther"
                      value={formData.venueClassification.venueTypeOther}
                      onChange={(e) => handleInputChange('venueClassification', 'venueTypeOther', e.target.value)}
                    />
                  </div>
                )}
              </div>

              <div>
                <Label>Is this venue *</Label>
                <RadioGroup
                  value={formData.venueClassification.indoorOutdoor}
                  onValueChange={(value) => handleInputChange('venueClassification', 'indoorOutdoor', value)}
                  className="mt-2"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="indoor" id="indoor" />
                    <Label htmlFor="indoor">Indoor</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="outdoor" id="outdoor" />
                    <Label htmlFor="outdoor">Outdoor</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="hybrid" id="hybrid" />
                    <Label htmlFor="hybrid">Hybrid</Label>
                  </div>
                </RadioGroup>
              </div>

              <div>
                <Label>Does your venue operate seasonally or year-round? *</Label>
                <RadioGroup
                  value={formData.venueClassification.operationMode}
                  onValueChange={(value) => handleInputChange('venueClassification', 'operationMode', value)}
                  className="mt-2"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="seasonal" id="seasonal" />
                    <Label htmlFor="seasonal">Seasonal</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="year_round" id="year_round" />
                    <Label htmlFor="year_round">Year-round</Label>
                  </div>
                </RadioGroup>
              </div>
            </CardContent>
          </Card>
        );

      case 3:
        return (
          <Card>
            <CardHeader>
              <CardTitle>Venue Location & Accessibility</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <Label htmlFor="street">Complete Address *</Label>
                  <Textarea
                    id="street"
                    value={formData.address.street}
                    onChange={(e) => handleInputChange('address', 'street', e.target.value)}
                    placeholder="Street address with complete details"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="city">City *</Label>
                  <Input
                    id="city"
                    value={formData.address.city}
                    onChange={(e) => handleInputChange('address', 'city', e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="state">State *</Label>
                  <Input
                    id="state"
                    value={formData.address.state}
                    onChange={(e) => handleInputChange('address', 'state', e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="pincode">Pincode *</Label>
                  <Input
                    id="pincode"
                    value={formData.address.pincode}
                    onChange={(e) => handleInputChange('address', 'pincode', e.target.value)}
                    pattern="[0-9]{6}"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="landmark">Landmark / Directions</Label>
                  <Input
                    id="landmark"
                    value={formData.address.landmark}
                    onChange={(e) => handleInputChange('address', 'landmark', e.target.value)}
                  />
                </div>
                <div className="md:col-span-2">
                  <Label htmlFor="googleMapsLink">Google Maps Link</Label>
                  <Input
                    id="googleMapsLink"
                    type="url"
                    value={formData.address.googleMapsLink}
                    onChange={(e) => handleInputChange('address', 'googleMapsLink', e.target.value)}
                    placeholder="https://maps.google.com/..."
                  />
                </div>
                <div>
                  <Label htmlFor="carCapacity">Car Parking Capacity *</Label>
                  <Input
                    id="carCapacity"
                    type="number"
                    value={formData.parking.carCapacity}
                    onChange={(e) => handleInputChange('parking', 'carCapacity', parseInt(e.target.value) || 0)}
                    required
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="twoWheelerAvailable"
                    checked={formData.parking.twoWheelerAvailable}
                    onCheckedChange={(checked) => handleInputChange('parking', 'twoWheelerAvailable', checked)}
                  />
                  <Label htmlFor="twoWheelerAvailable">Two-wheeler parking available</Label>
                </div>
              </div>
              
              <div className="space-y-4">
                <h4 className="font-semibold">Accessibility Features</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="wheelchairAccess"
                      checked={formData.accessibility.wheelchairAccess}
                      onCheckedChange={(checked) => handleInputChange('accessibility', 'wheelchairAccess', checked)}
                    />
                    <Label htmlFor="wheelchairAccess">Wheelchair access</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="liftElevator"
                      checked={formData.accessibility.liftElevator}
                      onCheckedChange={(checked) => handleInputChange('accessibility', 'liftElevator', checked)}
                    />
                    <Label htmlFor="liftElevator">Lift/elevator availability</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="airport"
                      checked={formData.accessibility.nearbyTransport.airport}
                      onCheckedChange={(checked) => handleInputChange('accessibility', 'nearbyTransport', checked, 'airport')}
                    />
                    <Label htmlFor="airport">Near Airport</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="railwayStation"
                      checked={formData.accessibility.nearbyTransport.railwayStation}
                      onCheckedChange={(checked) => handleInputChange('accessibility', 'nearbyTransport', checked, 'railwayStation')}
                    />
                    <Label htmlFor="railwayStation">Near Railway Station</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="taxiService"
                      checked={formData.accessibility.nearbyTransport.taxiService}
                      onCheckedChange={(checked) => handleInputChange('accessibility', 'nearbyTransport', checked, 'taxiService')}
                    />
                    <Label htmlFor="taxiService">Taxi service available</Label>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        );

      case 4:
        return (
          <Card>
            <CardHeader>
              <CardTitle>Venue Capacity & Booking Options</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="standingCapacity">Standing Capacity *</Label>
                  <Input
                    id="standingCapacity"
                    type="number"
                    value={formData.capacityDetails.standingCapacity}
                    onChange={(e) => handleInputChange('capacityDetails', 'standingCapacity', parseInt(e.target.value) || 0)}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="theatreStyle">Seating Capacity (Theatre Style)</Label>
                  <Input
                    id="theatreStyle"
                    type="number"
                    value={formData.capacityDetails.seatingCapacity.theatreStyle}
                    onChange={(e) => handleInputChange('capacityDetails', 'seatingCapacity', parseInt(e.target.value) || 0, 'theatreStyle')}
                  />
                </div>
                <div>
                  <Label htmlFor="roundTable">Seating Capacity (Round Table)</Label>
                  <Input
                    id="roundTable"
                    type="number"
                    value={formData.capacityDetails.seatingCapacity.roundTable}
                    onChange={(e) => handleInputChange('capacityDetails', 'seatingCapacity', parseInt(e.target.value) || 0, 'roundTable')}
                  />
                </div>
                <div>
                  <Label htmlFor="minimumBookingCapacity">Minimum Booking Capacity</Label>
                  <Input
                    id="minimumBookingCapacity"
                    type="number"
                    value={formData.capacityDetails.minimumBookingCapacity}
                    onChange={(e) => handleInputChange('capacityDetails', 'minimumBookingCapacity', parseInt(e.target.value) || 0)}
                  />
                </div>
                <div>
                  <Label htmlFor="advanceBookingDays">Advance Booking Required (Days) *</Label>
                  <Input
                    id="advanceBookingDays"
                    type="number"
                    value={formData.capacityDetails.advanceBookingDays}
                    onChange={(e) => handleInputChange('capacityDetails', 'advanceBookingDays', parseInt(e.target.value) || 0)}
                    required
                  />
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="multipleEventsPerDay"
                  checked={formData.capacityDetails.multipleEventsPerDay}
                  onCheckedChange={(checked) => handleInputChange('capacityDetails', 'multipleEventsPerDay', checked)}
                />
                <Label htmlFor="multipleEventsPerDay">Can host multiple events in a single day</Label>
              </div>
              
              <div>
                <Label>Time slots available</Label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mt-2">
                  {timeSlots.map((slot) => (
                    <div key={slot.value} className="flex items-center space-x-2">
                      <Checkbox
                        id={slot.value}
                        checked={formData.capacityDetails.timeSlots.includes(slot.value)}
                        onCheckedChange={(checked) => 
                          handleCheckboxChange('capacityDetails', 'timeSlots', slot.value, checked as boolean)
                        }
                      />
                      <Label htmlFor={slot.value} className="text-sm">{slot.label}</Label>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="peakSeasonRates">Peak Season Rates</Label>
                  <Textarea
                    id="peakSeasonRates"
                    value={formData.capacityDetails.peakSeasonRates}
                    onChange={(e) => handleInputChange('capacityDetails', 'peakSeasonRates', e.target.value)}
                    placeholder="Describe peak season pricing"
                  />
                </div>
                <div>
                  <Label htmlFor="offSeasonRates">Off-Season Rates</Label>
                  <Textarea
                    id="offSeasonRates"
                    value={formData.capacityDetails.offSeasonRates}
                    onChange={(e) => handleInputChange('capacityDetails', 'offSeasonRates', e.target.value)}
                    placeholder="Describe off-season pricing"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        );

      case 5:
        return (
          <Card>
            <CardHeader>
              <CardTitle>Pricing & Payment</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="basePrice">Rental Rate Per Day *</Label>
                <Input
                  id="basePrice"
                  type="number"
                  value={formData.pricing.basePrice}
                  onChange={(e) => handleInputChange('pricing', 'basePrice', parseInt(e.target.value) || 0)}
                  required
                />
              </div>
              
              <div>
                <Label>What does the rental include?</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
                  {rentalIncludes.map((item) => (
                    <div key={item.value} className="flex items-center space-x-2">
                      <Checkbox
                        id={item.value}
                        checked={formData.pricing.rentalIncludes.includes(item.value)}
                        onCheckedChange={(checked) => 
                          handleCheckboxChange('pricing', 'rentalIncludes', item.value, checked as boolean)
                        }
                      />
                      <Label htmlFor={item.value} className="text-sm">{item.label}</Label>
                    </div>
                  ))}
                </div>
                {formData.pricing.rentalIncludes.includes('other_equipment') && (
                  <div className="mt-4">
                    <Label htmlFor="otherEquipmentDetails">Please specify other equipment</Label>
                    <Textarea
                      id="otherEquipmentDetails"
                      value={formData.pricing.otherEquipmentDetails}
                      onChange={(e) => handleInputChange('pricing', 'otherEquipmentDetails', e.target.value)}
                    />
                  </div>
                )}
              </div>
              
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="securityDepositRequired"
                  checked={formData.pricing.securityDepositRequired}
                  onCheckedChange={(checked) => handleInputChange('pricing', 'securityDepositRequired', checked)}
                />
                <Label htmlFor="securityDepositRequired">Security Deposit Required</Label>
              </div>
              
              <div>
                <Label>Payment Modes Accepted</Label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mt-2">
                  {paymentModes.map((mode) => (
                    <div key={mode.value} className="flex items-center space-x-2">
                      <Checkbox
                        id={mode.value}
                        checked={formData.pricing.paymentModes.includes(mode.value)}
                        onCheckedChange={(checked) => 
                          handleCheckboxChange('pricing', 'paymentModes', mode.value, checked as boolean)
                        }
                      />
                      <Label htmlFor={mode.value} className="text-sm">{mode.label}</Label>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="space-y-4">
                <h4 className="font-semibold">Cancellation Policy</h4>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="refundable"
                    checked={formData.pricing.cancellationPolicy.refundable}
                    onCheckedChange={(checked) => handleInputChange('pricing', 'cancellationPolicy', checked, 'refundable')}
                  />
                  <Label htmlFor="refundable">Refundable</Label>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="timeFrame">Time Frame</Label>
                    <Input
                      id="timeFrame"
                      value={formData.pricing.cancellationPolicy.timeFrame}
                      onChange={(e) => handleInputChange('pricing', 'cancellationPolicy', e.target.value, 'timeFrame')}
                      placeholder="e.g., 48 hours before event"
                    />
                  </div>
                  <div>
                    <Label htmlFor="deductionPercentage">Deduction Percentage</Label>
                    <Input
                      id="deductionPercentage"
                      type="number"
                      value={formData.pricing.cancellationPolicy.deductionPercentage}
                      onChange={(e) => handleInputChange('pricing', 'cancellationPolicy', parseInt(e.target.value) || 0, 'deductionPercentage')}
                      placeholder="0-100"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        );

      case 6:
        return (
          <Card>
            <CardHeader>
              <CardTitle>Facilities & Amenities</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {Object.entries(formData.amenities).map(([key, amenity]) => (
                <div key={key} className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id={key}
                      checked={amenity.available}
                      onCheckedChange={(checked) => handleInputChange('amenities', key, checked, 'available')}
                    />
                    <Label htmlFor={key} className="font-medium">
                      {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                    </Label>
                  </div>
                  {amenity.available && (
                    <Textarea
                      placeholder="Description (optional)"
                      value={amenity.description || ''}
                      onChange={(e) => handleInputChange('amenities', key, e.target.value, 'description')}
                      className="ml-6"
                    />
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        );

      case 7:
        return (
          <Card>
            <CardHeader>
              <CardTitle>Venue Policies & Add-on Services</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <h4 className="font-semibold">Operating Hours</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="startTime">Start Time</Label>
                    <Input
                      id="startTime"
                      type="time"
                      value={formData.policies.operatingHours.startTime}
                      onChange={(e) => handleInputChange('policies', 'operatingHours', e.target.value, 'startTime')}
                    />
                  </div>
                  <div>
                    <Label htmlFor="endTime">End Time</Label>
                    <Input
                      id="endTime"
                      type="time"
                      value={formData.policies.operatingHours.endTime}
                      onChange={(e) => handleInputChange('policies', 'operatingHours', e.target.value, 'endTime')}
                    />
                  </div>
                </div>
              </div>
              
              <div>
                <Label htmlFor="noiseRestrictions">Noise Restrictions</Label>
                <Textarea
                  id="noiseRestrictions"
                  value={formData.policies.noiseRestrictions}
                  onChange={(e) => handleInputChange('policies', 'noiseRestrictions', e.target.value)}
                  placeholder="Local regulations and noise restrictions"
                />
              </div>
              
              <div>
                <Label>Smoking Policy</Label>
                <RadioGroup
                  value={formData.policies.smokingPolicy}
                  onValueChange={(value) => handleInputChange('policies', 'smokingPolicy', value)}
                  className="mt-2"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="allowed" id="smoking_allowed" />
                    <Label htmlFor="smoking_allowed">Allowed</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="not_allowed" id="smoking_not_allowed" />
                    <Label htmlFor="smoking_not_allowed">Not Allowed</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="designated_areas" id="smoking_designated" />
                    <Label htmlFor="smoking_designated">Designated Areas Only</Label>
                  </div>
                </RadioGroup>
              </div>
              
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="alcoholServingPermission"
                  checked={formData.policies.alcoholServingPermission}
                  onCheckedChange={(checked) => handleInputChange('policies', 'alcoholServingPermission', checked)}
                />
                <Label htmlFor="alcoholServingPermission">Alcohol Serving Permission</Label>
              </div>
              
              <div>
                <Label htmlFor="eventTypeRestrictions">Event Type Restrictions</Label>
                <Textarea
                  id="eventTypeRestrictions"
                  value={formData.policies.eventTypeRestrictions}
                  onChange={(e) => handleInputChange('policies', 'eventTypeRestrictions', e.target.value)}
                  placeholder="e.g., no late-night parties, no political events"
                />
              </div>
              
              <div className="space-y-4">
                <h4 className="font-semibold">Add-on Services</h4>
                {Object.entries(formData.addOnServices).map(([key, service]) => (
                  <div key={key} className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id={`service_${key}`}
                        checked={service.available}
                        onCheckedChange={(checked) => handleInputChange('addOnServices', key, checked, 'available')}
                      />
                      <Label htmlFor={`service_${key}`} className="font-medium">
                        {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                      </Label>
                    </div>
                    {service.available && (
                      <Textarea
                        placeholder="Description"
                        value={service.description || ''}
                        onChange={(e) => handleInputChange('addOnServices', key, e.target.value, 'description')}
                        className="ml-6"
                      />
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        );

      case 8:
        return (
          <Card>
            <CardHeader>
              <CardTitle>Document Upload & Final Confirmation</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div>
                  <Label>Venue Images (High Resolution)</Label>
                  <div className="mt-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={(e) => e.target.files && handleFileUpload(e.target.files, 'venueImages')}
                      className="hidden"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                    >
                      {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                      Upload Images
                    </Button>
                  </div>
                  {formData.documents.venueImages.length > 0 && (
                    <div className="mt-2 text-sm text-green-600">
                      {formData.documents.venueImages.length} image(s) uploaded
                    </div>
                  )}
                </div>
              </div>
              
              <div className="space-y-4">
                <h4 className="font-semibold">Final Confirmation</h4>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="publicListingAuthorized"
                    checked={formData.authorizations.publicListingAuthorized}
                    onCheckedChange={(checked) => handleInputChange('authorizations', 'publicListingAuthorized', checked)}
                  />
                  <Label htmlFor="publicListingAuthorized">
                    Do you authorize AHIBI to list your venue and display the provided information publicly?
                  </Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="onlineBookingEnabled"
                    checked={formData.authorizations.onlineBookingEnabled}
                    onCheckedChange={(checked) => handleInputChange('authorizations', 'onlineBookingEnabled', checked)}
                  />
                  <Label htmlFor="onlineBookingEnabled">
                    Do you want AHIBI to enable online booking & payment collection on your behalf?
                  </Label>
                </div>
                
                <div>
                  <Label>Preferred communication channel</Label>
                  <RadioGroup
                    value={formData.authorizations.preferredCommunication}
                    onValueChange={(value) => handleInputChange('authorizations', 'preferredCommunication', value)}
                    className="mt-2"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="whatsapp" id="comm_whatsapp" />
                      <Label htmlFor="comm_whatsapp">WhatsApp</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="email" id="comm_email" />
                      <Label htmlFor="comm_email">Email</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="phone_call" id="comm_phone" />
                      <Label htmlFor="comm_phone">Phone Call</Label>
                    </div>
                  </RadioGroup>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="informationAccuracyConfirmed"
                    checked={formData.authorizations.informationAccuracyConfirmed}
                    onCheckedChange={(checked) => handleInputChange('authorizations', 'informationAccuracyConfirmed', checked)}
                    required
                  />
                  <Label htmlFor="informationAccuracyConfirmed" className="font-medium text-red-600">
                    I confirm that all information provided is accurate *
                  </Label>
                </div>
              </div>
            </CardContent>
          </Card>
        );

      default:
        return null;
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">AHIBI Venue Listing</h1>
        <p className="text-gray-600">Complete your venue registration to get listed on AHIBI</p>
        
        {/* Progress indicator */}
        <div className="flex items-center justify-between mt-6">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((step) => (
            <div
              key={step}
              className={`flex items-center justify-center w-8 h-8 rounded-full ${
                step <= currentStep ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
              }`}
            >
              {step}
            </div>
          ))}
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        {renderStepContent()}

        <div className="flex justify-between mt-8">
          <Button
            type="button"
            variant="outline"
            onClick={prevStep}
            disabled={currentStep === 1}
          >
            Previous
          </Button>
          
          {currentStep < 8 ? (
            <Button type="button" onClick={nextStep}>
              Next
            </Button>
          ) : (
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Submit Registration
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}
