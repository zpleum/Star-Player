import { NextResponse } from 'next/server';
import { create } from 'youtube-dl-exec';
import path from 'path';

// Resolve the binary path correctly in Next.js
const ytDlpPath = path.join(process.cwd(), 'node_modules', 'youtube-dl-exec', 'bin', 'yt-dlp.exe');
const youtubedl = create(ytDlpPath);

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get('url');

  if (!url) {
    return NextResponse.json({ error: 'URL is required' }, { status: 400 });
  }

  try {
    const info = await youtubedl(url, {
      dumpJson: true,
      noWarnings: true,
      callHome: false,
      noCheckCertificates: true,
      preferFreeFormats: true,
      youtubeSkipDashManifest: true,
      noPlaylist: true,
    } as any);

    return NextResponse.json({
      title: (info as any).title,
      thumbnail: (info as any).thumbnail,
      duration: (info as any).duration,
    });
  } catch (error) {
    console.error('youtube-dl error:', error);
    return NextResponse.json({ error: 'Failed to fetch video info' }, { status: 500 });
  }
}
