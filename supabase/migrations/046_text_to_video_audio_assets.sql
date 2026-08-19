-- 046_text_to_video_audio_assets.sql
-- Idempotent ElevenLabs SFX / music generation evidence for text-to-video assembly.

create table if not exists public.text_to_video_audio_assets (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  content_package_id uuid not null references public.content_packages(id) on delete cascade,
  video_job_id uuid null references public.video_jobs(id) on delete set null,
  asset_kind text not null check (asset_kind in ('sound_effect', 'music')),
  scope_key text not null,
  input_fingerprint text not null,
  provider text not null default 'elevenlabs',
  model_id text not null,
  prompt text not null,
  duration_seconds numeric(6, 2) not null,
  status text not null default 'created'
    check (status in (
      'created',
      'submitting',
      'response_received',
      'completed',
      'failed_pre_submission',
      'submission_unknown',
      'artifact_recovery_required',
      'needs_review',
      'provider_rejected'
    )),
  submission_claim_owner text null,
  submission_claimed_at timestamptz null,
  estimated_cost_usd numeric null,
  audio_bucket text null,
  audio_path text null,
  audio_duration_seconds numeric null,
  error_code text null,
  error_message text null,
  synthesis_input jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint text_to_video_audio_assets_fingerprint_scope_key
    unique (project_id, content_package_id, asset_kind, scope_key, input_fingerprint),

  constraint text_to_video_audio_assets_submission_claim_integrity
    check (
      (
        status in ('submitting', 'response_received')
        and submission_claim_owner is not null
        and submission_claimed_at is not null
      )
      or (
        status not in ('submitting', 'response_received')
        and submission_claim_owner is null
        and submission_claimed_at is null
      )
    ),

  constraint text_to_video_audio_assets_completed_artifact_integrity
    check (
      status <> 'completed'
      or (
        audio_bucket is not null
        and audio_path is not null
        and audio_duration_seconds is not null
        and audio_duration_seconds > 0
      )
    )
);

create index if not exists text_to_video_audio_assets_job_idx
  on public.text_to_video_audio_assets (video_job_id, asset_kind);

create index if not exists text_to_video_audio_assets_package_idx
  on public.text_to_video_audio_assets (content_package_id, created_at desc);

create index if not exists text_to_video_audio_assets_status_updated_idx
  on public.text_to_video_audio_assets (status, updated_at desc);

alter table public.text_to_video_audio_assets enable row level security;

grant select, insert, update, delete on public.text_to_video_audio_assets to service_role;
revoke all on public.text_to_video_audio_assets from anon, authenticated;

create policy text_to_video_audio_assets_select on public.text_to_video_audio_assets
  for select to authenticated
  using (public.owns_project(project_id));

create policy text_to_video_audio_assets_insert on public.text_to_video_audio_assets
  for insert to authenticated
  with check (public.owns_project(project_id));

create policy text_to_video_audio_assets_update on public.text_to_video_audio_assets
  for update to authenticated
  using (public.owns_project(project_id))
  with check (public.owns_project(project_id));

create policy text_to_video_audio_assets_delete on public.text_to_video_audio_assets
  for delete to authenticated
  using (public.owns_project(project_id));

drop trigger if exists set_text_to_video_audio_assets_updated_at
  on public.text_to_video_audio_assets;
create trigger set_text_to_video_audio_assets_updated_at
  before update on public.text_to_video_audio_assets
  for each row execute function public.set_updated_at();
