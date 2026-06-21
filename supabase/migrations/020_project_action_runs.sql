-- 020_project_action_runs.sql
-- Lightweight status for Prepare-this-week triggers from Project Actions.
-- n8n reports completion via POST /api/n8n/action-run-status (or inline API routes).

create table project_action_runs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  week_start date not null,
  step text not null
    check (step in (
      'trend_scan',
      'weekly_strategy',
      'generate_packages',
      'publishing_planner'
    )),
  status text not null default 'running'
    check (status in ('queued', 'running', 'success', 'failed')),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  message text,
  error text,
  n8n_execution_id text,
  created_at timestamptz not null default now()
);

create index idx_project_action_runs_project_week
  on project_action_runs (project_id, week_start, started_at desc);

alter table project_action_runs enable row level security;

create policy "project_action_runs project access"
on project_action_runs
for all
using (owns_project(project_id))
with check (owns_project(project_id));
