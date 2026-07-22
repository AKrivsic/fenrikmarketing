-- 024_production_run_item_identity.sql
-- Unify production-run settlement identity.
--
-- Fail settlement historically used items[package_index] while success reconcile
-- used packages[i] → items[i]. Those maps diverge when successes and failures
-- interleave, leaving orphan queued slots and a forever-running parent.
--
-- Fix: each production_run_item gets:
--   package_index     — stable slot identity (set at create)
--   strategy_item_id  — FK to the strategy item that drives generation (set at seed)
-- Both fail and success paths resolve the run item by strategy_item_id.

alter table production_run_items
  add column if not exists package_index int,
  add column if not exists strategy_item_id uuid references content_strategy_items(id) on delete set null;

-- Backfill package_index in stable created_at, id order (one per run).
with ranked as (
  select
    id,
    (row_number() over (
      partition by production_run_id
      order by created_at asc, id asc
    ) - 1)::int as idx
  from production_run_items
  where package_index is null
)
update production_run_items pri
set package_index = ranked.idx
from ranked
where pri.id = ranked.id
  and pri.package_index is null;

-- Backfill strategy_item_id from strategy briefs that carry matching package_index.
with links as (
  select
    pri.id as run_item_id,
    csi.id as strategy_item_id
  from production_run_items pri
  join content_strategy_items csi
    on csi.project_id = pri.project_id
   and csi.brief->>'production_run_id' = pri.production_run_id::text
   and (csi.brief->>'package_index')::int = pri.package_index
  where pri.strategy_item_id is null
    and pri.package_index is not null
)
update production_run_items pri
set strategy_item_id = links.strategy_item_id
from links
where pri.id = links.run_item_id
  and pri.strategy_item_id is null;

alter table production_run_items
  alter column package_index set not null;

alter table production_run_items
  drop constraint if exists production_run_items_run_package_index_uniq;

alter table production_run_items
  add constraint production_run_items_run_package_index_uniq
  unique (production_run_id, package_index);

create unique index if not exists production_run_items_run_strategy_item_uniq
  on production_run_items (production_run_id, strategy_item_id)
  where strategy_item_id is not null;

create index if not exists idx_production_run_items_strategy_item
  on production_run_items (strategy_item_id)
  where strategy_item_id is not null;
