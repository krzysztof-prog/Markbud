import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixPendingLog() {
  try {
    // Delete all pending logs
    const result = await prisma.schucoFetchLog.deleteMany({
      where: { status: 'pending' },
    });

    console.log('Deleted', result.count, 'pending logs');
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixPendingLog();
