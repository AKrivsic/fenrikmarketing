-- 037_scene_video_submission_claim_integrity.sql
-- Enforce submission claim fields ↔ status (Step 9C).

alter table public.scene_video_generation_attempts
  add constraint scene_video_generation_attempts_submission_claim_integrity
  check (
    (
      status = 'submitting'
      and provider_task_id is null
      and submission_claim_owner is not null
      and submission_claimed_at is not null
    )
    or (
      status <> 'submitting'
      and submission_claim_owner is null
      and submission_claimed_at is null
    )
  );
