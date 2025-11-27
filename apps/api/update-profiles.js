const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function updateProfiles() {
  // Mapowanie profilów na numery artykułów
  const profileMap = {
    '8866': '18866000',
    '8869': '18869000',
    '9016': '19016000',
    '9315': '19315000',
    '9671': '19671000',
  };

  for (const [number, articleNumber] of Object.entries(profileMap)) {
    try {
      const updated = await prisma.profile.updateMany({
        where: { number },
        data: { articleNumber }
      });
      console.log(`Updated ${number} → ${articleNumber}: ${updated.count} records`);
    } catch (e) {
      console.error(`Error updating ${number}:`, e.message);
    }
  }

  await prisma.$disconnect();
  process.exit(0);
}

updateProfiles().catch(err => {
  console.error(err);
  process.exit(1);
});
