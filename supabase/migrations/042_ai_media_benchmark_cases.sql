-- 042_ai_media_benchmark_cases.sql
-- Shared benchmark case for image-to-video (Round A) runs (Step 12F).
-- Provides an atomic, authoritative snapshot of creative inputs shared by
-- all I2V models in the same case: the uploaded test image, core idea,
-- and motion intent. Analogous to 041 (T2V Round T cases) but for I2V.
-- Does not alter tables 038–041.

create table if not exists public.ai_media_benchmark_cases (
  id uuid primary key default gen_random_uuid(),

  -- One authoritative case per project+case_id.
  project_id uuid not null references public.projects(id) on delete cascade,
  case_id    text not null,

  -- Creative inputs locked for all I2V models in this case.
  core_idea    text    not null,
  motion_intent text   not null,

  -- The test image stored in our video-renders bucket.
  source_image_bucket text not null,
  source_image_path   text not null,

  -- Deterministic fingerprint of core_idea + motion_intent + image path.
  fingerprint text not null,

  -- Attribution: which run and model first locked this case.
  locked_by_run_id uuid null references public.ai_media_benchmark_runs(id) on delete set null,
  locked_by_model  text null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- Atomic uniqueness: one case snapshot per project+case.
  constraint ai_media_benchmark_cases_project_case_key
    unique (project_id, case_id)
);

create index if not exists ai_media_benchmark_cases_project_idx
  on public.ai_media_benchmark_cases (project_id, created_at desc);

alter table public.ai_media_benchmark_cases enable row level security;

grant select, insert, update, delete on public.ai_media_benchmark_cases to service_role;
revoke all on public.ai_media_benchmark_cases from anon, authenticated;

create policy ai_media_benchmark_cases_select
  on public.ai_media_benchmark_cases
  for select to authenticated
  using (public.owns_project(project_id));

create policy ai_media_benchmark_cases_insert
  on public.ai_media_benchmark_cases
  for insert to authenticated
  with check (public.owns_project(project_id));

create policy ai_media_benchmark_cases_update
  on public.ai_media_benchmark_cases
  for update to authenticated
  using (public.owns_project(project_id))
  with check (public.owns_project(project_id));

drop trigger if exists set_ai_media_benchmark_cases_updated_at
  on public.ai_media_benchmark_cases;
create trigger set_ai_media_benchmark_cases_updated_at
  before update on public.ai_media_benchmark_cases
  for each row execute function public.set_updated_at();
