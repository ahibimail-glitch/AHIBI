# Vercel Blob Setup Guide

This project uses Vercel Blob for file uploads in the venue documents section.

## Environment Variables

To use Vercel Blob, you need to set up the following environment variable:

### Required Environment Variable

Add to your `.env.local` file (for local development) or Vercel environment variables (for production):

```
BLOB_READ_WRITE_TOKEN=your_vercel_blob_token_here
```

## Getting Your Vercel Blob Token

1. Go to your Vercel dashboard
2. Navigate to your project settings
3. Go to the "Storage" section
4. Create a new Blob store or use an existing one
5. Copy the `BLOB_READ_WRITE_TOKEN` from the store settings

## File Upload Features

The venue documents section supports uploading:

- **Venue Images**: Multiple high-resolution images (PNG, JPG, GIF, WebP) up to 10MB each
- **Venue Video Tour**: Single video file (MP4, WebM, MOV) up to 100MB
- **Menu Cards**: Multiple images or PDFs up to 10MB each
- **Rate Card**: Single PDF file up to 10MB
- **Business License**: Multiple PDF or image files up to 10MB each

## API Route

The upload API route is located at:
- `/api/upload` - Handles file uploads to Vercel Blob

## Usage

Files are automatically uploaded to Vercel Blob when selected in the Documents & Media section of the venue dashboard. The uploaded file URLs are stored in the venue's documents field in the database.

