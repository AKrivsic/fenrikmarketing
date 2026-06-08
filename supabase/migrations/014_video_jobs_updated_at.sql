-- 014_video_jobs_updated_at.sql
-- Task 4 — stuck-processing recovery support.
--
-- video_jobs had only created_at (insert time, while still `queued`) and
-- completed_at (terminal). There was no way to tell HOW LONG a job had been
-- `processing`, so a job whose worker died mid-render stayed `processing`
-- forever with no signal. This migration adds an updated_at column bumped on
-- every UPDATE (reusing the existing set_updated_at() trigger function from
-- migration 007). The claim queued->processing now stamps updated_at = now(),
-- which is the "processing since" signal the recovery logic keys on.

-- Additive, idempotent. Existing rows get now() as their initial updated_at;
-- that is fine because terminal rows (completed/failed) are never re-dispatched
-- and only `processing` rows older than the stale threshold are recovered.
alter table video_jobs
  add column if not exists updated_at timestamptz not null default now();

-- Bump updated_at on every update (same function as projects / content_packages
-- / content_items). Idempotent: drop-if-exists then create.
drop trigger if exists video_jobs_set_updated_at on video_jobs;

create trigger video_jobs_set_updated_at
before update on video_jobs
for each row
execute function set_updated_at();
