import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const league = await prisma.league.findFirst({ include: { recommendations: true } });
  console.log(Object.keys(league));
}
main();
