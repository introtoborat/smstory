import "dotenv/config";
import { randomUUID } from "node:crypto";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

(async () => {
  const url = process.env.DATABASE_URL!;
  const adapter = new PrismaPg({ connectionString: url });
  const prisma = new PrismaClient({ adapter });

  const now = new Date();
  const id = randomUUID();

  // Insert a row marking 0001_user_management as applied.
  // The actual migration is a no-op (SELECT 1), so applied_steps_count = 1.
  // Skip if a row with this migration_name already exists.
  const exists = await prisma.$queryRaw<Array<{ count: bigint }>>`
    SELECT COUNT(*)::bigint AS count FROM "_prisma_migrations" WHERE migration_name = '0001_user_management'
  `;
  if (Number(exists[0].count) > 0) {
    console.log("0001_user_management already marked as applied — skipping insert.");
  } else {
    await prisma.$executeRawUnsafe(
      `INSERT INTO "_prisma_migrations"
        (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count)
       VALUES ($1, $2, $3, $4, NULL, NULL, $3, 1)`,
      id,
      "noop-0001_user_management",
      now,
      "0001_user_management",
    );
    console.log("Inserted 0001_user_management row with id:", id);
  }

  const rows = await prisma.$queryRaw<Array<{ migration_name: string; finished_at: Date | null }>>`
    SELECT migration_name, finished_at FROM "_prisma_migrations" ORDER BY started_at
  `;
  console.log("Migrations applied:");
  for (const r of rows) console.log(" -", r.migration_name, r.finished_at);

  await prisma.$disconnect();
})();
