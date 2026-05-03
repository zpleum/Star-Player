import { NextResponse } from 'next/server';
import { create } from 'youtube-dl-exec';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs';
import os from 'os';

// Resolve the binary path correctly in Next.js
const ytDlpPath = path.join(process.cwd(), 'node_modules', 'youtube-dl-exec', 'bin', 'yt-dlp.exe');
const youtubedl = create(ytDlpPath);

const execAsync = promisify(exec);

export async function POST(request: Request) {
  try {
    const { url, taskId } = await request.json();

    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    const tempId = Math.random().toString(36).substring(7);
    const tempDir = os.tmpdir();
    const outputPath = path.join(tempDir, `star-player-${tempId}.%(ext)s`);

    const ffmpegDir = path.join(tempDir, 'star-player-ffmpeg');
    if (!fs.existsSync(ffmpegDir)) {
      fs.mkdirSync(ffmpegDir, { recursive: true });
    }
    const destFfmpeg = path.join(ffmpegDir, 'ffmpeg.exe');
    const destFfprobe = path.join(ffmpegDir, 'ffprobe.exe');
    
    const ffmpegPath = path.join(process.cwd(), 'node_modules', 'ffmpeg-static', 'ffmpeg.exe');
    const ffprobePath = path.join(process.cwd(), 'node_modules', 'ffprobe-static', 'bin', 'win32', 'x64', 'ffprobe.exe');
    
    if (!fs.existsSync(destFfmpeg)) fs.copyFileSync(ffmpegPath, destFfmpeg);
    if (!fs.existsSync(destFfprobe)) fs.copyFileSync(ffprobePath, destFfprobe);

    // Use yt-dlp to download and extract audio
    const ytOptions = {
      extractAudio: true,
      audioFormat: 'mp3',
      audioQuality: 0,
      output: outputPath,
      noWarnings: true,
      callHome: false,
      noCheckCertificates: true,
      noPlaylist: true,
      ffmpegLocation: ffmpegDir,
    };

    if (taskId) {
      const progressPath = path.join(tempDir, `star-player-progress-${taskId}.json`);
      const subprocess = youtubedl.exec(url, ytOptions as any);
      
      subprocess.stdout?.on('data', (data: Buffer) => {
        const text = data.toString();
        const match = text.match(/\[download\]\s+([\d\.]+)%/);
        if (match && match[1]) {
          const progress = parseFloat(match[1]);
          fs.writeFileSync(progressPath, JSON.stringify({ progress }));
        }
      });

      await subprocess;
      
      if (fs.existsSync(progressPath)) {
        try { fs.unlinkSync(progressPath); } catch (e) {}
      }
    } else {
      await youtubedl(url, ytOptions as any);
    }

    // The actual output file will have .mp3 extension
    const mp3Path = path.join(tempDir, `star-player-${tempId}.mp3`);
    
    // Check if file exists
    if (!fs.existsSync(mp3Path)) {
        throw new Error('Downloaded file not found');
    }

    // Read the file
    const fileBuffer = fs.readFileSync(mp3Path);

    // Clean up
    try {
      fs.unlinkSync(mp3Path);
    } catch (e) {
      console.error('Failed to cleanup temp file:', e);
    }

    // Send the file back to the client
    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Disposition': 'attachment; filename="audio.mp3"',
      },
    });
  } catch (error) {
    console.error('Download error:', error);
    return NextResponse.json({ error: 'Failed to download audio' }, { status: 500 });
  }
}