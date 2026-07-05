-- AlterTable: add optional cover image fields to Story
ALTER TABLE "Story" ADD COLUMN "coverImageUrl" TEXT;
ALTER TABLE "Story" ADD COLUMN "coverImagePublicId" TEXT;
