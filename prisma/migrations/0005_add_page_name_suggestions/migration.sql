-- Add title column to StoryPage
ALTER TABLE "StoryPage" ADD COLUMN "title" TEXT;

-- Create PageNameSuggestion table
CREATE TABLE IF NOT EXISTS "PageNameSuggestion" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT NOT NULL UNIQUE,
  "order" INTEGER NOT NULL DEFAULT 0,
  "enabled" BOOLEAN NOT NULL DEFAULT TRUE,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "PageNameSuggestion_order_idx" ON "PageNameSuggestion"("order");
