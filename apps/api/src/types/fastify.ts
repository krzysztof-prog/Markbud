import { PrismaClient } from '@prisma/client';
import type { FastifyInstance } from 'fastify';

declare module 'fastify' {
  interface FastifyInstance {
    prisma: PrismaClient;
  }

  // Rozszerzenie FastifyRequest o pole user z auth middleware
  interface FastifyRequest {
    user?: {
      userId: string | number;
      email?: string;
    };
  }
}

export type FastifyWithPrisma = FastifyInstance & {
  prisma: PrismaClient;
};
