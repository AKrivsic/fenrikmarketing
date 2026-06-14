-- 017_translation_jobs.sql
-- Asynchronous "Generate translations" — lightweight work queue.
--
-- WHY: the package-level "Generate translations" action used to run EVERY Claude
-- localization call inline inside one Vercel server action (platforms x target
-- languages). After a few packages a single request exceeded the 300s function
-- limit and timed out, even though the video callbacks kept arriving afterwards.
--
-- This table turns that work into small, resumable units. One row per
-- (source approved primary item, target language). The server action only marks
-- rows `pending` and returns immediately; a background endpoint claims and
-- processes them one at a time, reusing the proven item-level workflow
-- (runGenerateLanguageVariantsForItem) for a SINGLE language per row.
--
-- It is a thin TRACKING/queue layer over the existing pipeline
-- (content_items / video_jobs). It introduces NO new AI, no video worker change
-- and no n8n internals. The real dedupe still lives in the item-level workflow
-- (variant content_items by source + language, variant video_jobs by package +
-- language); this table never creates content rows itself.
--
-- Status values are a CHECKed text column (not a new enum) so this migration is
-- fully self-contained and additive, mirroring production_runs (migration 015).

create table translation_jobs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  package_id uuid not null references content_packages(id) on delete cascade,

  -- The APPROVED primary content item to localize (language IS NULL). The work
  -- unit is (this item, target language); processing reuses the item-level
  -- workflow scoped to the single language below.
  source_content_item_id uuid not null references content_items(id) on delete cascade,

  -- The source item's platform, kept for display + TikTok-first ordering. Free
  -- text mirrors content_items.platform without coupling to the enum.
  platform text not null,

  -- Target language for THIS unit (never the project's primary language).
  language language_code not null,

  status text not null default 'pending'
    check (status in ('pending', 'processing', 'completed', 'failed')),

  -- Incremented on each claim so a permanently failing unit is visible.
  attempts int not null default 0,
  -- Surfaced when the localization for this unit failed.
  error_message text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Dedupe / idempotent enqueue: at most one queue row per (source item, target
-- language). A second "Generate translations" click upserts onto this and never
-- creates a duplicate unit.
create unique index uq_translation_jobs_source_language
  on translation_jobs (source_content_item_id, language);

-- The processor claims the oldest pending (or stale processing) row.
create index idx_translation_jobs_project_status
  on translation_jobs (project_id, status, created_at);
create index idx_translation_jobs_package
  on translation_jobs (package_id);

-- ---------------------------------------------------------------------------
-- RLS — same owns_project() model as every other project-scoped table
-- (migration 005). The processor + admin reads use the service-role client,
-- which bypasses RLS and scopes by project_id manually.
-- ---------------------------------------------------------------------------
alter table translation_jobs enable row level security;

create policy "translation_jobs project access"
on translation_jobs
for all
using (owns_project(project_id))
with check (owns_project(project_id));

-- updated_at trigger (reuse set_updated_at() from migration 007). The processor
-- relies on updated_at to detect a stuck `processing` row for recovery.
create trigger translation_jobs_set_updated_at
before update on translation_jobs
for each row
execute function set_updated_at();
