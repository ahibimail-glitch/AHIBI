// Venue completeness validation utility

export interface VenueAddress {
  street?: string;
  city?: string;
  state?: string;
  pincode?: string;
}

/** Returns true when street, city, state, and pincode are all filled in. */
export function isVenueAddressComplete(venue: { address?: VenueAddress } | null | undefined): boolean {
  const addr = venue?.address;
  return Boolean(
    addr?.street?.trim() &&
    addr?.city?.trim() &&
    addr?.state?.trim() &&
    addr?.pincode?.trim()
  );
}

export interface MissingField {
  section: string;
  sectionLabel: string;
  field: string;
  fieldLabel: string;
  severity: 'critical' | 'important' | 'recommended';
}

export interface VenueCompletenessResult {
  isComplete: boolean;
  completionPercentage: number;
  missingFields: MissingField[];
  criticalMissing: MissingField[];
  importantMissing: MissingField[];
  recommendedMissing: MissingField[];
}

export function checkVenueCompleteness(venueData: any): VenueCompletenessResult {
  const missingFields: MissingField[] = [];

  // Helper function to check if a value is empty or placeholder
  const isEmptyOrPlaceholder = (value: any, placeholders: string[] = []): boolean => {
    if (!value) return true;
    const strValue = String(value).trim().toLowerCase();
    if (strValue === '') return true;
    return placeholders.some(p => strValue === p.toLowerCase());
  };

  // Critical fields - must be filled for venue to be listed
  if (isEmptyOrPlaceholder(venueData?.description, ['to be updated', 'n/a', 'na', 'not provided'])) {
    missingFields.push({
      section: 'owner-details',
      sectionLabel: 'Owner Details',
      field: 'description',
      fieldLabel: 'Venue Description',
      severity: 'critical'
    });
  }

  if (isEmptyOrPlaceholder(venueData?.address?.street, ['not provided', 'n/a', 'na'])) {
    missingFields.push({
      section: 'location',
      sectionLabel: 'Location & Accessibility',
      field: 'address.street',
      fieldLabel: 'Street Address',
      severity: 'critical'
    });
  }

  if (isEmptyOrPlaceholder(venueData?.address?.city, ['unknown', 'n/a', 'na', 'not provided'])) {
    missingFields.push({
      section: 'location',
      sectionLabel: 'Location & Accessibility',
      field: 'address.city',
      fieldLabel: 'City',
      severity: 'critical'
    });
  }

  if (isEmptyOrPlaceholder(venueData?.address?.state, ['unknown', 'n/a', 'na', 'not provided'])) {
    missingFields.push({
      section: 'location',
      sectionLabel: 'Location & Accessibility',
      field: 'address.state',
      fieldLabel: 'State',
      severity: 'critical'
    });
  }

  if (isEmptyOrPlaceholder(venueData?.address?.pincode, ['000000', '0', 'n/a', 'na', 'not provided'])) {
    missingFields.push({
      section: 'location',
      sectionLabel: 'Location & Accessibility',
      field: 'address.pincode',
      fieldLabel: 'Pincode',
      severity: 'critical'
    });
  }

  // Capacity requirements (Critical)
  if (!venueData?.capacityDetails?.minimumBookingCapacity || venueData.capacityDetails.minimumBookingCapacity === 0) {
    missingFields.push({
      section: 'capacity',
      sectionLabel: 'Capacity & Booking',
      field: 'capacityDetails.minimumBookingCapacity',
      fieldLabel: 'Minimum Booking Capacity',
      severity: 'critical'
    });
  }

  const hasMaxCapacity = (venueData?.capacityDetails?.standingCapacity && venueData.capacityDetails.standingCapacity > 0)
    || (venueData?.capacity && venueData.capacity > 0);
  if (!hasMaxCapacity) {
    missingFields.push({
      section: 'capacity',
      sectionLabel: 'Capacity & Booking',
      field: 'capacityDetails.standingCapacity',
      fieldLabel: 'Maximum Capacity',
      severity: 'critical'
    });
  }

  // Important fields - highly recommended for better listing
  if (!venueData?.documents?.venueImages || venueData.documents.venueImages.length === 0) {
    if (!venueData?.gallery || venueData.gallery.length === 0) {
      missingFields.push({
        section: 'documents',
        sectionLabel: 'Documents & Images',
        field: 'venueImages',
        fieldLabel: 'Venue Images',
        severity: 'important'
      });
    }
  }

  if (!venueData?.pricing?.basePrice || venueData.pricing.basePrice === 0) {
    missingFields.push({
      section: 'pricing',
      sectionLabel: 'Pricing & Payment',
      field: 'pricing.basePrice',
      fieldLabel: 'Base Price',
      severity: 'critical'
    });
  }

  if (!venueData?.venueClassification?.venueTypes || venueData.venueClassification.venueTypes.length === 0) {
    missingFields.push({
      section: 'venue-classification',
      sectionLabel: 'Venue Classification',
      field: 'venueTypes',
      fieldLabel: 'Venue Types',
      severity: 'important'
    });
  }

  // Recommended fields - good to have for complete profile
  if (!venueData?.address?.googleMapsLink) {
    missingFields.push({
      section: 'location',
      sectionLabel: 'Location & Accessibility',
      field: 'address.googleMapsLink',
      fieldLabel: 'Google Maps Link',
      severity: 'recommended'
    });
  }

  if (!venueData?.contactInfo?.website) {
    missingFields.push({
      section: 'location',
      sectionLabel: 'Location & Accessibility',
      field: 'contactInfo.website',
      fieldLabel: 'Website',
      severity: 'recommended'
    });
  }

  if (!venueData?.amenities || Object.keys(venueData.amenities).length === 0) {
    missingFields.push({
      section: 'amenities',
      sectionLabel: 'Facilities & Amenities',
      field: 'amenities',
      fieldLabel: 'Amenities',
      severity: 'recommended'
    });
  }

  if (!venueData?.policies?.operatingHours) {
    missingFields.push({
      section: 'policies',
      sectionLabel: 'Venue Policies',
      field: 'policies.operatingHours',
      fieldLabel: 'Operating Hours',
      severity: 'recommended'
    });
  }

  if (!venueData?.documents?.venueVideoTour?.url) {
    missingFields.push({
      section: 'documents',
      sectionLabel: 'Documents & Images',
      field: 'venueVideoTour',
      fieldLabel: 'Video Tour',
      severity: 'recommended'
    });
  }

  if (!venueData?.parking?.carCapacity || venueData.parking.carCapacity === 0) {
    missingFields.push({
      section: 'location',
      sectionLabel: 'Location & Accessibility',
      field: 'parking.carCapacity',
      fieldLabel: 'Parking Capacity',
      severity: 'recommended'
    });
  }

  // Calculate completion percentage
  const totalFields = 17; // Updated total important/critical fields to track
  const filledFields = totalFields - missingFields.length;
  const completionPercentage = Math.round((filledFields / totalFields) * 100);

  // Categorize missing fields
  const criticalMissing = missingFields.filter(f => f.severity === 'critical');
  const importantMissing = missingFields.filter(f => f.severity === 'important');
  const recommendedMissing = missingFields.filter(f => f.severity === 'recommended');

  return {
    isComplete: criticalMissing.length === 0 && importantMissing.length === 0,
    completionPercentage,
    missingFields,
    criticalMissing,
    importantMissing,
    recommendedMissing
  };
}
