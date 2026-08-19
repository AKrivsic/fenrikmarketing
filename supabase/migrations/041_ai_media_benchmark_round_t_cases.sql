-- 041_ai_media_benchmark_round_t_cases.sql
-- Atomic authoritative snapshot for Round T text-to-video cases (Step 12E).
-- Prevents race condition where two concurrent first requests compose
-- different prompts and each inserts their own run. Unique (project_id, case_id)
-- guarantees only one snapshot per project+case. Does not alter 038–040.

create table if not exists public.ai_media_benchmark_round_t_cases (
  id uuid primary key default gen_random_uuid(),

  -- Composite key: one snapshot per project+case.
  project_id uuid not null references public.projects(id) on delete cascade,
  case_id    text not null,

  -- Snapshot fields (server-composed, never from the browser).
  prompt_text          text    not null,
  scene_idea_id        text    not null,
  core_idea            text    not null,
  brand_visual_profile jsonb   not null,
  duration_seconds     numeric not null,
  ratio                text    not null,

  -- Deterministic fingerprint of the 6 snapshot fields above.
  fingerprint text not null,

  -- Attribution: which run and model first locked this case.
  locked_by_run_id uuid null references public.ai_media_benchmark_runs(id) on delete set null,
  locked_by_model  text null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- Atomic uniqueness: only one snapshot per project+case.
  constraint ai_media_benchmark_round_t_cases_project_case_key
    unique (project_id, case_id)
);

create index if not exists ai_media_benchmark_round_t_cases_project_idx
  on public.ai_media_benchmark_round_t_cases (project_id, created_at desc);

alter table public.ai_media_benchmark_round_t_cases enable row level security;

grant select, insert, update, delete on public.ai_media_benchmark_round_t_cases to service_role;
revoke all on public.ai_media_benchmark_round_t_cases from anon, authenticated;

create policy ai_media_benchmark_round_t_cases_select
  on public.ai_media_benchmark_round_t_cases
  for select to authenticated
  using (public.owns_project(project_id));

create policy ai_media_benchmark_round_t_cases_insert
  on public.ai_media_benchmark_round_t_cases
  for insert to authenticated
  with check (public.owns_project(project_id));

create policy ai_media_benchmark_round_t_cases_update
  on public.ai_media_benchmark_round_t_cases
  for update to authenticated
  using (public.owns_project(project_id))
  with check (public.owns_project(project_id));

drop trigger if exists set_ai_media_benchmark_round_t_cases_updated_at
  on public.ai_media_benchmark_round_t_cases;
create trigger set_ai_media_benchmark_round_t_cases_updated_at
  before update on public.ai_media_benchmark_round_t_cases
  for each row execute function public.set_updated_at();
