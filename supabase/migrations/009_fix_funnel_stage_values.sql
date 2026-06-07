-- 009_fix_funnel_stage_values.sql
-- Defensive, idempotent fix that guarantees the funnel_stage enum contains
-- EXACTLY the canonical Single Source of Truth values:
--   awareness, problem_aware, solution_aware, conversion
--
-- It only does work on databases where an earlier 008 was applied with the
-- legacy values (consideration / retention). On a fresh database (008 already
-- creates the canonical enum) this migration is a no-op.
--
-- PostgreSQL cannot drop a value from an enum in place, so when legacy values
-- exist we recreate the type via a text round-trip on the dependent columns.
-- Legacy values are remapped as a one-time technical migration of old data:
--   consideration -> problem_aware
--   retention     -> conversion

do $$
begin
  if exists (
    select 1
    from pg_enum e
    join pg_type t on t.oid = e.enumtypid
    where t.typname = 'funnel_stage'
      and e.enumlabel in ('consideration', 'retention')
  ) then
    -- 1. Detach the columns from the enum type.
    alter table content_packages
      alter column funnel_stage type text using funnel_stage::text;
    alter table content_strategy_items
      alter column funnel_stage type text using funnel_stage::text;

    -- 2. Remap legacy values to canonical ones (technical migration only).
    update content_packages
      set funnel_stage = 'problem_aware' where funnel_stage = 'consideration';
    update content_packages
      set funnel_stage = 'conversion' where funnel_stage = 'retention';
    update content_strategy_items
      set funnel_stage = 'problem_aware' where funnel_stage = 'consideration';
    update content_strategy_items
      set funnel_stage = 'conversion' where funnel_stage = 'retention';

    -- 3. Recreate the enum with exactly the canonical values.
    drop type funnel_stage;
    create type funnel_stage as enum (
      'awareness',
      'problem_aware',
      'solution_aware',
      'conversion'
    );

    -- 4. Re-attach the columns to the canonical enum type.
    alter table content_packages
      alter column funnel_stage type funnel_stage using funnel_stage::funnel_stage;
    alter table content_strategy_items
      alter column funnel_stage type funnel_stage using funnel_stage::funnel_stage;
  end if;
end$$;

-- After this migration the enum no longer contains consideration/retention,
-- so those values can no longer be stored (the enum itself is the constraint;
-- no additional CHECK is required).
