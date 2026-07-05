import dotenv from 'dotenv';
dotenv.config();
import { prisma } from '../src/lib/prisma';

async function main() {
  try {
    const res = await prisma.$queryRaw`select 1 as ok`;
    console.log('connected', res);
  } catch (error) {
    console.error('connect error', error);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
