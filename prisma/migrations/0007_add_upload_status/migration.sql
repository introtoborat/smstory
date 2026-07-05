-- Add uploadStatus column to Story
ALTER TABLE "Story" ADD COLUMN "uploadStatus" TEXT NOT NULL DEFAULT 'not_uploaded';

-- Create index on uploadStatus
CREATE INDEX IF NOT EXISTS "Story_uploadStatus_idx" ON "Story"("uploadStatus");