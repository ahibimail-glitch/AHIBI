const express = require('express');
const router = express.Router();
const heroImageController = require('../controllers/heroImageController');
const { protect, adminOnly } = require('../middlewares/auth');
const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');
const multer = require('multer');

// Configure multer storage
const storage = multer.memoryStorage();
const upload = multer({ 
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept only images
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Only image files are allowed'), false);
    }
    cb(null, true);
  }
});

// Routes - Public GET endpoints
router.get('/', heroImageController.getAllImages);
router.get('/:id', heroImageController.getImage);

// Admin-specific authentication middleware
const protectAdminRoute = async (req, res, next) => {
  try {
    let token;

    // Check if auth header exists and has the correct format
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer')
    ) {
      // Extract token from auth header
      token = req.headers.authorization.split(' ')[1];
    }

    // Check if token exists
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized to access this route'
      });
    }

    try {
      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Find admin in database
      const admin = await Admin.findById(decoded.id);

      if (!admin) {
        return res.status(404).json({
          success: false,
          message: 'Admin not found'
        });
      }

      // Attach admin to request
      req.user = admin;
      next();
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// Protected routes - require admin authentication
router.post(
  '/',
  protectAdminRoute, // Use admin-specific authentication
  upload.single('image'),
  heroImageController.validate('uploadImage'),
  heroImageController.uploadImage
);

router.put(
  '/:id',
  protectAdminRoute, // Use admin-specific authentication
  heroImageController.validate('updateImage'),
  heroImageController.updateImage
);

router.delete(
  '/:id',
  protectAdminRoute, // Use admin-specific authentication
  heroImageController.deleteImage
);

module.exports = router;
