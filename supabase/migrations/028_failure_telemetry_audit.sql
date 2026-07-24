-- Failure telemetry audit trail (additive).
-- Ensures generation_telemetry exists (027 may not have been applied) and adds
-- bounded output forensics for failed package attempts.

alter table production_run_item_failure_telemetry
  add column if not exists generation_telemetry jsonb;

alter table production_run_item_failure_telemetry
  add column if not exists output_hash text;

alter table production_run_item_failure_telemetry
  add column if not exists output_snapshot jsonb;

comment on column production_run_item_failure_telemetry.generation_telemetry is
  'pipeline-telemetry@1 document (steps + estimated_cost) captured on failed package attempts';

comment on column production_run_item_failure_telemetry.output_hash is
  'sha256 hex of last raw model output (full), when available';

comment on column production_run_item_failure_telemetry.output_snapshot is
  'bounded diagnostic JSON (visual_scenes, platform field types, validation errors, truncated candidate); may include truncated:true';
