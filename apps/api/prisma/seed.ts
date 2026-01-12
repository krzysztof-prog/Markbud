import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Rozpoczynam seedowanie bazy danych...');

  // ==================== UŻYTKOWNICY ====================
  // Simple hash for seeding - in production, use proper password hashing
  const systemPasswordHash = 'system'; // Placeholder - authentication will be implemented later

  const systemUser = await prisma.user.upsert({
    where: { email: 'system@akrobud.local' },
    update: {},
    create: {
      email: 'system@akrobud.local',
      passwordHash: systemPasswordHash,
      name: 'System',
      role: 'admin',
    },
  });
  console.log('✅ Użytkownik systemowy utworzony (ID:', systemUser.id, ')');

  // ==================== PROFILE ====================
  const profiles = [
    { number: '9016', name: 'Profil 9016' },
    { number: '8866', name: 'Profil 8866' },
    { number: '8869', name: 'Profil 8869' },
    { number: '9671', name: 'Profil 9671' },
    { number: '9677', name: 'Profil 9677' },
    { number: '9315', name: 'Profil 9315' },
  ];

  for (const profile of profiles) {
    await prisma.profile.upsert({
      where: { number: profile.number },
      update: {},
      create: profile,
    });
  }
  console.log('✅ Profile utworzone');

  // ==================== KOLORY TYPOWE ====================
  const typicalColors = [
    { code: '000', name: 'Biały', hexColor: '#FFFFFF' },
    { code: '050', name: 'Kremowy', hexColor: '#F5F5DC' },
    { code: '730', name: 'Antracyt x1', hexColor: '#383838' },
    { code: '750', name: 'Biała folia x1', hexColor: '#FAFAFA' },
    { code: '148', name: 'Krem folia x1', hexColor: '#FFF8DC' },
    { code: '145', name: 'Antracyt x1 (b.krem)', hexColor: '#404040' },
    { code: '146', name: 'Granat x1 (b.krem)', hexColor: '#1E3A5F' },
    { code: '147', name: 'Jodłowy x1 (b.krem)', hexColor: '#2E5A35' },
    { code: '830', name: 'Granat x1', hexColor: '#1C3B6A' },
    { code: '890', name: 'Jodłowy x1', hexColor: '#355E3B' },
    { code: '128', name: 'Schwarzgrau', hexColor: '#2F2F2F' },
    { code: '864', name: 'Zielony monumentalny', hexColor: '#4A6741' },
  ];

  for (const color of typicalColors) {
    await prisma.color.upsert({
      where: { code: color.code },
      update: {},
      create: { ...color, type: 'typical' },
    });
  }
  console.log('✅ Kolory typowe utworzone');

  // ==================== KOLORY NIETYPOWE ====================
  const atypicalColors = [
    { code: '680', name: 'Biała folia x2', hexColor: '#F8F8F8' },
    { code: '533', name: 'Szary czarny x2', hexColor: '#2B2B2B' },
    { code: '154', name: 'Antracyt x2', hexColor: '#363636' },
    { code: '155', name: 'Krem folia/biały (b.krem)', hexColor: '#FFFDD0' },
    { code: '537', name: 'Quartgrau x1', hexColor: '#6B6B6B' },
    { code: '201', name: 'Biała folia/antracyt', hexColor: '#C0C0C0' },
  ];

  for (const color of atypicalColors) {
    await prisma.color.upsert({
      where: { code: color.code },
      update: {},
      create: { ...color, type: 'atypical' },
    });
  }
  console.log('✅ Kolory nietypowe utworzone');

  // ==================== POWIĄZANIA PROFIL-KOLOR ====================
  const allProfiles = await prisma.profile.findMany();
  const allColors = await prisma.color.findMany();

  for (const profile of allProfiles) {
    for (const color of allColors) {
      await prisma.profileColor.upsert({
        where: {
          profileId_colorId: {
            profileId: profile.id,
            colorId: color.id,
          },
        },
        update: {},
        create: {
          profileId: profile.id,
          colorId: color.id,
          isVisible: true,
        },
      });
    }
  }
  console.log('✅ Powiązania profil-kolor utworzone');

  // ==================== TYPY PALET ====================
  // Zgodnie z wymaganiami użytkownika dla optymalizacji pakowania
  const palletTypes = [
    {
      name: 'Paleta 4000',
      lengthMm: 6000,     // długość palety (może wystawać do 700mm)
      widthMm: 4000,      // szerokość palety
      heightMm: 2000,     // wysokość palety
      loadWidthMm: 960,   // max załadunek głębokości
      loadDepthMm: 6000   // głębokość załadunku
    },
    {
      name: 'Paleta 3500',
      lengthMm: 6000,
      widthMm: 3500,
      heightMm: 2000,
      loadWidthMm: 960,
      loadDepthMm: 6000
    },
    {
      name: 'Paleta 3000',
      lengthMm: 6000,
      widthMm: 3000,
      heightMm: 2000,
      loadWidthMm: 960,
      loadDepthMm: 6000
    },
    {
      name: 'Mała paleta',
      lengthMm: 6000,
      widthMm: 2400,
      heightMm: 1500,
      loadWidthMm: 700,   // mała paleta ma mniejszy załadunek
      loadDepthMm: 6000
    },
  ];

  for (const pallet of palletTypes) {
    const existing = await prisma.palletType.findFirst({
      where: { name: pallet.name },
    });
    if (!existing) {
      await prisma.palletType.create({ data: pallet });
    }
  }
  console.log('✅ Typy palet utworzone');

  // ==================== GŁĘBOKOŚCI PROFILI ====================
  // Głębokości według typu profilu dla algorytmu pakowania palet
  const profileDepths = [
    { profileType: 'VLAK', depthMm: 95, description: 'Profil VLAK - głębokość 95mm' },
    { profileType: 'BLOK', depthMm: 137, description: 'Profil BLOK - głębokość 137mm' },
    { profileType: 'szyba', depthMm: 50, description: 'Szyba - głębokość 50mm' },
    { profileType: 'VARIANT', depthMm: 120, description: 'Profil VARIANT - głębokość 120mm' },
  ];

  for (const depth of profileDepths) {
    await prisma.profileDepth.upsert({
      where: { profileType: depth.profileType },
      update: { depthMm: depth.depthMm, description: depth.description },
      create: depth,
    });
  }
  console.log('✅ Głębokości profili utworzone');

  // ==================== USTAWIENIA DOMYŚLNE ====================
  const defaultSettings = [
    { key: 'eurToPlnRate', value: '4.35' },
    { key: 'watchFolderUzyteBele', value: './uzyte bele' },
    { key: 'watchFolderCeny', value: './ceny' },
    { key: 'autoArchiveCompletedOrders', value: 'false' },
    { key: 'lowStockThreshold', value: '10' },
  ];

  for (const setting of defaultSettings) {
    await prisma.setting.upsert({
      where: { key: setting.key },
      update: {},
      create: setting,
    });
  }
  console.log('✅ Ustawienia domyślne utworzone');

  // ==================== INICJALIZACJA STANÓW MAGAZYNOWYCH ====================
  for (const profile of allProfiles) {
    for (const color of allColors) {
      await prisma.warehouseStock.upsert({
        where: {
          profileId_colorId: {
            profileId: profile.id,
            colorId: color.id,
          },
        },
        update: {},
        create: {
          profileId: profile.id,
          colorId: color.id,
          currentStockBeams: 0,
          updatedById: systemUser.id,  // Wymagane pole - użytkownik systemowy
        },
      });
    }
  }
  console.log('✅ Stany magazynowe zainicjalizowane');

  console.log('🎉 Seedowanie zakończone!');
}

main()
  .catch((e) => {
    console.error('❌ Błąd seedowania:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
