-- Race-safe slot for one language-variant video job per (project, package, language).
-- Failed jobs do not block a new slot; only queued/processing/completed count.
-- Retries use retryVideoJob, not this path.

create or replace function claim_variant_video_slot(
  p_project_id uuid,
  p_package_id uuid,
  p_language language_code
) returns boolean
language plpgsql
security invoker
set search_path = public
as $$
declare
  lock_key1 int;
  lock_key2 int;
begin
  lock_key1 := hashtext(p_package_id::text);
  lock_key2 := hashtext(p_language::text);
  perform pg_advisory_xact_lock(lock_key1, lock_key2);

  return not exists (
    select 1
    from video_jobs vj
    inner join content_items ci on ci.id = vj.content_item_id
    where vj.project_id = p_project_id
      and ci.package_id = p_package_id
      and ci.language = p_language
      and ci.language is not null
      and vj.status in ('queued', 'processing', 'completed')
  );
end;
$$;

-- Atomically claims the slot (transaction-scoped lock) and inserts the job row.
-- Returns the new video_jobs.id, or null when another active job already exists.
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
    provider,
    status,
    input
  )
  values (
    p_project_id,
    p_content_item_id,
    'video_engine',
    'queued',
    p_input
  )
  returning id into new_id;

  return new_id;
end;
$$;

grant execute on function claim_variant_video_slot(uuid, uuid, language_code)
  to service_role;
grant execute on function insert_variant_video_job_if_slot_available(
  uuid, uuid, language_code, uuid, jsonb
) to service_role;
