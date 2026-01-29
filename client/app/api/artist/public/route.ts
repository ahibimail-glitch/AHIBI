import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
  const url = new URL(`${backendUrl}/api/artist/public`);

  // Forward all query parameters (genre, city, sortBy, page, limit, etc.)
  searchParams.forEach((value, key) => {
    if (value !== null && value !== undefined && value !== '') {
      url.searchParams.append(key, value);
    }
  });

  try {
    const response = await fetch(url.toString(), {
      headers: {
        'Content-Type': 'application/json',
      },
      next: { revalidate: 60 },
      signal: AbortSignal.timeout(5000),
    });

    const text = await response.text();

    if (!response.ok) {
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to fetch artists',
          details: text,
        },
        { status: response.status }
      );
    }

    // Response is JSON from backend
    return new NextResponse(text, {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch artists',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
