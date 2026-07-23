-- Business Cost Accounting — failure telemetry steps (additive, backwards compatible).
-- Stores the full generation_telemetry document for failed package attempts so
-- incurred AI cost never disappears when no content_packages row is created.

alter table production_run_item_failure_telemetry
  add column if not exists generation_telemetry jsonb;

comment on column production_run_item_failure_telemetry.generation_telemetry is
  'pipeline-telemetry@1 document (steps + estimated_cost) captured on failed package attempts';
