-- Add slug column to sites table
ALTER TABLE sites ADD COLUMN slug TEXT;

-- Backfill existing sites: extract first segment of hostname as slug
UPDATE sites
SET slug = split_part(
  regexp_replace(
    regexp_replace(url, '^https?://', ''),
    '^www\.', ''
  ),
  '.', 1
);

-- Make slug NOT NULL and UNIQUE after backfill
ALTER TABLE sites ALTER COLUMN slug SET NOT NULL;
CREATE UNIQUE INDEX sites_slug_key ON sites (slug);
