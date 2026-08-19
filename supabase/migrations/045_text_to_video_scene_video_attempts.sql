-- 045_text_to_video_scene_video_attempts.sql
-- Extend scene_video_generation_attempts for Runway text_to_video (Gen-4.5) without breaking I2V rows.

alter table public.scene_video_generation_attempts
  add column if not exists generation_mode text not null default 'image_to_video'
    check (generation_mode in ('image_to_video', 'text_to_video'));

alter table public.scene_video_generation_attempts
  alter column source_image_bucket drop not null;

alter table public.scene_video_generation_attempts
  alter column source_image_path drop not null;

alter table public.scene_video_generation_attempts
  add column if not exists request_fingerprint text null;

alter table public.scene_video_generation_attempts
  add column if not exists required_trimmed_duration_seconds numeric(8, 3) null;

alter table public.scene_video_generation_attempts
  add column if not exists prompt_contract_version int null;

alter table public.scene_video_generation_attempts
  drop constraint if exists scene_video_generation_attempts_mode_source_check;

alter table public.scene_video_generation_attempts
  add constraint scene_video_generation_attempts_mode_source_check
  check (
    (
      generation_mode = 'image_to_video'
      and source_image_bucket is not null
      and source_image_path is not null
    )
    or (
      generation_mode = 'text_to_video'
      and source_image_bucket is null
      and source_image_path is null
    )
  );

create index if not exists scene_video_generation_attempts_t2v_fingerprint_idx
  on public.scene_video_generation_attempts (video_job_id, scene_id, request_fingerprint)
  where generation_mode = 'text_to_video' and request_fingerprint is not null;
