const HeroImage = require('../models/heroImage');
const { uploadPhoto, deletePhoto } = require('../utils/cloudinary');
const { body, validationResult } = require('express-validator');

// Validation rules
exports.validate = (method) => {
  switch (method) {
    case 'uploadImage': {
      return [
        body('title').optional().trim().escape(),
        body('description').optional().trim().escape(),
        body('order').optional().isNumeric().toInt(),
        body('active').optional().isBoolean().toBoolean(),
      ];
    }
    case 'updateImage': {
      return [
        body('title').optional().trim().escape(),
        body('description').optional().trim().escape(),
        body('order').optional().isNumeric().toInt(),
        body('active').optional().isBoolean().toBoolean(),
      ];
    }
  }
};

// Upload hero image
exports.uploadImage = async (req, res) => {
  try {
    // Validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    // Check if file exists
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Please upload an image file'
      });
    }

    // Upload to cloudinary
    const uploadResult = await uploadPhoto(req.file, 'ahibi/hero');

    // Get user ID from the authenticated user
    const userId = req.user ? req.user._id : null;

    // Create new hero image record
    const heroImage = new HeroImage({
      title: req.body.title || '',
      description: req.body.description || '',
      public_id: uploadResult.public_id,
      url: uploadResult.url,
      width: uploadResult.width,
      height: uploadResult.height,
      order: req.body.order || 0,
      active: req.body.active !== undefined ? req.body.active : true,
      uploadedBy: userId // Track who uploaded the image
    });

    await heroImage.save();

    return res.status(201).json({
      success: true,
      data: heroImage
    });
  } catch (error) {
    console.error('Error uploading hero image:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to upload image',
      error: error.message
    });
  }
};

// Get all hero images
exports.getAllImages = async (req, res) => {
  try {
    // Get query parameters for sorting
    const { active } = req.query;
    
    // Build filter object
    const filter = {};
    if (active !== undefined) {
      filter.active = active === 'true';
    }

    // Get all hero images sorted by order
    const heroImages = await HeroImage.find(filter).sort({ order: 1, createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: heroImages.length,
      data: heroImages
    });
  } catch (error) {
    console.error('Error getting hero images:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve hero images',
      error: error.message
    });
  }
};

// Get single hero image
exports.getImage = async (req, res) => {
  try {
    const heroImage = await HeroImage.findById(req.params.id);

    if (!heroImage) {
      return res.status(404).json({
        success: false,
        message: 'Hero image not found'
      });
    }

    return res.status(200).json({
      success: true,
      data: heroImage
    });
  } catch (error) {
    console.error('Error getting hero image:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve hero image',
      error: error.message
    });
  }
};

// Update hero image
exports.updateImage = async (req, res) => {
  try {
    // Validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const updateData = {
      ...(req.body.title !== undefined && { title: req.body.title }),
      ...(req.body.description !== undefined && { description: req.body.description }),
      ...(req.body.order !== undefined && { order: req.body.order }),
      ...(req.body.active !== undefined && { active: req.body.active }),
    };

    const heroImage = await HeroImage.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!heroImage) {
      return res.status(404).json({
        success: false,
        message: 'Hero image not found'
      });
    }

    return res.status(200).json({
      success: true,
      data: heroImage
    });
  } catch (error) {
    console.error('Error updating hero image:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update hero image',
      error: error.message
    });
  }
};

// Delete hero image
exports.deleteImage = async (req, res) => {
  try {
    const heroImage = await HeroImage.findById(req.params.id);

    if (!heroImage) {
      return res.status(404).json({
        success: false,
        message: 'Hero image not found'
      });
    }

    // Delete from cloudinary
    await deletePhoto(heroImage.public_id);

    // Delete from database
    await HeroImage.findByIdAndDelete(req.params.id);

    return res.status(200).json({
      success: true,
      message: 'Hero image deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting hero image:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete hero image',
      error: error.message
    });
  }
};
