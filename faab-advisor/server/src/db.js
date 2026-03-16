import { PrismaClient } from '@prisma/client';
// Use the edge client or standard client depending on deployment
export const prisma = new PrismaClient();
