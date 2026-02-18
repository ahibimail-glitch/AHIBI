/**
 * Configuration for API URLs and other environment-specific settings
 */

/**
 * Get the full API URL for a given path
 * @param path - API path (e.g., 'api/events')
 * @returns Full URL string
 */
export const getApiUrl = (path: string): string => {
  // Remove leading/trailing slashes for consistency
  const cleanPath = path.replace(/^\/+|\/+$/g, '');
  
  // Use NEXT_PUBLIC_API_URL from environment variables or default to local development URL
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
  
  // Combine base URL with /api prefix and path
  return `${baseUrl}/api/${cleanPath}`;
};

/**
 * Default configuration for file uploads
 */
export const uploadConfig = {
  // Maximum file size in bytes (10MB)
  maxFileSize: 10 * 1024 * 1024,
  // Allowed file types
  allowedFileTypes: ['image/jpeg', 'image/png', 'image/webp'],
  // Maximum number of files that can be uploaded at once
  maxFiles: 10,
};

/**
 * Common error messages
 */
export const errorMessages = {
  fileTooLarge: 'File is too large. Maximum size is 10MB.',
  invalidFileType: 'Invalid file type. Please upload a JPG, PNG, or WebP image.',
  uploadFailed: 'Failed to upload file. Please try again.',
  authenticationRequired: 'Authentication required. Please log in.',
};

export default {
  getApiUrl,
  upload: uploadConfig,
  errors: errorMessages,
};
