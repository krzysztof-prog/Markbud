import { PrismaClient } from '@prisma/client';
import { GlassValidationService } from '../src/services/glassValidationService.js';

const prisma = new PrismaClient();
const service = new GlassValidationService(prisma);

async function main() {
  const data = await service.getDetailedDiscrepancies('53690');
  console.log(JSON.stringify(data, null, 2));
}

main().finally(() => prisma.$disconnect());
