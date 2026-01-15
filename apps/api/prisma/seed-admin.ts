/**
 * Seed script - Pierwszy admin
 * Email: krzysztof@markbud.pl
 * Hasło: Admin123!
 *
 * Uruchom: pnpm --filter @markbud/api tsx prisma/seed-admin.ts
 */

import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../src/services/authService.js';

const prisma = new PrismaClient();

async function main() {
  console.log('🔧 Tworzenie pierwszego admina...');

  const email = 'krzysztof@markbud.pl';
  const password = 'Admin123!';
  const name = 'Krzysztof';
  const role = 'admin';

  // Sprawdź czy admin już istnieje
  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    console.log(`✅ Admin już istnieje: ${email}`);
    return;
  }

  // Hashuj hasło
  const passwordHash = await hashPassword(password);

  // Stwórz admina
  const admin = await prisma.user.create({
    data: {
      email,
      passwordHash,
      name,
      role,
    },
  });

  console.log(`✅ Admin utworzony pomyślnie!`);
  console.log(`   Email: ${admin.email}`);
  console.log(`   Nazwa: ${admin.name}`);
  console.log(`   Rola: ${admin.role}`);
  console.log(`   Hasło: ${password} (zmień po pierwszym logowaniu!)`);
}

main()
  .catch((error) => {
    console.error('❌ Błąd podczas tworzenia admina:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
