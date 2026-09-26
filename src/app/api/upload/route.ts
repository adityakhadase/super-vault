import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { supabase } from '@/lib/supabase';
import crypto from 'crypto';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Save to Supabase 'vault-public' bucket
    const ext = file.name.split('.').pop() || 'jpg';
    const id = crypto.randomUUID();
    const fileName = `${id}.${ext}`;
    
    const { data, error } = await supabase.storage
      .from('vault-public')
      .upload(fileName, buffer, {
        contentType: file.type || 'application/octet-stream',
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      console.error('Supabase upload error:', error);
      return NextResponse.json({ error: 'Failed to upload to Supabase' }, { status: 500 });
    }

    const { data: publicUrlData } = supabase.storage
      .from('vault-public')
      .getPublicUrl(fileName);

    const fileUrl = publicUrlData.publicUrl;

    const targetCategoryId = formData.get('categoryId') as string;
    
    // Create Item in DB
    let finalCategoryId = targetCategoryId;
    if (!finalCategoryId) {
      let category = await prisma.category.findUnique({ where: { name: 'Local Files' } });
      if (!category) {
        category = await prisma.category.create({ data: { name: 'Local Files', slug: 'local-files' } });
      }
      finalCategoryId = category.id;
    }

    // Determine basic file type
    const fileTypeStr = file.type || '';
    let platformType = 'file';
    let fileType = ext.toLowerCase();

    if (fileTypeStr.startsWith('image/')) platformType = 'image';
    else if (fileTypeStr.startsWith('video/')) platformType = 'video';
    else if (fileTypeStr.includes('pdf')) platformType = 'pdf';
    else if (fileTypeStr.includes('zip') || fileTypeStr.includes('tar') || fileTypeStr.includes('compressed')) platformType = 'archive';
    else if (['js', 'ts', 'jsx', 'tsx', 'py', 'java', 'c', 'cpp', 'cs', 'html', 'css', 'json', 'md'].includes(ext)) platformType = 'code';
    
    const item = await prisma.item.create({
      data: {
        url: fileUrl,
        title: file.name,
        thumbnailUrl: platformType === 'image' ? fileUrl : null, // only use url as thumb if it's an image
        platform: platformType,
        isLocal: true,
        fileSize: file.size,
        fileType: fileType,
        categoryId: finalCategoryId
      }
    });

    return NextResponse.json(item);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
