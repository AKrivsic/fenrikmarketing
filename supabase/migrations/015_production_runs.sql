-- 015_production_runs.sql
-- One-Button Content Production — run tracking (Package Based Model, V3).
--
-- A production run is the user-facing "Generate Content" action: it records
-- WHAT was requested (config + totals), WHAT is running, WHAT was generated and
-- WHAT failed. It is a thin TRACKING layer over the existing generation
-- pipeline (content_packages / content_items / video_jobs) — it introduces NO
-- new AI, video worker, storage or n8n internals. Results are reconciled back
-- onto run items from the real content rows the existing pipeline creates.
--
-- V3 — Package Based Model. A run is driven by a SINGLE quantity:
--   package_count, where 1 package = 1 theme = 1 video concept = 1 video.
-- Selected platforms + per-platform output multipliers only decide HOW MANY
-- outputs each package yields per platform; they never change the number of
-- packages/videos. The full config (platforms + multipliers) and the derived
-- plan live in requested_config jsonb.
--
-- Status values are kept as a CHECKed text column (not a new enum) so this
-- migration is fully self-contained and additive.

-- ---------------------------------------------------------------------------
-- production_runs — one row per "Generate Content" click.
-- ---------------------------------------------------------------------------
create table production_runs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,

  status text not null default 'queued'
    check (status in ('queued', 'running', 'completed', 'failed')),

  -- The submitted config (package_count + selected platforms + multipliers)
  -- plus the derived plan (per-platform outputs + totals).
  requested_config jsonb not null default '{}'::jsonb,

  -- V3 primary quantity: number of content packages (= videos) requested.
  package_count int not null default 0,

  -- requested_total mirrors the number of run items (one per package), kept for
  -- the run-level "generated / requested" counter.
  requested_total int not null default 0,
  generated_total int not null default 0,
  failed_total int not null default 0,

  -- Surfaced when the run could not be triggered (e.g. n8n not configured).
  error_message text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- production_run_items — V3: one row per PACKAGE (= one video concept), not per
-- platform slot. Per-platform output counts are derived from the run's
-- multipliers in requested_config, so they need no rows of their own.
-- content_package_id / content_item_id / video_job_id are filled in during
-- reconciliation as the existing pipeline produces the matching real rows.
-- ---------------------------------------------------------------------------
create table production_run_items (
  id uuid primary key default gen_random_uuid(),
  production_run_id uuid not null references production_runs(id) on delete cascade,
  project_id uuid not null references projects(id) on delete cascade,

  -- For a package item this is the package's primary video platform (the video
  -- the package produces). Free text (not platform_type) so non-enum surfaces
  -- like "x" can never break the insert.
  platform text not null,
  content_type text not null check (content_type in ('video', 'text')),

  status text not null default 'queued'
    check (status in ('queued', 'running', 'completed', 'failed')),

  content_package_id uuid references content_packages(id) on delete set null,
  content_item_id uuid references content_items(id) on delete set null,
  video_job_id uuid references video_jobs(id) on delete set null,

  error_message text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_production_runs_project on production_runs (project_id, created_at desc);
create index idx_production_run_items_run on production_run_items (production_run_id);
create index idx_production_run_items_project on production_run_items (project_id);

-- ---------------------------------------------------------------------------
-- RLS — same owns_project() model as every other project-scoped table
-- (migration 005). The admin UI uses the service-role client which bypasses
-- RLS and scopes by project_id manually, exactly like the other admin reads.
-- ---------------------------------------------------------------------------
alter table production_runs enable row level security;
alter table production_run_items enable row level security;

create policy "production_runs project access"
on production_runs
for all
using (owns_project(project_id))
with check (owns_project(project_id));

create policy "production_run_items project access"
on production_run_items
for all
using (owns_project(project_id))
with check (owns_project(project_id));

-- ---------------------------------------------------------------------------
-- updated_at triggers (reuse set_updated_at() from migration 007).
-- ---------------------------------------------------------------------------
create trigger production_runs_set_updated_at
before update on production_runs
for each row
execute function set_updated_at();

create trigger production_run_items_set_updated_at
before update on production_run_items
for each row
execute function set_updated_at();
