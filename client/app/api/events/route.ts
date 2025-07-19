import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get('category');
  const city = searchParams.get('city');
  const search = searchParams.get('search');
  const page = searchParams.get('page') || '1';
  const limit = searchParams.get('limit') || '20';

  const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
  const url = new URL(`${backendUrl}/api/events`);
  
  // Add query parameters
  if (category) url.searchParams.append('category', category);
  if (city) url.searchParams.append('city', city);
  if (search) url.searchParams.append('search', search);
  url.searchParams.append('page', page);
  url.searchParams.append('limit', limit);

  try {
    console.log('Fetching events from:', url.toString());
    
    const response = await fetch(url.toString(), {
      headers: {
        'Content-Type': 'application/json',
      },
      next: { revalidate: 60 }, // Cache for 60 seconds
      signal: AbortSignal.timeout(5000)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Backend returned error:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText
      });
      throw new Error(`Backend responded with ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    console.log('Successfully fetched events:', { 
      count: data.events?.length || 0,
      total: data.pagination?.total || 0
    });
    
    return NextResponse.json(data);
    
  } catch (error) {
    console.error('Error in events API route:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      url: url.toString()
    });
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch events',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}