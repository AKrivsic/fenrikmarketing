-- Detection only — do NOT auto-mutate production.
-- Video-required production run items marked completed with zero video_jobs.
--
-- Usage (Supabase SQL editor or psql):
--   See reports/concept-fidelity-production-fix.md §13

WITH video_required_runs AS (
  SELECT
    id,
    project_id,
    COALESCE(
      (requested_config->'plan'->>'videoCount')::int,
      CASE
        WHEN jsonb_typeof(requested_config->'plan'->'platformOutputs') = 'array'
          THEN (
            SELECT count(*)::int
            FROM jsonb_array_elements(requested_config->'plan'->'platformOutputs') o
            WHERE o->>'kind' = 'video'
          )
        ELSE 1
      END
    ) AS video_count
  FROM production_runs
),
pkgs AS (
  SELECT
    pri.production_run_id,
    pri.id AS run_item_id,
    pri.status AS item_status,
    pri.content_package_id,
    cp.id AS package_id,
    cp.created_at AS package_created_at,
    (
      SELECT count(*)
      FROM content_items ci
      JOIN video_jobs vj ON vj.content_item_id = ci.id
      WHERE ci.package_id = cp.id
    ) AS job_count
  FROM production_run_items pri
  JOIN content_packages cp ON cp.id = pri.content_package_id
  JOIN video_required_runs r
    ON r.id = pri.production_run_id
   AND r.video_count > 0
)
SELECT
  production_run_id,
  run_item_id,
  package_id,
  item_status,
  job_count,
  package_created_at
FROM pkgs
WHERE item_status = 'completed'
  AND job_count = 0
ORDER BY package_created_at DESC;
