import dotenv from 'dotenv';
dotenv.config();
import { PrismaClient } from '@prisma/client';

async function main() {
  const url = process.env.DATABASE_URL;
  console.log('DATABASE_URL', url);

  const prisma = new PrismaClient();
  try {
    const res = await prisma.$queryRaw`select 1 as ok`;
    console.log('prisma connected', res);
  } catch (error) {
    console.error('prisma error', error);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error('unhandled', err);
  process.exit(1);
});
