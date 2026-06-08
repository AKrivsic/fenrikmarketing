-- 013_content_package_idempotence.sql
-- Task 2 — durable idempotence for content packages.
--
-- One content package per strategy_item_id, enforced by the DB so that not even
-- a concurrent retry (duplicate n8n webhook delivery, re-trigger, worker
-- restart) can create two packages for the same strategy item. The application
-- already does a best-effort idempotence pre-check, but a pre-check loses races;
-- only a unique constraint is durable.

-- ---------------------------------------------------------------------------
-- 1. Resolve existing duplicates SAFELY (no data loss).
--    Keep the OLDEST package per strategy_item_id as canonical (this matches the
--    application, which treats the oldest row as canonical). Newer duplicates
--    are DETACHED by nulling their strategy_item_id rather than deleted, so
--    their content_items / video_jobs / asset_usage stay intact. A detached
--    package is simply no longer linked to the strategy item (and no longer
--    returned by the idempotence lookup), which frees the unique constraint.
-- ---------------------------------------------------------------------------
with ranked as (
  select
    id,
    row_number() over (
      partition by strategy_item_id
      order by created_at asc, id asc
    ) as rn
  from content_packages
  where strategy_item_id is not null
)
update content_packages cp
set strategy_item_id = null
from ranked
where cp.id = ranked.id
  and ranked.rn > 1;

-- ---------------------------------------------------------------------------
-- 2. Enforce one package per strategy item.
--    Partial unique index: rows with strategy_item_id IS NULL (detached /
--    ad-hoc packages) are intentionally excluded, so multiple NULLs are allowed
--    while every non-null strategy_item_id is unique.
-- ---------------------------------------------------------------------------
create unique index if not exists uniq_content_packages_strategy_item
  on content_packages (strategy_item_id)
  where strategy_item_id is not null;
