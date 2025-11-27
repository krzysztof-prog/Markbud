const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Kolory typowe
const typicalColors = [
  { code: '000', name: 'biały' },
  { code: '050', name: 'kremowy' },
  { code: '730', name: 'antracyt' },
  { code: '750', name: 'biała folia' },
  { code: '148', name: 'krem folia' },
  { code: '145', name: 'antracyt (b.krem)' },
  { code: '146', name: 'granat (b.krem)' },
  { code: '147', name: 'jodłowy (b.krem)' },
  { code: '830', name: 'granat' },
  { code: '890', name: 'jodłowy' },
  { code: '128', name: 'Schwarzgrau' },
  { code: '864', name: 'zielony monumentalny' },
];

// Kolory nietypowe
const atypicalColors = [
  { code: '680', name: 'biała folia' },
  { code: '533', name: 'szary czarny' },
  { code: '154', name: 'antracyt' },
  { code: '155', name: 'krem folia/biały (b.krem)' },
  { code: '537', name: 'quartgrau' },
  { code: '201', name: 'biała folia/antracyt' },
];

async function addColors() {
  console.log('Dodawanie kolorów typowych...');
  
  for (const color of typicalColors) {
    try {
      await prisma.color.create({
        data: {
          code: color.code,
          name: color.name,
          type: 'typical',
          hexColor: null,
        },
      });
      console.log(`✓ Dodano: ${color.code} - ${color.name}`);
    } catch (e) {
      if (e.code === 'P2002') {
        console.log(`⚠ Już istnieje: ${color.code}`);
      } else {
        console.error(`✗ Błąd przy ${color.code}:`, e.message);
      }
    }
  }

  console.log('\nDodawanie kolorów nietypowych...');
  
  for (const color of atypicalColors) {
    try {
      await prisma.color.create({
        data: {
          code: color.code,
          name: color.name,
          type: 'atypical',
          hexColor: null,
        },
      });
      console.log(`✓ Dodano: ${color.code} - ${color.name}`);
    } catch (e) {
      if (e.code === 'P2002') {
        console.log(`⚠ Już istnieje: ${color.code}`);
      } else {
        console.error(`✗ Błąd przy ${color.code}:`, e.message);
      }
    }
  }

  console.log('\nGotowe!');
  await prisma.$disconnect();
}

addColors().catch(err => {
  console.error('Błąd:', err);
  process.exit(1);
});
