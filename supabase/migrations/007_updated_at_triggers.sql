create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger projects_set_updated_at
before update on projects
for each row
execute function set_updated_at();

create trigger assets_set_updated_at
before update on assets
for each row
execute function set_updated_at();

create trigger content_packages_set_updated_at
before update on content_packages
for each row
execute function set_updated_at();

create trigger content_items_set_updated_at
before update on content_items
for each row
execute function set_updated_at();
