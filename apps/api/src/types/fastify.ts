import { PrismaClient } from '@prisma/client';
import type { FastifyInstance } from 'fastify';

declare module 'fastify' {
  interface FastifyInstance {
    prisma: PrismaClient;
  }
}

export type FastifyWithPrisma = FastifyInstance & {
  prisma: PrismaClient;
};
