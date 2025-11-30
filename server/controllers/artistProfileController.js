const Artist = require('../models/Artist');
const ApiResponse = require('../utils/apiResponse');
const { validationResult } = require('express-validator');
// const cloudinary = require('../config/cloudinary');

/**
 * @desc    Update artist gallery (photos/videos)
 * @route   PUT /api/artist/gallery
 * @access  Private (Artist only)
 */
exports.updateGallery = async (req, res) => {
  try {
    const { photos, videos } = req.body;
    
    const artist = await Artist.findById(req.user.id);
    if (!artist) {
      return ApiResponse.notFound(res, 'Artist not found');
    }

    if (photos) {
      artist.gallery.photos = photos;
    }
    
    if (videos) {
      artist.gallery.videos = videos;
    }
    
    await artist.save();

    return ApiResponse.success(res, 'Gallery updated successfully', {
      gallery: artist.gallery
    });

  } catch (error) {
    console.error('Update Gallery Error:', error);
    return ApiResponse.serverError(res, 'Error updating gallery', error.message);
  }
};

/**
 * @desc    Add photo to gallery
 * @route   POST /api/artist/gallery/photo
 * @access  Private (Artist only)
 */
exports.addPhoto = async (req, res) => {
  try {
    const { url, caption, isProfileImage, isCoverImage } = req.body;
    
    const artist = await Artist.findById(req.user.id);
    if (!artist) {
      return ApiResponse.notFound(res, 'Artist not found');
    }

    // If setting as profile or cover image, remove the flag from other photos
    if (isProfileImage) {
      artist.gallery.photos.forEach(photo => {
        photo.isProfileImage = false;
      });
    }
    
    if (isCoverImage) {
      artist.gallery.photos.forEach(photo => {
        photo.isCoverImage = false;
      });
    }

    artist.gallery.photos.push({
      url,
      caption,
      isProfileImage: isProfileImage || false,
      isCoverImage: isCoverImage || false
    });
    
    await artist.save();

    return ApiResponse.success(res, 'Photo added successfully', {
      photo: artist.gallery.photos[artist.gallery.photos.length - 1]
    });

  } catch (error) {
    console.error('Add Photo Error:', error);
    return ApiResponse.serverError(res, 'Error adding photo', error.message);
  }
};

/**
 * @desc    Add video to gallery
 * @route   POST /api/artist/gallery/video
 * @access  Private (Artist only)
 */
exports.addVideo = async (req, res) => {
  try {
    const { url, thumbnail, caption, platform } = req.body;
    
    const artist = await Artist.findById(req.user.id);
    if (!artist) {
      return ApiResponse.notFound(res, 'Artist not found');
    }

    artist.gallery.videos.push({
      url,
      thumbnail,
      caption,
      platform: platform || 'other'
    });
    
    await artist.save();

    return ApiResponse.success(res, 'Video added successfully', {
      video: artist.gallery.videos[artist.gallery.videos.length - 1]
    });

  } catch (error) {
    console.error('Add Video Error:', error);
    return ApiResponse.serverError(res, 'Error adding video', error.message);
  }
};

/**
 * @desc    Remove photo from gallery
 * @route   DELETE /api/artist/gallery/photo/:photoId
 * @access  Private (Artist only)
 */
exports.removePhoto = async (req, res) => {
  try {
    const { photoId } = req.params;
    
    const artist = await Artist.findById(req.user.id);
    if (!artist) {
      return ApiResponse.notFound(res, 'Artist not found');
    }

    artist.gallery.photos = artist.gallery.photos.filter(
      photo => photo._id.toString() !== photoId
    );
    
    await artist.save();

    return ApiResponse.success(res, 'Photo removed successfully');

  } catch (error) {
    console.error('Remove Photo Error:', error);
    return ApiResponse.serverError(res, 'Error removing photo', error.message);
  }
};

/**
 * @desc    Remove video from gallery
 * @route   DELETE /api/artist/gallery/video/:videoId
 * @access  Private (Artist only)
 */
exports.removeVideo = async (req, res) => {
  try {
    const { videoId } = req.params;
    
    const artist = await Artist.findById(req.user.id);
    if (!artist) {
      return ApiResponse.notFound(res, 'Artist not found');
    }

    artist.gallery.videos = artist.gallery.videos.filter(
      video => video._id.toString() !== videoId
    );
    
    await artist.save();

    return ApiResponse.success(res, 'Video removed successfully');

  } catch (error) {
    console.error('Remove Video Error:', error);
    return ApiResponse.serverError(res, 'Error removing video', error.message);
  }
};

/**
 * @desc    Add accolade
 * @route   POST /api/artist/accolades
 * @access  Private (Artist only)
 */
exports.addAccolade = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  try {
    const { title, description, year, organization, certificate } = req.body;
    
    const artist = await Artist.findById(req.user.id);
    if (!artist) {
      return ApiResponse.notFound(res, 'Artist not found');
    }

    artist.accolades.push({
      title,
      description,
      year,
      organization,
      certificate
    });
    
    await artist.save();

    return ApiResponse.success(res, 'Accolade added successfully', {
      accolade: artist.accolades[artist.accolades.length - 1]
    });

  } catch (error) {
    console.error('Add Accolade Error:', error);
    return ApiResponse.serverError(res, 'Error adding accolade', error.message);
  }
};

/**
 * @desc    Update accolade
 * @route   PUT /api/artist/accolades/:accoladeId
 * @access  Private (Artist only)
 */
exports.updateAccolade = async (req, res) => {
  try {
    const { accoladeId } = req.params;
    const { title, description, year, organization, certificate } = req.body;
    
    const artist = await Artist.findById(req.user.id);
    if (!artist) {
      return ApiResponse.notFound(res, 'Artist not found');
    }

    const accolade = artist.accolades.id(accoladeId);
    if (!accolade) {
      return ApiResponse.notFound(res, 'Accolade not found');
    }

    if (title) accolade.title = title;
    if (description) accolade.description = description;
    if (year) accolade.year = year;
    if (organization) accolade.organization = organization;
    if (certificate) accolade.certificate = certificate;
    
    await artist.save();

    return ApiResponse.success(res, 'Accolade updated successfully', {
      accolade
    });

  } catch (error) {
    console.error('Update Accolade Error:', error);
    return ApiResponse.serverError(res, 'Error updating accolade', error.message);
  }
};

/**
 * @desc    Remove accolade
 * @route   DELETE /api/artist/accolades/:accoladeId
 * @access  Private (Artist only)
 */
exports.removeAccolade = async (req, res) => {
  try {
    const { accoladeId } = req.params;
    
    const artist = await Artist.findById(req.user.id);
    if (!artist) {
      return ApiResponse.notFound(res, 'Artist not found');
    }

    artist.accolades = artist.accolades.filter(
      accolade => accolade._id.toString() !== accoladeId
    );
    
    await artist.save();

    return ApiResponse.success(res, 'Accolade removed successfully');

  } catch (error) {
    console.error('Remove Accolade Error:', error);
    return ApiResponse.serverError(res, 'Error removing accolade', error.message);
  }
};

/**
 * @desc    Update social links
 * @route   PUT /api/artist/social-links
 * @access  Private (Artist only)
 */
exports.updateSocialLinks = async (req, res) => {
  try {
    const { instagram, youtube, spotify, facebook, twitter, website } = req.body;
    
    const artist = await Artist.findById(req.user.id);
    if (!artist) {
      return ApiResponse.notFound(res, 'Artist not found');
    }

    if (instagram !== undefined) artist.socialLinks.instagram = instagram;
    if (youtube !== undefined) artist.socialLinks.youtube = youtube;
    if (spotify !== undefined) artist.socialLinks.spotify = spotify;
    if (facebook !== undefined) artist.socialLinks.facebook = facebook;
    if (twitter !== undefined) artist.socialLinks.twitter = twitter;
    if (website !== undefined) artist.socialLinks.website = website;
    
    await artist.save();

    return ApiResponse.success(res, 'Social links updated successfully', {
      socialLinks: artist.socialLinks
    });

  } catch (error) {
    console.error('Update Social Links Error:', error);
    return ApiResponse.serverError(res, 'Error updating social links', error.message);
  }
};

/**
 * @desc    Get public artist profile
 * @route   GET /api/artist/public/:artistId
 * @access  Public
 */
exports.getPublicArtistProfile = async (req, res) => {
  try {
    const { artistId } = req.params;
    
    const artist = await Artist.findOne({
      _id: artistId,
      approvalStatus: 'approved',
      status: 'active'
    }).select('-otp -createdAt -updatedAt');

    if (!artist) {
      return ApiResponse.notFound(res, 'Artist profile not found or not approved');
    }

    return ApiResponse.success(res, 'Public artist profile retrieved successfully', {
      artist
    });

  } catch (error) {
    console.error('Get Public Artist Profile Error:', error);
    return ApiResponse.serverError(res, 'Error retrieving artist profile', error.message);
  }
};

/**
 * @desc    Get all approved artists (for public listing)
 * @route   GET /api/artist/public
 * @access  Public
 */
exports.getApprovedArtists = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 12, 
 
      type, 
      city, 
      minPrice, 
      maxPrice,
      sortBy = 'rating.average'
    } = req.query;

    const query = {
      approvalStatus: 'approved',
      status: 'active'
    };

    // Add filters

    
    if (type) {
      query.type = type;
    }
    
    if (city) {
      query.city = new RegExp(city, 'i');
    }
    
    if (minPrice || maxPrice) {
      query.basePrice = {};
      if (minPrice) query.basePrice.$gte = parseInt(minPrice);
      if (maxPrice) query.basePrice.$lte = parseInt(maxPrice);
    }

    const artists = await Artist.find(query)
      .select('name bio type basePrice city rating gallery.photos socialLinks')
      .sort({ [sortBy]: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Artist.countDocuments(query);

    return ApiResponse.success(res, 'Artists retrieved successfully', {
      artists,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / limit),
        total
      }
    });

  } catch (error) {
    console.error('Get Approved Artists Error:', error);
    return ApiResponse.serverError(res, 'Error retrieving artists', error.message);
  }
};
