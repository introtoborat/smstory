import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

(async () => {
  const url = process.env.DATABASE_URL!;
  const adapter = new PrismaPg({ connectionString: url });
  const prisma = new PrismaClient({ adapter });

  // Inspect _prisma_migrations columns and indexes
  const cols = await prisma.$queryRaw<Array<{ column_name: string; data_type: string }>>`
    SELECT column_name, data_type FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = '_prisma_migrations'
    ORDER BY ordinal_position
  `;
  console.log("Columns:", cols);

  const idx = await prisma.$queryRaw<Array<{ indexname: string; indexdef: string }>>`
    SELECT indexname, indexdef FROM pg_indexes
    WHERE schemaname = 'public' AND tablename = '_prisma_migrations'
  `;
  console.log("Indexes:", idx);

  const existing = await prisma.$queryRaw<Array<any>>`
    SELECT * FROM "_prisma_migrations" ORDER BY started_at
  `;
  console.log("Existing rows:", existing);

  await prisma.$disconnect();
})();
