import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

(async () => {
  try {
    const url = process.env.DATABASE_URL;
    if (!url) {
      console.error("DATABASE_URL not set");
      process.exit(1);
    }
    console.log("URL host:", new URL(url).host);
    console.log("Database:", new URL(url).pathname);

    const adapter = new PrismaPg({ connectionString: url });
    const prisma = new PrismaClient({ adapter });

    const result = await prisma.$queryRaw<Array<{ test: number }>>`SELECT 1 as test`;
    console.log("Connection test result:", result);

    // Try a simple count
    const userCount = await prisma.user.count();
    console.log("User count:", userCount);

    await prisma.$disconnect();
    console.log("\n✅ Supabase connection successful!");
  } catch (e: any) {
    console.error("\n❌ Connection error:", e.message);
    process.exit(1);
  }
})();
