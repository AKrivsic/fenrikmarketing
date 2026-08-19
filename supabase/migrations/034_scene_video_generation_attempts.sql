-- 034_scene_video_generation_attempts.sql
-- Provider-agnostic production evidence for per-scene video clip generation.
-- Each paid create is one immutable attempt row. Status CHECK must match
-- TypeScript SCENE_VIDEO_ATTEMPT_STATUSES exactly.

create table if not exists public.scene_video_generation_attempts (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  video_job_id uuid not null references public.video_jobs(id) on delete cascade,
  scene_id text not null,

  -- Idempotency: one client_request_id => at most one provider create POST.
  client_request_id uuid not null,
  parent_attempt_id uuid null
    references public.scene_video_generation_attempts(id) on delete set null,

  source_image_bucket text not null,
  source_image_path text not null,
  motion_prompt text not null,

  provider text not null,
  model text not null,
  duration_seconds int not null,
  ratio text not null,
  seed int null,

  provider_task_id text null,

  status text not null default 'created'
    check (status in (
      'created',
      'submitted',
      'pending',
      'running',
      'downloading',
      'succeeded',
      'failed',
      'cancelled',
      'download_failed',
      'submission_unknown'
    )),

  failure_code text null,
  error_message text null,

  estimated_credits numeric null,
  estimated_cost_usd numeric null,

  created_at timestamptz not null default now(),
  submitted_at timestamptz null,
  started_at timestamptz null,
  completed_at timestamptz null,
  updated_at timestamptz not null default now(),
  generation_duration_ms int null,

  output_bucket text null,
  output_path text null,
  output_duration_seconds numeric null,
  output_has_audio boolean null,
  -- Safe opaque provider metadata only (no secrets / signed URLs).
  provider_metadata jsonb null,

  download_claimed_at timestamptz null,
  download_claim_owner text null,

  constraint scene_video_generation_attempts_client_request_id_key
    unique (client_request_id)
);

create index if not exists scene_video_generation_attempts_project_created_idx
  on public.scene_video_generation_attempts (project_id, created_at desc);

create index if not exists scene_video_generation_attempts_job_scene_idx
  on public.scene_video_generation_attempts (video_job_id, scene_id, created_at desc);

create index if not exists scene_video_generation_attempts_provider_task_idx
  on public.scene_video_generation_attempts (provider_task_id)
  where provider_task_id is not null;

create index if not exists scene_video_generation_attempts_parent_idx
  on public.scene_video_generation_attempts (parent_attempt_id)
  where parent_attempt_id is not null;

alter table public.scene_video_generation_attempts enable row level security;

grant select, insert, update, delete
  on public.scene_video_generation_attempts to service_role;
revoke all on public.scene_video_generation_attempts from anon, authenticated;

create policy scene_video_generation_attempts_select
  on public.scene_video_generation_attempts
  for select to authenticated
  using (public.owns_project(project_id));

create policy scene_video_generation_attempts_insert
  on public.scene_video_generation_attempts
  for insert to authenticated
  with check (public.owns_project(project_id));

create policy scene_video_generation_attempts_update
  on public.scene_video_generation_attempts
  for update to authenticated
  using (public.owns_project(project_id))
  with check (public.owns_project(project_id));

create policy scene_video_generation_attempts_delete
  on public.scene_video_generation_attempts
  for delete to authenticated
  using (public.owns_project(project_id));

drop trigger if exists set_scene_video_generation_attempts_updated_at
  on public.scene_video_generation_attempts;
create trigger set_scene_video_generation_attempts_updated_at
  before update on public.scene_video_generation_attempts
  for each row execute function public.set_updated_at();
