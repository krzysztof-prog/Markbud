/**
 * Seed script - Tworzenie użytkowników
 *
 * Tworzy 5 użytkowników:
 * 1. krzysztof@markbud.pl - admin (już istnieje)
 * 2. marek@markbud.pl - owner
 * 3. pawel@markbud.pl - kierownik
 * 4. ksiegowosc@markbud.pl - ksiegowa
 * 5. wlodek@markbud.pl - user
 * 6. a.iwanski@markbud.pl - user
 *
 * Hasło dla wszystkich nowych: "aaa"
 *
 * Uruchom: pnpm --filter @markbud/api tsx prisma/seed-users.ts
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { UserRole } from '../src/validators/auth.js';

const prisma = new PrismaClient();

interface UserData {
  email: string;
  name: string;
  role: UserRole;
  password: string;
}

const users: UserData[] = [
  {
    email: 'marek@markbud.pl',
    name: 'Marek',
    role: UserRole.OWNER,
    password: 'aaa',
  },
  {
    email: 'pawel@markbud.pl',
    name: 'Paweł',
    role: UserRole.KIEROWNIK,
    password: 'aaa',
  },
  {
    email: 'ksiegowosc@markbud.pl',
    name: 'Księgowość',
    role: UserRole.KSIEGOWA,
    password: 'aaa',
  },
  {
    email: 'wlodek@markbud.pl',
    name: 'Włodek',
    role: UserRole.USER,
    password: 'aaa',
  },
  {
    email: 'a.iwanski@markbud.pl',
    name: 'A. Iwański',
    role: UserRole.USER,
    password: 'aaa',
  },
];

async function main() {
  console.log('🔧 Tworzenie użytkowników...\n');

  for (const userData of users) {
    // Sprawdź czy użytkownik już istnieje
    const existingUser = await prisma.user.findUnique({
      where: { email: userData.email },
    });

    if (existingUser) {
      console.log(`⏭️  ${userData.email} już istnieje (${existingUser.role})`);
      continue;
    }

    // Hashuj hasło
    const passwordHash = await bcrypt.hash(userData.password, 10);

    // Stwórz użytkownika
    const user = await prisma.user.create({
      data: {
        email: userData.email,
        passwordHash,
        name: userData.name,
        role: userData.role,
      },
    });

    console.log(`✅ ${user.email} - ${user.name} (${user.role})`);
  }

  console.log('\n✅ Zakończono tworzenie użytkowników!');
  console.log('\n📝 Podsumowanie:');

  const allUsers = await prisma.user.findMany({
    select: {
      email: true,
      name: true,
      role: true,
    },
    orderBy: {
      createdAt: 'asc',
    },
  });

  console.table(allUsers);

  console.log('\n🔑 Hasło dla nowych użytkowników: "aaa"');
  console.log('⚠️  Zmień hasła po pierwszym logowaniu!');
}

main()
  .catch((error) => {
    console.error('❌ Błąd podczas tworzenia użytkowników:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
