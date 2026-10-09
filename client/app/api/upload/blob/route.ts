import { del } from '@vercel/blob';
import { NextRequest, NextResponse } from 'next/server';

export async function DELETE(request: NextRequest) {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json({ error: 'Blob storage is not configured' }, { status: 500 });
  }

  try {
    const body = await request.json();
    const url = body?.url as string | undefined;

    if (!url) {
      return NextResponse.json({ error: 'File URL is required' }, { status: 400 });
    }

    await del(url, { token: process.env.BLOB_READ_WRITE_TOKEN });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Blob delete error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Delete failed' },
      { status: 500 }
    );
  }
}
