const express = require('express');
const uploadController = require('../controllers/uploadController');

const upload = require('../middlewares/uploadMiddleware');

const router = express.Router();

// Upload single image
router.post('/',
    upload.single('photo'),
    uploadController.uploadPhoto
);

// Upload multiple images
router.post('/multiple',
    upload.array('photos', 10), // Max 10 files
    uploadController.uploadMultiplePhotos
);

// Delete image
router.delete('/:publicId',
    uploadController.deletePhoto
);

// Get photo info
router.get('/:publicId',

    uploadController.getPhotoInfo
);

// Get responsive URLs for a photo
router.get('/:publicId/urls',

    uploadController.getResponsiveUrls
);

module.exports = router;
