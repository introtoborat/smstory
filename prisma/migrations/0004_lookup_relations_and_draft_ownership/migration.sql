-- Preserve existing free-text story lookup values by creating missing lookup rows.
INSERT INTO "AgeGroup" ("id", "name", "order", "createdAt", "updatedAt")
SELECT
  'age_' || md5(lookup_values."ageGroup"),
  lookup_values."ageGroup",
  COALESCE((SELECT MAX("order") + 1 FROM "AgeGroup"), 0) + lookup_values.rownum - 1,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM (
  SELECT DISTINCT "ageGroup", row_number() OVER (ORDER BY "ageGroup") AS rownum
  FROM "Story"
  WHERE "ageGroup" IS NOT NULL
) AS lookup_values
ON CONFLICT ("name") DO NOTHING;

INSERT INTO "Genre" ("id", "name", "color", "order", "createdAt", "updatedAt")
SELECT
  'genre_' || md5(lookup_values."genre"),
  lookup_values."genre",
  '#6366f1',
  COALESCE((SELECT MAX("order") + 1 FROM "Genre"), 0) + lookup_values.rownum - 1,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM (
  SELECT DISTINCT "genre", row_number() OVER (ORDER BY "genre") AS rownum
  FROM "Story"
  WHERE "genre" IS NOT NULL
) AS lookup_values
ON CONFLICT ("name") DO NOTHING;

INSERT INTO "CharacterGender" ("id", "name", "order", "createdAt", "updatedAt")
SELECT
  'gender_' || md5(lookup_values."characterGender"),
  lookup_values."characterGender",
  COALESCE((SELECT MAX("order") + 1 FROM "CharacterGender"), 0) + lookup_values.rownum - 1,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM (
  SELECT DISTINCT "characterGender", row_number() OVER (ORDER BY "characterGender") AS rownum
  FROM "Story"
  WHERE "characterGender" IS NOT NULL
) AS lookup_values
ON CONFLICT ("name") DO NOTHING;

-- Add relational lookup columns and backfill them from the old string columns.
ALTER TABLE "Story" ADD COLUMN "ageGroupId" TEXT;
ALTER TABLE "Story" ADD COLUMN "genreId" TEXT;
ALTER TABLE "Story" ADD COLUMN "characterGenderId" TEXT;

UPDATE "Story" AS story
SET "ageGroupId" = lookup."id"
FROM "AgeGroup" AS lookup
WHERE story."ageGroup" = lookup."name";

UPDATE "Story" AS story
SET "genreId" = lookup."id"
FROM "Genre" AS lookup
WHERE story."genre" = lookup."name";

UPDATE "Story" AS story
SET "characterGenderId" = lookup."id"
FROM "CharacterGender" AS lookup
WHERE story."characterGender" = lookup."name";

ALTER TABLE "Story" ALTER COLUMN "ageGroupId" SET NOT NULL;
ALTER TABLE "Story" ALTER COLUMN "genreId" SET NOT NULL;
ALTER TABLE "Story" ALTER COLUMN "characterGenderId" SET NOT NULL;

DROP INDEX IF EXISTS "Story_ageGroup_idx";
DROP INDEX IF EXISTS "Story_genre_idx";
DROP INDEX IF EXISTS "Story_characterGender_idx";

ALTER TABLE "Story" DROP COLUMN "ageGroup";
ALTER TABLE "Story" DROP COLUMN "genre";
ALTER TABLE "Story" DROP COLUMN "characterGender";

CREATE INDEX "Story_ageGroupId_idx" ON "Story"("ageGroupId");
CREATE INDEX "Story_genreId_idx" ON "Story"("genreId");
CREATE INDEX "Story_characterGenderId_idx" ON "Story"("characterGenderId");

ALTER TABLE "Story" ADD CONSTRAINT "Story_ageGroupId_fkey" FOREIGN KEY ("ageGroupId") REFERENCES "AgeGroup"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Story" ADD CONSTRAINT "Story_genreId_fkey" FOREIGN KEY ("genreId") REFERENCES "Genre"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Story" ADD CONSTRAINT "Story_characterGenderId_fkey" FOREIGN KEY ("characterGenderId") REFERENCES "CharacterGender"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Drafts are now owned by the authenticated user who created/saves them.
ALTER TABLE "Draft" ADD COLUMN "userId" TEXT;

UPDATE "Draft" AS draft
SET "userId" = COALESCE(story."createdById", (SELECT "id" FROM "User" ORDER BY "createdAt" ASC LIMIT 1))
FROM "Story" AS story
WHERE draft."storyId" = story."id";

UPDATE "Draft"
SET "userId" = (SELECT "id" FROM "User" ORDER BY "createdAt" ASC LIMIT 1)
WHERE "userId" IS NULL;

DELETE FROM "Draft" WHERE "userId" IS NULL;

DELETE FROM "Draft" AS draft
USING (
  SELECT
    "id",
    row_number() OVER (
      PARTITION BY "userId", "storyId"
      ORDER BY "updatedAt" DESC, "createdAt" DESC, "id" DESC
    ) AS rownum
  FROM "Draft"
  WHERE "storyId" IS NOT NULL
) AS ranked
WHERE draft."id" = ranked."id" AND ranked.rownum > 1;

ALTER TABLE "Draft" ALTER COLUMN "userId" SET NOT NULL;

CREATE INDEX "Draft_userId_idx" ON "Draft"("userId");
CREATE UNIQUE INDEX "Draft_userId_storyId_key" ON "Draft"("userId", "storyId");

ALTER TABLE "Draft" ADD CONSTRAINT "Draft_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
