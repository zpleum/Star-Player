import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';
import os from 'os';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const taskId = searchParams.get('taskId');

  if (!taskId) {
    return NextResponse.json({ progress: 0 });
  }

  const progressPath = path.join(os.tmpdir(), `star-player-progress-${taskId}.json`);

  try {
    if (fs.existsSync(progressPath)) {
      const data = fs.readFileSync(progressPath, 'utf-8');
      const parsed = JSON.parse(data);
      return NextResponse.json({ progress: parsed.progress || 0 });
    }
  } catch (err) {
    // Ignore errors
  }

  return NextResponse.json({ progress: 0 });
}