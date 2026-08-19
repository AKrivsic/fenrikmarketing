-- 038_ai_media_benchmark_runs.sql
-- Internal admin Benchmark Lab runs (video / voice / sound / final_reel).
-- Not production routing. One paid provider create per client_request_id.

create table if not exists public.ai_media_benchmark_runs (
  id uuid primary key default gen_random_uuid(),
  case_id text not null,
  test_type text not null
    check (test_type in ('video', 'voice', 'sound', 'final_reel')),
  audio_role text not null
    check (audio_role in (
      'none',
      'scene_model_audio',
      'voiceover',
      'ambient_sfx',
      'music_bed'
    )),
  project_id uuid null references public.projects(id) on delete set null,
  client_request_id uuid not null,

  source_video_job_id uuid null references public.video_jobs(id) on delete set null,
  source_scene_id text null,
  source_image_bucket text null,
  source_image_path text null,

  provider text not null,
  model text not null,
  voice_id text null,
  settings jsonb not null default '{}'::jsonb,
  provider_task_id text null,

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
  duration_seconds numeric null,
  latency_ms int null,
  output_contains_audio boolean null,

  output_bucket text null,
  output_path text null,

  error_message text null,
  failure_code text null,

  rating int null
    check (rating is null or (rating >= 1 and rating <= 5)),
  note text null
    check (note is null or char_length(note) <= 500),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz null,

  constraint ai_media_benchmark_runs_client_request_id_key unique (client_request_id)
);

create index if not exists ai_media_benchmark_runs_case_type_created_idx
  on public.ai_media_benchmark_runs (case_id, test_type, created_at desc);

create index if not exists ai_media_benchmark_runs_project_created_idx
  on public.ai_media_benchmark_runs (project_id, created_at desc);

alter table public.ai_media_benchmark_runs enable row level security;

grant select, insert, update, delete on public.ai_media_benchmark_runs to service_role;
revoke all on public.ai_media_benchmark_runs from anon, authenticated;

create policy ai_media_benchmark_runs_select on public.ai_media_benchmark_runs
  for select to authenticated
  using (project_id is not null and public.owns_project(project_id));

create policy ai_media_benchmark_runs_insert on public.ai_media_benchmark_runs
  for insert to authenticated
  with check (project_id is not null and public.owns_project(project_id));

create policy ai_media_benchmark_runs_update on public.ai_media_benchmark_runs
  for update to authenticated
  using (project_id is not null and public.owns_project(project_id))
  with check (project_id is not null and public.owns_project(project_id));

create policy ai_media_benchmark_runs_delete on public.ai_media_benchmark_runs
  for delete to authenticated
  using (project_id is not null and public.owns_project(project_id));

drop trigger if exists set_ai_media_benchmark_runs_updated_at on public.ai_media_benchmark_runs;
create trigger set_ai_media_benchmark_runs_updated_at
  before update on public.ai_media_benchmark_runs
  for each row execute function public.set_updated_at();
