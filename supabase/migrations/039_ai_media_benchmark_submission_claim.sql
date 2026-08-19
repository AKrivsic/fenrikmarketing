-- 039_ai_media_benchmark_submission_claim.sql
-- Atomic submission claim for Benchmark Lab paid creates (Step 12B).
-- Do not edit 038. Adds submitting / submission_unknown and claim integrity.

alter table public.ai_media_benchmark_runs
  add column if not exists submission_claim_owner text null,
  add column if not exists submission_claimed_at timestamptz null;

alter table public.ai_media_benchmark_runs
  drop constraint if exists ai_media_benchmark_runs_status_check;

alter table public.ai_media_benchmark_runs
  add constraint ai_media_benchmark_runs_status_check
  check (status in (
    'created',
    'submitting',
    'pending',
    'running',
    'succeeded',
    'failed',
    'cancelled',
    'download_failed',
    'submission_unknown'
  ));

alter table public.ai_media_benchmark_runs
  drop constraint if exists ai_media_benchmark_runs_submission_claim_integrity;

alter table public.ai_media_benchmark_runs
  add constraint ai_media_benchmark_runs_submission_claim_integrity
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

create unique index if not exists ai_media_benchmark_runs_provider_task_uniq
  on public.ai_media_benchmark_runs (provider, provider_task_id)
  where provider_task_id is not null;
