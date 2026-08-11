-- Manual Review (Phase 1): packages may finish without video jobs and wait
-- for creative review before video generation continues.

alter table production_runs
  drop constraint production_runs_status_check;

alter table production_runs
  add constraint production_runs_status_check
  check (
    status in (
      'queued',
      'running',
      'completed',
      'failed',
      'cancelled',
      'waiting_for_creative_review'
    )
  );
