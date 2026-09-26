import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const { name } = await request.json();

    if (!name || typeof name !== 'string') {
      return NextResponse.json({ error: 'Folder name is required' }, { status: 400 });
    }

    const slug = name.toLowerCase().trim().replace(/[\s\W-]+/g, '-');

    const category = await prisma.category.upsert({
      where: { name: name.trim() },
      update: {},
      create: {
        name: name.trim(),
        slug
      }
    });

    return NextResponse.json(category);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
