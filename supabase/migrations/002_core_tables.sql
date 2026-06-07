create extension if not exists pgcrypto;

create table projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,

  name text not null,
  type project_type not null,
  language language_code not null default 'cs',
  market_scope market_scope not null,

  target_audience jsonb not null default '{}'::jsonb,
  goal_type goal_type not null,

  product_is text[] not null default '{}',
  product_is_not text[] not null default '{}',
  product_strengths text[] not null default '{}',
  pain_points text[] not null default '{}',
  forbidden_claims text[] not null default '{}',

  tone_of_voice jsonb not null default '{}'::jsonb,
  platforms platform_type[] not null default '{}',
  publishing_rules jsonb not null default '{}'::jsonb,
  default_cta text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table assets (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,

  title text not null,
  media_type media_type not null,
  asset_mode asset_mode not null default 'source',

  storage_bucket text,
  storage_path text,
  mime_type text,

  metadata jsonb not null default '{}'::jsonb,
  tags text[] not null default '{}',

  usage_count int not null default 0,
  reuse_score numeric(5,2) not null default 0,
  last_used_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table asset_variants (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid not null references assets(id) on delete cascade,
  project_id uuid not null references projects(id) on delete cascade,

  variant_name text not null,
  storage_bucket text,
  storage_path text,
  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now()
);

create table evergreen_topics (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,

  title text not null,
  angle text,
  pillar text,
  keywords text[] not null default '{}',
  audience_stage text,
  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now()
);

create table trends (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,

  title text not null,
  source trend_source not null default 'manual',
  source_url text,
  signal_strength int not null default 1 check (signal_strength between 1 and 10),
  detected_at timestamptz not null default now(),
  expires_at timestamptz,
  metadata jsonb not null default '{}'::jsonb
);

create table content_strategies (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,

  name text not null,
  objective goal_type not null,
  period_start date,
  period_end date,
  strategy_brief jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now()
);

create table content_strategy_items (
  id uuid primary key default gen_random_uuid(),
  strategy_id uuid not null references content_strategies(id) on delete cascade,
  project_id uuid not null references projects(id) on delete cascade,

  platform platform_type not null,
  format content_format not null,
  topic_id uuid references evergreen_topics(id) on delete set null,
  trend_id uuid references trends(id) on delete set null,

  brief jsonb not null default '{}'::jsonb,
  priority int not null default 3 check (priority between 1 and 5),

  created_at timestamptz not null default now()
);

create table content_packages (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  strategy_item_id uuid references content_strategy_items(id) on delete set null,

  title text not null,
  status package_status not null default 'draft',
  package_brief jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table content_items (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  package_id uuid references content_packages(id) on delete cascade,

  platform platform_type not null,
  format content_format not null,
  status approval_status not null default 'draft',

  title text,
  body text,
  caption text,
  hashtags text[] not null default '{}',
  cta text,

  generation_metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table asset_usage (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  asset_id uuid not null references assets(id) on delete cascade,
  content_item_id uuid references content_items(id) on delete set null,

  used_as text,
  metadata jsonb not null default '{}'::jsonb,
  used_at timestamptz not null default now()
);
