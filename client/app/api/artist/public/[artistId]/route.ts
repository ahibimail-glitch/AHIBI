import { NextResponse } from 'next/server';

export async function GET(
  _request: Request,
  context: { params: { artistId: string } }
) {
  const { artistId } = context.params;

  const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
  const url = new URL(`${backendUrl}/api/artist/public/${artistId}`);

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
          error: 'Failed to fetch artist',
          details: text,
        },
        { status: response.status }
      );
    }

    return new NextResponse(text, {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch artist',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
