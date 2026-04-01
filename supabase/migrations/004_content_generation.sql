ALTER TABLE posts ADD COLUMN images JSONB;
ALTER TABLE posts ADD COLUMN humanized BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE job_queue (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  site_id TEXT NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
