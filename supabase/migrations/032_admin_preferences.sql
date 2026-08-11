-- Admin preferences (singleton). Editor Language for Manual Creative Review.
-- Not project language. Not browser locale.

create table if not exists public.admin_preferences (
  id text primary key default 'default',
  editor_language text not null default 'en'
    check (editor_language in ('en', 'cs', 'uk')),
  updated_at timestamptz not null default now(),
  updated_by text null
);

alter table public.admin_preferences enable row level security;

-- Admin app uses service role; no public policies needed beyond service_role access.
grant select, insert, update on public.admin_preferences to service_role;
revoke all on public.admin_preferences from anon, authenticated;

insert into public.admin_preferences (id, editor_language)
values ('default', 'en')
on conflict (id) do nothing;
