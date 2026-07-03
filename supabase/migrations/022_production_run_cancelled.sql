-- Allow operators to stop an in-flight production run without deleting
-- packages that were already generated.

alter table production_runs
  drop constraint production_runs_status_check;

alter table production_runs
  add constraint production_runs_status_check
  check (status in ('queued', 'running', 'completed', 'failed', 'cancelled'));
