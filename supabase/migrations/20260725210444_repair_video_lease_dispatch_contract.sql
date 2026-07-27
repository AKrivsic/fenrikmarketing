-- Repair: live claim_video_job_for_dispatch drifted back to 025 semantics
-- (processing + lease at enqueue) while Variant 1 app/worker expected queued
-- without lease. Incident: production run e6469382-a897-42b7-88fe-2d650b778d42.
--
-- This migration re-applies the Variant 1 contract with explicit fingerprints
-- and adds assert_video_lease_contract() for deployment gates.

-- ---------------------------------------------------------------------------
-- Dispatch prepare: authorize enqueue WITHOUT starting the lease clock.
-- CONTRACT FINGERPRINT: VIDEO_LEASE_CONTRACT=dispatch_v1_queued_no_lease
-- ---------------------------------------------------------------------------
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
  -- VIDEO_LEASE_CONTRACT=dispatch_v1_queued_no_lease
  job_status text;
  job_lease timestamptz;
  job_updated timestamptz;
  job_output jsonb;
  can_dispatch boolean := false;
begin
  -- owner_token kept for API compatibility; lease is not taken here.
  if p_owner_token is null or length(trim(p_owner_token)) = 0 then
    raise exception 'owner_token required';
  end if;
  if p_legacy_stale_minutes is null or p_legacy_stale_minutes < 1 then
    p_legacy_stale_minutes := 30;
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

  if job_status = 'processing'
     and job_output ? 'mp4_url'
     and nullif(job_output->>'mp4_url', '') is not null then
    return jsonb_build_object(
      'status', 'artifacts_ready',
      'output', job_output
    );
  end if;

  if job_status = 'queued' then
    can_dispatch := true;
  elsif job_status = 'processing' then
    -- Live worker lease → busy (do not double-enqueue).
    -- Expired / legacy processing → reset to queued so a worker can reclaim.
    if job_lease is not null then
      can_dispatch := job_lease < now();
    else
      can_dispatch :=
        job_updated < now() - make_interval(mins => p_legacy_stale_minutes);
    end if;
  end if;

  if not can_dispatch then
    return jsonb_build_object(
      'status', 'busy',
      'job_status', job_status,
      'lease_expires_at', job_lease
    );
  end if;

  -- Stay (or return to) queued with no lease. Lease starts only in
  -- claim_video_job_for_worker when render actually begins.
  update video_jobs
  set
    status = 'queued',
    lease_owner = null,
    lease_expires_at = null,
    error_message = null
  where id = p_job_id
    and project_id = p_project_id;

  return jsonb_build_object(
    'status', 'claimed',
    'lease_owner', null,
    'lease_expires_at', null,
    'job_status', 'queued'
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Worker claim: queued → processing + lease (or reclaim expired processing).
-- CONTRACT FINGERPRINT: VIDEO_LEASE_CONTRACT=worker_v1_processing_with_lease
-- ---------------------------------------------------------------------------
create or replace function claim_video_job_for_worker(
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
  -- VIDEO_LEASE_CONTRACT=worker_v1_processing_with_lease
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
  if p_legacy_stale_minutes is null or p_legacy_stale_minutes < 1 then
    p_legacy_stale_minutes := 30;
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
      can_claim :=
        job_updated < now() - make_interval(mins => p_legacy_stale_minutes);
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

-- ---------------------------------------------------------------------------
-- Deployment safety: inspect live function bodies for contract fingerprints.
-- ---------------------------------------------------------------------------
create or replace function assert_video_lease_contract()
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  dispatch_src text;
  worker_src text;
  errors text[] := array[]::text[];
begin
  select p.prosrc into dispatch_src
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.proname = 'claim_video_job_for_dispatch'
  limit 1;

  select p.prosrc into worker_src
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.proname = 'claim_video_job_for_worker'
  limit 1;

  if dispatch_src is null then
    errors := array_append(errors, 'claim_video_job_for_dispatch missing');
  else
    if position('VIDEO_LEASE_CONTRACT=dispatch_v1_queued_no_lease' in dispatch_src) = 0 then
      errors := array_append(
        errors,
        'dispatch missing fingerprint VIDEO_LEASE_CONTRACT=dispatch_v1_queued_no_lease'
      );
    end if;
    if position('lease_owner = null' in dispatch_src) = 0 then
      errors := array_append(errors, 'dispatch must clear lease_owner');
    end if;
    if position('lease_until := now()' in dispatch_src) > 0 then
      errors := array_append(
        errors,
        'dispatch must not assign lease_until (old 025 contract)'
      );
    end if;
    if position('can_dispatch' in dispatch_src) = 0 then
      errors := array_append(errors, 'dispatch must use can_dispatch (Variant 1)');
    end if;
  end if;

  if worker_src is null then
    errors := array_append(errors, 'claim_video_job_for_worker missing');
  else
    if position('VIDEO_LEASE_CONTRACT=worker_v1_processing_with_lease' in worker_src) = 0 then
      errors := array_append(
        errors,
        'worker missing fingerprint VIDEO_LEASE_CONTRACT=worker_v1_processing_with_lease'
      );
    end if;
    if position('lease_until := now()' in worker_src) = 0 then
      errors := array_append(errors, 'worker must assign lease_until');
    end if;
    if position('status = ''processing''' in worker_src) = 0 then
      errors := array_append(errors, 'worker must set status processing');
    end if;
  end if;

  return jsonb_build_object(
    'ok', coalesce(array_length(errors, 1), 0) = 0,
    'contract', 'video_lease_v1',
    'errors', to_jsonb(errors)
  );
end;
$$;

grant execute on function claim_video_job_for_dispatch(uuid, uuid, text, int, int)
  to service_role;
grant execute on function claim_video_job_for_worker(uuid, uuid, text, int, int)
  to service_role;
grant execute on function assert_video_lease_contract()
  to service_role;
