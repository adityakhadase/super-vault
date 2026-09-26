import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const { code } = await request.json();
    
    let config = await prisma.vaultConfig.findUnique({ where: { id: 'global' } });
    if (code !== config?.secretFolderCode) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let secretCategory = await prisma.category.findFirst({
      where: { isSecret: true },
      include: { items: { orderBy: { createdAt: 'desc' } } }
    });

    if (!secretCategory) {
      secretCategory = await prisma.category.create({
        data: {
          name: 'Secret Vault',
          slug: 'secret-vault',
          isSecret: true
        },
        include: { items: true }
      });
    }

    return NextResponse.json(secretCategory);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
