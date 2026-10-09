const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const ApiResponse = require('../utils/apiResponse');

// Configure storage
const storage = multer.memoryStorage();

// File filters
const imageFileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed.'), false);
  }
};

const pdfFileFilter = (req, file, cb) => {
  const allowedTypes = ['application/pdf'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only PDF is allowed.'), false);
  }
};

// Configure multer
const upload = multer({
  storage: storage,
  fileFilter: imageFileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
});

// Separate multer instance for PDFs (larger size limit)
const uploadPdf = multer({
  storage: storage,
  fileFilter: pdfFileFilter,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB limit
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
  // Specific helpers
  image: {
    single: (fieldName) => [upload.single(fieldName), handleMulterErrors],
    array: (fieldName, maxCount) => [upload.array(fieldName, maxCount), handleMulterErrors],
  },
  pdf: {
    single: (fieldName) => [uploadPdf.single(fieldName), handleMulterErrors],
  },
  upload,
};
