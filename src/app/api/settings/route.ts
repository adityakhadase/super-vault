import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const data = await request.json();
    
    let config = await prisma.vaultConfig.findUnique({ where: { id: 'global' } });
    if (!config) {
      config = await prisma.vaultConfig.create({
        data: { id: 'global', ...data }
      });
    } else {
      config = await prisma.vaultConfig.update({
        where: { id: 'global' },
        data
      });
    }

    return NextResponse.json(config);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
