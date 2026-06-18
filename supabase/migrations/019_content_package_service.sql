-- Content Package Service MVP — delivery / review layer (not SaaS billing).

create table clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  company text,
  website_url text,
  notes text,
  created_at timestamptz not null default now()
);

create table client_projects (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,
  title text not null,
  status text not null default 'draft' check (
    status in (
      'draft',
      'preview_sent',
      'revision_requested',
      'approved',
      'paid',
      'delivered'
    )
  ),
  paid boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table client_project_packages (
  id uuid primary key default gen_random_uuid(),
  client_project_id uuid not null references client_projects(id) on delete cascade,
  internal_package_id uuid references content_packages(id) on delete set null,
  title text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table client_project_items (
  id uuid primary key default gen_random_uuid(),
  client_project_id uuid not null references client_projects(id) on delete cascade,
  package_id uuid references client_project_packages(id) on delete set null,
  video_url text,
  video_storage_path text,
  title text not null default '',
  tik_tok_caption text not null default '',
  instagram_caption text not null default '',
  facebook_post text not null default '',
  linkedin_post text not null default '',
  hashtags text[] not null default '{}',
  client_note text,
  internal_note text,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table client_project_comments (
  id uuid primary key default gen_random_uuid(),
  client_project_item_id uuid not null references client_project_items(id) on delete cascade,
  author_type text not null check (author_type in ('client', 'admin', 'internal')),
  comment text not null,
  created_at timestamptz not null default now()
);

create table sample_requests (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  company text,
  website_url text,
  notes text,
  status text not null default 'new',
  created_at timestamptz not null default now()
);

create index idx_client_projects_client on client_projects(client_id);
create index idx_client_project_packages_project on client_project_packages(client_project_id);
create index idx_client_project_items_project on client_project_items(client_project_id);
create index idx_client_project_items_package on client_project_items(package_id);
create index idx_client_project_comments_item on client_project_comments(client_project_item_id);
create index idx_sample_requests_status on sample_requests(status, created_at desc);

create trigger client_projects_set_updated_at
before update on client_projects
for each row execute function set_updated_at();

create trigger client_project_items_set_updated_at
before update on client_project_items
for each row execute function set_updated_at();

alter table clients enable row level security;
alter table client_projects enable row level security;
alter table client_project_packages enable row level security;
alter table client_project_items enable row level security;
alter table client_project_comments enable row level security;
alter table sample_requests enable row level security;
