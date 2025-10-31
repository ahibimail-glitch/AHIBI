/**
 * Upload an image file to the server
 * @param file - The image file to upload
 * @param type - Type of upload ('profile', 'cover', 'gallery')
 * @returns Promise<string> - The URL of the uploaded image
 */
export const uploadImage = async (file: File, type: 'profile' | 'cover' | 'gallery' = 'gallery'): Promise<string> => {
  try {
    const token = localStorage.getItem('artist_token');
    console.log('Starting image upload...');
    console.log('File details:', {
      name: file.name,
      type: file.type,
      size: file.size
    });

    if (!token) {
      throw new Error('Authentication token not found');
    }

    const formData = new FormData();
    formData.append('image', file);
    formData.append('type', type);

    console.log('Sending request to /api/artist/upload/image');
    const response = await fetch('/api/artist/upload/image', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formData
    });

    console.log('Upload response status:', response.status);
    
    const responseText = await response.text();
    console.log('Raw response:', responseText);
    
    let data;
    try {
      data = JSON.parse(responseText);
    } catch (e) {
      console.error('Failed to parse response as JSON:', e);
      throw new Error('Invalid response from server');
    }

    if (!response.ok) {
      console.error('Upload failed:', data);
      throw new Error(data.message || `Failed to upload image: ${response.statusText}`);
    }

    // Handle different response formats
    let imageUrl: string | undefined;
    
    // Case 1: Direct URL in response
    if (typeof data === 'string') {
      imageUrl = data;
    } 
    // Case 2: Nested in data.url or data.data.url
    else if (data?.data?.url) {
      imageUrl = data.data.url;
    } 
    else if (data?.url) {
      imageUrl = data.url;
    }
    // Case 3: Cloudinary response format
    else if (data?.secure_url) {
      imageUrl = data.secure_url;
    }
    // Case 4: Server response format: { success: true, data: { url: ... } }
    else if (data?.data && typeof data.data === 'object') {
      console.log('Found data.data object:', data.data);
      // Check for common URL fields in the data object
      imageUrl = data.data.url || data.data.imageUrl || data.data.photoUrl || data.data.image_url;
      
      // If no URL found, check if data itself is a string URL
      if (!imageUrl && typeof data.data === 'string') {
        imageUrl = data.data;
      }
    }

    console.log('Extracted image URL:', imageUrl);

    if (!imageUrl) {
      console.error('No image URL found in response:', data);
      throw new Error('No URL returned from image upload');
    }

    return imageUrl;
  } catch (error) {
    console.error('Error in uploadImage:', error);
    throw error;
  }
};

/**
 * Validate image file before upload
 * @param file - The file to validate
 * @returns boolean - Whether the file is valid
 */
export const validateImageFile = (file: File): { valid: boolean; error?: string } => {
  // Check file type
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
  if (!allowedTypes.includes(file.type)) {
    return { valid: false, error: 'Please select a valid image file (JPEG, PNG, or WebP)' };
  }

  // Check file size (max 5MB)
  const maxSize = 5 * 1024 * 1024; // 5MB
  if (file.size > maxSize) {
    return { valid: false, error: 'Image size must be less than 5MB' };
  }

  return { valid: true };
};
