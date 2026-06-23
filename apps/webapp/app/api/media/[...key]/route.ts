import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import { readFile, stat } from 'fs/promises';
import { getRequestUser } from '@/lib/api-auth';

const MIME_TYPES: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  gif: 'image/gif',
  webp: 'image/webp',
  svg: 'image/svg+xml',
  pdf: 'application/pdf',
  mp4: 'video/mp4',
  mp3: 'audio/mpeg',
  ogg: 'audio/ogg',
  wav: 'audio/wav',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
};

export async function GET(request: NextRequest, { params }: { params: Promise<{ key: string[] }> }) {
  if (!getRequestUser(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { key } = await params;
    const fileKey = key.join('/');

    if (fileKey.includes('..') || fileKey.startsWith('/')) {
      return NextResponse.json({ error: 'Invalid path' }, { status: 400 });
    }

    const filePath = path.resolve(process.cwd(), fileKey);
    const uploadsDir = path.resolve(process.cwd(), 'uploads');

    if (!filePath.startsWith(uploadsDir)) {
      return NextResponse.json({ error: 'Invalid path' }, { status: 400 });
    }

    const fileStat = await stat(filePath);
    const fileBuffer = await readFile(filePath);

    const extension = path.extname(filePath).slice(1).toLowerCase();
    const contentType = MIME_TYPES[extension] || 'application/octet-stream';

    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': contentType,
        'Content-Length': fileStat.size.toString(),
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error) {
    console.error('Error serving media:', error);
    return NextResponse.json({ error: 'File not found' }, { status: 404 });
  }
}
