import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { supabase } from '@/lib/supabase';

export async function GET() {
  try {
    const media = await prisma.secretMedia.findMany({
      orderBy: { createdAt: 'desc' }
    });
    return NextResponse.json(media);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    
    const ext = file.name.split('.').pop() || 'bin';
    const type = file.type.startsWith('video/') ? 'video' : 'image';
    
    const dbRecord = await prisma.secretMedia.create({
      data: {
        type,
        fileUrl: '', // Will update next
      }
    });

    const fileName = `${dbRecord.id}.${ext}`;
    
    const { error } = await supabase.storage
      .from('vault-secret')
      .upload(fileName, buffer, {
        contentType: file.type || 'application/octet-stream',
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      console.error('Supabase secret upload error:', error);
      // Clean up DB record if upload fails
      await prisma.secretMedia.delete({ where: { id: dbRecord.id } });
      return NextResponse.json({ error: 'Failed to upload to Supabase' }, { status: 500 });
    }

    const updated = await prisma.secretMedia.update({
      where: { id: dbRecord.id },
      data: { fileUrl: fileName }
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
