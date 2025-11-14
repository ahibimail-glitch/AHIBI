import { getApiUrl } from '@/config';

export interface CloudinaryPhoto {
  public_id: string;
  url: string;
  width: number;
  height: number;
  format: string;
  size: number;
  created_at: string;
}

export interface ResponsiveUrls {
  thumbnail: string;
  small: string;
  medium: string;
  large: string;
  original: string;
}

// Upload single photo
export const uploadPhoto = async (
  file: File,
  folder: string = 'ahibi',
  description?: string
): Promise<CloudinaryPhoto> => {
  const token = localStorage.getItem('token');
  if (!token) {
    throw new Error('Authentication required');
  }

  const formData = new FormData();
  formData.append('photo', file);
  formData.append('folder', folder);
  if (description) {
    formData.append('description', description);
  }

  const response = await fetch(getApiUrl('api/v1/upload/photo'), {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Upload failed');
  }

  const data = await response.json();
  return data.data.photo;
};

// Upload multiple photos
export const uploadMultiplePhotos = async (
  files: File[],
  folder: string = 'ahibi',
  description?: string
): Promise<CloudinaryPhoto[]> => {
  const token = localStorage.getItem('token');
  if (!token) {
    throw new Error('Authentication required');
  }

  const formData = new FormData();
  files.forEach((file) => {
    formData.append('photos', file);
  });
  formData.append('folder', folder);
  if (description) {
    formData.append('description', description);
  }

  const response = await fetch(getApiUrl('api/v1/upload/photos'), {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Upload failed');
  }

  const data = await response.json();
  return data.data.photos;
};

// Upload profile picture
export const uploadProfilePicture = async (file: File): Promise<CloudinaryPhoto> => {
  const token = localStorage.getItem('token');
  if (!token) {
    throw new Error('Authentication required');
  }

  const formData = new FormData();
  formData.append('photo', file);

  const response = await fetch(getApiUrl('api/v1/upload/profile-picture'), {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Upload failed');
  }

  const data = await response.json();
  return data.data.photo;
};

// Upload court images
export const uploadCourtImages = async (
  files: File[],
  courtId: string
): Promise<CloudinaryPhoto[]> => {
  const token = localStorage.getItem('token');
  if (!token) {
    throw new Error('Authentication required');
  }

  const formData = new FormData();
  files.forEach((file) => {
    formData.append('photos', file);
  });
  formData.append('courtId', courtId);

  const response = await fetch(getApiUrl('api/v1/upload/court-images'), {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Upload failed');
  }

  const data = await response.json();
  return data.data.photos;
};

// Delete photo
export const deletePhoto = async (publicId: string): Promise<void> => {
  const token = localStorage.getItem('token');
  if (!token) {
    throw new Error('Authentication required');
  }

  const response = await fetch(getApiUrl(`api/v1/upload/photo/${publicId}`), {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Delete failed');
  }
};

// Get photo info
export const getPhotoInfo = async (publicId: string): Promise<CloudinaryPhoto> => {
  const token = localStorage.getItem('token');
  if (!token) {
    throw new Error('Authentication required');
  }

  const response = await fetch(getApiUrl(`api/v1/upload/photo/${publicId}`), {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to get photo info');
  }

  const data = await response.json();
  return data.data.photo;
};

// Get responsive URLs
export const getResponsiveUrls = async (publicId: string): Promise<ResponsiveUrls> => {
  const token = localStorage.getItem('token');
  if (!token) {
    throw new Error('Authentication required');
  }

  const response = await fetch(getApiUrl(`api/v1/upload/photo/${publicId}/urls`), {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to get responsive URLs');
  }

  const data = await response.json();
  return data.data.urls;
};

// Utility function to validate file before upload
export const validateFile = (file: File, maxSize: number = 10 * 1024 * 1024): string | null => {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  
  if (!allowedTypes.includes(file.type)) {
    return 'Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed.';
  }
  
  if (file.size > maxSize) {
    return `File size too large. Maximum size is ${Math.round(maxSize / 1024 / 1024)}MB.`;
  }
  
  return null;
};

// Upload file to the server
interface UploadResponse {
  status: 'success' | 'error';
  data?: {
    photo: {
      url: string;
      public_id: string;
      width: number;
      height: number;
      format: string;
      resourceType: string;
      size?: number;
      created_at?: string;
    };
  };
  message?: string;
}

export const uploadFile = async (file: File): Promise<UploadResponse> => {
  try {
    const formData = new FormData();
    formData.append('photo', file);

    const response = await fetch(getApiUrl('api/upload'), {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      let message = 'Failed to upload file';
      try {
        const error = await response.json();
        message = error.message || message;
      } catch (_e) {
        // Non-JSON error response
        const text = await response.text();
        if (text) message = text;
      }
      throw new Error(message);
    }

    const result = await response.json();
    
    // Ensure the response has the expected structure
    if (result.status !== 'success' || !result.data?.photo) {
      throw new Error(result.message || 'Invalid response from server');
    }
    
    return result;
  } catch (error) {
    console.error('Upload error:', error);
    return {
      status: 'error',
      message: error instanceof Error ? error.message : 'Failed to upload file',
    };
  }
};

// Upload multiple files
export const uploadMultipleFiles = async (files: File[]): Promise<UploadResponse> => {
  try {
    const formData = new FormData();
    files.forEach((file) => {
      formData.append('photos', file);
    });

    const response = await fetch(getApiUrl('api/upload/multiple'), {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      let message = 'Failed to upload files';
      try {
        const error = await response.json();
        message = error.message || message;
      } catch (_e) {
        const text = await response.text();
        if (text) message = text;
      }
      throw new Error(message);
    }

    return await response.json();
  } catch (error) {
    console.error('Upload error:', error);
    return {
      status: 'error',
      message: error instanceof Error ? error.message : 'Failed to upload files',
    };
  }
};

// Utility function to create image preview
export const createImagePreview = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};