-- 033_runway_test_jobs.sql
-- Internal admin-only Runway single-scene test jobs (not production video pipeline).
-- Each paid create attempt is one row. Status CHECK must match TypeScript
-- RunwayTestJobStatus exactly.

create table if not exists public.runway_test_jobs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  -- Idempotency: one client_request_id => at most one Runway create POST.
  client_request_id uuid not null,

  source_video_job_id uuid null references public.video_jobs(id) on delete set null,
  source_scene_id text not null,
  source_image_bucket text not null,
  source_image_path text not null,

  motion_prompt text not null,
  provider text not null default 'runway',
  model text not null,
  duration_seconds int not null,
  ratio text not null,

  runway_task_id text null,

  status text not null default 'created'
    check (status in (
      'created',
      'pending',
      'running',
      'succeeded',
      'failed',
      'cancelled',
      'download_failed'
    )),

  estimated_credits numeric null,
  estimated_cost_usd numeric null,

  output_bucket text null,
  output_path text null,

  error_message text null,
  failure_code text null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz null,

  constraint runway_test_jobs_client_request_id_key unique (client_request_id)
);

create index if not exists runway_test_jobs_project_created_idx
  on public.runway_test_jobs (project_id, created_at desc);

create index if not exists runway_test_jobs_runway_task_id_idx
  on public.runway_test_jobs (runway_task_id)
  where runway_task_id is not null;

alter table public.runway_test_jobs enable row level security;

-- Admin UI uses service_role and scopes by project_id manually.
grant select, insert, update, delete on public.runway_test_jobs to service_role;
revoke all on public.runway_test_jobs from anon, authenticated;

-- Defense in depth for non-service-role access (mirrors production_runs).
create policy runway_test_jobs_select on public.runway_test_jobs
  for select to authenticated
  using (public.owns_project(project_id));

create policy runway_test_jobs_insert on public.runway_test_jobs
  for insert to authenticated
  with check (public.owns_project(project_id));

create policy runway_test_jobs_update on public.runway_test_jobs
  for update to authenticated
  using (public.owns_project(project_id))
  with check (public.owns_project(project_id));

create policy runway_test_jobs_delete on public.runway_test_jobs
  for delete to authenticated
  using (public.owns_project(project_id));

drop trigger if exists set_runway_test_jobs_updated_at on public.runway_test_jobs;
create trigger set_runway_test_jobs_updated_at
  before update on public.runway_test_jobs
  for each row execute function public.set_updated_at();
