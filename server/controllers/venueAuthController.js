const Venue = require('../models/Venue');
const smsService = require('../services/smsService');
const { validationResult } = require('express-validator');
const ApiResponse = require('../utils/apiResponse');
const tempOtpStore = require('../utils/tempOtpStore');

/**
 * @desc    Send OTP for venue
 * @route   POST /api/venue/auth/send-otp
 * @access  Public
 */
exports.sendVenueOtp = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  const { phone, mode } = req.body;

  try {
    if (mode === 'login') {
      const venue = await Venue.findOne({ phone });
      if (!venue) {
        return ApiResponse.notFound(res, 'Venue not found. Please sign up first.');
      }

      if (venue.approvalStatus === 'pending') {
        return ApiResponse.forbidden(res, 'Your account is pending approval from the admin.');
      }

      if (venue.approvalStatus === 'rejected') {
        return ApiResponse.forbidden(res, 'Your account has been rejected. Please contact support.');
      }

      let otp = await venue.setOtp();
      const smsResponse = await smsService.sendOtp(phone, otp);

      if (!smsResponse.success) {
        return ApiResponse.serverError(res, 'Failed to send OTP', smsResponse.message);
      }

      return ApiResponse.success(res, 'OTP sent successfully', {
        phone,
        otpSent: true
      });
    }

    if (mode === 'signup' || !mode) {
      let venue = await Venue.findOne({ phone });

      if (venue) {
        return ApiResponse.badRequest(res, 'Number is already registered');
      }

      let otp = Math.floor(100000 + Math.random() * 900000).toString();
      tempOtpStore.set(phone, { otp, data: req.body });

      const smsResponse = await smsService.sendOtp(phone, otp);

      if (!smsResponse.success) {
        return ApiResponse.serverError(res, 'Failed to send OTP', smsResponse.message);
      }

      return ApiResponse.success(res, 'OTP sent successfully', {
        phone,
        otpSent: true
      });
    }

  } catch (error) {
    console.error('Send venue OTP error:', error);
    return ApiResponse.serverError(res, 'Server error', error);
  }
};

/**
 * @desc    Verify OTP for venue
 * @route   POST /api/venue/auth/verify-otp
 * @access  Public
 */
exports.verifyVenueOtp = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  const { phone, otp, mode } = req.body;

  try {
    if (mode === 'login') {
      const venue = await Venue.findOne({ phone });
      
      if (!venue) {
        return ApiResponse.badRequest(res, 'Venue not found');
      }

      const isOtpValid = await venue.verifyOtp(otp);
      if (!isOtpValid) {
        return ApiResponse.badRequest(res, 'Invalid or expired OTP');
      }

      if (venue.approvalStatus === 'pending') {
        return ApiResponse.accepted(res, 'Your venue account is pending approval', {
          pending: true,
          approvalStatus: venue.approvalStatus
        });
      }

      if (venue.approvalStatus === 'rejected') {
        return ApiResponse.forbidden(res, 'Your venue account has been rejected', {
          rejected: true,
          reason: venue.rejectionReason
        });
      }

      const token = venue.getSignedJwtToken();

      return ApiResponse.success(res, 'OTP verified successfully. Login successful.', {
        token,
        user: {
          _id: venue._id,
          name: venue.name,
          email: venue.email,
          phone: venue.phone,
          role: 'venue',
        }
      });

    } else {
      const stored = tempOtpStore.get(phone);
      if (!stored || stored.otp !== otp) {
        return ApiResponse.badRequest(res, 'Invalid or expired OTP');
      }

      tempOtpStore.delete(phone);

      // Prepare venue data with defaults for required fields
      const signupData = stored.data;
      
      // Ensure ownerDetails has all required fields with defaults
      // Email is required, so we must have it from signup data
      const ownerEmail = signupData.ownerDetails?.email || signupData.email;
      if (!ownerEmail) {
        return ApiResponse.badRequest(res, 'Email is required for venue registration');
      }

      const ownerDetails = {
        fullName: signupData.ownerDetails?.fullName || signupData.name || 'Not Provided',
        primaryContact: signupData.ownerDetails?.primaryContact || signupData.phone || phone,
        email: ownerEmail,
        businessName: signupData.ownerDetails?.businessName || signupData.name || 'Not Provided',
        designation: signupData.ownerDetails?.designation || 'Owner',
        alternateContact: signupData.ownerDetails?.alternateContact || '',
        businessRegistrationNumber: signupData.ownerDetails?.businessRegistrationNumber || '',
        gstNumber: signupData.ownerDetails?.gstNumber || ''
      };

      // Ensure venueClassification has required fields
      const venueClassification = {
        venueTypes: signupData.venueClassification?.venueTypes || [],
        venueTypeOther: signupData.venueClassification?.venueTypeOther || '',
        indoorOutdoor: signupData.venueClassification?.indoorOutdoor || 'indoor',
        operationMode: signupData.venueClassification?.operationMode || 'year_round'
      };

      // Ensure parking has required fields
      const parking = {
        carCapacity: signupData.parking?.carCapacity || 0,
        twoWheelerAvailable: signupData.parking?.twoWheelerAvailable || false
      };

      // Ensure capacityDetails has required fields
      const capacityDetails = {
        standingCapacity: signupData.capacityDetails?.standingCapacity || 0,
        seatingCapacity: signupData.capacityDetails?.seatingCapacity || {},
        minimumBookingCapacity: signupData.capacityDetails?.minimumBookingCapacity || 0,
        multipleEventsPerDay: signupData.capacityDetails?.multipleEventsPerDay || false,
        timeSlots: signupData.capacityDetails?.timeSlots || [],
        peakSeasonRates: signupData.capacityDetails?.peakSeasonRates || '',
        offSeasonRates: signupData.capacityDetails?.offSeasonRates || '',
        advanceBookingDays: signupData.capacityDetails?.advanceBookingDays || 30
      };

      // Ensure pricing has required fields
      const pricing = {
        basePrice: signupData.pricing?.basePrice || 0,
        hourlyRate: signupData.pricing?.hourlyRate || 0,
        fullDayRate: signupData.pricing?.fullDayRate || 0,
        halfDayRate: signupData.pricing?.halfDayRate || 0,
        cleaningFee: signupData.pricing?.cleaningFee || 0,
        securityDeposit: signupData.pricing?.securityDeposit || 0,
        rentalIncludes: signupData.pricing?.rentalIncludes || [],
        otherEquipmentDetails: signupData.pricing?.otherEquipmentDetails || '',
        securityDepositRequired: signupData.pricing?.securityDepositRequired || false,
        paymentModes: signupData.pricing?.paymentModes || [],
        cancellationPolicy: signupData.pricing?.cancellationPolicy || {
          refundable: false,
          timeFrame: '',
          deductionPercentage: 0
        }
      };

      // Provide minimal defaults so initial signup doesn't require full details
      const minimalDefaults = {
        description: signupData.description || 'To be updated',
        address: {
          street: signupData.address?.street || 'Not Provided',
          city: signupData.address?.city || 'Unknown',
          state: signupData.address?.state || 'Unknown',
          pincode: signupData.address?.pincode || '000000',
          landmark: signupData.address?.landmark || '',
          googleMapsLink: signupData.address?.googleMapsLink || '',
          directions: signupData.address?.directions || ''
        },
        location: signupData.location || { type: 'Point', coordinates: [] },
        capacity: Number(signupData.capacity) || 0,
        contactInfo: {
          phone: signupData.contactInfo?.phone || signupData.phone || phone,
          email: signupData.contactInfo?.email || signupData.email || ownerEmail,
          website: signupData.contactInfo?.website || ''
        }
      };

      // Merge all data with defaults and ensure top-level fields exist
      const venueData = {
        name: signupData.venueName || signupData.name || 'New Venue',
        email: ownerEmail,
        phone: signupData.phone || phone,
        approvalStatus: 'pending',
        ownerDetails,
        venueClassification,
        parking,
        capacityDetails,
        pricing,
        ...minimalDefaults
      };

      // Save without running full validation; details will be updated later in admin panel
      const venue = new Venue(venueData);
      await venue.save({ validateBeforeSave: false });

      return ApiResponse.success(res, 'Venue account created successfully. Pending admin approval.', {
        venue: {
          id: venue._id,
          name: venue.name,
          approvalStatus: venue.approvalStatus
        }
      });
    }

  } catch (error) {
    console.error('Verify Venue OTP Error:', error);
    return ApiResponse.serverError(res, 'Server error', error);
  }
};

/**
 * @desc    Get venue profile
 * @route   GET /api/venue/profile
 * @access  Private (Venue only)
 */
exports.getVenueProfile = async (req, res) => {
  try {
    const venue = await Venue.findById(req.user.id);

    if (!venue) {
      return ApiResponse.notFound(res, 'Venue profile not found');
    }

    return ApiResponse.success(res, 'Venue profile retrieved successfully', {
      venue
    });

  } catch (error) {
    console.error('Get venue profile error:', error);
    return ApiResponse.serverError(res, 'Error retrieving venue profile', error);
  }
};

/**
 * @desc    Update venue profile
 * @route   PUT /api/venue/profile
 * @access  Private (Venue only)
 */
exports.updateVenueProfile = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  try {
    const venue = await Venue.findById(req.user.id);

    if (!venue) {
      return ApiResponse.notFound(res, 'Venue profile not found');
    }

    const allowedFields = [
      'name', 'description', 'address', 'location', 'capacity', 
      'facilities', 'pricing', 'gallery', 'contactInfo', 
      'availability', 'terms', 'ownerDetails', 'venueClassification',
      'parking', 'accessibility', 'capacityDetails', 'amenities',
      'policies', 'addOnServices', 'documents', 'authorizations'
    ];

    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        venue[field] = req.body[field];
      }
    });

    await venue.save();

    return ApiResponse.success(res, 'Venue profile updated successfully', {
      venue
    });

  } catch (error) {
    console.error('Update venue profile error:', error);
    return ApiResponse.serverError(res, 'Error updating venue profile', error);
  }
};

/**
 * @desc    Update owner details section
 * @route   PUT /api/venue/details/owner-details
 * @access  Private (Venue only)
 */
exports.updateOwnerDetails = async (req, res) => {
  try {
    const venue = await Venue.findById(req.user.id);
    if (!venue) {
      return ApiResponse.notFound(res, 'Venue not found');
    }

    const { fullName, primaryContact, alternateContact, email, businessName, designation, businessRegistrationNumber, gstNumber, venueDescription } = req.body;

    // Validation
    if (designation && !designation.trim()) {
      return ApiResponse.badRequest(res, 'Designation is required');
    }

    // Update venue description if provided
    if (venueDescription !== undefined) {
      venue.description = venueDescription;
    }

    venue.ownerDetails = {
      ...venue.ownerDetails,
      fullName: fullName !== undefined ? fullName : venue.ownerDetails?.fullName,
      primaryContact: primaryContact !== undefined ? primaryContact : venue.ownerDetails?.primaryContact,
      alternateContact: alternateContact !== undefined ? alternateContact : venue.ownerDetails?.alternateContact,
      email: email !== undefined ? email : venue.ownerDetails?.email,
      businessName: businessName !== undefined ? businessName : venue.ownerDetails?.businessName,
      designation: designation !== undefined ? designation : venue.ownerDetails?.designation,
      businessRegistrationNumber: businessRegistrationNumber !== undefined ? businessRegistrationNumber : venue.ownerDetails?.businessRegistrationNumber,
      gstNumber: gstNumber !== undefined ? gstNumber : venue.ownerDetails?.gstNumber
    };

    await venue.save();

    return ApiResponse.success(res, 'Owner details updated successfully', {
      ownerDetails: venue.ownerDetails,
      description: venue.description
    });
  } catch (error) {
    console.error('Update owner details error:', error);
    if (error.name === 'ValidationError') {
      return ApiResponse.badRequest(res, Object.values(error.errors).map(e => e.message).join(', '));
    }
    return ApiResponse.serverError(res, 'Error updating owner details', error);
  }
};

/**
 * @desc    Update venue classification section
 * @route   PUT /api/venue/details/venue-classification
 * @access  Private (Venue only)
 */
exports.updateVenueClassification = async (req, res) => {
  try {
    const venue = await Venue.findById(req.user.id);
    if (!venue) {
      return ApiResponse.notFound(res, 'Venue not found');
    }

    const { venueTypes, venueTypeOther, indoorOutdoor, operationMode } = req.body;

    // Validation
    if (indoorOutdoor && !['indoor', 'outdoor', 'both'].includes(indoorOutdoor)) {
      return ApiResponse.badRequest(res, 'Invalid indoor/outdoor value');
    }
    if (operationMode && !['seasonal', 'year_round'].includes(operationMode)) {
      return ApiResponse.badRequest(res, 'Invalid operation mode');
    }

    venue.venueClassification = {
      ...venue.venueClassification,
      venueTypes: venueTypes !== undefined ? venueTypes : venue.venueClassification?.venueTypes,
      venueTypeOther: venueTypeOther !== undefined ? venueTypeOther : venue.venueClassification?.venueTypeOther,
      indoorOutdoor: indoorOutdoor !== undefined ? indoorOutdoor : venue.venueClassification?.indoorOutdoor,
      operationMode: operationMode !== undefined ? operationMode : venue.venueClassification?.operationMode
    };

    await venue.save();

    return ApiResponse.success(res, 'Venue classification updated successfully', {
      venueClassification: venue.venueClassification
    });
  } catch (error) {
    console.error('Update venue classification error:', error);
    if (error.name === 'ValidationError') {
      return ApiResponse.badRequest(res, Object.values(error.errors).map(e => e.message).join(', '));
    }
    return ApiResponse.serverError(res, 'Error updating venue classification', error);
  }
};

/**
 * @desc    Update location and accessibility section
 * @route   PUT /api/venue/details/location
 * @access  Private (Venue only)
 */
exports.updateLocation = async (req, res) => {
  try {
    const venue = await Venue.findById(req.user.id);
    if (!venue) {
      return ApiResponse.notFound(res, 'Venue not found');
    }

    const { address, parking, accessibility } = req.body;

    console.log('Update Location Request:', {
      venueId: venue._id,
      address,
      parking,
      accessibility
    });

    // Validation
    if (parking?.carCapacity !== undefined && (isNaN(parking.carCapacity) || parking.carCapacity < 0)) {
      return ApiResponse.badRequest(res, 'Car parking capacity must be a valid number');
    }

    if (address) {
      venue.address = {
        ...venue.address.toObject ? venue.address.toObject() : venue.address,
        ...address
      };
      console.log('Updated address:', venue.address);
    }

    if (parking) {
      venue.parking = {
        ...venue.parking.toObject ? venue.parking.toObject() : venue.parking,
        ...parking
      };
      console.log('Updated parking:', venue.parking);
    }

    if (accessibility) {
      venue.accessibility = {
        ...venue.accessibility.toObject ? venue.accessibility.toObject() : venue.accessibility,
        ...accessibility
      };
      console.log('Updated accessibility:', venue.accessibility);
    }

    await venue.save();

    console.log('Location saved successfully');

    return ApiResponse.success(res, 'Location details updated successfully', {
      address: venue.address,
      parking: venue.parking,
      accessibility: venue.accessibility
    });
  } catch (error) {
    console.error('Update location error:', error);
    if (error.name === 'ValidationError') {
      return ApiResponse.badRequest(res, Object.values(error.errors).map(e => e.message).join(', '));
    }
    return ApiResponse.serverError(res, 'Error updating location details', error);
  }
};

/**
 * @desc    Update capacity and booking options section
 * @route   PUT /api/venue/details/capacity
 * @access  Private (Venue only)
 */
exports.updateCapacity = async (req, res) => {
  try {
    const venue = await Venue.findById(req.user.id);
    if (!venue) {
      return ApiResponse.notFound(res, 'Venue not found');
    }

    const { standingCapacity, seatingCapacity, minimumBookingCapacity, multipleEventsPerDay, timeSlots, peakSeasonRates, offSeasonRates, advanceBookingDays } = req.body;

    // Validation
    if (standingCapacity !== undefined && (isNaN(standingCapacity) || standingCapacity < 0)) {
      return ApiResponse.badRequest(res, 'Standing capacity must be a valid number');
    }
    if (advanceBookingDays !== undefined && (isNaN(advanceBookingDays) || advanceBookingDays < 0)) {
      return ApiResponse.badRequest(res, 'Advance booking days must be a valid number');
    }

    venue.capacityDetails = {
      ...venue.capacityDetails,
      standingCapacity: standingCapacity !== undefined ? standingCapacity : venue.capacityDetails?.standingCapacity,
      seatingCapacity: seatingCapacity !== undefined ? seatingCapacity : venue.capacityDetails?.seatingCapacity,
      minimumBookingCapacity: minimumBookingCapacity !== undefined ? minimumBookingCapacity : venue.capacityDetails?.minimumBookingCapacity,
      multipleEventsPerDay: multipleEventsPerDay !== undefined ? multipleEventsPerDay : venue.capacityDetails?.multipleEventsPerDay,
      timeSlots: timeSlots !== undefined ? timeSlots : venue.capacityDetails?.timeSlots,
      peakSeasonRates: peakSeasonRates !== undefined ? peakSeasonRates : venue.capacityDetails?.peakSeasonRates,
      offSeasonRates: offSeasonRates !== undefined ? offSeasonRates : venue.capacityDetails?.offSeasonRates,
      advanceBookingDays: advanceBookingDays !== undefined ? advanceBookingDays : venue.capacityDetails?.advanceBookingDays
    };

    await venue.save();

    return ApiResponse.success(res, 'Capacity details updated successfully', {
      capacityDetails: venue.capacityDetails
    });
  } catch (error) {
    console.error('Update capacity error:', error);
    if (error.name === 'ValidationError') {
      return ApiResponse.badRequest(res, Object.values(error.errors).map(e => e.message).join(', '));
    }
    return ApiResponse.serverError(res, 'Error updating capacity details', error);
  }
};

/**
 * @desc    Update pricing and payment section
 * @route   PUT /api/venue/details/pricing
 * @access  Private (Venue only)
 */
exports.updatePricing = async (req, res) => {
  try {
    const venue = await Venue.findById(req.user.id);
    if (!venue) {
      return ApiResponse.notFound(res, 'Venue not found');
    }

    const { basePrice, hourlyRate, fullDayRate, halfDayRate, cleaningFee, securityDeposit, rentalIncludes, otherEquipmentDetails, securityDepositRequired, paymentModes, cancellationPolicy } = req.body;

    // Validation
    if (basePrice !== undefined && (isNaN(basePrice) || basePrice < 0)) {
      return ApiResponse.badRequest(res, 'Base price must be a valid number');
    }

    venue.pricing = {
      ...venue.pricing,
      basePrice: basePrice !== undefined ? basePrice : venue.pricing?.basePrice,
      hourlyRate: hourlyRate !== undefined ? hourlyRate : venue.pricing?.hourlyRate,
      fullDayRate: fullDayRate !== undefined ? fullDayRate : venue.pricing?.fullDayRate,
      halfDayRate: halfDayRate !== undefined ? halfDayRate : venue.pricing?.halfDayRate,
      cleaningFee: cleaningFee !== undefined ? cleaningFee : venue.pricing?.cleaningFee,
      securityDeposit: securityDeposit !== undefined ? securityDeposit : venue.pricing?.securityDeposit,
      rentalIncludes: rentalIncludes !== undefined ? rentalIncludes : venue.pricing?.rentalIncludes,
      otherEquipmentDetails: otherEquipmentDetails !== undefined ? otherEquipmentDetails : venue.pricing?.otherEquipmentDetails,
      securityDepositRequired: securityDepositRequired !== undefined ? securityDepositRequired : venue.pricing?.securityDepositRequired,
      paymentModes: paymentModes !== undefined ? paymentModes : venue.pricing?.paymentModes,
      cancellationPolicy: cancellationPolicy !== undefined ? cancellationPolicy : venue.pricing?.cancellationPolicy
    };

    await venue.save();

    return ApiResponse.success(res, 'Pricing details updated successfully', {
      pricing: venue.pricing
    });
  } catch (error) {
    console.error('Update pricing error:', error);
    if (error.name === 'ValidationError') {
      return ApiResponse.badRequest(res, Object.values(error.errors).map(e => e.message).join(', '));
    }
    return ApiResponse.serverError(res, 'Error updating pricing details', error);
  }
};

/**
 * @desc    Update amenities section
 * @route   PUT /api/venue/details/amenities
 * @access  Private (Venue only)
 */
exports.updateAmenities = async (req, res) => {
  try {
    const venue = await Venue.findById(req.user.id);
    if (!venue) {
      return ApiResponse.notFound(res, 'Venue not found');
    }

    // Filter out undefined values and properly merge nested objects
    const updateData = {};
    for (const [key, value] of Object.entries(req.body)) {
      // Skip undefined and null values
      if (value === undefined || value === null) {
        continue;
      }

      // Check if this is a nested object that needs merging (like washrooms)
      // washrooms doesn't have 'available' property, it has 'count' and 'cleanlinessStandards'
      const isNestedObject = typeof value === 'object' && 
                             !Array.isArray(value) && 
                             !value.hasOwnProperty('available');
      
      if (isNestedObject) {
        // This is a nested object field (like washrooms with count/cleanlinessStandards)
        // Filter out undefined/null values from nested properties
        const cleanValue = {};
        for (const [nestedKey, nestedValue] of Object.entries(value)) {
          if (nestedValue !== undefined && nestedValue !== null && nestedValue !== '') {
            cleanValue[nestedKey] = nestedValue;
          }
        }
        
        // Only set the nested object if it has valid data
        if (Object.keys(cleanValue).length > 0) {
          if (venue.amenities?.[key] && typeof venue.amenities[key] === 'object') {
            // Merge with existing data
            updateData[key] = {
              ...venue.amenities[key],
              ...cleanValue
            };
          } else {
            // New nested object
            updateData[key] = cleanValue;
          }
        }
        // If cleanValue is empty, we skip adding it to updateData, preserving existing value
      } else {
        // Regular amenity field (with available property) or other types
        updateData[key] = value;
      }
    }

    // Only update fields that are in updateData, preserving existing values for others
    for (const [key, value] of Object.entries(updateData)) {
      venue.amenities[key] = value;
    }

    await venue.save();

    return ApiResponse.success(res, 'Amenities updated successfully', {
      amenities: venue.amenities
    });
  } catch (error) {
    console.error('Update amenities error:', error);
    if (error.name === 'ValidationError') {
      return ApiResponse.badRequest(res, Object.values(error.errors).map(e => e.message).join(', '));
    }
    return ApiResponse.serverError(res, 'Error updating amenities', error);
  }
};

/**
 * @desc    Update policies section
 * @route   PUT /api/venue/details/policies
 * @access  Private (Venue only)
 */
exports.updatePolicies = async (req, res) => {
  try {
    const venue = await Venue.findById(req.user.id);
    if (!venue) {
      return ApiResponse.notFound(res, 'Venue not found');
    }

    venue.policies = {
      ...venue.policies,
      ...req.body
    };

    await venue.save();

    return ApiResponse.success(res, 'Policies updated successfully', {
      policies: venue.policies
    });
  } catch (error) {
    console.error('Update policies error:', error);
    if (error.name === 'ValidationError') {
      return ApiResponse.badRequest(res, Object.values(error.errors).map(e => e.message).join(', '));
    }
    return ApiResponse.serverError(res, 'Error updating policies', error);
  }
};

/**
 * @desc    Update add-on services section
 * @route   PUT /api/venue/details/addon-services
 * @access  Private (Venue only)
 */
exports.updateAddOnServices = async (req, res) => {
  try {
    const venue = await Venue.findById(req.user.id);
    if (!venue) {
      return ApiResponse.notFound(res, 'Venue not found');
    }

    venue.addOnServices = {
      ...venue.addOnServices,
      ...req.body
    };

    await venue.save();

    return ApiResponse.success(res, 'Add-on services updated successfully', {
      addOnServices: venue.addOnServices
    });
  } catch (error) {
    console.error('Update add-on services error:', error);
    if (error.name === 'ValidationError') {
      return ApiResponse.badRequest(res, Object.values(error.errors).map(e => e.message).join(', '));
    }
    return ApiResponse.serverError(res, 'Error updating add-on services', error);
  }
};

/**
 * @desc    Update documents section
 * @route   PUT /api/venue/details/documents
 * @access  Private (Venue only)
 */
exports.updateDocuments = async (req, res) => {
  try {
    const venue = await Venue.findById(req.user.id);
    if (!venue) {
      return ApiResponse.notFound(res, 'Venue not found');
    }

    // Handle documents update - preserve existing data and merge new data
    const { venueImages, venueVideoTour, menuCards, rateCard, businessLicense } = req.body;

    if (venueImages !== undefined) {
      venue.documents.venueImages = Array.isArray(venueImages) ? venueImages : venue.documents.venueImages || [];
    }

    if (venueVideoTour !== undefined) {
      venue.documents.venueVideoTour = venueVideoTour || venue.documents.venueVideoTour || {};
    }

    if (menuCards !== undefined) {
      venue.documents.menuCards = Array.isArray(menuCards) ? menuCards : venue.documents.menuCards || [];
    }

    if (rateCard !== undefined) {
      venue.documents.rateCard = rateCard || venue.documents.rateCard || {};
    }

    if (businessLicense !== undefined) {
      venue.documents.businessLicense = Array.isArray(businessLicense) ? businessLicense : venue.documents.businessLicense || [];
    }

    await venue.save();

    return ApiResponse.success(res, 'Documents updated successfully', {
      documents: venue.documents
    });
  } catch (error) {
    console.error('Update documents error:', error);
    if (error.name === 'ValidationError') {
      return ApiResponse.badRequest(res, Object.values(error.errors).map(e => e.message).join(', '));
    }
    return ApiResponse.serverError(res, 'Error updating documents', error);
  }
};

/**
 * @desc    Update authorizations section
 * @route   PUT /api/venue/details/authorizations
 * @access  Private (Venue only)
 */
exports.updateAuthorizations = async (req, res) => {
  try {
    const venue = await Venue.findById(req.user.id);
    if (!venue) {
      return ApiResponse.notFound(res, 'Venue not found');
    }

    const { publicListingAuthorized, onlineBookingEnabled, preferredCommunication } = req.body;

    // Validation
    if (preferredCommunication && !['whatsapp', 'email', 'phone_call'].includes(preferredCommunication)) {
      return ApiResponse.badRequest(res, 'Invalid preferred communication channel');
    }

    venue.authorizations = {
      ...venue.authorizations,
      publicListingAuthorized: publicListingAuthorized !== undefined ? publicListingAuthorized : venue.authorizations?.publicListingAuthorized,
      onlineBookingEnabled: onlineBookingEnabled !== undefined ? onlineBookingEnabled : venue.authorizations?.onlineBookingEnabled,
      preferredCommunication: preferredCommunication !== undefined ? preferredCommunication : venue.authorizations?.preferredCommunication
    };

    await venue.save();

    return ApiResponse.success(res, 'Authorizations updated successfully', {
      authorizations: venue.authorizations
    });
  } catch (error) {
    console.error('Update authorizations error:', error);
    if (error.name === 'ValidationError') {
      return ApiResponse.badRequest(res, Object.values(error.errors).map(e => e.message).join(', '));
    }
    return ApiResponse.serverError(res, 'Error updating authorizations', error);
  }
};

/**
 * @desc    Get venue FAQs
 * @route   GET /api/venue/faqs
 * @access  Private (Venue only)
 */
exports.getFaqs = async (req, res) => {
  try {
    const venue = await Venue.findById(req.user.id).select('faqs');
    if (!venue) {
      return ApiResponse.notFound(res, 'Venue not found');
    }
    return ApiResponse.success(res, 'FAQs retrieved successfully', { faqs: venue.faqs || [] });
  } catch (error) {
    console.error('Get FAQs error:', error);
    return ApiResponse.serverError(res, 'Error retrieving FAQs', error);
  }
};

/**
 * @desc    Create a new FAQ
 * @route   POST /api/venue/faqs
 * @access  Private (Venue only)
 */
exports.createFaq = async (req, res) => {
  try {
    const { question, answer, isActive, order } = req.body;
    if (!question || !answer) {
      return ApiResponse.badRequest(res, 'Question and answer are required');
    }
    const venue = await Venue.findById(req.user.id);
    if (!venue) {
      return ApiResponse.notFound(res, 'Venue not found');
    }
    const faq = {
      question,
      answer,
      isActive: isActive !== undefined ? isActive : true,
      order: order || 0,
      createdAt: new Date()
    };
    venue.faqs = venue.faqs || [];
    venue.faqs.push(faq);
    await venue.save();
    return ApiResponse.success(res, 'FAQ added successfully', { faqs: venue.faqs });
  } catch (error) {
    console.error('Create FAQ error:', error);
    return ApiResponse.serverError(res, 'Error creating FAQ', error);
  }
};

/**
 * @desc    Update an existing FAQ
 * @route   PUT /api/venue/faqs/:faqId
 * @access  Private (Venue only)
 */
exports.updateFaq = async (req, res) => {
  try {
    const { faqId } = req.params;
    const { question, answer, isActive, order } = req.body;
    const venue = await Venue.findById(req.user.id);
    if (!venue) {
      return ApiResponse.notFound(res, 'Venue not found');
    }
    const faq = (venue.faqs || []).id(faqId);
    if (!faq) {
      return ApiResponse.notFound(res, 'FAQ not found');
    }
    if (question !== undefined) faq.question = question;
    if (answer !== undefined) faq.answer = answer;
    if (isActive !== undefined) faq.isActive = isActive;
    if (order !== undefined) faq.order = order;
    await venue.save();
    return ApiResponse.success(res, 'FAQ updated successfully', { faqs: venue.faqs });
  } catch (error) {
    console.error('Update FAQ error:', error);
    return ApiResponse.serverError(res, 'Error updating FAQ', error);
  }
};

/**
 * @desc    Delete an FAQ
 * @route   DELETE /api/venue/faqs/:faqId
 * @access  Private (Venue only)
 */
exports.deleteFaq = async (req, res) => {
  try {
    const { faqId } = req.params;
    const venue = await Venue.findById(req.user.id);
    if (!venue) {
      return ApiResponse.notFound(res, 'Venue not found');
    }
    const before = (venue.faqs || []).length;
    venue.faqs = (venue.faqs || []).filter(f => f._id.toString() !== faqId);
    if (venue.faqs.length === before) {
      return ApiResponse.notFound(res, 'FAQ not found');
    }
    await venue.save();
    return ApiResponse.success(res, 'FAQ deleted successfully', { faqs: venue.faqs });
  } catch (error) {
    console.error('Delete FAQ error:', error);
    return ApiResponse.serverError(res, 'Error deleting FAQ', error);
  }
};

/**
 * @desc    Get all blocked slots for a venue
 * @route   GET /api/venue/blocked-slots
 * @access  Private (Venue only)
 */
exports.getBlockedSlots = async (req, res) => {
  try {
    const venue = await Venue.findById(req.user.id);
    if (!venue) {
      return ApiResponse.notFound(res, 'Venue not found');
    }
    return ApiResponse.success(res, 'Blocked slots retrieved successfully', {
      blockedSlots: venue.blockedSlots || []
    });
  } catch (error) {
    console.error('Get blocked slots error:', error);
    return ApiResponse.serverError(res, 'Error retrieving blocked slots', error);
  }
};

/**
 * @desc    Add a blocked slot (date/time unavailability)
 * @route   POST /api/venue/blocked-slots
 * @access  Private (Venue only)
 */
exports.addBlockedSlot = async (req, res) => {
  try {
    const venue = await Venue.findById(req.user.id);
    if (!venue) {
      return ApiResponse.notFound(res, 'Venue not found');
    }

    const { date, isFullDayBlocked, timeSlots, reason, notes } = req.body;

    // Validation
    if (!date) {
      return ApiResponse.badRequest(res, 'Date is required');
    }

    if (!isFullDayBlocked && (!timeSlots || timeSlots.length === 0)) {
      return ApiResponse.badRequest(res, 'Time slots are required when not blocking full day');
    }

    // Validate time slots format
    if (timeSlots && timeSlots.length > 0) {
      const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
      for (const slot of timeSlots) {
        if (!timeRegex.test(slot.startTime) || !timeRegex.test(slot.endTime)) {
          return ApiResponse.badRequest(res, 'Invalid time format. Use HH:MM (24-hour format)');
        }
      }
    }

    const blockedSlot = {
      date: new Date(date),
      isFullDayBlocked: isFullDayBlocked || false,
      timeSlots: timeSlots || [],
      reason: reason || 'offline_booking',
      notes: notes || ''
    };

    if (!venue.blockedSlots) {
      venue.blockedSlots = [];
    }

    venue.blockedSlots.push(blockedSlot);
    await venue.save();

    return ApiResponse.success(res, 'Blocked slot added successfully', {
      blockedSlots: venue.blockedSlots
    });
  } catch (error) {
    console.error('Add blocked slot error:', error);
    return ApiResponse.serverError(res, 'Error adding blocked slot', error);
  }
};

/**
 * @desc    Update a blocked slot
 * @route   PUT /api/venue/blocked-slots/:slotId
 * @access  Private (Venue only)
 */
exports.updateBlockedSlot = async (req, res) => {
  try {
    const { slotId } = req.params;
    const { date, isFullDayBlocked, timeSlots, reason, notes } = req.body;

    const venue = await Venue.findById(req.user.id);
    if (!venue) {
      return ApiResponse.notFound(res, 'Venue not found');
    }

    const slot = (venue.blockedSlots || []).id(slotId);
    if (!slot) {
      return ApiResponse.notFound(res, 'Blocked slot not found');
    }

    // Validate time slots format if provided
    if (timeSlots && timeSlots.length > 0) {
      const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
      for (const timeSlot of timeSlots) {
        if (!timeRegex.test(timeSlot.startTime) || !timeRegex.test(timeSlot.endTime)) {
          return ApiResponse.badRequest(res, 'Invalid time format. Use HH:MM (24-hour format)');
        }
      }
    }

    if (date !== undefined) slot.date = new Date(date);
    if (isFullDayBlocked !== undefined) slot.isFullDayBlocked = isFullDayBlocked;
    if (timeSlots !== undefined) slot.timeSlots = timeSlots;
    if (reason !== undefined) slot.reason = reason;
    if (notes !== undefined) slot.notes = notes;

    await venue.save();

    return ApiResponse.success(res, 'Blocked slot updated successfully', {
      blockedSlots: venue.blockedSlots
    });
  } catch (error) {
    console.error('Update blocked slot error:', error);
    return ApiResponse.serverError(res, 'Error updating blocked slot', error);
  }
};

/**
 * @desc    Delete a blocked slot
 * @route   DELETE /api/venue/blocked-slots/:slotId
 * @access  Private (Venue only)
 */
exports.deleteBlockedSlot = async (req, res) => {
  try {
    const { slotId } = req.params;

    const venue = await Venue.findById(req.user.id);
    if (!venue) {
      return ApiResponse.notFound(res, 'Venue not found');
    }

    const before = (venue.blockedSlots || []).length;
    venue.blockedSlots = (venue.blockedSlots || []).filter(
      slot => slot._id.toString() !== slotId
    );

    if (venue.blockedSlots.length === before) {
      return ApiResponse.notFound(res, 'Blocked slot not found');
    }

    await venue.save();

    return ApiResponse.success(res, 'Blocked slot deleted successfully', {
      blockedSlots: venue.blockedSlots
    });
  } catch (error) {
    console.error('Delete blocked slot error:', error);
    return ApiResponse.serverError(res, 'Error deleting blocked slot', error);
  }
};