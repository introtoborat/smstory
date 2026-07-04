import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { hashPassword } from "../src/lib/auth";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL || "" });
const prisma = new PrismaClient({ adapter });

const DEFAULT_GENRES = [
  { name: "Confidence", color: "#3b82f6" },
  { name: "Friendship", color: "#ec4899" },
  { name: "Kindness", color: "#22c55e" },
  { name: "Adventure", color: "#f97316" },
  { name: "STEM", color: "#a855f7" },
  { name: "Creativity", color: "#eab308" },
  { name: "Fantasy", color: "#6366f1" },
  { name: "Nature", color: "#10b981" },
  { name: "Family", color: "#f43f5e" },
  { name: "Other", color: "#6b7280" },
];

const DEFAULT_AGE_GROUPS = ["3-4", "5-6", "7-8", "9-10", "11-12"];

const DEFAULT_GENDERS = ["Male", "Female", "Unisex"];

async function seedLookups() {
  for (let i = 0; i < DEFAULT_GENRES.length; i++) {
    const g = DEFAULT_GENRES[i];
    await prisma.genre.upsert({
      where: { name: g.name },
      update: { color: g.color, order: i },
      create: { name: g.name, color: g.color, order: i },
    });
  }
  for (let i = 0; i < DEFAULT_AGE_GROUPS.length; i++) {
    await prisma.ageGroup.upsert({
      where: { name: DEFAULT_AGE_GROUPS[i] },
      update: { order: i },
      create: { name: DEFAULT_AGE_GROUPS[i], order: i },
    });
  }
  for (let i = 0; i < DEFAULT_GENDERS.length; i++) {
    await prisma.characterGender.upsert({
      where: { name: DEFAULT_GENDERS[i] },
      update: { order: i },
      create: { name: DEFAULT_GENDERS[i], order: i },
    });
  }
  console.log(`✅ Seeded ${DEFAULT_GENRES.length} genres, ${DEFAULT_AGE_GROUPS.length} age groups, ${DEFAULT_GENDERS.length} genders`);
}

async function main() {
  console.log("🌱 Seeding database...");

  // Create admin user from environment variables
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminEmail || !adminPassword) {
    console.error("❌ ADMIN_EMAIL and ADMIN_PASSWORD environment variables are required");
    process.exit(1);
  }

  const hashedPassword = await hashPassword(adminPassword);
  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: { role: "admin", status: "active", password: hashedPassword },
    create: {
      email: adminEmail,
      name: "Admin",
      password: hashedPassword,
      role: "admin",
      status: "active",
    },
  });
  console.log(`✅ Admin user created: ${admin.email}`);

  // Create some tags
  const tags = await Promise.all([
    prisma.tag.upsert({ where: { name: "Popular" }, update: {}, create: { name: "Popular", color: "#ef4444" } }),
    prisma.tag.upsert({ where: { name: "New" }, update: {}, create: { name: "New", color: "#22c55e" } }),
    prisma.tag.upsert({ where: { name: "Featured" }, update: {}, create: { name: "Featured", color: "#f59e0b" } }),
    prisma.tag.upsert({ where: { name: "Draft" }, update: {}, create: { name: "Draft", color: "#6366f1" } }),
    prisma.tag.upsert({ where: { name: "Reviewed" }, update: {}, create: { name: "Reviewed", color: "#06b6d4" } }),
  ]);
  console.log(`✅ ${tags.length} tags created`);

  await seedLookups();

  // Create sample stories
  const story1 = await prisma.story.create({
    data: {
      title: "The Brave Little Star",
      ageGroupLookup: { connect: { name: "3-4" } },
      genreLookup: { connect: { name: "Confidence" } },
      characterGenderLookup: { connect: { name: "Unisex" } },
      pages: {
        create: [
          {
            pageNumber: 1,
            storyText: "Once upon a time, there was a little star named Sparkle. Sparkle lived in the big, wide sky with many other stars.",
            sceneDescription: "A night sky filled with twinkling stars. One small star in the center glows slightly brighter than the rest.",
            imagePrompt: "A cute cartoon star character with a friendly face, glowing softly in a dark blue night sky filled with other stars, children's book illustration style",
            notes: "Introduction page - set the scene",
          },
          {
            pageNumber: 2,
            storyText: "Sparkle was afraid to shine too brightly. \"What if the other stars laugh at me?\" Sparkle thought.",
            sceneDescription: "The little star looks worried, surrounded by bigger, brighter stars.",
            imagePrompt: "A small worried cartoon star looking at bigger brighter stars, feeling insecure, children's book illustration, soft pastel colors",
            notes: "Show Sparkle's insecurity",
          },
          {
            pageNumber: 3,
            storyText: "But one night, the moon said to Sparkle, \"Every star has its own special light. You just need to believe in yourself.\"",
            sceneDescription: "A friendly moon smiling down at Sparkle the little star.",
            imagePrompt: "A wise friendly cartoon moon talking to a small star, nighttime sky scene, warm glow, children's book illustration style",
            notes: "Mentor character introduced",
          },
          {
            pageNumber: 4,
            storyText: "So Sparkle took a deep breath and shone as bright as could be. And you know what? It was beautiful!",
            sceneDescription: "Sparkle shining brightly and proudly, illuminating the sky.",
            imagePrompt: "A small star glowing brilliantly with pride, radiating warm golden light across a beautiful night sky, all other stars cheering, children's book illustration style",
            notes: "Climax - Sparkle overcomes fear",
          },
          {
            pageNumber: 5,
            storyText: "From that day on, Sparkle shone brighter than ever, knowing that being yourself is the most beautiful thing of all.",
            sceneDescription: "A beautiful sky with Sparkle shining proudly among friends.",
            imagePrompt: "A beautiful starry night sky with one star glowing brilliantly at the center, surrounded by happy star friends, warm magical atmosphere, children's book illustration",
            notes: "Resolution - confidence message",
          },
        ],
      },
    },
    include: { pages: true },
  });

  const story2 = await prisma.story.create({
    data: {
      title: "Luna and the Friendship Garden",
      ageGroupLookup: { connect: { name: "5-6" } },
      genreLookup: { connect: { name: "Friendship" } },
      characterGenderLookup: { connect: { name: "Female" } },
      pages: {
        create: [
          {
            pageNumber: 1,
            storyText: "Luna loved to garden. Every day she would tend to her little patch of earth behind her house.",
            sceneDescription: "A young girl kneeling in a small garden, surrounded by flowers and plants.",
            imagePrompt: "A young girl named Luna with curly hair gardening behind a cute house, flowers and vegetables growing, sunny day, children's book illustration style",
            notes: "Introduce Luna and her hobby",
          },
          {
            pageNumber: 2,
            storyText: "One day, a new girl named Mia moved in next door. Mia looked sad and lonely.",
            sceneDescription: "Luna peering over the fence at a new girl sitting alone in her yard.",
            imagePrompt: "A girl looking over a wooden fence at a new girl sitting alone looking sad, suburban neighborhood, children's book illustration style",
            notes: "Introduce conflict",
          },
          {
            pageNumber: 3,
            storyText: "\"Would you like to help me plant some seeds?\" Luna asked with a warm smile. Mia's eyes lit up.",
            sceneDescription: "Luna offering seeds to Mia with a friendly smile.",
            imagePrompt: "Two girls at a garden, one girl offering seeds to another with a warm smile, friendship moment, children's book illustration style",
            notes: "Friendship begins",
          },
          {
            pageNumber: 4,
            storyText: "Together, they planted sunflowers, daisies, and even a little vegetable patch. They named it the Friendship Garden.",
            sceneDescription: "The two girls happily gardening together, with many beautiful flowers growing.",
            imagePrompt: "Two happy girls gardening together, surrounded by tall sunflowers and colorful flowers, a sign says Friendship Garden, children's book illustration style",
            notes: "Building friendship",
          },
        ],
      },
    },
    include: { pages: true },
  });

  const story3 = await prisma.story.create({
    data: {
      title: "Robot's First Day of School",
      ageGroupLookup: { connect: { name: "7-8" } },
      genreLookup: { connect: { name: "STEM" } },
      characterGenderLookup: { connect: { name: "Unisex" } },
      pages: {
        create: [
          {
            pageNumber: 1,
            storyText: "Beep-Boop was a small robot who had just been built. Today was a very special day — it was Beep-Boop's first day of school!",
            sceneDescription: "A small, cute robot with big eyes standing at the school gate.",
            imagePrompt: "A cute small robot with big LED eyes standing at school gates, holding a tiny backpack, first day of school, children's book illustration style",
            notes: "Introduction to protagonist",
          },
          {
            pageNumber: 2,
            storyText: "The classroom was full of children, and Beep-Boop felt nervous. The children stared curiously at the new student.",
            sceneDescription: "Beep-Boop entering a colorful classroom, children looking at the robot curiously.",
            imagePrompt: "A cute robot entering a colorful classroom full of curious children, warm and inviting atmosphere, children's book illustration style",
            notes: "Set the scene in school",
          },
          {
            pageNumber: 3,
            storyText: "During science class, the teacher asked how plants grow. Beep-Boop's memory banks lit up with knowledge! \"Water, sunlight, and nutrients!\" Beep-Boop answered.",
            sceneDescription: "Beep-Boop excitedly answering a question in science class.",
            imagePrompt: "A robot enthusiastically raising its hand in a science class, plants and diagrams on the board, excited classmates, children's book illustration style",
            notes: "Beep-Boop shows STEM knowledge",
          },
        ],
      },
    },
    include: { pages: true },
  });

  // Connect some tags (StoryTag is a join table — create join rows directly)
  await prisma.storyTag.createMany({
    data: [
      { storyId: story1.id, tagId: tags[0].id },
      { storyId: story1.id, tagId: tags[2].id },
      { storyId: story2.id, tagId: tags[1].id },
      { storyId: story3.id, tagId: tags[1].id },
      { storyId: story3.id, tagId: tags[4].id },
    ],
  });

  // Update page counts
  await prisma.story.update({ where: { id: story1.id }, data: { pageCount: story1.pages.length } });
  await prisma.story.update({ where: { id: story2.id }, data: { pageCount: story2.pages.length } });
  await prisma.story.update({ where: { id: story3.id }, data: { pageCount: story3.pages.length } });

  console.log(`✅ ${3} sample stories created with pages`);
  console.log("🎉 Seeding complete!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
