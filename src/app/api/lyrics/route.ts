import { NextResponse } from 'next/server';

interface LrcLibResponse {
  id: number;
  trackName: string;
  artistName: string;
  albumName: string;
  duration: number;
  instrumental: boolean;
  plainLyrics: string | null;
  syncedLyrics: string | null;
}

function parseLrcToSegments(syncedLyrics: string) {
  const lines = syncedLyrics.split('\n');
  const segments: { start: number; end: number; text: string }[] = [];
  const regex = /\[(\d{2}):(\d{2}\.\d{2,3})\](.*)/;

  for (const line of lines) {
    const match = regex.exec(line);
    if (match) {
      const minutes = parseInt(match[1], 10);
      const seconds = parseFloat(match[2]);
      const text = match[3].trim();
      if (text) {
        const time = minutes * 60 + seconds;
        segments.push({ start: time, end: time + 5, text });
      }
    }
  }

  // Fix end times
  for (let i = 0; i < segments.length - 1; i++) {
    segments[i].end = segments[i + 1].start;
  }
  if (segments.length > 0) {
    segments[segments.length - 1].end = segments[segments.length - 1].start + 15;
  }

  return segments;
}

async function searchLrcLib(query: string): Promise<LrcLibResponse[]> {
  const url = new URL('https://lrclib.net/api/search');
  url.searchParams.append('q', query);

  const res = await fetch(url.toString(), {
    headers: { 'User-Agent': 'StarPlayer/1.0 (https://github.com/star-player)' },
    next: { revalidate: 3600 },
  });

  if (!res.ok) return [];
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

function cleanTitle(title: string) {
  // Remove common suffixes: (feat. ...), [Official MV], etc.
  return title
    .replace(/\s*[\[(].*?[\])]/g, '')
    .replace(/\s*ft\.?.*/i, '')
    .replace(/\s*feat\.?.*/i, '')
    .trim();
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { title, artist } = body;

    if (!title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    const cleanedTitle = cleanTitle(title);

    // Try multiple search strategies in order
    const strategies = [
      `${cleanedTitle} ${artist}`,
      cleanedTitle,
      `${title} ${artist}`,
      title,
    ].filter(Boolean);

    let results: LrcLibResponse[] = [];

    for (const query of strategies) {
      results = await searchLrcLib(query);
      if (results.length > 0) break;
    }

    if (results.length === 0) {
      return NextResponse.json(
        { error: `No lyrics found for "${title}"${artist ? ` by ${artist}` : ''}. The song may not be in the lyrics database yet.` },
        { status: 404 }
      );
    }

    // Prefer results with synced lyrics
    const syncedResult = results.find(r => r.syncedLyrics && !r.instrumental);
    const plainResult = results.find(r => r.plainLyrics && !r.instrumental);
    const target = syncedResult || plainResult || results[0];

    if (target.syncedLyrics) {
      const segments = parseLrcToSegments(target.syncedLyrics);
      if (segments.length > 0) {
        return NextResponse.json({ lyrics: segments, source: 'synced' });
      }
    }

    if (target.plainLyrics) {
      // Split plain lyrics into lines as best-effort (no timestamps)
      const lines = target.plainLyrics
        .split('\n')
        .map(l => l.trim())
        .filter(Boolean);

      const segments = lines.map((text, i) => ({
        start: i * 5,
        end: (i + 1) * 5,
        text,
      }));

      return NextResponse.json({ lyrics: segments, source: 'plain' });
    }

    return NextResponse.json(
      { error: 'Lyrics found but content is empty.' },
      { status: 404 }
    );
  } catch (error: any) {
    console.error('Error fetching lyrics:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch lyrics' },
      { status: 500 }
    );
  }
}
