import { put } from '@vercel/blob';
import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import { NextRequest, NextResponse } from 'next/server';

const IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
const VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime'];
const DOC_TYPES = ['application/pdf'];

function getUploadLimits(pathname: string) {
  if (pathname.includes('/video/')) {
    return {
      allowedContentTypes: VIDEO_TYPES,
      maximumSizeInBytes: 100 * 1024 * 1024,
    };
  }

  if (pathname.includes('/document/')) {
    return {
      allowedContentTypes: DOC_TYPES,
      maximumSizeInBytes: 10 * 1024 * 1024,
    };
  }

  return {
    allowedContentTypes: IMAGE_TYPES,
    maximumSizeInBytes: 10 * 1024 * 1024,
  };
}

export async function POST(request: NextRequest) {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    console.error('BLOB_READ_WRITE_TOKEN is not configured');
    return NextResponse.json(
      {
        error:
          'File upload service is not configured. Please set BLOB_READ_WRITE_TOKEN environment variable.',
      },
      { status: 500 }
    );
  }

  const contentType = request.headers.get('content-type') || '';

  // Fast path: browser uploads directly to Vercel Blob using a short-lived token.
  if (contentType.includes('application/json')) {
    try {
      const body = (await request.json()) as HandleUploadBody;

      const jsonResponse = await handleUpload({
        body,
        request,
        token: process.env.BLOB_READ_WRITE_TOKEN,
        onBeforeGenerateToken: async (pathname) => getUploadLimits(pathname),
      });

      return NextResponse.json(jsonResponse);
    } catch (error) {
      console.error('Client upload error:', error);
      return NextResponse.json(
        { error: error instanceof Error ? error.message : 'Upload failed' },
        { status: 400 }
      );
    }
  }

  // Legacy path: server receives the full file then uploads to Blob.
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const folder = (formData.get('folder') as string) || 'venues';
    const documentType = (formData.get('documentType') as string) || 'image';

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const limits = getUploadLimits(`${folder}/${documentType}/placeholder`);
    if (file.size > limits.maximumSizeInBytes) {
      return NextResponse.json(
        {
          error: `File size too large. Maximum size is ${Math.round(
            limits.maximumSizeInBytes / (1024 * 1024)
          )}MB`,
        },
        { status: 400 }
      );
    }

    if (
      limits.allowedContentTypes.length > 0 &&
      file.type &&
      !limits.allowedContentTypes.includes(file.type)
    ) {
      return NextResponse.json(
        { error: `Invalid file type. Allowed types: ${limits.allowedContentTypes.join(', ')}` },
        { status: 400 }
      );
    }

    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    const fileExtension = file.name.split('.').pop();
    const filename = `${folder}/${documentType}/${timestamp}-${randomString}.${fileExtension}`;

    const blob = await put(filename, file, {
      access: 'public',
      addRandomSuffix: false,
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });

    return NextResponse.json({
      success: true,
      url: blob.url,
      pathname: blob.pathname,
      size: file.size,
      contentType: file.type,
    });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Upload failed' },
      { status: 500 }
    );
  }
}
