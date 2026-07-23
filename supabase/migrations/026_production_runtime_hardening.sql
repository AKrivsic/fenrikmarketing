-- Phase 6G — Production runtime hardening.
-- Additive: terminal settlement, active-render uniqueness, lease CHECK,
-- translation package match, recovery lease, failure telemetry.
-- Prefer NOT VALID → backfill → VALIDATE. Do not delete historical rows.

-- ---------------------------------------------------------------------------
-- 0. Report helpers (counts captured by apply script / audit report)
-- ---------------------------------------------------------------------------
-- Before/after probes are documented in docs/audits/phase-6g-runtime-hardening.md

-- ---------------------------------------------------------------------------
-- 1. video_jobs: denormalized package_id / language / render_kind + lease CHECK
-- ---------------------------------------------------------------------------

alter table video_jobs
  add column if not exists package_id uuid references content_packages(id) on delete set null,
  add column if not exists render_language language_code,
  add column if not exists render_kind text not null default 'package',
  add column if not exists worker_instance_id text;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'video_jobs_render_kind_check'
  ) then
    alter table video_jobs
      add constraint video_jobs_render_kind_check
      check (render_kind in ('package', 'variant', 'scene'));
  end if;
end$$;

-- Backfill from content_items
update video_jobs vj
set
  package_id = coalesce(vj.package_id, ci.package_id),
  render_language = coalesce(vj.render_language, ci.language),
  render_kind = case
    when vj.render_kind is distinct from 'package' then vj.render_kind
    when ci.language is not null then 'variant'
    when coalesce(vj.input->>'scene_editor', '') in ('true', '1')
      or coalesce(vj.input->>'render_kind', '') = 'scene'
      then 'scene'
    else 'package'
  end
from content_items ci
where ci.id = vj.content_item_id
  and (
    vj.package_id is null
    or vj.render_language is distinct from ci.language
    or (ci.language is not null and vj.render_kind = 'package')
  );

create index if not exists video_jobs_package_id_idx
  on video_jobs (package_id)
  where package_id is not null;

-- Keep denormalized fields in sync on insert/update of content_item_id
create or replace function sync_video_job_package_fields()
returns trigger
language plpgsql
as $$
declare
  item_package uuid;
  item_language language_code;
begin
  if NEW.content_item_id is null then
    return NEW;
  end if;
  select package_id, language
    into item_package, item_language
  from content_items
  where id = NEW.content_item_id;

  if item_package is not null then
    NEW.package_id := coalesce(NEW.package_id, item_package);
  end if;
  if NEW.render_language is null and item_language is not null then
    NEW.render_language := item_language;
  end if;
  if NEW.render_kind = 'package' and item_language is not null then
    NEW.render_kind := 'variant';
  end if;
  return NEW;
end;
$$;

drop trigger if exists trg_sync_video_job_package_fields on video_jobs;
create trigger trg_sync_video_job_package_fields
before insert or update of content_item_id, package_id, render_language, render_kind
on video_jobs
for each row
execute function sync_video_job_package_fields();

-- One active primary package render
create unique index if not exists uniq_active_primary_render_per_package
  on video_jobs (package_id)
  where status in ('queued', 'processing')
    and package_id is not null
    and render_kind = 'package'
    and render_language is null;

-- One active language-variant render per package × language
create unique index if not exists uniq_active_variant_render_per_package_lang
  on video_jobs (package_id, render_language)
  where status in ('queued', 'processing')
    and package_id is not null
    and render_kind = 'variant'
    and render_language is not null;

-- One active scene render per content item
create unique index if not exists uniq_active_scene_render_per_item
  on video_jobs (content_item_id)
  where status in ('queued', 'processing')
    and content_item_id is not null
    and render_kind = 'scene';

-- Normalize ownerless processing (no fabricated live lease):
-- promote if durable mp4, else fail as stale.
update video_jobs
set
  status = 'completed',
  completed_at = coalesce(completed_at, now()),
  lease_expires_at = coalesce(lease_expires_at, now()),
  error_message = null
where status = 'processing'
  and (lease_owner is null or btrim(lease_owner) = '' or lease_expires_at is null)
  and output ? 'mp4_url'
  and nullif(output->>'mp4_url', '') is not null;

update video_jobs
set
  status = 'failed',
  error_message = coalesce(
    nullif(error_message, ''),
    'Video job stale: processing without lease (phase-6g backfill).'
  ),
  lease_expires_at = coalesce(lease_expires_at, now())
where status = 'processing'
  and (lease_owner is null or btrim(lease_owner) = '' or lease_expires_at is null);

alter table video_jobs
  drop constraint if exists video_jobs_processing_requires_lease;

alter table video_jobs
  add constraint video_jobs_processing_requires_lease
  check (
    status <> 'processing'
    or (
      lease_owner is not null
      and length(btrim(lease_owner)) > 0
      and lease_expires_at is not null
    )
  ) not valid;

alter table video_jobs
  validate constraint video_jobs_processing_requires_lease;

-- ---------------------------------------------------------------------------
-- 2. Terminal run settlement RPC + guards
-- ---------------------------------------------------------------------------

create or replace function recompute_production_run_counters(p_run_id uuid)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_requested int;
  v_generated int;
  v_failed int;
begin
  select
    count(*)::int,
    count(*) filter (where status = 'completed')::int,
    count(*) filter (where status = 'failed')::int
  into v_requested, v_generated, v_failed
  from production_run_items
  where production_run_id = p_run_id;

  update production_runs
  set
    requested_total = v_requested,
    generated_total = v_generated,
    failed_total = v_failed
  where id = p_run_id;

  return jsonb_build_object(
    'requested_total', v_requested,
    'generated_total', v_generated,
    'failed_total', v_failed
  );
end;
$$;

-- Settle open children then mark parent terminal (single transaction).
create or replace function settle_production_run_terminal(
  p_run_id uuid,
  p_status text,
  p_error_message text default null,
  p_item_error_message text default null
) returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  run_row production_runs%rowtype;
  item_msg text;
  open_count int;
  counters jsonb;
begin
  if p_status not in ('completed', 'failed', 'cancelled') then
    raise exception 'settle_production_run_terminal: invalid status %', p_status;
  end if;

  select * into run_row
  from production_runs
  where id = p_run_id
  for update;

  if not found then
    raise exception 'production run % not found', p_run_id;
  end if;

  item_msg := coalesce(
    nullif(p_item_error_message, ''),
    case
      when p_status = 'cancelled' then 'Zastaveno operátorem.'
      else coalesce(nullif(p_error_message, ''), 'Běh ukončen se otevřenými položkami.')
    end
  );

  update production_run_items
  set
    status = 'failed',
    error_message = coalesce(nullif(error_message, ''), item_msg)
  where production_run_id = p_run_id
    and status in ('queued', 'running');

  get diagnostics open_count = row_count;

  counters := recompute_production_run_counters(p_run_id);

  update production_runs
  set
    status = p_status,
    error_message = case
      when p_status in ('failed', 'cancelled') then
        coalesce(nullif(p_error_message, ''), error_message)
      else error_message
    end
  where id = p_run_id;

  return jsonb_build_object(
    'run_id', p_run_id,
    'status', p_status,
    'settled_open_items', open_count,
    'counters', counters
  );
end;
$$;

grant execute on function recompute_production_run_counters(uuid) to service_role;
grant execute on function settle_production_run_terminal(uuid, text, text, text) to service_role;

-- Historical backfill: terminal parents with open children
-- completed + open → treat conservatively as failed children (do not delete)
do $$
declare
  r record;
  before_open int;
  after_open int;
begin
  select count(*) into before_open
  from production_runs pr
  join production_run_items pri on pri.production_run_id = pr.id
  where pr.status in ('completed', 'failed', 'cancelled')
    and pri.status in ('queued', 'running');

  for r in
    select id, status, error_message
    from production_runs
    where status in ('failed', 'cancelled')
      and exists (
        select 1 from production_run_items pri
        where pri.production_run_id = production_runs.id
          and pri.status in ('queued', 'running')
      )
  loop
    update production_run_items
    set
      status = 'failed',
      error_message = coalesce(
        nullif(error_message, ''),
        case
          when r.status = 'cancelled' then 'Zastaveno operátorem.'
          else 'Historická oprava (phase-6g): rodičovský běh byl terminální s otevřenou položkou.'
        end
      )
    where production_run_id = r.id
      and status in ('queued', 'running');
    perform recompute_production_run_counters(r.id);
  end loop;

  -- completed parents with open children: fail open children, keep completed if
  -- at least one completed item remains; otherwise demote parent to failed.
  for r in
    select id
    from production_runs
    where status = 'completed'
      and exists (
        select 1 from production_run_items pri
        where pri.production_run_id = production_runs.id
          and pri.status in ('queued', 'running')
      )
  loop
    update production_run_items
    set
      status = 'failed',
      error_message = coalesce(
        nullif(error_message, ''),
        'Historická oprava (phase-6g): completed běh měl otevřenou položku.'
      )
    where production_run_id = r.id
      and status in ('queued', 'running');
    perform recompute_production_run_counters(r.id);
  end loop;

  select count(*) into after_open
  from production_runs pr
  join production_run_items pri on pri.production_run_id = pr.id
  where pr.status in ('completed', 'failed', 'cancelled')
    and pri.status in ('queued', 'running');

  raise notice 'phase-6g terminal open items before=% after=%', before_open, after_open;
end$$;

-- Backstop triggers (after writers use settle RPC)
create or replace function enforce_terminal_run_has_no_open_items()
returns trigger
language plpgsql
as $$
begin
  if NEW.status in ('completed', 'failed', 'cancelled')
     and (TG_OP = 'INSERT' or OLD.status is distinct from NEW.status) then
    if exists (
      select 1 from production_run_items
      where production_run_id = NEW.id
        and status in ('queued', 'running')
    ) then
      raise exception
        'terminal production_run % still has open items', NEW.id
        using errcode = 'check_violation';
    end if;
  end if;
  return NEW;
end;
$$;

drop trigger if exists trg_terminal_run_no_open_items on production_runs;
create trigger trg_terminal_run_no_open_items
before insert or update of status on production_runs
for each row
execute function enforce_terminal_run_has_no_open_items();

create or replace function enforce_no_open_item_under_terminal_run()
returns trigger
language plpgsql
as $$
declare
  parent_status text;
begin
  if NEW.status in ('queued', 'running') then
    select status into parent_status
    from production_runs
    where id = NEW.production_run_id;
    if parent_status in ('completed', 'failed', 'cancelled') then
      raise exception
        'cannot open item % under terminal run %', NEW.id, NEW.production_run_id
        using errcode = 'check_violation';
    end if;
  end if;
  return NEW;
end;
$$;

drop trigger if exists trg_no_open_item_under_terminal_run on production_run_items;
create trigger trg_no_open_item_under_terminal_run
before insert or update of status on production_run_items
for each row
execute function enforce_no_open_item_under_terminal_run();

-- ---------------------------------------------------------------------------
-- 3. Translation package must match source item package
-- ---------------------------------------------------------------------------

update translation_jobs tj
set package_id = ci.package_id
from content_items ci
where ci.id = tj.source_content_item_id
  and ci.package_id is not null
  and tj.package_id is distinct from ci.package_id;

create or replace function enforce_translation_package_matches_source()
returns trigger
language plpgsql
as $$
declare
  src_package uuid;
begin
  select package_id into src_package
  from content_items
  where id = NEW.source_content_item_id;

  if src_package is distinct from NEW.package_id then
    raise exception
      'translation_jobs.package_id must match source content_items.package_id'
      using errcode = 'check_violation';
  end if;
  return NEW;
end;
$$;

drop trigger if exists trg_translation_package_matches_source on translation_jobs;
create trigger trg_translation_package_matches_source
before insert or update of package_id, source_content_item_id
on translation_jobs
for each row
execute function enforce_translation_package_matches_source();

-- ---------------------------------------------------------------------------
-- 4. Recovery invocation lease (single overlapping recovery)
-- ---------------------------------------------------------------------------

create table if not exists production_runtime_recovery_leases (
  id text primary key default 'global',
  owner_token text not null,
  lease_expires_at timestamptz not null,
  updated_at timestamptz not null default now()
);

alter table production_runtime_recovery_leases enable row level security;

create or replace function claim_production_recovery_lease(
  p_owner_token text,
  p_lease_seconds int default 120
) returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  row_owner text;
  row_lease timestamptz;
  lease_until timestamptz;
begin
  if p_owner_token is null or length(trim(p_owner_token)) = 0 then
    raise exception 'owner_token required';
  end if;
  if p_lease_seconds is null or p_lease_seconds < 30 then
    p_lease_seconds := 120;
  end if;
  lease_until := now() + make_interval(secs => p_lease_seconds);

  perform pg_advisory_xact_lock(hashtext('production_runtime_recovery'));

  select owner_token, lease_expires_at
    into row_owner, row_lease
  from production_runtime_recovery_leases
  where id = 'global'
  for update;

  if found then
    if row_lease > now() and row_owner is distinct from p_owner_token then
      return jsonb_build_object(
        'status', 'busy',
        'owner_token', row_owner,
        'lease_expires_at', row_lease
      );
    end if;
    update production_runtime_recovery_leases
    set owner_token = p_owner_token,
        lease_expires_at = lease_until,
        updated_at = now()
    where id = 'global';
  else
    insert into production_runtime_recovery_leases (id, owner_token, lease_expires_at)
    values ('global', p_owner_token, lease_until);
  end if;

  return jsonb_build_object(
    'status', 'claimed',
    'owner_token', p_owner_token,
    'lease_expires_at', lease_until
  );
end;
$$;

create or replace function release_production_recovery_lease(
  p_owner_token text
) returns boolean
language plpgsql
security invoker
set search_path = public
as $$
begin
  update production_runtime_recovery_leases
  set lease_expires_at = now(),
      updated_at = now()
  where id = 'global'
    and owner_token = p_owner_token;
  return found;
end;
$$;

grant execute on function claim_production_recovery_lease(text, int) to service_role;
grant execute on function release_production_recovery_lease(text) to service_role;

-- ---------------------------------------------------------------------------
-- 5. Package-generation failure telemetry (no package row required)
-- ---------------------------------------------------------------------------

create table if not exists production_run_item_failure_telemetry (
  id uuid primary key default gen_random_uuid(),
  production_run_id uuid references production_runs(id) on delete cascade,
  production_run_item_id uuid references production_run_items(id) on delete set null,
  project_id uuid not null references projects(id) on delete cascade,
  strategy_item_id uuid references content_strategy_items(id) on delete set null,
  owner_token text,
  phase text,
  provider text,
  model text,
  attempt_count int not null default 0,
  duration_ms int,
  input_tokens int,
  output_tokens int,
  estimated_cost_usd numeric(12, 6),
  error_truncated text,
  terminal_classification text,
  created_at timestamptz not null default now()
);

create index if not exists idx_failure_telemetry_run
  on production_run_item_failure_telemetry (production_run_id, created_at desc);
create index if not exists idx_failure_telemetry_strategy
  on production_run_item_failure_telemetry (strategy_item_id, created_at desc);

alter table production_run_item_failure_telemetry enable row level security;

create policy "failure_telemetry project access"
on production_run_item_failure_telemetry
for all
using (owns_project(project_id))
with check (owns_project(project_id));

-- Optional JSON diagnostics column on run items (bounded app writes)
alter table production_run_items
  add column if not exists failure_telemetry jsonb;

-- Recompute all terminal-run counters after backfill
do $$
declare r record;
begin
  for r in
    select id from production_runs
    where status in ('completed', 'failed', 'cancelled')
  loop
    perform recompute_production_run_counters(r.id);
  end loop;
end$$;

-- Update variant insert RPC to stamp package_id / render_kind / language.
create or replace function insert_variant_video_job_if_slot_available(
  p_project_id uuid,
  p_package_id uuid,
  p_language language_code,
  p_content_item_id uuid,
  p_input jsonb
) returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  new_id uuid;
begin
  if not claim_variant_video_slot(p_project_id, p_package_id, p_language) then
    return null;
  end if;

  insert into video_jobs (
    project_id,
    content_item_id,
    package_id,
    render_language,
    render_kind,
    provider,
    status,
    input
  )
  values (
    p_project_id,
    p_content_item_id,
    p_package_id,
    p_language,
    'variant',
    'video_engine',
    'queued',
    p_input
  )
  returning id into new_id;

  return new_id;
exception
  when unique_violation then
    return null;
end;
$$;
