import VaultDashboard from '@/components/VaultDashboard';
import { prisma } from '@/lib/prisma';

export const revalidate = 0; // Disable caching for now to always get fresh items

export default async function Home() {
  const categories = await prisma.category.findMany({
    include: {
      items: {
        orderBy: { createdAt: 'desc' }
      }
    },
    orderBy: [
      { orderIndex: 'asc' },
      { name: 'asc' }
    ]
  });

  let config = await prisma.vaultConfig.findUnique({ where: { id: 'global' } });
  if (!config) {
    config = await prisma.vaultConfig.create({
      data: { id: 'global', secretFolderCode: '192006', secretNotepadCode: '345' }
    });
  }

  const hasSecretCategory = categories.some(c => c.isSecret);
  if (!hasSecretCategory) {
    const newSecret = await prisma.category.create({
      data: { name: 'Secure Vault', slug: 'secure-vault', isSecret: true },
      include: { items: true }
    });
    categories.push(newSecret);
  }


  const secretNotes = await prisma.secretNote.findMany({ orderBy: { updatedAt: 'desc' } });
  const secretMedia = await prisma.secretMedia.findMany({ orderBy: { createdAt: 'desc' } });
  const credentials = await prisma.credential.findMany({ orderBy: { createdAt: 'desc' } });
  const contacts = await prisma.contact.findMany({ orderBy: { createdAt: 'desc' } });

  return (
    <main>
      <VaultDashboard 
        initialCategories={categories} 
        initialConfig={config} 
        initialSecretNotes={secretNotes}
        initialSecretMedia={secretMedia}
        initialCredentials={credentials}
        initialContacts={contacts}
      />
    </main>
  );
}
