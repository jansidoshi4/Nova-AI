-- Run this in the Supabase SQL Editor (Dashboard → SQL → New query)

-- ── Per-user SQL schema ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_schemas (
  user_id     UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  schema_text TEXT NOT NULL DEFAULT '',
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE user_schemas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own schema"
  ON user_schemas FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own schema"
  ON user_schemas FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own schema"
  ON user_schemas FOR UPDATE
  USING (auth.uid() = user_id);

-- ── PDF storage path on existing pdf_sessions table ──────────────────
ALTER TABLE pdf_sessions ADD COLUMN IF NOT EXISTS storage_path TEXT;

-- ── Private bucket for uploaded PDFs ─────────────────────────────────
INSERT INTO storage.buckets (id, name, public)
VALUES ('pdfs', 'pdfs', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Users upload own PDFs"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'pdfs'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users read own PDFs"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'pdfs'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users delete own PDFs"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'pdfs'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
