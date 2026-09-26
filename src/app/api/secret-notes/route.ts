import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const notes = await prisma.secretNote.findMany({ orderBy: { updatedAt: 'desc' } });
    return NextResponse.json(notes);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json();

    let note;
    if (data.id) {
      note = await prisma.secretNote.update({
        where: { id: data.id },
        data: { title: data.title, content: data.content }
      });
    } else {
      note = await prisma.secretNote.create({
        data: { title: data.title || 'New Note', content: data.content || '' }
      });
    }

    return NextResponse.json(note);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
