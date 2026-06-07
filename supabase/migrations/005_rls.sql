alter table projects enable row level security;
alter table assets enable row level security;
alter table asset_variants enable row level security;
alter table asset_usage enable row level security;
alter table evergreen_topics enable row level security;
alter table trends enable row level security;
alter table content_strategies enable row level security;
alter table content_strategy_items enable row level security;
alter table content_packages enable row level security;
alter table content_items enable row level security;
alter table ai_visuals enable row level security;
alter table video_jobs enable row level security;
alter table publishing_schedule enable row level security;
alter table content_versions enable row level security;
alter table content_performance enable row level security;

create or replace function owns_project(p_project_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from projects
    where id = p_project_id
      and owner_id = auth.uid()
  );
$$;

create policy "projects owner select"
on projects
for select
using (owner_id = auth.uid());

create policy "projects owner insert"
on projects
for insert
with check (owner_id = auth.uid());

create policy "projects owner update"
on projects
for update
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

create policy "projects owner delete"
on projects
for delete
using (owner_id = auth.uid());

create policy "assets project access"
on assets
for all
using (owns_project(project_id))
with check (owns_project(project_id));

create policy "asset_variants project access"
on asset_variants
for all
using (owns_project(project_id))
with check (owns_project(project_id));

create policy "asset_usage project access"
on asset_usage
for all
using (owns_project(project_id))
with check (owns_project(project_id));

create policy "evergreen_topics project access"
on evergreen_topics
for all
using (owns_project(project_id))
with check (owns_project(project_id));

create policy "trends project access"
on trends
for all
using (owns_project(project_id))
with check (owns_project(project_id));

create policy "content_strategies project access"
on content_strategies
for all
using (owns_project(project_id))
with check (owns_project(project_id));

create policy "content_strategy_items project access"
on content_strategy_items
for all
using (owns_project(project_id))
with check (owns_project(project_id));

create policy "content_packages project access"
on content_packages
for all
using (owns_project(project_id))
with check (owns_project(project_id));

create policy "content_items project access"
on content_items
for all
using (owns_project(project_id))
with check (owns_project(project_id));

create policy "ai_visuals project access"
on ai_visuals
for all
using (owns_project(project_id))
with check (owns_project(project_id));

create policy "video_jobs project access"
on video_jobs
for all
using (owns_project(project_id))
with check (owns_project(project_id));

create policy "publishing_schedule project access"
on publishing_schedule
for all
using (owns_project(project_id))
with check (owns_project(project_id));

create policy "content_versions project access"
on content_versions
for all
using (owns_project(project_id))
with check (owns_project(project_id));

create policy "content_performance project access"
on content_performance
for all
using (owns_project(project_id))
with check (owns_project(project_id));
