-- Phase 5A — Production runtime: exclusive package-generation claims,
-- video job leases/heartbeats, and durable artifact persistence helpers.
-- Prefer DB ownership + compare-and-set over application-only locks.

-- ---------------------------------------------------------------------------
-- 1. Package generation claims (Invariant 1)
-- ---------------------------------------------------------------------------

create table if not exists content_package_generation_claims (
  strategy_item_id uuid primary key
    references content_strategy_items(id) on delete cascade,
  project_id uuid not null references projects(id) on delete cascade,
  owner_token text not null,
  status text not null
    check (status in ('generating', 'completed', 'failed', 'released')),
  lease_expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists content_package_generation_claims_project_idx
  on content_package_generation_claims (project_id);

create index if not exists content_package_generation_claims_lease_idx
  on content_package_generation_claims (lease_expires_at)
  where status = 'generating';

drop trigger if exists content_package_generation_claims_set_updated_at
  on content_package_generation_claims;
create trigger content_package_generation_claims_set_updated_at
before update on content_package_generation_claims
for each row
execute function set_updated_at();

alter table content_package_generation_claims enable row level security;

-- Service role / admin only (no anon/authenticated policies).

-- claim_package_generation:
--   existing package → { status: 'existing_package', package_id }
--   acquired / renewed stale → { status: 'claimed', owner_token }
--   live foreign owner → { status: 'busy', lease_expires_at }
create or replace function claim_package_generation(
  p_project_id uuid,
  p_strategy_item_id uuid,
  p_owner_token text,
  p_lease_seconds int default 900
) returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  existing_package_id uuid;
  lock_key int;
  row_owner text;
  row_status text;
  row_lease timestamptz;
  lease_until timestamptz;
begin
  if p_owner_token is null or length(trim(p_owner_token)) = 0 then
    raise exception 'owner_token required';
  end if;
  if p_lease_seconds is null or p_lease_seconds < 60 then
    p_lease_seconds := 900;
  end if;

  lock_key := hashtext(p_strategy_item_id::text);
  perform pg_advisory_xact_lock(lock_key);

  select id into existing_package_id
  from content_packages
  where project_id = p_project_id
    and strategy_item_id = p_strategy_item_id
  limit 1;

  if existing_package_id is not null then
    return jsonb_build_object(
      'status', 'existing_package',
      'package_id', existing_package_id
    );
  end if;

  lease_until := now() + make_interval(secs => p_lease_seconds);

  select owner_token, status, lease_expires_at
    into row_owner, row_status, row_lease
  from content_package_generation_claims
  where strategy_item_id = p_strategy_item_id
  for update;

  if found then
    if row_status = 'generating'
       and row_lease > now()
       and row_owner is distinct from p_owner_token then
      return jsonb_build_object(
        'status', 'busy',
        'owner_token', row_owner,
        'lease_expires_at', row_lease
      );
    end if;

    update content_package_generation_claims
    set
      project_id = p_project_id,
      owner_token = p_owner_token,
      status = 'generating',
      lease_expires_at = lease_until
    where strategy_item_id = p_strategy_item_id;

    return jsonb_build_object(
      'status', 'claimed',
      'owner_token', p_owner_token,
      'lease_expires_at', lease_until
    );
  end if;

  insert into content_package_generation_claims (
    strategy_item_id,
    project_id,
    owner_token,
    status,
    lease_expires_at
  ) values (
    p_strategy_item_id,
    p_project_id,
    p_owner_token,
    'generating',
    lease_until
  );

  return jsonb_build_object(
    'status', 'claimed',
    'owner_token', p_owner_token,
    'lease_expires_at', lease_until
  );
end;
$$;

create or replace function renew_package_generation_claim(
  p_strategy_item_id uuid,
  p_owner_token text,
  p_lease_seconds int default 900
) returns boolean
language plpgsql
security invoker
set search_path = public
as $$
declare
  lease_until timestamptz;
begin
  if p_lease_seconds is null or p_lease_seconds < 60 then
    p_lease_seconds := 900;
  end if;
  lease_until := now() + make_interval(secs => p_lease_seconds);

  update content_package_generation_claims
  set lease_expires_at = lease_until
  where strategy_item_id = p_strategy_item_id
    and owner_token = p_owner_token
    and status = 'generating';

  return found;
end;
$$;

create or replace function release_package_generation_claim(
  p_strategy_item_id uuid,
  p_owner_token text,
  p_final_status text default 'released'
) returns boolean
language plpgsql
security invoker
set search_path = public
as $$
begin
  if p_final_status not in ('completed', 'failed', 'released') then
    p_final_status := 'released';
  end if;

  update content_package_generation_claims
  set
    status = p_final_status,
    lease_expires_at = now()
  where strategy_item_id = p_strategy_item_id
    and owner_token = p_owner_token
    and status = 'generating';

  return found;
end;
$$;

grant execute on function claim_package_generation(uuid, uuid, text, int)
  to service_role;
grant execute on function renew_package_generation_claim(uuid, text, int)
  to service_role;
grant execute on function release_package_generation_claim(uuid, text, text)
  to service_role;

-- ---------------------------------------------------------------------------
-- 2. Video job leases (Invariants 2 + 3)
-- ---------------------------------------------------------------------------

alter table video_jobs
  add column if not exists lease_owner text,
  add column if not exists lease_expires_at timestamptz;

create index if not exists video_jobs_lease_expires_idx
  on video_jobs (lease_expires_at)
  where status = 'processing';

-- Atomic claim/reclaim for dispatch. Stale = processing with expired lease
-- (or null lease for legacy rows older than p_legacy_stale_minutes).
create or replace function claim_video_job_for_dispatch(
  p_job_id uuid,
  p_project_id uuid,
  p_owner_token text,
  p_lease_seconds int default 600,
  p_legacy_stale_minutes int default 30
) returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  job_status text;
  job_lease timestamptz;
  job_updated timestamptz;
  job_output jsonb;
  lease_until timestamptz;
  can_claim boolean := false;
begin
  if p_owner_token is null or length(trim(p_owner_token)) = 0 then
    raise exception 'owner_token required';
  end if;
  if p_lease_seconds is null or p_lease_seconds < 60 then
    p_lease_seconds := 600;
  end if;

  select status, lease_expires_at, updated_at, output
    into job_status, job_lease, job_updated, job_output
  from video_jobs
  where id = p_job_id
    and project_id = p_project_id
  for update;

  if not found then
    return jsonb_build_object('status', 'missing');
  end if;

  if job_status in ('completed', 'failed') then
    return jsonb_build_object(
      'status', 'terminal',
      'job_status', job_status,
      'output', coalesce(job_output, '{}'::jsonb)
    );
  end if;

  -- Durable artifacts already present while still processing → promote path.
  if job_status = 'processing'
     and job_output ? 'mp4_url'
     and nullif(job_output->>'mp4_url', '') is not null then
    return jsonb_build_object(
      'status', 'artifacts_ready',
      'output', job_output
    );
  end if;

  if job_status = 'queued' then
    can_claim := true;
  elsif job_status = 'processing' then
    if job_lease is not null then
      can_claim := job_lease < now();
    else
      -- Legacy rows without lease: fall back to updated_at age.
      can_claim := job_updated < now() - make_interval(mins => p_legacy_stale_minutes);
    end if;
  end if;

  if not can_claim then
    return jsonb_build_object(
      'status', 'busy',
      'job_status', job_status,
      'lease_expires_at', job_lease
    );
  end if;

  lease_until := now() + make_interval(secs => p_lease_seconds);

  update video_jobs
  set
    status = 'processing',
    lease_owner = p_owner_token,
    lease_expires_at = lease_until,
    error_message = null
  where id = p_job_id
    and project_id = p_project_id;

  return jsonb_build_object(
    'status', 'claimed',
    'lease_owner', p_owner_token,
    'lease_expires_at', lease_until
  );
end;
$$;

create or replace function renew_video_job_lease(
  p_job_id uuid,
  p_project_id uuid,
  p_owner_token text,
  p_lease_seconds int default 600
) returns boolean
language plpgsql
security invoker
set search_path = public
as $$
declare
  lease_until timestamptz;
begin
  if p_lease_seconds is null or p_lease_seconds < 60 then
    p_lease_seconds := 600;
  end if;
  lease_until := now() + make_interval(secs => p_lease_seconds);

  update video_jobs
  set lease_expires_at = lease_until
  where id = p_job_id
    and project_id = p_project_id
    and status = 'processing'
    and lease_owner = p_owner_token;

  return found;
end;
$$;

-- Persist artifact URLs while still processing (Invariant 2). Does not complete.
create or replace function persist_video_job_artifacts(
  p_job_id uuid,
  p_project_id uuid,
  p_owner_token text,
  p_output jsonb
) returns boolean
language plpgsql
security invoker
set search_path = public
as $$
begin
  update video_jobs
  set output = coalesce(output, '{}'::jsonb) || coalesce(p_output, '{}'::jsonb)
  where id = p_job_id
    and project_id = p_project_id
    and status = 'processing'
    and (lease_owner = p_owner_token or lease_owner is null);

  return found;
end;
$$;

-- Promote processing → completed when durable mp4_url is already in output.
create or replace function promote_video_job_if_artifacts_ready(
  p_job_id uuid,
  p_project_id uuid
) returns boolean
language plpgsql
security invoker
set search_path = public
as $$
begin
  update video_jobs
  set
    status = 'completed',
    completed_at = coalesce(completed_at, now()),
    lease_expires_at = now(),
    error_message = null
  where id = p_job_id
    and project_id = p_project_id
    and status = 'processing'
    and output ? 'mp4_url'
    and nullif(output->>'mp4_url', '') is not null;

  return found;
end;
$$;

grant execute on function claim_video_job_for_dispatch(uuid, uuid, text, int, int)
  to service_role;
grant execute on function renew_video_job_lease(uuid, uuid, text, int)
  to service_role;
grant execute on function persist_video_job_artifacts(uuid, uuid, text, jsonb)
  to service_role;
grant execute on function promote_video_job_if_artifacts_ready(uuid, uuid)
  to service_role;
