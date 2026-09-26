import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function PUT(request: Request) {
  try {
    const { categoryIds } = await request.json();
    
    if (!Array.isArray(categoryIds)) {
      return NextResponse.json({ error: 'Invalid data' }, { status: 400 });
    }

    // Update each category with its new orderIndex
    const updates = categoryIds.map((id, index) => 
      prisma.category.update({
        where: { id },
        data: { orderIndex: index }
      })
    );

    await prisma.$transaction(updates);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
