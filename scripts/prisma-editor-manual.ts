import dotenv from 'dotenv';
dotenv.config();

async function main() {
  const { prisma } = await import('../src/lib/prisma');

  const ageGroup = (await prisma.ageGroup.findFirst())?.name;
  const genre = (await prisma.genre.findFirst())?.name;
  const gender = (await prisma.characterGender.findFirst())?.name;
  if (!ageGroup || !genre || !gender) {
    console.error('Missing lookups');
    process.exit(1);
  }

  const story = await prisma.story.create({
    data: {
      title: 'Prisma Manual Test Story',
      ageGroupLookup: { connect: { name: ageGroup } },
      genreLookup: { connect: { name: genre } },
      characterGenderLookup: { connect: { name: gender } },
      createdById: (await prisma.user.findFirst({ select: { id: true } }))?.id,
    },
  });

  console.log('Created story', story.id);

  const pages = [];
  for (let i = 1; i <= 3; i++) {
    const p = await prisma.storyPage.create({
      data: {
        storyId: story.id,
        pageNumber: i,
        title: `Page ${i}`,
        storyText: `Page ${i} text`,
      },
    });
    pages.push(p);
    console.log('Created page', p.id, p.pageNumber, p.title);
  }

  // Update page 2 to Page 20
  const page2 = pages[1];
  const updated = await prisma.storyPage.update({ where: { id: page2.id }, data: { title: 'Page 20', pageNumber: 20 } });
  console.log('Updated page2', updated.id, updated.pageNumber, updated.title);

  // Create new page 21
  const p4 = await prisma.storyPage.create({ data: { storyId: story.id, pageNumber: 21, title: 'Page 21', storyText: 'Page 21 text' } });
  console.log('Created page', p4.id, p4.pageNumber, p4.title);

  const all = await prisma.storyPage.findMany({ where: { storyId: story.id }, orderBy: { pageNumber: 'asc' } });
  console.log('All pages:', all.map((p) => ({ id: p.id, pageNumber: p.pageNumber, title: p.title })));

  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
