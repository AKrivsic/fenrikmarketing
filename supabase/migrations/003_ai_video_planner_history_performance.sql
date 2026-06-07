create table ai_visuals (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  content_item_id uuid references content_items(id) on delete set null,
  asset_id uuid references assets(id) on delete set null,

  prompt text not null,
  negative_prompt text,

  image_provider visual_provider not null,
  image_model text not null,
  provider_job_id text,
  provider_metadata jsonb not null default '{}'::jsonb,

  result_bucket text,
  result_path text,
  status job_status not null default 'queued',

  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create table video_jobs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  content_item_id uuid references content_items(id) on delete set null,

  provider text not null,
  model text,
  provider_job_id text,
  status job_status not null default 'queued',

  input jsonb not null default '{}'::jsonb,
  output jsonb not null default '{}'::jsonb,
  error_message text,

  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create table publishing_schedule (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  content_item_id uuid not null references content_items(id) on delete cascade,

  platform platform_type not null,
  scheduled_at timestamptz not null,
  status approval_status not null default 'scheduled',

  publishing_metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table content_versions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  content_item_id uuid not null references content_items(id) on delete cascade,

  version_no int not null,
  snapshot jsonb not null,
  change_note text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),

  unique(content_item_id, version_no)
);

create table content_performance (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  content_item_id uuid not null references content_items(id) on delete cascade,

  platform platform_type not null,
  measured_at timestamptz not null default now(),

  impressions int default 0,
  reach int default 0,
  likes int default 0,
  comments int default 0,
  shares int default 0,
  saves int default 0,
  clicks int default 0,
  leads int default 0,

  metrics jsonb not null default '{}'::jsonb
);
