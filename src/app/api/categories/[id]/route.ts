import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { name } = await request.json();

    if (!name || typeof name !== 'string') {
      return NextResponse.json({ error: 'Folder name is required' }, { status: 400 });
    }

    const slug = name.toLowerCase().trim().replace(/[\s\W-]+/g, '-');

    const category = await prisma.category.update({
      where: { id },
      data: { name: name.trim(), slug }
    });

    return NextResponse.json(category);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    
    // Check if the category is a secret/protected folder
    const category = await prisma.category.findUnique({
      where: { id },
      select: { isSecret: true }
    });
    
    if (!category) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }
    
    if (category.isSecret) {
      return NextResponse.json({ error: 'Cannot delete a protected secure vault folder.' }, { status: 403 });
    }

    // Delete all items in the category first manually.
    await prisma.item.deleteMany({
      where: { categoryId: id }
    });

    await prisma.category.delete({
      where: { id }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
