-- 035_scene_video_attempts_integrity.sql
-- 7B integrity fixes for scene_video_generation_attempts:
--   * seed → bigint (Runway 0..4294967295)
--   * unique (provider, provider_task_id) when task id present
--   * parent_attempt_id cannot reference self
--   * trigger: parent must match project/video_job/scene

alter table public.scene_video_generation_attempts
  alter column seed type bigint using seed::bigint;

create unique index if not exists scene_video_generation_attempts_provider_task_uidx
  on public.scene_video_generation_attempts (provider, provider_task_id)
  where provider_task_id is not null;

alter table public.scene_video_generation_attempts
  drop constraint if exists scene_video_generation_attempts_parent_not_self;

alter table public.scene_video_generation_attempts
  add constraint scene_video_generation_attempts_parent_not_self
  check (parent_attempt_id is null or parent_attempt_id <> id);

create or replace function public.validate_scene_video_attempt_parent()
returns trigger
language plpgsql
as $$
declare
  parent_row public.scene_video_generation_attempts%rowtype;
begin
  if new.parent_attempt_id is null then
    return new;
  end if;

  if new.parent_attempt_id = new.id then
    raise exception 'parent_attempt_self_reference';
  end if;

  select * into parent_row
  from public.scene_video_generation_attempts
  where id = new.parent_attempt_id;

  if not found then
    raise exception 'parent_attempt_not_found';
  end if;

  if parent_row.project_id is distinct from new.project_id
     or parent_row.video_job_id is distinct from new.video_job_id
     or parent_row.scene_id is distinct from new.scene_id then
    raise exception 'parent_attempt_lineage_mismatch';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_validate_scene_video_attempt_parent
  on public.scene_video_generation_attempts;

create trigger trg_validate_scene_video_attempt_parent
  before insert or update of parent_attempt_id, project_id, video_job_id, scene_id
  on public.scene_video_generation_attempts
  for each row
  execute function public.validate_scene_video_attempt_parent();
