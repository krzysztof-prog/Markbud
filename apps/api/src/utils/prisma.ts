/**
 * Prisma Client Singleton
 * Separate file to avoid circular dependency issues
 */

import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient();

export default prisma;
