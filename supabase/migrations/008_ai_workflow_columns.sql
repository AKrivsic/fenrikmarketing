-- 008_ai_workflow_columns.sql
-- Closes the schema gaps surfaced by the AI workflow layer. No new modules,
-- no business-scope change: only first-class columns for entities the code
-- already produces. Idempotent wherever PostgreSQL allows.

-- ---------------------------------------------------------------------------
-- funnel_stage enum
-- Single Source of Truth funnel stages (human labels Awareness / Problem Aware
-- / Solution Aware / Conversion) stored as lowercase snake_case enum values.
-- "consideration" and "retention" are NOT part of the architecture.
-- (Migration 009 defensively converts any pre-existing legacy enum values.)
-- ---------------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_type where typname = 'funnel_stage') then
    create type funnel_stage as enum (
      'awareness',
      'problem_aware',
      'solution_aware',
      'conversion'
    );
  end if;
end$$;

-- ---------------------------------------------------------------------------
-- 1. content_packages: weekly_strategy_id + funnel_stage
-- ---------------------------------------------------------------------------
alter table content_packages
  add column if not exists weekly_strategy_id uuid
    references content_strategies(id) on delete set null;

alter table content_packages
  add column if not exists funnel_stage funnel_stage;

-- ---------------------------------------------------------------------------
-- 2. Backfill content_packages.weekly_strategy_id from the strategy item.
--    strategy_item_id -> content_strategy_items.strategy_id
--    Rows whose strategy_item_id is NULL stay NULL (reported as unresolved).
-- ---------------------------------------------------------------------------
update content_packages cp
set weekly_strategy_id = csi.strategy_id
from content_strategy_items csi
where cp.strategy_item_id = csi.id
  and cp.weekly_strategy_id is null;

-- Backfill content_packages.funnel_stage from the existing JSONB workaround
-- (package_brief.funnel_stage). Legacy values are mapped to canonical stages
-- (consideration -> problem_aware, retention -> conversion) as a one-time
-- technical migration of old data only.
update content_packages
set funnel_stage = (
  case lower(package_brief->>'funnel_stage')
    when 'awareness' then 'awareness'
    when 'problem_aware' then 'problem_aware'
    when 'solution_aware' then 'solution_aware'
    when 'conversion' then 'conversion'
    when 'consideration' then 'problem_aware'
    when 'retention' then 'conversion'
  end
)::funnel_stage
where funnel_stage is null
  and package_brief ? 'funnel_stage'
  and lower(package_brief->>'funnel_stage') in (
    'awareness', 'problem_aware', 'solution_aware', 'conversion',
    'consideration', 'retention'
  );

-- ---------------------------------------------------------------------------
-- 3. content_strategy_items: funnel_stage
-- ---------------------------------------------------------------------------
alter table content_strategy_items
  add column if not exists funnel_stage funnel_stage;

-- Backfill from brief.funnel_stage (JSONB workaround) with the same canonical
-- mapping of legacy values.
update content_strategy_items
set funnel_stage = (
  case lower(brief->>'funnel_stage')
    when 'awareness' then 'awareness'
    when 'problem_aware' then 'problem_aware'
    when 'solution_aware' then 'solution_aware'
    when 'conversion' then 'conversion'
    when 'consideration' then 'problem_aware'
    when 'retention' then 'conversion'
  end
)::funnel_stage
where funnel_stage is null
  and brief ? 'funnel_stage'
  and lower(brief->>'funnel_stage') in (
    'awareness', 'problem_aware', 'solution_aware', 'conversion',
    'consideration', 'retention'
  );

-- ---------------------------------------------------------------------------
-- 4. platform_type: add google_business (safe if value already exists).
-- ---------------------------------------------------------------------------
alter type platform_type add value if not exists 'google_business';

-- ---------------------------------------------------------------------------
-- 5. content_versions: allow package-level snapshots.
--    - add nullable content_package_id (kept alongside content_item_id)
--    - drop NOT NULL on content_item_id so package-only snapshots are possible
--    - require at least one target via a check constraint
-- ---------------------------------------------------------------------------
alter table content_versions
  add column if not exists content_package_id uuid
    references content_packages(id) on delete cascade;

alter table content_versions
  alter column content_item_id drop not null;

-- Idempotent: drop-if-exists then re-add the check constraint.
alter table content_versions
  drop constraint if exists content_versions_target_check;

alter table content_versions
  add constraint content_versions_target_check
  check (content_item_id is not null or content_package_id is not null);

-- ---------------------------------------------------------------------------
-- 6. Indexes (only where they pay off).
-- ---------------------------------------------------------------------------
create index if not exists idx_packages_weekly_strategy
  on content_packages(weekly_strategy_id);
create index if not exists idx_packages_funnel_stage
  on content_packages(funnel_stage);
create index if not exists idx_strategy_items_funnel_stage
  on content_strategy_items(funnel_stage);
create index if not exists idx_versions_package
  on content_versions(content_package_id, version_no desc);

-- ---------------------------------------------------------------------------
-- 7. RLS: unchanged.
--    content_versions already has a project-scoped policy (owns_project on
--    project_id) which also covers the new content_package_id column. The new
--    FK targets content_packages, itself protected by owns_project. No new
--    access path is introduced, so no RLS update is required.
-- ---------------------------------------------------------------------------
