-- AlterTable
ALTER TABLE "posts" ADD COLUMN "wp_category_id" INTEGER,
ADD COLUMN "wp_tag_ids" JSONB;
