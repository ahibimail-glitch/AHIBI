const express = require('express');
const uploadController = require('../controllers/uploadController');

const upload = require('../middlewares/uploadMiddleware');
const venueAuth = require('../middlewares/venueAuth');

const router = express.Router();

// Upload single image
router.post('/',
    upload.single('photo'),
    uploadController.uploadPhoto
);

// Upload multiple images
router.post('/multiple',
    venueAuth,
    upload.array('photos', 10), // Max 10 files
    uploadController.uploadMultiplePhotos
);

// Delete image
router.delete('/:publicId',
    venueAuth,
    uploadController.deletePhoto
);

// Set cover image
router.put('/cover-image',
    venueAuth,
    uploadController.setCoverImage
);

// Set cover image for space
router.put('/space-cover-image',
    venueAuth,
    uploadController.setSpaceCoverImage
);

// Get photo info
router.get('/:publicId',
    uploadController.getPhotoInfo
);

// Get responsive URLs for a photo
router.get('/:publicId/urls',
    uploadController.getResponsiveUrls
);

// Upload a document (PDF)
router.post('/document',
    upload.pdf.single('document'),
    uploadController.uploadDocument
);

module.exports = router;
