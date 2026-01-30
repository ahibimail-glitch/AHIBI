const Artist = require('../models/Artist');
const smsService = require('../services/smsService');
const { validationResult } = require('express-validator');
const ApiResponse = require('../utils/apiResponse');
const tempOtpStore = require('../utils/tempOtpStore');

/**
 * @desc    Register a new artist
 * @route   POST /api/auth/artist/signup
 * @access  Public
 */
exports.artistSignup = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  const {
    name,
    email,
    phone,
    city,
    bio,

    type,
    specialization,
    basePrice,
    experience
  } = req.body;

  try {
    // Check if artist already exists
    const existingArtist = await Artist.findOne({ 
      $or: [{ phone }, { email }] 
    });

    if (existingArtist) {
      return ApiResponse.badRequest(res, 'Artist with this phone or email already exists');
    }

    // Create artist account
    const artist = await Artist.create({
      name,
      email,
      phone,
      city,
      bio,

      type: type || specialization,
      basePrice,
      experience,
      approvalStatus: 'pending'
    });

    // For OTP-based signup, we don't send a token here.
    // The user will verify OTP to complete registration and get a token.
    return ApiResponse.success(res, 'Artist registered. Please verify OTP to complete signup.');

  } catch (error) {
    console.error('Artist Signup Error:', error);
    return ApiResponse.serverError(res, 'Error creating artist account', error.message);
  }
};

/**
 * @desc    Send OTP to artist for login or signup
 * @route   POST /api/auth/artist/send-otp
 * @access  Public
 */
exports.sendArtistOtp = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  const { phone, mode } = req.body;

  try {
    // For login, check if artist exists and is approved
    if (mode === 'login') {
      const artist = await Artist.findOne({ phone });
      if (!artist) {
        return ApiResponse.notFound(res, 'Artist not found. Please sign up first.');
      }

      if (artist.approvalStatus === 'pending') {
        return ApiResponse.forbidden(res, 'Your account is pending approval from the admin.');
      }

      if (artist.approvalStatus === 'rejected') {
        return ApiResponse.forbidden(res, 'Your account has been rejected. Please contact support.');
      }

      // Set and send OTP
      let otp = await artist.setOtp();
      const smsResponse = await smsService.sendOtp(phone, otp);

      if (!smsResponse.success) {
        return ApiResponse.serverError(res, 'Failed to send OTP', smsResponse.message);
      }

      return ApiResponse.success(res, 'Login OTP sent successfully');

    } else {
      // For signup, check if artist already exists
      let artist = await Artist.findOne({ phone });
      if (artist) {
        return ApiResponse.badRequest(res, 'Number is already registered');
      }

      // Generate OTP
      let otp = Math.floor(100000 + Math.random() * 900000).toString();
      tempOtpStore.set(phone, otp);

      // Send OTP via SMS
      const smsResponse = await smsService.sendOtp(phone, otp);

      if (!smsResponse.success) {
        return ApiResponse.serverError(res, 'Failed to send OTP', smsResponse.message);
      }

      return ApiResponse.success(res, 'OTP sent successfully');
    }

  } catch (error) {
    console.error('Send Artist OTP Error:', error);
    return ApiResponse.serverError(res, 'Error sending OTP', error.message);
  }
};

/**
 * @desc    Verify OTP for artist login or signup
 * @route   POST /api/auth/artist/verify-otp
 * @access  Public
 */
exports.verifyArtistOtp = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  const { phone, otp, mode } = req.body;

  try {
    if (mode === 'login') {
      // For login, verify OTP from artist document
      const artist = await Artist.findOne({ phone });
      
      if (!artist) {
        return ApiResponse.badRequest(res, 'Artist not found');
      }

      const isOtpValid = await artist.verifyOtp(otp);
      if (!isOtpValid) {
        return ApiResponse.badRequest(res, 'Invalid or expired OTP');
      }

      // Check approval status
      if (artist.approvalStatus === 'pending') {
        return ApiResponse.accepted(res, 'Your artist account is pending approval', {
          pending: true,
          approvalStatus: artist.approvalStatus
        });
      }

      if (artist.approvalStatus === 'rejected') {
        return ApiResponse.forbidden(res, 'Your artist account has been rejected', {
          rejected: true,
          reason: artist.rejectionReason
        });
      }

      // Generate JWT token
      const token = artist.getSignedJwtToken();

      // Respond with token
      return ApiResponse.success(res, 'OTP verified successfully. Login successful.', {
        token,
        user: {
          _id: artist._id,
          name: artist.name,
          email: artist.email,
          phone: artist.phone,
          role: 'artist',
          status: artist.status
        }
      });

    } else {
      // For signup, verify OTP from temp store
      const storedOtp = tempOtpStore.get(phone);
      if (!storedOtp || storedOtp !== otp) {
        return ApiResponse.badRequest(res, 'Invalid or expired OTP');
      }
      tempOtpStore.delete(phone);
      return ApiResponse.success(res, 'OTP verified successfully. Please complete your profile.');
    }

  } catch (error) {
    console.error('Verify Artist OTP Error:', error);
    return ApiResponse.serverError(res, 'Error verifying OTP', error.message);
  }
};

/**
 * @desc    Get current artist profile
 * @route   GET /api/auth/artist/profile
 * @access  Private (Artist only)
 */
exports.getArtistProfile = async (req, res) => {
  try {
    const artist = await Artist.findById(req.user.id);

    if (!artist) {
      return ApiResponse.notFound(res, 'Artist profile not found');
    }

    return ApiResponse.success(res, 'Artist profile retrieved successfully', {
      artist
    });

  } catch (error) {
    console.error('Get Artist Profile Error:', error);
    return ApiResponse.serverError(res, 'Error retrieving artist profile', error.message);
  }
};

/**
 * @desc    Update artist profile
 * @route   PUT /api/auth/artist/profile
 * @access  Private (Artist only)
 */
exports.updateArtistProfile = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  try {
    const artist = await Artist.findById(req.user.id);

    if (!artist) {
      return ApiResponse.notFound(res, 'Artist profile not found');
    }

    // Update allowed fields
    const { 
      name, 
      stageName,
      gender,
      email, 
      phone,
      emergencyContact,
      city, 
      bio,
      shortBio,
      longBio,
 
      artistCategories,
      type, 
      specialization, 
      basePrice, 
      experience, 
      socialLinks, 
      profilePic,
      coverImage,
      profileImage,
      performanceRegions,
      eventTypes,
      eventTypesOther,
      audienceVibe,
      performanceDurations,
      performanceDurationOther,
      performanceFormats,
      performanceFormatsOther,
      feeRange,
      techRider
    } = req.body;
    
    console.log('Updating artist profile:', {
      artistId: req.user.id,
      fieldsReceived: Object.keys(req.body)
    });
    
    // Helper function to check if value is not empty
    const isValidValue = (value) => value !== undefined && value !== null && value !== '';
    
    if (isValidValue(name)) artist.name = name;
    if (isValidValue(stageName)) artist.stageName = stageName;
    if (isValidValue(gender)) artist.gender = gender;
    if (isValidValue(email)) artist.email = email;
    if (isValidValue(phone)) artist.phone = phone;
    if (isValidValue(emergencyContact)) artist.emergencyContact = emergencyContact;
    if (isValidValue(city)) artist.city = city;
    if (isValidValue(bio)) artist.bio = bio;
    if (isValidValue(shortBio)) artist.shortBio = shortBio;
    if (isValidValue(longBio)) artist.longBio = longBio;

    if (artistCategories !== undefined && Array.isArray(artistCategories)) artist.artistCategories = artistCategories;
    if (type !== undefined || specialization !== undefined) artist.type = type || specialization;
    if (basePrice !== undefined && basePrice !== null && basePrice !== '') artist.basePrice = parseFloat(basePrice);
    if (experience !== undefined) artist.experience = experience;
    if (socialLinks !== undefined) {
      if (typeof socialLinks === 'object') {
        Object.keys(socialLinks).forEach(key => {
          if (isValidValue(socialLinks[key])) {
            artist.socialLinks[key] = socialLinks[key];
          }
        });
      }
    }
    if (isValidValue(profilePic)) artist.profilePic = profilePic;
    if (isValidValue(profileImage)) {
      artist.profilePic = profileImage;
      // Also update gallery if profileImage is set
      if (!artist.gallery) artist.gallery = { photos: [], videos: [] };
      // Mark existing profile images as false
      artist.gallery.photos.forEach(photo => {
        photo.isProfileImage = false;
      });
      // Find or add the profile image
      const existingPhoto = artist.gallery.photos.find(p => p.url === profileImage);
      if (existingPhoto) {
        existingPhoto.isProfileImage = true;
      } else {
        artist.gallery.photos.push({
          url: profileImage,
          caption: 'Profile Image',
          isProfileImage: true,
          isCoverImage: false
        });
      }
    }
    if (isValidValue(coverImage)) {
      // Update gallery cover image
      if (!artist.gallery) artist.gallery = { photos: [], videos: [] };
      // Mark existing cover images as false
      artist.gallery.photos.forEach(photo => {
        photo.isCoverImage = false;
      });
      // Find or add the cover image
      const existingPhoto = artist.gallery.photos.find(p => p.url === coverImage);
      if (existingPhoto) {
        existingPhoto.isCoverImage = true;
      } else {
        artist.gallery.photos.push({
          url: coverImage,
          caption: 'Cover Image',
          isProfileImage: false,
          isCoverImage: true
        });
      }
    }
    if (performanceRegions !== undefined && Array.isArray(performanceRegions)) artist.performanceRegions = performanceRegions;
    if (eventTypes !== undefined && Array.isArray(eventTypes)) artist.eventTypes = eventTypes;
    if (isValidValue(eventTypesOther)) artist.eventTypesOther = eventTypesOther;
    if (audienceVibe !== undefined && Array.isArray(audienceVibe)) artist.audienceVibe = audienceVibe;
    if (performanceDurations !== undefined && Array.isArray(performanceDurations)) artist.performanceDurations = performanceDurations;
    if (isValidValue(performanceDurationOther)) artist.performanceDurationOther = performanceDurationOther;
    if (performanceFormats !== undefined && Array.isArray(performanceFormats)) artist.performanceFormats = performanceFormats;
    if (isValidValue(performanceFormatsOther)) artist.performanceFormatsOther = performanceFormatsOther;
    if (feeRange !== undefined && typeof feeRange === 'object') {
      if (feeRange.min !== undefined && feeRange.min !== null && feeRange.min !== '') {
        artist.feeRange = artist.feeRange || {};
        artist.feeRange.min = parseFloat(feeRange.min);
      }
      if (feeRange.max !== undefined && feeRange.max !== null && feeRange.max !== '') {
        artist.feeRange = artist.feeRange || {};
        artist.feeRange.max = parseFloat(feeRange.max);
      }
    }

    if (techRider !== undefined && typeof techRider === 'object') {
      artist.techRider = artist.techRider || {};

      if (isValidValue(techRider.soundRequirements)) {
        artist.techRider.soundRequirements = techRider.soundRequirements;
      }
      if (isValidValue(techRider.lightingRequirements)) {
        artist.techRider.lightingRequirements = techRider.lightingRequirements;
      }
      if (isValidValue(techRider.stageRequirements)) {
        artist.techRider.stageRequirements = techRider.stageRequirements;
      }
      if (isValidValue(techRider.instrumentsEquipmentNeeded)) {
        artist.techRider.instrumentsEquipmentNeeded = techRider.instrumentsEquipmentNeeded;
      }
      if (isValidValue(techRider.powerRequirements)) {
        artist.techRider.powerRequirements = techRider.powerRequirements;
      }
      if (isValidValue(techRider.specialNotes)) {
        artist.techRider.specialNotes = techRider.specialNotes;
      }

      if (techRider.file !== undefined && typeof techRider.file === 'object') {
        artist.techRider.file = artist.techRider.file || {};

        if (isValidValue(techRider.file.url)) {
          artist.techRider.file.url = techRider.file.url;
        }

        if (isValidValue(techRider.file.fileType)) {
          artist.techRider.file.fileType = techRider.file.fileType;
        }

        if (isValidValue(techRider.file.uploadedAt)) {
          artist.techRider.file.uploadedAt = techRider.file.uploadedAt;
        }
      }

      artist.techRider.updatedAt = new Date();
    }

    const updatedArtist = await artist.save();
    console.log('Artist profile updated successfully:', updatedArtist._id);

    return ApiResponse.success(res, 'Artist profile updated successfully', {
      artist: updatedArtist
    });

  } catch (error) {
    console.error('Update Artist Profile Error:', error);
    return ApiResponse.serverError(res, 'Error updating artist profile', error.message);
  }
};