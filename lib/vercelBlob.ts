/**
 * Utility functions for uploading files to Vercel Blob
 */

export interface UploadResponse {
  success: boolean;
  url: string;
  pathname: string;
  size: number;
  contentType: string;
}

export interface UploadError {
  error: string;
}

/**
 * Upload a file to Vercel Blob
 * @param file - The file to upload
 * @param folder - The folder path (e.g., 'venues', 'documents')
 * @param documentType - Type of document: 'image', 'video', or 'document'
 * @returns Promise with upload response
 */
export async function uploadToVercelBlob(
  file: File,
  folder: string = 'venues',
  documentType: 'image' | 'video' | 'document' = 'image'
): Promise<UploadResponse> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('folder', folder);
  formData.append('documentType', documentType);

  const response = await fetch('/api/upload', {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const error: UploadError = await response.json();
    throw new Error(error.error || 'Upload failed');
  }

  const data: UploadResponse = await response.json();
  return data;
}

/**
 * Upload multiple files to Vercel Blob
 * @param files - Array of files to upload
 * @param folder - The folder path
 * @param documentType - Type of document
 * @returns Promise with array of upload responses
 */
export async function uploadMultipleToVercelBlob(
  files: File[],
  folder: string = 'venues',
  documentType: 'image' | 'video' | 'document' = 'image'
): Promise<UploadResponse[]> {
  const uploadPromises = files.map(file => 
    uploadToVercelBlob(file, folder, documentType)
  );
  
  return Promise.all(uploadPromises);
}

