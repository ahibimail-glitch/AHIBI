const { 
    uploadPhoto, 
    uploadDocument,
    uploadMultiplePhotos, 
    deletePhoto, 
    getPhotoInfo, 
    getResponsiveUrls 
  } = require('../utils/cloudinary');
  const { AppError } = require('../middlewares/errorHandler');
  const { logger } = require('../utils/logger');
  
  // Upload single photo
  exports.uploadPhoto = async (req, res, next) => {
    try {
      if (!req.file) {
        return next(new AppError('Please upload a photo', 400));
      }
  
      const { folder = 'ahibi', description } = req.body;
      const file = req.file;
  
      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
      if (!allowedTypes.includes(file.mimetype)) {
        return next(new AppError('Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed', 400));
      }
  
      // Validate file size (10MB max)
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (file.size > maxSize) {
        return next(new AppError('File size too large. Maximum size is 10MB', 400));
      }
  
      // Upload to Cloudinary
      const uploadOptions = {
        context: {
          description: description || 'Uploaded photo',
        }
      };
      
      // Add user ID if available
      const userId = req.user?.id || 'anonymous';
      if (userId) {
        uploadOptions.context.uploaded_by = userId;
      }
      
      const result = await uploadPhoto(file, folder, uploadOptions);
  
      logger.info(`Photo uploaded successfully: ${result.public_id} by user ${userId}`);
  
      res.status(200).json({
        status: 'success',
        data: {
          photo: result
        }
      });
    } catch (error) {
      logger.error(`Photo upload failed: ${error.message}`);
      next(error);
    }
  };
  
  // Upload a document (PDF)
  exports.uploadDocument = async (req, res, next) => {
    try {
      if (!req.file) {
        return next(new AppError('Please upload a document', 400));
      }

      const { folder = 'ahibi/documents', description } = req.body;
      const file = req.file;

      // Validate file type
      const allowedTypes = ['application/pdf'];
      if (!allowedTypes.includes(file.mimetype)) {
        return next(new AppError('Invalid file type. Only PDF is allowed', 400));
      }

      // Validate file size (100MB max)
      const maxSize = 100 * 1024 * 1024; // 100MB
      if (file.size > maxSize) {
        return next(new AppError('File size too large. Maximum size is 100MB', 400));
      }

      const uploadOptions = {
        context: {
          description: description || 'Uploaded document',
        },
      };

      const userId = req.user?.id || 'anonymous';
      if (userId) {
        uploadOptions.context.uploaded_by = userId;
      }

      const result = await uploadDocument(file, folder, uploadOptions);

      logger.info(`Document uploaded successfully: ${result.public_id} by user ${userId}`);

      res.status(200).json({
        status: 'success',
        data: {
          document: result,
        },
      });
    } catch (error) {
      logger.error(`Document upload failed: ${error.message}`);
      next(error);
    }
  };

  // Upload multiple photos
  exports.uploadMultiplePhotos = async (req, res, next) => {
    try {
      if (!req.files || req.files.length === 0) {
        return next(new AppError('Please upload photos', 400));
      }
  
      const { folder = 'ahibi', description } = req.body;
      const files = Array.isArray(req.files) ? req.files : [req.files];
  
      // Validate files
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
      const maxSize = 10 * 1024 * 1024; // 10MB
  
      for (const file of files) {
        if (!allowedTypes.includes(file.mimetype)) {
          return next(new AppError(`Invalid file type for ${file.name}. Only JPEG, PNG, GIF, and WebP are allowed`, 400));
        }
        if (file.size > maxSize) {
          return next(new AppError(`File ${file.name} is too large. Maximum size is 10MB`, 400));
        }
      }
  
      // Upload to Cloudinary
      const uploadOptions = {
        context: {
          description: description || 'Uploaded photos',
        }
      };
      
      // Add user/venue ID if available
      const userId = req.venue?.id || req.user?.id || 'anonymous';
      const userType = req.venue ? 'venue' : 'user';
      if (userId) {
        uploadOptions.context.uploaded_by = userId;
        uploadOptions.context.user_type = userType;
      }
      
      const results = await uploadMultiplePhotos(files, folder, uploadOptions);
  
      logger.info(`${results.length} photos uploaded successfully by ${userType} ${userId}`);
  
      res.status(200).json({
        success: true,
        status: 'success',
        data: {
          photos: results
        }
      });
    } catch (error) {
      logger.error(`Multiple photo upload failed: ${error.message}`);
      next(error);
    }
  };
  
  // Set cover image
  exports.setCoverImage = async (req, res, next) => {
    try {
      const { publicId } = req.body;
  
      if (!publicId) {
        return next(new AppError('Public ID is required', 400));
      }
      
      // Decode the public ID to handle forward slashes and other URL-encoded characters
      const decodedPublicId = decodeURIComponent(publicId);
      
      // Get venue from authentication
      const venueId = req.venue.id;
      const Venue = require('../models/Venue');
      
      const venue = await Venue.findById(venueId);
      if (!venue) {
        return next(new AppError('Venue not found', 404));
      }
      
      // Check if the image exists in venue's images
      const imageExists = venue.images.some(img => img.public_id === decodedPublicId);
      if (!imageExists) {
        return next(new AppError('Image not found in venue images', 404));
      }
      
      // Set the cover image
      venue.coverImage = decodedPublicId;
      await venue.save();
      
      // Log with appropriate user identifier
      const userId = req.venue?.id || req.user?.id || 'anonymous';
      const userType = req.venue ? 'venue' : 'user';
  
      logger.info(`Cover image set successfully: ${decodedPublicId} by ${userType} ${userId}`);
  
      res.status(200).json({
        status: 'success',
        data: {
          message: 'Cover image set successfully',
          coverImage: decodedPublicId
        }
      });
    } catch (error) {
      logger.error(`Set cover image failed: ${error.message}`);
      next(error);
    }
  };

  // Set cover image for space
  exports.setSpaceCoverImage = async (req, res, next) => {
    try {
      const { publicId, spaceId } = req.body;
  
      if (!publicId) {
        return next(new AppError('Public ID is required', 400));
      }
      
      if (!spaceId) {
        return next(new AppError('Space ID is required', 400));
      }
      
      // Decode the public ID to handle forward slashes and other URL-encoded characters
      const decodedPublicId = decodeURIComponent(publicId);
      
      // Get venue from authentication
      const venueId = req.venue.id;
      const EventSpace = require('../models/EventSpace');
      
      // Find the space and verify it belongs to the authenticated venue
      const space = await EventSpace.findOne({ _id: spaceId, venueId: venueId });
      if (!space) {
        return next(new AppError('Space not found or does not belong to this venue', 404));
      }
      
      // Check if the image exists in space's gallery
      const imageExists = space.gallery.some(img => img.public_id === decodedPublicId);
      if (!imageExists) {
        return next(new AppError('Image not found in space gallery', 404));
      }
      
      // Set the cover image
      space.coverImage = decodedPublicId;
      await space.save();
      
      // Log with appropriate user identifier
      const userId = req.venue?.id || req.user?.id || 'anonymous';
      const userType = req.venue ? 'venue' : 'user';
  
      logger.info(`Space cover image set successfully: ${decodedPublicId} for space ${spaceId} by ${userType} ${userId}`);
  
      res.status(200).json({
        status: 'success',
        data: {
          message: 'Space cover image set successfully',
          coverImage: decodedPublicId
        }
      });
    } catch (error) {
      logger.error(`Set space cover image failed: ${error.message}`);
      next(error);
    }
  };
  
  // Delete photo
  exports.deletePhoto = async (req, res, next) => {
    try {
      const { publicId } = req.params;
  
      if (!publicId) {
        return next(new AppError('Public ID is required', 400));
      }
      
      // Decode the public ID to handle forward slashes and other URL-encoded characters
      const decodedPublicId = decodeURIComponent(publicId);
  
      const result = await deletePhoto(decodedPublicId);
      
      // Log with appropriate user identifier (venue or user)
      const userId = req.venue?.id || req.user?.id || 'anonymous';
      const userType = req.venue ? 'venue' : 'user';
  
      logger.info(`Photo deleted successfully: ${decodedPublicId} by ${userType} ${userId}`);
  
      res.status(200).json({
        status: 'success',
        data: {
          message: 'Photo deleted successfully',
          result
        }
      });
    } catch (error) {
      logger.error(`Photo deletion failed: ${error.message}`);
      next(error);
    }
  };
  
  // Get photo info
  exports.getPhotoInfo = async (req, res, next) => {
    try {
      const { publicId } = req.params;
  
      if (!publicId) {
        return next(new AppError('Public ID is required', 400));
      }
      
      // Decode the public ID to handle forward slashes and other URL-encoded characters
      const decodedPublicId = decodeURIComponent(publicId);
  
      const photoInfo = await getPhotoInfo(decodedPublicId);
  
      res.status(200).json({
        status: 'success',
        data: {
          photo: photoInfo
        }
      });
    } catch (error) {
      logger.error(`Get photo info failed: ${error.message}`);
      next(error);
    }
  };
  
  // Get responsive URLs for a photo
  exports.getResponsiveUrls = async (req, res, next) => {
    try {
      const { publicId } = req.params;
  
      if (!publicId) {
        return next(new AppError('Public ID is required', 400));
      }
      
      // Decode the public ID to handle forward slashes and other URL-encoded characters
      const decodedPublicId = decodeURIComponent(publicId);
  
      const urls = getResponsiveUrls(decodedPublicId);
  
      res.status(200).json({
        status: 'success',
        data: {
          urls
        }
      });
    } catch (error) {
      logger.error(`Get responsive URLs failed: ${error.message}`);
      next(error);
    }
  };
  
  // Upload profile picture
  exports.uploadProfilePicture = async (req, res, next) => {
    try {
      if (!req.files || !req.files.photo) {
        return next(new AppError('Please upload a photo', 400));
      }
  
      const file = req.files.photo;
  
      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
      if (!allowedTypes.includes(file.mimetype)) {
        return next(new AppError('Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed', 400));
      }
  
      // Validate file size (5MB max for profile pictures)
      const maxSize = 5 * 1024 * 1024; // 5MB
      if (file.size > maxSize) {
        return next(new AppError('File size too large. Maximum size is 5MB', 400));
      }
  
      // Upload to Cloudinary with profile picture specific settings
      const result = await uploadPhoto(file, 'profile-pictures', {
        transformation: [
          { width: 400, height: 400, crop: 'fill', gravity: 'face' },
          { quality: 'auto:good' },
          { fetch_format: 'auto' }
        ],
        context: {
          description: 'Profile picture',
          uploaded_by: req.user.id
        }
      });
  
      logger.info(`Profile picture uploaded successfully: ${result.public_id} by user ${req.user.id}`);
  
      res.status(200).json({
        status: 'success',
        data: {
          photo: result
        }
      });
    } catch (error) {
      logger.error(`Profile picture upload failed: ${error.message}`);
      next(error);
    }
  };
  
  // Upload court images
  exports.uploadCourtImages = async (req, res, next) => {
    try {
      if (!req.files || req.files.length === 0) {
        return next(new AppError('Please upload court images', 400));
      }
  
      const { courtId } = req.body;
      const files = Array.isArray(req.files) ? req.files : [req.files];
  
      // Validate files
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
      const maxSize = 10 * 1024 * 1024; // 10MB
  
      for (const file of files) {
        if (!allowedTypes.includes(file.mimetype)) {
          return next(new AppError(`Invalid file type for ${file.name}. Only JPEG, PNG, GIF, and WebP are allowed`, 400));
        }
        if (file.size > maxSize) {
          return next(new AppError(`File ${file.name} is too large. Maximum size is 10MB`, 400));
        }
      }
  
      // Upload to Cloudinary with court-specific settings
      const results = await uploadMultiplePhotos(files, 'court-images', {
        transformation: [
          { quality: 'auto:good' },
          { fetch_format: 'auto' }
        ],
        context: {
          description: 'Court images',
          court_id: courtId,
          uploaded_by: req.user.id
        }
      });
  
      logger.info(`${results.length} court images uploaded successfully for court ${courtId} by user ${req.user.id}`);
  
      res.status(200).json({
        status: 'success',
        data: {
          photos: results
        }
      });
    } catch (error) {
      logger.error(`Court images upload failed: ${error.message}`);
      next(error);
    }
  }; 