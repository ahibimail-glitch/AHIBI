const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const ApiResponse = require('../utils/apiResponse');

// Configure storage
const storage = multer.memoryStorage();

// File filter to allow only images
const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed.'), false);
  }
};

// Configure multer
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
});

// Middleware to handle multer errors
const handleMulterErrors = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    // A Multer error occurred when uploading
    return ApiResponse.badRequest(res, `Upload error: ${err.message}`);
  } else if (err) {
    // An unknown error occurred
    return ApiResponse.serverError(res, `Server error: ${err.message}`);
  }
  // No errors, proceed to next middleware
  next();
};

module.exports = {
  single: (fieldName) => [upload.single(fieldName), handleMulterErrors],
  array: (fieldName, maxCount) => [upload.array(fieldName, maxCount), handleMulterErrors],
  fields: (fields) => [upload.fields(fields), handleMulterErrors],
  none: () => [upload.none(), handleMulterErrors],
  upload,
};
