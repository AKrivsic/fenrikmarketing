-- 040_ai_media_benchmark_combined_runs.sql
-- Derived 4s combined scenes (video + shared voiceover + optional sound).
-- Not a paid provider lifecycle. Does not alter 038 or 039.

create table if not exists public.ai_media_benchmark_combined_runs (
  id uuid primary key default gen_random_uuid(),
  case_id text not null,
  project_id uuid not null references public.projects(id) on delete cascade,
  client_request_id uuid not null,

  video_run_id uuid not null references public.ai_media_benchmark_runs(id) on delete restrict,
  voice_run_id uuid not null references public.ai_media_benchmark_runs(id) on delete restrict,
  sound_run_id uuid null references public.ai_media_benchmark_runs(id) on delete restrict,

  voiceover_text text null,
  mix_settings jsonb not null default '{}'::jsonb,

  status text not null default 'created'
    check (status in (
      'created',
      'assembling',
      'succeeded',
      'failed'
    )),

  assembly_claim_owner text null,
  assembly_claimed_at timestamptz null,

  output_bucket text null,
  output_path text null,
  duration_seconds numeric null,

  error_message text null,
  failure_code text null,

  rating_image int null
    check (rating_image is null or (rating_image >= 1 and rating_image <= 5)),
  rating_av_fit int null
    check (rating_av_fit is null or (rating_av_fit >= 1 and rating_av_fit <= 5)),
  rating_overall int null
    check (rating_overall is null or (rating_overall >= 1 and rating_overall <= 5)),
  note text null
    check (note is null or char_length(note) <= 500),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz null,

  constraint ai_media_benchmark_combined_runs_client_request_id_key
    unique (client_request_id),
  constraint ai_media_benchmark_combined_runs_distinct_sources
    check (
      video_run_id <> voice_run_id
      and (sound_run_id is null or (
        sound_run_id <> video_run_id and sound_run_id <> voice_run_id
      ))
    ),
  constraint ai_media_benchmark_combined_runs_assembly_claim_integrity
    check (
      (
        status = 'assembling'
        and assembly_claim_owner is not null
        and assembly_claimed_at is not null
      )
      or (
        status <> 'assembling'
        and assembly_claim_owner is null
        and assembly_claimed_at is null
      )
    )
);

create index if not exists ai_media_benchmark_combined_runs_project_created_idx
  on public.ai_media_benchmark_combined_runs (project_id, created_at desc);

create index if not exists ai_media_benchmark_combined_runs_video_run_idx
  on public.ai_media_benchmark_combined_runs (video_run_id);

alter table public.ai_media_benchmark_combined_runs enable row level security;

grant select, insert, update, delete on public.ai_media_benchmark_combined_runs to service_role;
revoke all on public.ai_media_benchmark_combined_runs from anon, authenticated;

create policy ai_media_benchmark_combined_runs_select
  on public.ai_media_benchmark_combined_runs
  for select to authenticated
  using (public.owns_project(project_id));

create policy ai_media_benchmark_combined_runs_insert
  on public.ai_media_benchmark_combined_runs
  for insert to authenticated
  with check (public.owns_project(project_id));

create policy ai_media_benchmark_combined_runs_update
  on public.ai_media_benchmark_combined_runs
  for update to authenticated
  using (public.owns_project(project_id))
  with check (public.owns_project(project_id));

create policy ai_media_benchmark_combined_runs_delete
  on public.ai_media_benchmark_combined_runs
  for delete to authenticated
  using (public.owns_project(project_id));

drop trigger if exists set_ai_media_benchmark_combined_runs_updated_at
  on public.ai_media_benchmark_combined_runs;
create trigger set_ai_media_benchmark_combined_runs_updated_at
  before update on public.ai_media_benchmark_combined_runs
  for each row execute function public.set_updated_at();
