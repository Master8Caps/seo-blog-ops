-- Add WordPress taxonomy fields to posts table
ALTER TABLE "posts" ADD COLUMN "wp_category_id" INTEGER;
ALTER TABLE "posts" ADD COLUMN "wp_tag_ids" JSONB;
