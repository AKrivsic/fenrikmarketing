-- 043_benchmark_case_image_sha256.sql
-- Adds immutability fields to ai_media_benchmark_cases (from migration 042):
--   source_image_sha256  – hex SHA-256 of the uploaded file bytes, included in fingerprint
--   source_image_uuid    – random UUID in the storage path, prevents path reuse
--
-- Migration 042 is already applied; this migration is additive and safe.

alter table public.ai_media_benchmark_cases
  add column if not exists source_image_sha256 text null,
  add column if not exists source_image_uuid   text null;

-- Backfill for any rows created before this migration (none expected in production):
-- source_image_sha256 remains null → fingerprint guard will catch mismatch.
