import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { title, artist } = await req.json();

    if (!title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    // Clean title for better search
    const cleanTitle = title.replace(/\s*[\[(].*?[\])]/g, '').trim();
    const query = artist && artist !== 'Unknown Artist' && artist !== 'YouTube'
      ? `${artist} ${cleanTitle}`
      : cleanTitle;

    const url = new URL('https://itunes.apple.com/search');
    url.searchParams.append('term', query);
    url.searchParams.append('entity', 'song');
    url.searchParams.append('limit', '1');

    const res = await fetch(url.toString());
    if (!res.ok) {
      throw new Error('iTunes API failed');
    }

    const data = await res.json();
    if (data.results && data.results.length > 0) {
      const track = data.results[0];
      // Get higher resolution artwork
      const artworkUrl = track.artworkUrl100.replace('100x100bb.jpg', '600x600bb.jpg');
      return NextResponse.json({ artworkUrl });
    }

    return NextResponse.json({ error: 'No artwork found' }, { status: 404 });
  } catch (error: any) {
    console.error('Cover art search failed:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
