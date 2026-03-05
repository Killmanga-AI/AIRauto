// ============================================================
// AIRAuto – Prisma Client Singleton
// ============================================================

import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const db =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ?
      ['info', 'warn', 'error'] :
      ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db;
