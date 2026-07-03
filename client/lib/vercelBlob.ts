/**
 * Utility functions for uploading files to Vercel Blob
 */

import { upload } from '@vercel/blob/client';

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

const MULTIPART_THRESHOLD_BYTES = 4 * 1024 * 1024;

async function compressImageIfNeeded(
  file: File,
  maxWidth = 1920,
  quality = 0.85
): Promise<File> {
  if (!file.type.startsWith('image/') || file.type === 'image/gif') {
    return file;
  }

  if (file.size < 500 * 1024) {
    return file;
  }

  return new Promise((resolve) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      let { width, height } = img;
      if (width <= maxWidth && file.size < 1024 * 1024) {
        resolve(file);
        return;
      }

      if (width > maxWidth) {
        height = Math.round((height * maxWidth) / width);
        width = maxWidth;
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(file);
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            resolve(file);
            return;
          }

          const compressedName = file.name.replace(/\.[^.]+$/, '.jpg');
          resolve(new File([blob], compressedName, { type: 'image/jpeg' }));
        },
        'image/jpeg',
        quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(file);
    };

    img.src = objectUrl;
  });
}

function buildPathname(
  folder: string,
  documentType: 'image' | 'video' | 'document',
  file: File
): string {
  const timestamp = Date.now();
  const randomString = Math.random().toString(36).substring(2, 15);
  const fileExtension = file.name.split('.').pop() || 'bin';
  return `${folder}/${documentType}/${timestamp}-${randomString}.${fileExtension}`;
}

/**
 * Upload a file directly from the browser to Vercel Blob (fast path).
 */
export async function uploadToVercelBlob(
  file: File,
  folder: string = 'venues',
  documentType: 'image' | 'video' | 'document' = 'image'
): Promise<UploadResponse> {
  const preparedFile =
    documentType === 'image' ? await compressImageIfNeeded(file) : file;
  const pathname = buildPathname(folder, documentType, preparedFile);

  try {
    const blob = await upload(pathname, preparedFile, {
      access: 'public',
      handleUploadUrl: '/api/upload',
      contentType: preparedFile.type || undefined,
      multipart: preparedFile.size > MULTIPART_THRESHOLD_BYTES,
    });

    return {
      success: true,
      url: blob.url,
      pathname: blob.pathname,
      size: preparedFile.size,
      contentType: preparedFile.type,
    };
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : 'Upload failed');
  }
}

/**
 * Upload multiple files to Vercel Blob
 */
export async function uploadMultipleToVercelBlob(
  files: File[],
  folder: string = 'venues',
  documentType: 'image' | 'video' | 'document' = 'image'
): Promise<UploadResponse[]> {
  const uploadPromises = files.map((file) =>
    uploadToVercelBlob(file, folder, documentType)
  );

  return Promise.all(uploadPromises);
}

/**
 * Upload an event CRM file (documents, maps, schedules, etc.)
 */
export async function uploadEventCrmFile(
  file: File,
  eventId: string
): Promise<UploadResponse> {
  const timestamp = Date.now();
  const randomString = Math.random().toString(36).substring(2, 15);
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const pathname = `event-files/${eventId}/${timestamp}-${randomString}-${safeName}`;

  const blob = await upload(pathname, file, {
    access: 'public',
    handleUploadUrl: '/api/upload',
    contentType: file.type || undefined,
    multipart: file.size > MULTIPART_THRESHOLD_BYTES,
  });

  return {
    success: true,
    url: blob.url,
    pathname: blob.pathname,
    size: file.size,
    contentType: file.type,
  };
}
