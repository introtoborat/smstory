import dotenv from "dotenv";
dotenv.config();

async function main() {
  const { prisma } = await import("../src/lib/prisma");

  const suggestions = [
    "Cover Page",
    "Title Page",
    "Dedication",
    "Message Page",
    "Introduction",
    "About the Author",
    "The End",
  ];

  for (let i = 0; i < suggestions.length; i++) {
    const name = suggestions[i];
    const order = i;
    try {
      const up = await prisma.pageNameSuggestion.upsert({
        where: { name },
        update: { order, enabled: true },
        create: { name, order, enabled: true },
      });
      console.log("Upserted:", up.name, up.id);
    } catch (e) {
      console.error("Failed to upsert", name, e);
    }
  }

  const all = await prisma.pageNameSuggestion.findMany({ orderBy: { order: "asc" } });
  console.log("All suggestions:", all.map((s) => ({ name: s.name, order: s.order, enabled: s.enabled })));

  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
