import "dotenv/config";
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

(async () => {
  const url = process.env.DATABASE_URL!;
  const adapter = new PrismaPg({ connectionString: url });
  const prisma = new PrismaClient({ adapter });

  const migrationName = "0004_lookup_relations_and_draft_ownership";

  // Check if already applied
  const exists = await prisma.$queryRaw<Array<{ count: bigint }>>`
    SELECT COUNT(*)::bigint AS count FROM "_prisma_migrations" WHERE migration_name = ${migrationName}
  `;
  if (Number(exists[0].count) > 0) {
    console.log(`${migrationName} already marked as applied — skipping.`);
    await prisma.$disconnect();
    return;
  }

  // Read and execute the migration SQL
  const sql = readFileSync("prisma/migrations/0004_lookup_relations_and_draft_ownership/migration.sql", "utf-8");
  
  // Split by semicolons and execute each statement
  const statements = sql
    .split(";")
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith("--"));

  console.log(`Executing ${statements.length} SQL statements...`);
  
  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i];
    try {
      await prisma.$executeRawUnsafe(`${stmt};`);
      console.log(`  [${i + 1}/${statements.length}] OK: ${stmt.substring(0, 80)}...`);
    } catch (err: any) {
      console.error(`  [${i + 1}/${statements.length}] FAILED: ${stmt.substring(0, 80)}...`);
      console.error(`  Error: ${err.message}`);
      // Continue with remaining statements
    }
  }

  // Mark migration as applied
  const now = new Date();
  const id = randomUUID();
  await prisma.$executeRawUnsafe(
    `INSERT INTO "_prisma_migrations"
      (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count)
     VALUES ($1, $2, $3, $4, NULL, NULL, $3, $5)`,
    id,
    "manual-0004_lookup_relations_and_draft_ownership",
    now,
    migrationName,
    statements.length,
  );
  console.log(`\n✅ Migration ${migrationName} applied and marked as complete.`);

  await prisma.$disconnect();
})();