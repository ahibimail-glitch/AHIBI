"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { AlertCircle } from "lucide-react";
import { 
  Edit, 
  Save, 
  X, 
  User, 
  Building, 
  MapPin, 
  Car, 
  Users, 
  DollarSign,
  Settings,
  Star,
  FileText,
  Camera,
  Shield,
  Clock,
  Loader2,
  Upload,
  Trash2,
  Image as ImageIcon,
  Video,
  File,
  ArrowLeft,
  Menu,
  ChevronRight
} from "lucide-react";
import { uploadToVercelBlob, uploadMultipleToVercelBlob } from "@/lib/vercelBlob";
import { FileUploadArea } from "@/components/ui/file-upload-area";

interface VenueDetailsManagerProps {
  venueData: any;
  onUpdate: (section: string, data: any) => Promise<void>;
  initialSection?: string | null;
  onSectionChange?: () => void;
  onBack?: () => void;
}

export default function VenueDetailsManager({ 
  venueData, 
  onUpdate, 
  initialSection, 
  onSectionChange,
  onBack 
}: VenueDetailsManagerProps) {
  const [activeSection, setActiveSection] = useState("owner-details");
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [editData, setEditData] = useState<any>({});
  const [saving, setSaving] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [uploading, setUploading] = useState<{ [key: string]: boolean }>({});
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const sidebarItems = [
    { id: "owner-details", label: "Owner Details", shortLabel: "Owner", icon: User },
    { id: "venue-classification", label: "Venue Classification", shortLabel: "Classification", icon: Building },
    { id: "location", label: "Location & Accessibility", shortLabel: "Location", icon: MapPin },
    { id: "capacity", label: "Capacity & Booking", shortLabel: "Capacity", icon: Users },
    { id: "pricing", label: "Pricing & Payment", shortLabel: "Pricing", icon: DollarSign },
    { id: "amenities", label: "Facilities & Amenities", shortLabel: "Amenities", icon: Star },
    { id: "policies", label: "Venue Policies", shortLabel: "Policies", icon: Settings },
    { id: "addon-services", label: "Add-on Services", shortLabel: "Add-ons", icon: FileText },
    { id: "documents", label: "Documents & Media", shortLabel: "Documents", icon: Camera },
    { id: "authorizations", label: "Authorizations", shortLabel: "Auth", icon: Shield },
  ];

  const [showMobileSidebar, setShowMobileSidebar] = useState(false);

  const getInitialEditData = (section: string) => {
    switch (section) {
      case "owner-details":
        return {
          ...venueData?.ownerDetails || {},
          venueDescription: venueData?.description || ""
        };
      case "venue-classification":
        return venueData?.venueClassification || {};
      case "location":
        return { 
          address: venueData?.address || {}, 
          parking: venueData?.parking || {},
          accessibility: venueData?.accessibility || {}
        };
      case "capacity":
        return venueData?.capacityDetails || {};
      case "pricing":
        return venueData?.pricing || {};
      case "amenities":
        return venueData?.amenities || {};
      case "policies":
        return venueData?.policies || {};
      case "addon-services":
        return venueData?.addOnServices || {};
      case "documents":
        return venueData?.documents || {};
      case "authorizations":
        return venueData?.authorizations || {};
      default:
        return {};
    }
  };

  const handleEdit = (section: string) => {
    setEditingSection(section);
    setEditData(getInitialEditData(section));
  };

  // Handle initial section navigation
  useEffect(() => {
    if (initialSection) {
      console.log('VenueDetailsManager received initialSection:', initialSection);
      setActiveSection(initialSection);
      setEditingSection(initialSection);
      setEditData(getInitialEditData(initialSection));
      if (onSectionChange) {
        onSectionChange();
      }
    }
  }, [initialSection]);

  const validateSection = (section: string, data: any) => {
    const errors: string[] = [];
    
    switch (section) {
      case "owner-details":
        if (!data.designation?.trim()) {
          errors.push("Designation is required");
        }
        break;
      case "venue-classification":
        if (!data.indoorOutdoor) {
          errors.push("Indoor/Outdoor specification is required");
        }
        if (!data.operationMode) {
          errors.push("Operation mode is required");
        }
        break;
      case "pricing":
        if (data.basePrice !== undefined && (isNaN(data.basePrice) || data.basePrice < 0)) {
          errors.push("Base price must be a valid positive number");
        }
        break;
      case "authorizations":
        if (data.preferredCommunication && !['whatsapp', 'email', 'phone_call'].includes(data.preferredCommunication)) {
          errors.push("Invalid preferred communication channel");
        }
        break;
      case "location":
        if (!data.parking?.carCapacity && data.parking?.carCapacity !== 0) {
          errors.push("Car parking capacity is required");
        }
        break;
      case "capacity":
        if (!data.standingCapacity && data.standingCapacity !== 0) {
          errors.push("Standing capacity is required");
        }
        if (!data.advanceBookingDays && data.advanceBookingDays !== 0) {
          errors.push("Advance booking days is required");
        }
        break;
    }
    
    return errors;
  };

  const handleSave = async (section: string) => {
    // Validate required fields before saving
    const errors = validateSection(section, editData);
    setValidationErrors(errors);
    
    if (errors.length > 0) {
      toast.error(errors.join(", "));
      return;
    }
    
    setSaving(true);
    try {
      await onUpdate(section, editData);
      setEditingSection(null);
      setEditData({});
      setValidationErrors([]);
      toast.success("Section updated successfully");
    } catch (error) {
      toast.error("Failed to update section");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setEditingSection(null);
    setEditData({});
    setValidationErrors([]);
  };

  const ValidationErrorDisplay = () => {
    if (validationErrors.length === 0) return null;
    
    return (
      <Alert variant="destructive" className="mb-4">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          <ul className="list-disc list-inside space-y-1">
            {validationErrors.map((error, index) => (
              <li key={index}>{error}</li>
            ))}
          </ul>
        </AlertDescription>
      </Alert>
    );
  };

  const renderOwnerDetails = () => (
    <Card className="shadow-sm">
      <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3">
        <CardTitle className="flex items-center gap-2">
          <User className="h-5 w-5" />
          Owner Details
        </CardTitle>
        {editingSection !== "owner-details" && (
          <Button variant="outline" size="sm" onClick={() => handleEdit("owner-details")} className="w-full sm:w-auto">
            <Edit className="h-4 w-4 mr-2" />
            Edit
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {editingSection === "owner-details" ? (
          <div className="space-y-4">
            <ValidationErrorDisplay />
            
            {/* Venue Description - Full Width */}
            <div>
              <Label>Venue Description *</Label>
              <Textarea
                value={editData.venueDescription || ""}
                onChange={(e) => setEditData({...editData, venueDescription: e.target.value})}
                placeholder="Describe your venue, its unique features, ambiance, and what makes it special..."
                rows={4}
                required
              />
              <p className="text-xs text-gray-500 mt-1">This description will be shown to customers on your venue listing page.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Full Name</Label>
                <Input
                  value={editData.fullName || ""}
                  onChange={(e) => setEditData({...editData, fullName: e.target.value})}
                />
              </div>
              <div>
                <Label>Business Name</Label>
                <Input
                  value={editData.businessName || ""}
                  onChange={(e) => setEditData({...editData, businessName: e.target.value})}
                />
              </div>
              <div>
                <Label>Primary Contact</Label>
                <Input
                  value={editData.primaryContact || ""}
                  onChange={(e) => setEditData({...editData, primaryContact: e.target.value})}
                />
              </div>
              <div>
                <Label>Email</Label>
                <Input
                  type="email"
                  value={editData.email || ""}
                  onChange={(e) => setEditData({...editData, email: e.target.value})}
                />
              </div>
              <div>
                <Label>Designation *</Label>
                <Input
                  value={editData.designation || ""}
                  onChange={(e) => setEditData({...editData, designation: e.target.value})}
                  placeholder="e.g., Owner, Manager, Director"
                  required
                />
              </div>
              <div>
                <Label>GST Number</Label>
                <Input
                  value={editData.gstNumber || ""}
                  onChange={(e) => setEditData({...editData, gstNumber: e.target.value})}
                />
              </div>
              <div>
                <Label>Alternate Contact</Label>
                <Input
                  value={editData.alternateContact || ""}
                  onChange={(e) => setEditData({...editData, alternateContact: e.target.value})}
                  placeholder="Alternate phone number"
                />
              </div>
              <div>
                <Label>Business Registration Number</Label>
                <Input
                  value={editData.businessRegistrationNumber || ""}
                  onChange={(e) => setEditData({...editData, businessRegistrationNumber: e.target.value})}
                  placeholder="Business registration number"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => handleSave("owner-details")} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                Save
              </Button>
              <Button variant="outline" onClick={handleCancel}>
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Venue Description - Full Width */}
            <div>
              <Label className="text-sm font-medium text-gray-500">Venue Description</Label>
              <p className="text-sm mt-1 whitespace-pre-wrap">{venueData?.description || "Not provided"}</p>
            </div>

            <Separator className="my-4" />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium text-gray-500">Full Name</Label>
                <p className="text-sm">{venueData?.ownerDetails?.fullName || "Not provided"}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-500">Business Name</Label>
                <p className="text-sm">{venueData?.ownerDetails?.businessName || "Not provided"}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-500">Primary Contact</Label>
                <p className="text-sm">{venueData?.ownerDetails?.primaryContact || "Not provided"}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-500">Email</Label>
                <p className="text-sm">{venueData?.ownerDetails?.email || "Not provided"}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-500">Designation</Label>
                <p className="text-sm">{venueData?.ownerDetails?.designation || "Not provided"}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-500">GST Number</Label>
                <p className="text-sm">{venueData?.ownerDetails?.gstNumber || "Not provided"}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-500">Alternate Contact</Label>
                <p className="text-sm">{venueData?.ownerDetails?.alternateContact || "Not provided"}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-500">Business Registration Number</Label>
                <p className="text-sm">{venueData?.ownerDetails?.businessRegistrationNumber || "Not provided"}</p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );

  const renderVenueClassification = () => (
    <Card className="shadow-sm">
      <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3">
        <CardTitle className="flex items-center gap-2">
          <Building className="h-5 w-5" />
          Venue Classification
        </CardTitle>
        {editingSection !== "venue-classification" && (
          <Button variant="outline" size="sm" onClick={() => handleEdit("venue-classification")} className="w-full sm:w-auto">
            <Edit className="h-4 w-4 mr-2" />
            Edit
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {editingSection === "venue-classification" ? (
          <div className="space-y-4">
            <ValidationErrorDisplay />
            <div>
              <Label>Venue Types *</Label>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {[
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
                ].map((type) => (
                  <div key={type.value} className="flex items-center space-x-2">
                    <Checkbox
                      checked={(editData.venueTypes || []).includes(type.value)}
                      onCheckedChange={(checked) => {
                        const types = editData.venueTypes || [];
                        setEditData({
                          ...editData,
                          venueTypes: checked 
                            ? [...types, type.value]
                            : types.filter((t: string) => t !== type.value)
                        });
                      }}
                    />
                    <Label className="text-sm">{type.label}</Label>
                  </div>
                ))}
              </div>
              {(editData.venueTypes || []).includes("others") && (
                <div className="mt-2">
                  <Label>Others (Specify)</Label>
                  <Input
                    value={editData.venueTypeOther || ""}
                    onChange={(e) => setEditData({...editData, venueTypeOther: e.target.value})}
                    placeholder="Specify other venue type"
                  />
                </div>
              )}
            </div>
            <div>
              <Label>Indoor/Outdoor *</Label>
              <RadioGroup
                value={editData.indoorOutdoor || ""}
                onValueChange={(value) => setEditData({...editData, indoorOutdoor: value})}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="indoor" />
                  <Label>Indoor</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="outdoor" />
                  <Label>Outdoor</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="hybrid" />
                  <Label>Hybrid</Label>
                </div>
              </RadioGroup>
            </div>
            <div>
              <Label>Operation Mode *</Label>
              <RadioGroup
                value={editData.operationMode || ""}
                onValueChange={(value) => setEditData({...editData, operationMode: value})}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="seasonal" />
                  <Label>Seasonal</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="year_round" />
                  <Label>Year-round</Label>
                </div>
              </RadioGroup>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => handleSave("venue-classification")} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                Save
              </Button>
              <Button variant="outline" onClick={handleCancel}>
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <Label className="text-sm font-medium text-gray-500">Venue Types</Label>
              <div className="flex flex-wrap gap-2 mt-1">
                {venueData?.venueClassification?.venueTypes?.map((type: string) => (
                  <Badge key={type} variant="secondary">
                    {type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </Badge>
                )) || <p className="text-sm text-gray-400">Not specified</p>}
              </div>
            </div>
            <div>
              <Label className="text-sm font-medium text-gray-500">Indoor/Outdoor</Label>
              <p className="text-sm">
                {(() => {
                  const value = venueData?.venueClassification?.indoorOutdoor;
                  if (!value) return "Not specified";
                  if (value === "indoor") return "Indoor";
                  if (value === "outdoor") return "Outdoor";
                  if (value === "both" || value === "hybrid") return "Hybrid";
                  return value;
                })()}
              </p>
            </div>
            <div>
              <Label className="text-sm font-medium text-gray-500">Operation Mode</Label>
              <p className="text-sm">{venueData?.venueClassification?.operationMode || "Not specified"}</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );

  const renderLocationSection = () => (
    <Card className="shadow-sm">
      <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3">
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5" />
          Location & Accessibility
        </CardTitle>
        {editingSection !== "location" && (
          <Button variant="outline" size="sm" onClick={() => handleEdit("location")} className="w-full sm:w-auto">
            <Edit className="h-4 w-4 mr-2" />
            Edit
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {editingSection === "location" ? (
          <div className="space-y-4">
            <ValidationErrorDisplay />
            <div>
              <Label>Complete Address *</Label>
              <Textarea
                value={editData.address?.street || ""}
                onChange={(e) => setEditData({
                  ...editData,
                  address: { ...editData.address, street: e.target.value }
                })}
                placeholder="Complete address with street details"
                rows={3}
              />
            </div>
            <div>
              <Label>Google Maps Link</Label>
              <Input
                value={editData.address?.googleMapsLink || ""}
                onChange={(e) => setEditData({
                  ...editData,
                  address: { ...editData.address, googleMapsLink: e.target.value }
                })}
                placeholder="https://maps.google.com/..."
              />
            </div>
            <div>
              <Label>Landmark / Directions</Label>
              <Textarea
                value={editData.address?.landmark || ""}
                onChange={(e) => setEditData({
                  ...editData,
                  address: { ...editData.address, landmark: e.target.value }
                })}
                placeholder="Nearby landmarks or directions"
                rows={2}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label>City</Label>
                <Input
                  value={editData.address?.city || ""}
                  onChange={(e) => setEditData({
                    ...editData,
                    address: { ...editData.address, city: e.target.value }
                  })}
                />
              </div>
              <div>
                <Label>State</Label>
                <Input
                  value={editData.address?.state || ""}
                  onChange={(e) => setEditData({
                    ...editData,
                    address: { ...editData.address, state: e.target.value }
                  })}
                />
              </div>
              <div>
                <Label>Pincode</Label>
                <Input
                  value={editData.address?.pincode || ""}
                  onChange={(e) => setEditData({
                    ...editData,
                    address: { ...editData.address, pincode: e.target.value }
                  })}
                />
              </div>
            </div>
            <div>
              <Label>Car Parking Capacity *</Label>
              <Input
                type="number"
                value={editData.parking?.carCapacity || ""}
                onChange={(e) => setEditData({
                  ...editData,
                  parking: { ...editData.parking, carCapacity: parseInt(e.target.value) || 0 }
                })}
                placeholder="Enter number of car parking spaces"
                required
              />
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                checked={editData.parking?.twoWheelerAvailable || false}
                onCheckedChange={(checked) => setEditData({
                  ...editData,
                  parking: { ...editData.parking, twoWheelerAvailable: checked }
                })}
              />
              <Label>Two-wheeler parking available</Label>
            </div>
            <Separator />
            <div>
              <Label className="text-base font-semibold mb-2">Accessibility</Label>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    checked={editData.accessibility?.wheelchairAccess || false}
                    onCheckedChange={(checked) => setEditData({
                      ...editData,
                      accessibility: { ...editData.accessibility, wheelchairAccess: checked }
                    })}
                  />
                  <Label>Wheelchair access</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    checked={editData.accessibility?.liftElevator || false}
                    onCheckedChange={(checked) => setEditData({
                      ...editData,
                      accessibility: { ...editData.accessibility, liftElevator: checked }
                    })}
                  />
                  <Label>Lift/Elevator availability</Label>
                </div>
                <div>
                  <Label className="text-sm">Nearby Transport Options</Label>
                  <div className="space-y-2 mt-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        checked={editData.accessibility?.nearbyTransport?.airport || false}
                        onCheckedChange={(checked) => setEditData({
                          ...editData,
                          accessibility: {
                            ...editData.accessibility,
                            nearbyTransport: {
                              ...editData.accessibility?.nearbyTransport,
                              airport: checked
                            }
                          }
                        })}
                      />
                      <Label className="text-sm">Airport</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        checked={editData.accessibility?.nearbyTransport?.railwayStation || false}
                        onCheckedChange={(checked) => setEditData({
                          ...editData,
                          accessibility: {
                            ...editData.accessibility,
                            nearbyTransport: {
                              ...editData.accessibility?.nearbyTransport,
                              railwayStation: checked
                            }
                          }
                        })}
                      />
                      <Label className="text-sm">Railway Station</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        checked={editData.accessibility?.nearbyTransport?.taxiService || false}
                        onCheckedChange={(checked) => setEditData({
                          ...editData,
                          accessibility: {
                            ...editData.accessibility,
                            nearbyTransport: {
                              ...editData.accessibility?.nearbyTransport,
                              taxiService: checked
                            }
                          }
                        })}
                      />
                      <Label className="text-sm">Taxi Service</Label>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => handleSave("location")} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                Save
              </Button>
              <Button variant="outline" onClick={handleCancel}>
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <Label className="text-sm font-medium text-gray-500">Address</Label>
              <p className="text-sm">{venueData?.address?.street || "Not provided"}</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label className="text-sm font-medium text-gray-500">City</Label>
                <p className="text-sm">{venueData?.address?.city || "Not provided"}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-500">State</Label>
                <p className="text-sm">{venueData?.address?.state || "Not provided"}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-500">Pincode</Label>
                <p className="text-sm">{venueData?.address?.pincode || "Not provided"}</p>
              </div>
            </div>
            <div>
              <Label className="text-sm font-medium text-gray-500">Parking Capacity</Label>
              <p className="text-sm">{venueData?.parking?.carCapacity || 0} cars</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );

  const renderSectionContent = () => {
    const content = (() => {
      switch (activeSection) {
        case "owner-details":
          return renderOwnerDetails();
        case "venue-classification":
          return renderVenueClassification();
        case "location":
          return renderLocationSection();
      case "capacity":
        return (
          <Card className="shadow-sm">
            <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3">
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Capacity & Booking Details
              </CardTitle>
              {editingSection !== "capacity" && (
                <Button variant="outline" size="sm" onClick={() => handleEdit("capacity")} className="w-full sm:w-auto">
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {editingSection === "capacity" ? (
                <div className="space-y-4">
                  <ValidationErrorDisplay />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>Standing Capacity *</Label>
                      <Input
                        type="number"
                        value={editData.standingCapacity || ""}
                        onChange={(e) => setEditData({...editData, standingCapacity: parseInt(e.target.value) || 0})}
                        placeholder="Maximum standing capacity"
                        required
                      />
                    </div>
                    <div>
                      <Label>Seating Capacity (Theatre Style)</Label>
                      <Input
                        type="number"
                        value={editData.seatingCapacity?.theatreStyle || ""}
                        onChange={(e) => setEditData({
                          ...editData,
                          seatingCapacity: {
                            ...editData.seatingCapacity,
                            theatreStyle: parseInt(e.target.value) || 0
                          }
                        })}
                        placeholder="Theatre style seating"
                      />
                    </div>
                    <div>
                      <Label>Seating Capacity (Round Table)</Label>
                      <Input
                        type="number"
                        value={editData.seatingCapacity?.roundTable || ""}
                        onChange={(e) => setEditData({
                          ...editData,
                          seatingCapacity: {
                            ...editData.seatingCapacity,
                            roundTable: parseInt(e.target.value) || 0
                          }
                        })}
                        placeholder="Round table seating"
                      />
                    </div>
                    <div>
                      <Label>Minimum Booking Capacity</Label>
                      <Input
                        type="number"
                        value={editData.minimumBookingCapacity || ""}
                        onChange={(e) => setEditData({...editData, minimumBookingCapacity: parseInt(e.target.value) || 0})}
                        placeholder="Minimum number of guests"
                      />
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      checked={editData.multipleEventsPerDay || false}
                      onCheckedChange={(checked) => setEditData({...editData, multipleEventsPerDay: checked})}
                    />
                    <Label>Can host multiple events in a single day?</Label>
                  </div>
                  <div>
                    <Label>Time Slots Available</Label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-2">
                      {[
                        { value: "full_day", label: "Full Day" },
                        { value: "half_day", label: "Half Day" },
                        { value: "hourly", label: "Hourly Booking" }
                      ].map((slot) => (
                        <div key={slot.value} className="flex items-center space-x-2">
                          <Checkbox
                            checked={(editData.timeSlots || []).includes(slot.value)}
                            onCheckedChange={(checked) => {
                              const slots = editData.timeSlots || [];
                              setEditData({
                                ...editData,
                                timeSlots: checked
                                  ? [...slots, slot.value]
                                  : slots.filter((s: string) => s !== slot.value)
                              });
                            }}
                          />
                          <Label className="text-sm">{slot.label}</Label>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>Peak Season Rates</Label>
                    <Textarea
                        value={editData.peakSeasonRates || ""}
                        onChange={(e) => setEditData({...editData, peakSeasonRates: e.target.value})}
                        placeholder="Describe peak season rates"
                        rows={2}
                      />
                    </div>
                    <div>
                      <Label>Off-Season Rates</Label>
                      <Textarea
                        value={editData.offSeasonRates || ""}
                        onChange={(e) => setEditData({...editData, offSeasonRates: e.target.value})}
                        placeholder="Describe off-season rates"
                        rows={2}
                      />
                    </div>
                  </div>
                  <div>
                    <Label>Advance Booking Days Required *</Label>
                    <Input
                      type="number"
                      value={editData.advanceBookingDays || ""}
                      onChange={(e) => setEditData({...editData, advanceBookingDays: parseInt(e.target.value) || 0})}
                      placeholder="How many days prior?"
                      required
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={() => handleSave("capacity")} disabled={saving}>
                      {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                      Save
                    </Button>
                    <Button variant="outline" onClick={handleCancel}>
                      <X className="h-4 w-4 mr-2" />
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium text-gray-500">Standing Capacity</Label>
                      <p className="text-sm">{venueData?.capacityDetails?.standingCapacity || "Not specified"}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-500">Seating Capacity</Label>
                      <div className="text-sm space-y-1">
                        {venueData?.capacityDetails?.seatingCapacity?.theatreStyle && (
                          <p>Theatre Style: {venueData.capacityDetails.seatingCapacity.theatreStyle}</p>
                        )}
                        {venueData?.capacityDetails?.seatingCapacity?.roundTable && (
                          <p>Round Table: {venueData.capacityDetails.seatingCapacity.roundTable}</p>
                        )}
                        {!venueData?.capacityDetails?.seatingCapacity?.theatreStyle && 
                         !venueData?.capacityDetails?.seatingCapacity?.roundTable && (
                          <p>Not specified</p>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium text-gray-500">Minimum Booking Capacity</Label>
                      <p className="text-sm">{venueData?.capacityDetails?.minimumBookingCapacity || "Not specified"}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-500">Advance Booking Days</Label>
                      <p className="text-sm">{venueData?.capacityDetails?.advanceBookingDays || "Not specified"}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium text-gray-500">Multiple Events Per Day</Label>
                      <p className="text-sm">{venueData?.capacityDetails?.multipleEventsPerDay ? "Yes" : "No"}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-500">Time Slots</Label>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {venueData?.capacityDetails?.timeSlots?.length > 0 ? (
                          venueData.capacityDetails.timeSlots.map((slot: string) => (
                            <Badge key={slot} variant="secondary">
                              {slot.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
                            </Badge>
                          ))
                        ) : (
                          <p className="text-sm text-gray-400">Not specified</p>
                        )}
                      </div>
                    </div>
                  </div>
                  {(venueData?.capacityDetails?.peakSeasonRates || venueData?.capacityDetails?.offSeasonRates) && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {venueData?.capacityDetails?.peakSeasonRates && (
                        <div>
                          <Label className="text-sm font-medium text-gray-500">Peak Season Rates</Label>
                          <p className="text-sm">{venueData.capacityDetails.peakSeasonRates}</p>
                        </div>
                      )}
                      {venueData?.capacityDetails?.offSeasonRates && (
                        <div>
                          <Label className="text-sm font-medium text-gray-500">Off-Season Rates</Label>
                          <p className="text-sm">{venueData.capacityDetails.offSeasonRates}</p>
                        </div>
                      )}
                    </div>
                  )}
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Special Requirements</Label>
                    <p className="text-sm">{venueData?.capacityDetails?.specialRequirements || "None specified"}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        );
      case "pricing":
        return (
          <Card className="shadow-sm">
            <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3">
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Pricing & Payment
              </CardTitle>
              {editingSection !== "pricing" && (
                <Button variant="outline" size="sm" onClick={() => handleEdit("pricing")} className="w-full sm:w-auto">
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {editingSection === "pricing" ? (
                <div className="space-y-4">
                  <ValidationErrorDisplay />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>Rental Rate Per Slot / Per Day *</Label>
                      <Input
                        type="number"
                        value={editData.basePrice || ""}
                        onChange={(e) => setEditData({...editData, basePrice: parseFloat(e.target.value) || 0})}
                        placeholder="Base rental rate"
                        required
                      />
                    </div>
                    <div>
                      <Label>Hourly Rate</Label>
                      <Input
                        type="number"
                        value={editData.hourlyRate || ""}
                        onChange={(e) => setEditData({...editData, hourlyRate: parseFloat(e.target.value) || 0})}
                        placeholder="Hourly booking rate"
                      />
                    </div>
                    <div>
                      <Label>Full Day Rate</Label>
                      <Input
                        type="number"
                        value={editData.fullDayRate || ""}
                        onChange={(e) => setEditData({...editData, fullDayRate: parseFloat(e.target.value) || 0})}
                        placeholder="Full day rate"
                      />
                    </div>
                    <div>
                      <Label>Half Day Rate</Label>
                      <Input
                        type="number"
                        value={editData.halfDayRate || ""}
                        onChange={(e) => setEditData({...editData, halfDayRate: parseFloat(e.target.value) || 0})}
                        placeholder="Half day rate"
                      />
                    </div>
                    <div>
                      <Label>Cleaning Fee</Label>
                      <Input
                        type="number"
                        value={editData.cleaningFee || ""}
                        onChange={(e) => setEditData({...editData, cleaningFee: parseFloat(e.target.value) || 0})}
                        placeholder="Cleaning fee amount"
                      />
                    </div>
                    <div>
                      <Label>Security Deposit</Label>
                      <Input
                        type="number"
                        value={editData.securityDeposit || ""}
                        onChange={(e) => setEditData({...editData, securityDeposit: parseFloat(e.target.value) || 0})}
                        placeholder="Security deposit amount"
                      />
                    </div>
                  </div>
                  <div>
                    <Label>What does the rental include?</Label>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      {[
                        { value: "space_only", label: "Space Only" },
                        { value: "chairs_tables", label: "Chairs & Tables" },
                        { value: "basic_lighting", label: "Basic Lighting" },
                        { value: "sound_system", label: "Sound System" },
                        { value: "cleaning_staff", label: "Cleaning Staff" },
                        { value: "generator_backup_power", label: "Generator / Backup Power" },
                        { value: "other_equipment", label: "Other Equipment" }
                      ].map((item) => (
                        <div key={item.value} className="flex items-center space-x-2">
                          <Checkbox
                            checked={(editData.rentalIncludes || []).includes(item.value)}
                            onCheckedChange={(checked) => {
                              const includes = editData.rentalIncludes || [];
                              setEditData({
                                ...editData,
                                rentalIncludes: checked
                                  ? [...includes, item.value]
                                  : includes.filter((i: string) => i !== item.value)
                              });
                            }}
                          />
                          <Label className="text-sm">{item.label}</Label>
                        </div>
                      ))}
                    </div>
                    {(editData.rentalIncludes || []).includes("other_equipment") && (
                      <div className="mt-2">
                        <Label>Other Equipment Details</Label>
                        <Textarea
                          value={editData.otherEquipmentDetails || ""}
                          onChange={(e) => setEditData({...editData, otherEquipmentDetails: e.target.value})}
                          placeholder="Specify other equipment included"
                          rows={2}
                        />
                      </div>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      checked={editData.securityDepositRequired || false}
                      onCheckedChange={(checked) => setEditData({...editData, securityDepositRequired: checked})}
                    />
                    <Label>Security Deposit Required?</Label>
                  </div>
                  <div>
                    <Label>Payment Modes Accepted</Label>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      {[
                        { value: "online", label: "Online" },
                        { value: "cash", label: "Cash" },
                        { value: "bank_transfer", label: "Bank Transfer" },
                        { value: "upi", label: "UPI" },
                        { value: "card_payment", label: "Card Payment" }
                      ].map((mode) => (
                        <div key={mode.value} className="flex items-center space-x-2">
                          <Checkbox
                            checked={(editData.paymentModes || []).includes(mode.value)}
                            onCheckedChange={(checked) => {
                              const modes = editData.paymentModes || [];
                              setEditData({
                                ...editData,
                                paymentModes: checked
                                  ? [...modes, mode.value]
                                  : modes.filter((m: string) => m !== mode.value)
                              });
                            }}
                          />
                          <Label className="text-sm">{mode.label}</Label>
                        </div>
                      ))}
                    </div>
                  </div>
                  <Separator />
                  <div>
                    <Label className="text-base font-semibold mb-2">Cancellation Policy</Label>
                    <div className="space-y-4">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          checked={editData.cancellationPolicy?.refundable || false}
                          onCheckedChange={(checked) => setEditData({
                            ...editData,
                            cancellationPolicy: {
                              ...editData.cancellationPolicy,
                              refundable: checked
                            }
                          })}
                        />
                        <Label>Refundable</Label>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label>Time Frame</Label>
                          <Input
                            value={editData.cancellationPolicy?.timeFrame || ""}
                            onChange={(e) => setEditData({
                              ...editData,
                              cancellationPolicy: {
                                ...editData.cancellationPolicy,
                                timeFrame: e.target.value
                              }
                            })}
                            placeholder="e.g., 7 days before event"
                          />
                        </div>
                        <div>
                          <Label>Deduction Percentage</Label>
                          <Input
                            type="number"
                            value={editData.cancellationPolicy?.deductionPercentage || ""}
                            onChange={(e) => setEditData({
                              ...editData,
                              cancellationPolicy: {
                                ...editData.cancellationPolicy,
                                deductionPercentage: parseFloat(e.target.value) || 0
                              }
                            })}
                            placeholder="% deduction"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={() => handleSave("pricing")} disabled={saving}>
                      {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                      Save
                    </Button>
                    <Button variant="outline" onClick={handleCancel}>
                      <X className="h-4 w-4 mr-2" />
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium text-gray-500">Base Price</Label>
                      <p className="text-sm">₹{venueData?.pricing?.basePrice || "Not set"}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-500">Hourly Rate</Label>
                      <p className="text-sm">₹{venueData?.pricing?.hourlyRate || "Not set"}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-500">Half Day Rate</Label>
                      {(() => {
                        const half = venueData?.pricing?.halfDayRate;
                        const hourly = venueData?.pricing?.hourlyRate;
                        const full = venueData?.pricing?.fullDayRate;
                        let value: number | undefined = undefined;
                        let derived = false;
                        if (typeof half === 'number' && half > 0) {
                          value = half;
                        } else {
                          const cands: number[] = [];
                          if (typeof full === 'number' && full > 0) cands.push(full / 2);
                          if (typeof hourly === 'number' && hourly > 0) cands.push(hourly * 12);
                          if (cands.length > 0) {
                            value = Math.min(...cands);
                            derived = true;
                          }
                        }
                        return <p className="text-sm">{value !== undefined ? `₹${value}` + (derived ? ' (derived)' : '') : 'Not set'}</p>;
                      })()}
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-500">Full Day Rate</Label>
                      <p className="text-sm">₹{venueData?.pricing?.fullDayRate || "Not set"}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-500">Security Deposit</Label>
                      <p className="text-sm">₹{venueData?.pricing?.securityDeposit || "Not set"}</p>
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Rental Includes</Label>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {venueData?.pricing?.rentalIncludes?.map((item: string) => (
                        <Badge key={item} variant="secondary">
                          {item.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </Badge>
                      )) || <p className="text-sm text-gray-400">Not specified</p>}
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Payment Modes</Label>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {venueData?.pricing?.paymentModes?.map((mode: string) => (
                        <Badge key={mode} variant="secondary">
                          {mode.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </Badge>
                      )) || <p className="text-sm text-gray-400">Not specified</p>}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        );
      case "amenities":
        return (
          <Card className="shadow-sm">
            <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3">
              <CardTitle className="flex items-center gap-2">
                <Star className="h-5 w-5" />
                Facilities & Amenities
              </CardTitle>
              {editingSection !== "amenities" && (
                <Button variant="outline" size="sm" onClick={() => handleEdit("amenities")} className="w-full sm:w-auto">
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {editingSection === "amenities" ? (
                <div className="space-y-4">
                  <ValidationErrorDisplay />
                  {[
                    { key: "stage", label: "Stage / Platform" },
                    { key: "airConditioning", label: "Air Conditioning / Heating" },
                    { key: "inHouseCatering", label: "In-house Catering" },
                    { key: "lightingSystem", label: "Lighting System" },
                    { key: "professionalSoundSystem", label: "Professional Sound System" },
                    { key: "ledScreenProjection", label: "LED Screen / Projection" },
                    { key: "wifiAvailability", label: "Wi-Fi Availability" },
                    { key: "dressingRooms", label: "Dressing Rooms / Green Rooms" },
                    { key: "changingRooms", label: "Changing Rooms" },
                    { key: "washrooms", label: "Washroom Count & Cleanliness Standards", isSpecial: true },
                    { key: "powerBackup", label: "Power Backup / Generator Capacity", hasDescription: true },
                    { key: "securityCctv", label: "Security & CCTV" },
                    { key: "alcoholPermission", label: "Alcohol Service Permission" },
                    { key: "liveMusicPermission", label: "Live Music Permission / Sound Restrictions", hasDescription: true },
                    { key: "sportsEquipment", label: "Sports Equipment (if applicable)" },
                    { key: "accommodation", label: "Accommodation / Rooms on Site", isSpecial: true },
                    { key: "decorationServices", label: "Decoration Services Available" },
                    { key: "valetService", label: "Parking Attendant / Valet Service" }
                  ].map((amenity) => (
                    <div key={amenity.key} className="space-y-2 p-3 border rounded-lg">
                      <div className="flex items-center justify-between">
                        <Label className="font-medium">{amenity.label}</Label>
                        <div className="flex items-center space-x-2">
                          {/* <Label className="text-sm">No</Label> */}
                          <Checkbox
                            checked={editData[amenity.key]?.available || false}
                            onCheckedChange={(checked) => setEditData({
                              ...editData,
                              [amenity.key]: {
                                ...editData[amenity.key],
                                available: checked
                              }
                            })}
                          />
                          <Label className="text-sm">Yes</Label>
                        </div>
                      </div>
                      {amenity.isSpecial && amenity.key === "washrooms" && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                          <div>
                            <Label className="text-sm">Washroom Count</Label>
                            <Input
                              type="number"
                              value={editData.washrooms?.count || ""}
                              onChange={(e) => setEditData({
                                ...editData,
                                washrooms: {
                                  ...editData.washrooms,
                                  count: parseInt(e.target.value) || 0
                                }
                              })}
                            />
                          </div>
                          <div>
                            <Label className="text-sm">Cleanliness Standards</Label>
                            <Input
                              value={editData.washrooms?.cleanlinessStandards || ""}
                              onChange={(e) => setEditData({
                                ...editData,
                                washrooms: {
                                  ...editData.washrooms,
                                  cleanlinessStandards: e.target.value
                                }
                              })}
                              placeholder="Describe cleanliness standards"
                            />
                          </div>
                        </div>
                      )}
                      {amenity.isSpecial && amenity.key === "accommodation" && (
                        <div className="mt-2">
                          <Label className="text-sm">Number of Rooms</Label>
                          <Input
                            type="number"
                            value={editData.accommodation?.roomsCount || ""}
                            onChange={(e) => setEditData({
                              ...editData,
                              accommodation: {
                                ...editData.accommodation,
                                roomsCount: parseInt(e.target.value) || 0
                              }
                            })}
                          />
                        </div>
                      )}
                      {amenity.hasDescription && editData[amenity.key]?.available && (
                        <div className="mt-2">
                          <Label className="text-sm">Description</Label>
                          <Textarea
                            value={editData[amenity.key]?.description || ""}
                            onChange={(e) => setEditData({
                              ...editData,
                              [amenity.key]: {
                                ...editData[amenity.key],
                                description: e.target.value
                              }
                            })}
                            placeholder={`Describe ${amenity.label.toLowerCase()}`}
                            rows={2}
                          />
                        </div>
                      )}
                      {amenity.key === "powerBackup" && editData.powerBackup?.available && (
                        <div className="mt-2">
                          <Label className="text-sm">Generator Capacity</Label>
                          <Input
                            value={editData.powerBackup?.generatorCapacity || ""}
                            onChange={(e) => setEditData({
                              ...editData,
                              powerBackup: {
                                ...editData.powerBackup,
                                generatorCapacity: e.target.value
                              }
                            })}
                            placeholder="e.g., 50 KVA"
                          />
                        </div>
                      )}
                      {amenity.key === "liveMusicPermission" && editData.liveMusicPermission?.available && (
                        <div className="mt-2">
                          <Label className="text-sm">Sound Restrictions</Label>
                          <Input
                            value={editData.liveMusicPermission?.soundRestrictions || ""}
                            onChange={(e) => setEditData({
                              ...editData,
                              liveMusicPermission: {
                                ...editData.liveMusicPermission,
                                soundRestrictions: e.target.value
                              }
                            })}
                            placeholder="Describe sound restrictions"
                          />
                        </div>
                      )}
                    </div>
                  ))}
                  <div className="flex gap-2">
                    <Button onClick={() => handleSave("amenities")} disabled={saving}>
                      {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                      Save
                    </Button>
                    <Button variant="outline" onClick={handleCancel}>
                      <X className="h-4 w-4 mr-2" />
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {Object.entries(venueData?.amenities || {}).map(([key, value]: [string, any]) => (
                      value?.available && (
                        <div key={key} className="flex items-center space-x-2">
                          <Badge variant="secondary">{key.replace(/([A-Z])/g, ' $1').trim()}</Badge>
                          {value.description && <span className="text-xs text-gray-500">- {value.description}</span>}
                        </div>
                      )
                    ))}
                  </div>
                  {(!venueData?.amenities || Object.values(venueData.amenities).every((v: any) => !v?.available)) && (
                    <p className="text-sm text-gray-400">No amenities specified</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        );
      case "policies":
        return (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Venue Policies
              </CardTitle>
              {editingSection !== "policies" && (
                <Button variant="outline" size="sm" onClick={() => handleEdit("policies")}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {editingSection === "policies" ? (
                <div className="space-y-4">
                  <ValidationErrorDisplay />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                      <Label>Start Time</Label>
                      <Input
                        type="time"
                        value={editData.operatingHours?.startTime || ""}
                        onChange={(e) => setEditData({
                          ...editData,
                          operatingHours: {
                            ...editData.operatingHours,
                            startTime: e.target.value
                          }
                        })}
                      />
                      </div>
                    <div>
                      <Label>End Time</Label>
                      <Input
                        type="time"
                        value={editData.operatingHours?.endTime || ""}
                        onChange={(e) => setEditData({
                          ...editData,
                          operatingHours: {
                            ...editData.operatingHours,
                            endTime: e.target.value
                          }
                        })}
                      />
                    </div>
                  </div>
                  <div>
                    <Label>Noise Restrictions (Local Regulations)</Label>
                    <Textarea
                      value={editData.noiseRestrictions || ""}
                      onChange={(e) => setEditData({...editData, noiseRestrictions: e.target.value})}
                      placeholder="Describe noise restrictions and local regulations"
                      rows={3}
                    />
                      </div>
                  <div>
                    <Label>Smoking Policy</Label>
                    <RadioGroup
                      value={editData.smokingPolicy || ""}
                      onValueChange={(value) => setEditData({...editData, smokingPolicy: value})}
                      className="mt-2 space-y-2"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="allowed" id="smoking_allowed" />
                        <Label htmlFor="smoking_allowed">Yes</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="not_allowed" id="smoking_not_allowed" />
                        <Label htmlFor="smoking_not_allowed">No</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="designated_areas" id="smoking_designated" />
                        <Label htmlFor="smoking_designated">Designated Areas Only</Label>
                      </div>
                    </RadioGroup>
                  </div>
                  <div>
                    <Label>Alcohol Serving Permission</Label>
                    <RadioGroup
                      value={editData.alcoholServingPermission ? "allowed" : "not_allowed"}
                      onValueChange={(value) => setEditData({...editData, alcoholServingPermission: value === "allowed"})}
                      className="mt-2 space-y-2"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="allowed" id="alcohol_allowed" />
                        <Label htmlFor="alcohol_allowed">Allowed</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="not_allowed" id="alcohol_not_allowed" />
                        <Label htmlFor="alcohol_not_allowed">Not Allowed</Label>
                      </div>
                    </RadioGroup>
                  </div>
                  <div>
                    <Label>Required Permissions or Licenses</Label>
                    <Textarea
                      value={editData.requiredPermissions || ""}
                      onChange={(e) => setEditData({...editData, requiredPermissions: e.target.value})}
                      placeholder="List any required permissions or licenses"
                      rows={3}
                    />
                      </div>
                  <div>
                    <Label>Event Type Restrictions</Label>
                    <Textarea
                      value={editData.eventTypeRestrictions || ""}
                      onChange={(e) => setEditData({...editData, eventTypeRestrictions: e.target.value})}
                      placeholder="e.g., no late-night parties, no political events"
                      rows={3}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={() => handleSave("policies")} disabled={saving}>
                      {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                      Save
                    </Button>
                    <Button variant="outline" onClick={handleCancel}>
                      <X className="h-4 w-4 mr-2" />
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Operating Hours</Label>
                    <p className="text-sm">
                      {venueData?.policies?.operatingHours?.startTime || "Not set"} - {venueData?.policies?.operatingHours?.endTime || "Not set"}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Smoking Policy</Label>
                    <p className="text-sm">
                      {venueData?.policies?.smokingPolicy
                        ? venueData.policies.smokingPolicy.replace(/_/g, ' ')
                        : "Not specified"}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Alcohol Serving Permission</Label>
                    <p className="text-sm">{venueData?.policies?.alcoholServingPermission ? "Yes" : "No"}</p>
                  </div>
                  {venueData?.policies?.noiseRestrictions && (
                    <div>
                      <Label className="text-sm font-medium text-gray-500">Noise Restrictions</Label>
                      <p className="text-sm whitespace-pre-line">{venueData.policies.noiseRestrictions}</p>
                    </div>
                  )}
                  {venueData?.policies?.requiredPermissions && (
                    <div>
                      <Label className="text-sm font-medium text-gray-500">Required Permissions or Licenses</Label>
                      <p className="text-sm whitespace-pre-line">{venueData.policies.requiredPermissions}</p>
                    </div>
                  )}
                  {venueData?.policies?.eventTypeRestrictions && (
                    <div>
                      <Label className="text-sm font-medium text-gray-500">Event Type Restrictions</Label>
                      <p className="text-sm whitespace-pre-line">{venueData.policies.eventTypeRestrictions}</p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        );
      case "addon-services":
        return (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Add-on Services & Partnerships
              </CardTitle>
              {editingSection !== "addon-services" && (
                <Button variant="outline" size="sm" onClick={() => handleEdit("addon-services")}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {editingSection === "addon-services" ? (
                <div className="space-y-4">
                  <ValidationErrorDisplay />
                  <div className="space-y-4">
                    <div className="p-3 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <Label className="font-medium">Catering Packages</Label>
                        <Checkbox
                          checked={editData.cateringPackages?.available || false}
                          onCheckedChange={(checked) => setEditData({
                            ...editData,
                            cateringPackages: {
                              ...editData.cateringPackages,
                              available: checked
                            }
                          })}
                        />
                      </div>
                      {editData.cateringPackages?.available && (
                        <div className="mt-2">
                          <Label className="text-sm">Menu URL</Label>
                          <Input
                            value={editData.cateringPackages?.menuUrl || ""}
                            onChange={(e) => setEditData({
                              ...editData,
                              cateringPackages: {
                                ...editData.cateringPackages,
                                menuUrl: e.target.value
                              }
                            })}
                            placeholder="URL to catering menu"
                          />
                        </div>
                      )}
                    </div>
                    <div className="p-3 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <Label className="font-medium">Event Management Services</Label>
                        <Checkbox
                          checked={editData.eventManagementServices?.available || false}
                          onCheckedChange={(checked) => setEditData({
                            ...editData,
                            eventManagementServices: {
                              ...editData.eventManagementServices,
                              available: checked
                            }
                          })}
                        />
                      </div>
                      {editData.eventManagementServices?.available && (
                        <div className="mt-2">
                          <Label className="text-sm">Description</Label>
                          <Textarea
                            value={editData.eventManagementServices?.description || ""}
                            onChange={(e) => setEditData({
                              ...editData,
                              eventManagementServices: {
                                ...editData.eventManagementServices,
                                description: e.target.value
                              }
                            })}
                            placeholder="Describe event management services"
                            rows={2}
                          />
                        </div>
                      )}
                    </div>
                    <div className="p-3 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <Label className="font-medium">Vendor Tie-ups</Label>
                        <Checkbox
                          checked={editData.vendorTieUps?.available || false}
                          onCheckedChange={(checked) => setEditData({
                            ...editData,
                            vendorTieUps: {
                              ...editData.vendorTieUps,
                              available: checked
                            }
                          })}
                        />
                      </div>
                      {editData.vendorTieUps?.available && (
                        <div className="mt-2">
                          <Label className="text-sm">Description</Label>
                          <Textarea
                            value={editData.vendorTieUps?.description || ""}
                            onChange={(e) => setEditData({
                              ...editData,
                              vendorTieUps: {
                                ...editData.vendorTieUps,
                                description: e.target.value
                              }
                            })}
                            placeholder="Describe vendor tie-ups"
                            rows={2}
                          />
                        </div>
                      )}
                    </div>
                    <div className="p-3 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <Label className="font-medium">Photography & Décor Packages</Label>
                        <Checkbox
                          checked={editData.photographyDecorPackages?.available || false}
                          onCheckedChange={(checked) => setEditData({
                            ...editData,
                            photographyDecorPackages: {
                              ...editData.photographyDecorPackages,
                              available: checked
                            }
                          })}
                        />
                      </div>
                      {editData.photographyDecorPackages?.available && (
                        <div className="mt-2">
                          <Label className="text-sm">Description</Label>
                          <Textarea
                            value={editData.photographyDecorPackages?.description || ""}
                            onChange={(e) => setEditData({
                              ...editData,
                              photographyDecorPackages: {
                                ...editData.photographyDecorPackages,
                                description: e.target.value
                              }
                            })}
                            placeholder="Describe photography & décor packages"
                            rows={2}
                          />
                        </div>
                      )}
                    </div>
                    <div className="p-3 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <Label className="font-medium">Accommodation Bundle</Label>
                        <Checkbox
                          checked={editData.accommodationBundle?.available || false}
                          onCheckedChange={(checked) => setEditData({
                            ...editData,
                            accommodationBundle: {
                              ...editData.accommodationBundle,
                              available: checked
                            }
                          })}
                        />
                      </div>
                      {editData.accommodationBundle?.available && (
                        <div className="mt-2">
                          <Label className="text-sm">Description</Label>
                          <Textarea
                            value={editData.accommodationBundle?.description || ""}
                            onChange={(e) => setEditData({
                              ...editData,
                              accommodationBundle: {
                                ...editData.accommodationBundle,
                                description: e.target.value
                              }
                            })}
                            placeholder="Describe accommodation bundle"
                            rows={2}
                          />
                        </div>
                      )}
                    </div>
                    <div className="p-3 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <Label className="font-medium">Special Discounts</Label>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            checked={editData.specialDiscounts?.repeatBookings || false}
                            onCheckedChange={(checked) => setEditData({
                              ...editData,
                              specialDiscounts: {
                                ...editData.specialDiscounts,
                                repeatBookings: checked
                              }
                            })}
                          />
                          <Label className="text-sm">Repeat Bookings</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            checked={editData.specialDiscounts?.offPeakDays || false}
                            onCheckedChange={(checked) => setEditData({
                              ...editData,
                              specialDiscounts: {
                                ...editData.specialDiscounts,
                                offPeakDays: checked
                              }
                            })}
                          />
                          <Label className="text-sm">Off-Peak Days</Label>
                        </div>
                        <div className="mt-2">
                          <Label className="text-sm">Description</Label>
                          <Textarea
                            value={editData.specialDiscounts?.description || ""}
                            onChange={(e) => setEditData({
                              ...editData,
                              specialDiscounts: {
                                ...editData.specialDiscounts,
                                description: e.target.value
                              }
                            })}
                            placeholder="Describe special discounts"
                            rows={2}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={() => handleSave("addon-services")} disabled={saving}>
                      {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                      Save
                    </Button>
                    <Button variant="outline" onClick={handleCancel}>
                      <X className="h-4 w-4 mr-2" />
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {venueData?.addOnServices && Object.entries(venueData.addOnServices).some(([_, value]: [string, any]) => value?.available) ? (
                    <div className="space-y-2">
                      {Object.entries(venueData.addOnServices).map(([key, value]: [string, any]) => (
                        value?.available && (
                          <div key={key} className="p-2 border rounded">
                            <Badge variant="secondary">{key.replace(/([A-Z])/g, ' $1').trim()}</Badge>
                            {value.description && <p className="text-sm text-gray-600 mt-1">{value.description}</p>}
                          </div>
                        )
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-400">No add-on services specified</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        );
      case "documents":
        return (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Documents & Images
              </CardTitle>
              {editingSection !== "documents" && (
                <Button variant="outline" size="sm" onClick={() => handleEdit("documents")}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {editingSection === "documents" ? (
                <div className="space-y-6">
                  <ValidationErrorDisplay />
                  
                  {/* Venue Images */}
                  <div>
                    <Label className="text-base font-semibold mb-2">Venue Images (High Resolution)</Label>
                    <p className="text-sm text-gray-500 mb-3">Interior, Exterior, Parking, Facilities</p>
                    <FileUploadArea
                      accept="image/*"
                      multiple
                      maxSize={10 * 1024 * 1024}
                      onUpload={async (files: File[]) => {
                        setUploading(prev => ({ ...prev, venueImages: true }));
                        try {
                          const uploads = await uploadMultipleToVercelBlob(files, 'venues', 'image');
                          const newImages = uploads.map(upload => ({
                            url: upload.url,
                            caption: '',
                            isMain: false
                          }));
                          setEditData({
                            ...editData,
                            venueImages: [...(editData.venueImages || []), ...newImages]
                          });
                          toast.success(`${files.length} image(s) uploaded successfully`);
                        } catch (error) {
                          toast.error(error instanceof Error ? error.message : 'Failed to upload images');
                        } finally {
                          setUploading(prev => ({ ...prev, venueImages: false }));
                        }
                      }}
                      uploading={uploading.venueImages}
                      existingFiles={editData.venueImages || venueData?.documents?.venueImages || []}
                      onRemove={(index: number) => {
                        const newImages = [...(editData.venueImages || venueData?.documents?.venueImages || [])];
                        newImages.splice(index, 1);
                        setEditData({ ...editData, venueImages: newImages });
                      }}
                    />
                  </div>

                  {/* Venue Video Tour */}
                  <div>
                    <Label className="text-base font-semibold mb-2">Venue Video Tour (Optional)</Label>
                    <FileUploadArea
                      accept="video/*"
                      maxSize={100 * 1024 * 1024}
                      onUpload={async (files: File[]) => {
                        setUploading(prev => ({ ...prev, video: true }));
                        try {
                          const upload = await uploadToVercelBlob(files[0], 'venues', 'video');
                          setEditData({
                            ...editData,
                            venueVideoTour: { url: upload.url }
                          });
                          toast.success('Video uploaded successfully');
                        } catch (error) {
                          toast.error(error instanceof Error ? error.message : 'Failed to upload video');
                        } finally {
                          setUploading(prev => ({ ...prev, video: false }));
                        }
                      }}
                      uploading={uploading.video}
                      existingFiles={editData.venueVideoTour?.url ? [{ url: editData.venueVideoTour.url }] : (venueData?.documents?.venueVideoTour?.url ? [{ url: venueData.documents.venueVideoTour.url }] : [])}
                      onRemove={() => {
                        setEditData({ ...editData, venueVideoTour: { url: '' } });
                      }}
                      type="video"
                    />
                  </div>

                  {/* Menu Cards */}
                  <div>
                    <Label className="text-base font-semibold mb-2">Menu Cards (for restaurants)</Label>
                    <FileUploadArea
                      accept="image/*,.pdf"
                      multiple
                      maxSize={10 * 1024 * 1024}
                      onUpload={async (files: File[]) => {
                        setUploading(prev => ({ ...prev, menuCards: true }));
                        try {
                          const uploads = await uploadMultipleToVercelBlob(
                            files,
                            'venues',
                            files[0].type.startsWith('image/') ? 'image' : 'document'
                          );
                          const newCards = uploads.map((upload, idx) => ({
                            url: upload.url,
                            name: files[idx]?.name || 'Menu Card'
                          }));
                          setEditData({
                            ...editData,
                            menuCards: [...(editData.menuCards || []), ...newCards]
                          });
                          toast.success(`${files.length} menu card(s) uploaded successfully`);
                        } catch (error) {
                          toast.error(error instanceof Error ? error.message : 'Failed to upload menu cards');
                        } finally {
                          setUploading(prev => ({ ...prev, menuCards: false }));
                        }
                      }}
                      uploading={uploading.menuCards}
                      existingFiles={editData.menuCards || venueData?.documents?.menuCards || []}
                      onRemove={(index: number) => {
                        const newCards = [...(editData.menuCards || venueData?.documents?.menuCards || [])];
                        newCards.splice(index, 1);
                        setEditData({ ...editData, menuCards: newCards });
                      }}
                    />
                  </div>

                  {/* Rate Card */}
                  <div>
                    <Label className="text-base font-semibold mb-2">Rate Card (PDF)</Label>
                    <FileUploadArea
                      accept=".pdf"
                      maxSize={10 * 1024 * 1024}
                      onUpload={async (files: File[]) => {
                        setUploading(prev => ({ ...prev, rateCard: true }));
                        try {
                          const upload = await uploadToVercelBlob(files[0], 'venues', 'document');
                          setEditData({
                            ...editData,
                            rateCard: { url: upload.url }
                          });
                          toast.success('Rate card uploaded successfully');
                        } catch (error) {
                          toast.error(error instanceof Error ? error.message : 'Failed to upload rate card');
                        } finally {
                          setUploading(prev => ({ ...prev, rateCard: false }));
                        }
                      }}
                      uploading={uploading.rateCard}
                      existingFiles={editData.rateCard?.url ? [{ url: editData.rateCard.url }] : (venueData?.documents?.rateCard?.url ? [{ url: venueData.documents.rateCard.url }] : [])}
                      onRemove={() => {
                        setEditData({ ...editData, rateCard: { url: '' } });
                      }}
                      type="document"
                    />
                  </div>

                  {/* Business License */}
                  <div>
                    <Label className="text-base font-semibold mb-2">Business License Documents</Label>
                    <FileUploadArea
                      accept=".pdf,image/*"
                      multiple
                      maxSize={10 * 1024 * 1024}
                      onUpload={async (files: File[]) => {
                        setUploading(prev => ({ ...prev, businessLicense: true }));
                        try {
                          const uploads = await uploadMultipleToVercelBlob(
                            files,
                            'venues',
                            files[0].type.startsWith('image/') ? 'image' : 'document'
                          );
                          const newDocs = uploads.map((upload, idx) => ({
                            url: upload.url,
                            name: files[idx]?.name || 'Business License'
                          }));
                          setEditData({
                            ...editData,
                            businessLicense: [...(editData.businessLicense || []), ...newDocs]
                          });
                          toast.success(`${files.length} document(s) uploaded successfully`);
                        } catch (error) {
                          toast.error(error instanceof Error ? error.message : 'Failed to upload documents');
                        } finally {
                          setUploading(prev => ({ ...prev, businessLicense: false }));
                        }
                      }}
                      uploading={uploading.businessLicense}
                      existingFiles={editData.businessLicense || venueData?.documents?.businessLicense || []}
                      onRemove={(index: number) => {
                        const newDocs = [...(editData.businessLicense || venueData?.documents?.businessLicense || [])];
                        newDocs.splice(index, 1);
                        setEditData({ ...editData, businessLicense: newDocs });
                      }}
                      type="document"
                    />
                  </div>

                  <div className="flex gap-2 pt-4">
                    <Button onClick={() => handleSave("documents")} disabled={saving || Object.values(uploading).some(v => v)}>
                      {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                      Save
                    </Button>
                    <Button variant="outline" onClick={handleCancel}>
                      <X className="h-4 w-4 mr-2" />
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Venue Images</Label>
                    <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-4">
                      {venueData?.documents?.venueImages?.length > 0 ? (
                        venueData.documents.venueImages.slice(0, 8).map((image: any, index: number) => (
                          <div key={index} className="aspect-square rounded-lg overflow-hidden bg-gray-100 relative group">
                            <img
                              src={image.url}
                              alt={`Venue ${index + 1}`}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        ))
                      ) : venueData?.gallery?.length > 0 ? (
                        venueData.gallery.slice(0, 4).map((image: any, index: number) => (
                        <div key={index} className="aspect-square rounded-lg overflow-hidden bg-gray-100">
                          <img
                            src={image.url}
                            alt={`Venue ${index + 1}`}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        ))
                      ) : (
                        <div className="col-span-4 text-center py-8 text-gray-500">
                          No images uploaded yet
                        </div>
                      )}
                    </div>
                  </div>

                  {venueData?.documents?.menuCards?.length > 0 && (
                    <div>
                      <Label className="text-sm font-medium text-gray-500">Menu Cards</Label>
                      <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-4">
                        {venueData.documents.menuCards.map((menu: any, index: number) => (
                          <div key={index} className="aspect-square rounded-lg overflow-hidden bg-gray-100 relative group">
                            {menu.url.endsWith('.pdf') ? (
                              <div className="w-full h-full flex flex-col items-center justify-center bg-gray-50">
                                <FileText className="h-12 w-12 text-gray-400 mb-2" />
                                <span className="text-xs text-gray-600 text-center px-2">{menu.name || 'Menu Card'}</span>
                              </div>
                            ) : (
                              <img
                                src={menu.url}
                                alt={menu.name || `Menu ${index + 1}`}
                                className="w-full h-full object-cover"
                              />
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div>
                    <Label className="text-sm font-medium text-gray-500">Documents</Label>
                    <div className="mt-2 space-y-2">
                      {venueData?.documents?.businessLicense?.length > 0 && (
                      <div className="flex items-center gap-2 p-2 border rounded">
                        <FileText className="h-4 w-4 text-gray-400" />
                          <span className="text-sm">Business License ({venueData.documents.businessLicense.length} file(s))</span>
                          <Badge variant="secondary" className="ml-auto">Uploaded</Badge>
                      </div>
                      )}
                      {venueData?.documents?.rateCard?.url && (
                      <div className="flex items-center gap-2 p-2 border rounded">
                        <FileText className="h-4 w-4 text-gray-400" />
                          <span className="text-sm">Rate Card</span>
                          <Badge variant="secondary" className="ml-auto">Uploaded</Badge>
                      </div>
                      )}
                      {venueData?.documents?.venueVideoTour?.url && (
                        <div className="flex items-center gap-2 p-2 border rounded">
                          <Video className="h-4 w-4 text-gray-400" />
                          <span className="text-sm">Video Tour</span>
                          <Badge variant="secondary" className="ml-auto">Uploaded</Badge>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        );
      case "authorizations":
        return (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Final Confirmation & Authorizations
              </CardTitle>
              {editingSection !== "authorizations" && (
                <Button variant="outline" size="sm" onClick={() => handleEdit("authorizations")}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {editingSection === "authorizations" ? (
                <div className="space-y-4">
                  <ValidationErrorDisplay />
                  <div className="space-y-4">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        checked={editData.publicListingAuthorized || false}
                        onCheckedChange={(checked) => setEditData({...editData, publicListingAuthorized: checked})}
                      />
                      <div>
                        <Label className="font-medium">Public Listing Authorization</Label>
                        <p className="text-sm text-gray-500">Do you authorize AHIBI to list your venue and display the provided information publicly?</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        checked={editData.onlineBookingEnabled || false}
                        onCheckedChange={(checked) => setEditData({...editData, onlineBookingEnabled: checked})}
                      />
                      <div>
                        <Label className="font-medium">Online Booking Enabled</Label>
                        <p className="text-sm text-gray-500">Do you want AHIBI to enable online booking & payment collection on your behalf?</p>
                      </div>
                    </div>
                    <div>
                      <Label>Preferred Communication Channel</Label>
                      <RadioGroup
                        value={editData.preferredCommunication || ""}
                        onValueChange={(value) => setEditData({...editData, preferredCommunication: value})}
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="whatsapp" />
                          <Label>WhatsApp</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="email" />
                          <Label>Email</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="phone_call" />
                          <Label>Phone Call</Label>
                        </div>
                      </RadioGroup>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={() => handleSave("authorizations")} disabled={saving}>
                      {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                      Save
                    </Button>
                    <Button variant="outline" onClick={handleCancel}>
                      <X className="h-4 w-4 mr-2" />
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Public Listing Authorized</Label>
                    <p className="text-sm">{venueData?.authorizations?.publicListingAuthorized ? "Yes" : "No"}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Online Booking Enabled</Label>
                    <p className="text-sm">{venueData?.authorizations?.onlineBookingEnabled ? "Yes" : "No"}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Preferred Communication</Label>
                    <p className="text-sm">
                      {venueData?.authorizations?.preferredCommunication 
                        ? venueData.authorizations.preferredCommunication.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())
                        : "Not specified"}
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        );
        default:
          return null;
      }
    })();

    return (
      <div className="space-y-4 sm:space-y-6 p-3 sm:p-6">
        {/* Back Button */}
        {onBack && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onBack}
            className="-ml-2 text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
        )}
        {/* Mobile Section Navigation */}
        <div className="md:hidden">
          <button
            onClick={() => setShowMobileSidebar(!showMobileSidebar)}
            className="w-full flex items-center justify-between p-3 bg-white border rounded-lg shadow-sm hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Menu className="h-5 w-5 text-gray-600" />
              <span className="text-sm font-medium text-gray-900">
                {sidebarItems.find(item => item.id === activeSection)?.label || 'Select Section'}
              </span>
            </div>
            <ChevronRight className={`h-5 w-5 text-gray-400 transition-transform ${showMobileSidebar ? 'rotate-90' : ''}`} />
          </button>
          
          {showMobileSidebar && (
            <div className="mt-2 bg-white border rounded-lg shadow-lg overflow-hidden">
              {sidebarItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeSection === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveSection(item.id);
                      setShowMobileSidebar(false);
                      setEditingSection(null);
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors border-b last:border-b-0 ${
                      isActive 
                        ? 'bg-blue-50 text-blue-700 border-l-4 border-l-blue-600' 
                        : 'text-gray-700 hover:bg-gray-50 border-l-4 border-l-transparent'
                    }`}
                  >
                    <Icon className={`h-5 w-5 ${isActive ? 'text-blue-600' : 'text-gray-400'}`} />
                    <span className="text-sm font-medium">{item.label}</span>
                    {isActive && <ChevronRight className="h-4 w-4 ml-auto" />}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Desktop Section Navigation */}
        <div className="hidden md:block">
          <div className="bg-white border rounded-lg shadow-sm p-2">
            <div className="flex flex-wrap gap-2">
              {sidebarItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeSection === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveSection(item.id);
                      setEditingSection(null);
                    }}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                      isActive 
                        ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-md' 
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="hidden lg:inline">{item.label}</span>
                    <span className="lg:hidden">{item.shortLabel}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Section Content */}
        {content}
      </div>
    );
  };

  return renderSectionContent();
}
