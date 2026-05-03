import { NextResponse } from 'next/server';
import { create } from 'youtube-dl-exec';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs';
import os from 'os';

// Resolve the binary path correctly for both Windows and Linux
const isWin = process.platform === 'win32';
const ytDlpPath = path.join(process.cwd(), 'node_modules', 'youtube-dl-exec', 'bin', isWin ? 'yt-dlp.exe' : 'yt-dlp');
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
    const ffmpegBin = isWin ? 'ffmpeg.exe' : 'ffmpeg';
    const ffprobeBin = isWin ? 'ffprobe.exe' : 'ffprobe';

    const destFfmpeg = path.join(ffmpegDir, ffmpegBin);
    const destFfprobe = path.join(ffmpegDir, ffprobeBin);
    
    const ffmpegPath = path.join(process.cwd(), 'node_modules', 'ffmpeg-static', ffmpegBin);
    
    let ffprobePath = '';
    if (isWin) {
      ffprobePath = path.join(process.cwd(), 'node_modules', 'ffprobe-static', 'bin', 'win32', 'x64', 'ffprobe.exe');
    } else {
      // For Linux/macOS, ffprobe-static usually puts it in the root of the package or a 'bin' folder
      ffprobePath = path.join(process.cwd(), 'node_modules', 'ffprobe-static', ffprobeBin);
      // Fallback check
      if (!fs.existsSync(ffprobePath)) {
        ffprobePath = path.join(process.cwd(), 'node_modules', 'ffprobe-static', 'bin', process.platform, process.arch, ffprobeBin);
      }
    }
    
    if (fs.existsSync(ffmpegPath) && !fs.existsSync(destFfmpeg)) fs.copyFileSync(ffmpegPath, destFfmpeg);
    if (fs.existsSync(ffprobePath) && !fs.existsSync(destFfprobe)) fs.copyFileSync(ffprobePath, destFfprobe);

    // Set permissions for Linux
    if (!isWin) {
      try {
        if (fs.existsSync(destFfmpeg)) fs.chmodSync(destFfmpeg, '755');
        if (fs.existsSync(destFfprobe)) fs.chmodSync(destFfprobe, '755');
        if (fs.existsSync(ytDlpPath)) fs.chmodSync(ytDlpPath, '755');
      } catch (e) {
        console.warn('Failed to set executable permissions:', e);
      }
    }

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