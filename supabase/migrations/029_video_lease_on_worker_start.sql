-- Variant 1 video lease: lease starts when the worker begins render, not at
-- dispatch/enqueue. claim_video_job_for_dispatch keeps jobs queued with no
-- lease; claim_video_job_for_worker transitions queued → processing + lease.

-- ---------------------------------------------------------------------------
-- Dispatch prepare: authorize enqueue without starting the lease clock.
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
  job_status text;
  job_lease timestamptz;
  job_updated timestamptz;
  job_output jsonb;
  can_dispatch boolean := false;
begin
  -- owner_token kept for API compatibility with callers; lease is not taken here.
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

grant execute on function claim_video_job_for_dispatch(uuid, uuid, text, int, int)
  to service_role;
grant execute on function claim_video_job_for_worker(uuid, uuid, text, int, int)
  to service_role;
