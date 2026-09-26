import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { supabase } from '@/lib/supabase';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const media = await prisma.secretMedia.findUnique({
      where: { id }
    });

    if (!media) {
      return new NextResponse('Not found', { status: 404 });
    }

    // Generate a short-lived signed URL for the private bucket
    const { data, error } = await supabase.storage
      .from('vault-secret')
      .createSignedUrl(media.fileUrl, 60 * 60); // 1 hour expiry

    if (error || !data) {
      console.error('Supabase signed URL error:', error);
      return new NextResponse('File not accessible', { status: 500 });
    }

    // Redirect the browser to the securely signed Supabase URL
    return NextResponse.redirect(data.signedUrl);
  } catch (error) {
    console.error(error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    
    const media = await prisma.secretMedia.findUnique({
      where: { id }
    });

    if (media) {
      // Remove from Supabase
      const { error } = await supabase.storage
        .from('vault-secret')
        .remove([media.fileUrl]);
        
      if (error) console.error('Supabase delete error:', error);

      await prisma.secretMedia.delete({
        where: { id }
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
