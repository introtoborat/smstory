// Load environment variables first
import dotenv from "dotenv";

dotenv.config();

async function main() {
  const { prisma } = await import("../src/lib/prisma");
  console.log("Creating PageNameSuggestion table if missing...");
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "PageNameSuggestion" (
      "id" TEXT PRIMARY KEY,
      "name" TEXT NOT NULL UNIQUE,
      "order" INTEGER NOT NULL DEFAULT 0,
      "enabled" BOOLEAN NOT NULL DEFAULT TRUE,
      "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `);
  console.log("Done.");
  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
