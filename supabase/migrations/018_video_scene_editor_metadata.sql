-- Video Scene Editor MVP — metadata contract (no DDL).
--
-- Scene editor state lives in content_items.generation_metadata.video_scene_editor
-- (JSON). See lib/video-scene-editor/metadata.ts for the shape:
--   source_video_job_id, scenes[], original_scenes{}, image_versions{}, updated_at
--
-- No new tables or columns are required. Storage objects remain in existing
-- video-renders buckets; original generated stills are retained in image_versions
-- with is_original=true and never deleted by the editor.

SELECT 1;
