insert into storage.buckets (id, name, public)
values
  ('project-assets', 'project-assets', false),
  ('generated-visuals', 'generated-visuals', false),
  ('video-renders', 'video-renders', false)
on conflict (id) do nothing;

create policy "storage read own project files"
on storage.objects
for select
using (
  bucket_id in ('project-assets', 'generated-visuals', 'video-renders')
  and owns_project((storage.foldername(name))[1]::uuid)
);

create policy "storage insert own project files"
on storage.objects
for insert
with check (
  bucket_id in ('project-assets', 'generated-visuals', 'video-renders')
  and owns_project((storage.foldername(name))[1]::uuid)
);

create policy "storage update own project files"
on storage.objects
for update
using (
  bucket_id in ('project-assets', 'generated-visuals', 'video-renders')
  and owns_project((storage.foldername(name))[1]::uuid)
)
with check (
  bucket_id in ('project-assets', 'generated-visuals', 'video-renders')
  and owns_project((storage.foldername(name))[1]::uuid)
);

create policy "storage delete own project files"
on storage.objects
for delete
using (
  bucket_id in ('project-assets', 'generated-visuals', 'video-renders')
  and owns_project((storage.foldername(name))[1]::uuid)
);
