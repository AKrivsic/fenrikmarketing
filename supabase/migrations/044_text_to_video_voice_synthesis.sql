-- Text-to-video ElevenLabs voice synthesis attempts (Step 3 / 3B).
-- One row per (project, package, synthesis_fingerprint).

create table if not exists public.text_to_video_voice_syntheses (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  content_package_id uuid not null references public.content_packages(id) on delete cascade,
  video_job_id uuid null references public.video_jobs(id) on delete set null,

  synthesis_fingerprint text not null,
  voiceover_revision_id text not null,
  provider text not null default 'elevenlabs',
  model_id text not null,
  voice_id text not null,
  output_format text not null,

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

  submission_claimed_at timestamptz null,
  submission_claim_owner text null,

  estimated_cost_usd numeric null,
  synthesis_input jsonb not null default '{}'::jsonb,

  audio_bucket text null,
  audio_path text null,
  audio_duration_seconds numeric null,
  alignment jsonb null,
  subtitle_cues jsonb null,
  error_code text null,
  error_message text null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint text_to_video_voice_syntheses_fingerprint_key
    unique (project_id, content_package_id, synthesis_fingerprint),

  constraint text_to_video_voice_syntheses_submission_claim_integrity
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

  constraint text_to_video_voice_syntheses_completed_artifact_integrity
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

create index if not exists text_to_video_voice_syntheses_package_idx
  on public.text_to_video_voice_syntheses (content_package_id, created_at desc);

create index if not exists text_to_video_voice_syntheses_project_idx
  on public.text_to_video_voice_syntheses (project_id, created_at desc);

create index if not exists text_to_video_voice_syntheses_status_updated_idx
  on public.text_to_video_voice_syntheses (status, updated_at desc);

alter table public.text_to_video_voice_syntheses enable row level security;

grant select, insert, update, delete on public.text_to_video_voice_syntheses to service_role;
revoke all on public.text_to_video_voice_syntheses from anon, authenticated;

create policy text_to_video_voice_syntheses_select on public.text_to_video_voice_syntheses
  for select to authenticated
  using (public.owns_project(project_id));

create policy text_to_video_voice_syntheses_insert on public.text_to_video_voice_syntheses
  for insert to authenticated
  with check (public.owns_project(project_id));

create policy text_to_video_voice_syntheses_update on public.text_to_video_voice_syntheses
  for update to authenticated
  using (public.owns_project(project_id))
  with check (public.owns_project(project_id));

create policy text_to_video_voice_syntheses_delete on public.text_to_video_voice_syntheses
  for delete to authenticated
  using (public.owns_project(project_id));

drop trigger if exists set_text_to_video_voice_syntheses_updated_at
  on public.text_to_video_voice_syntheses;
create trigger set_text_to_video_voice_syntheses_updated_at
  before update on public.text_to_video_voice_syntheses
  for each row execute function public.set_updated_at();
