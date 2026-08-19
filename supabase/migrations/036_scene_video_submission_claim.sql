-- 036_scene_video_submission_claim.sql
-- Atomic submission claim before Runway create POST (Step 9B).
-- Adds `submitting` status + submission claim columns (parallel to download claim).

alter table public.scene_video_generation_attempts
  add column if not exists submission_claim_owner text null,
  add column if not exists submission_claimed_at timestamptz null;

alter table public.scene_video_generation_attempts
  drop constraint if exists scene_video_generation_attempts_status_check;

alter table public.scene_video_generation_attempts
  add constraint scene_video_generation_attempts_status_check
  check (status in (
    'created',
    'submitting',
    'submitted',
    'pending',
    'running',
    'downloading',
    'succeeded',
    'failed',
    'cancelled',
    'download_failed',
    'submission_unknown'
  ));
