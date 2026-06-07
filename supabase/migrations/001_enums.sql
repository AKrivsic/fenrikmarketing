create type project_type as enum ('local_service', 'saas', 'community_service');
create type language_code as enum ('cs', 'en', 'sk');
create type market_scope as enum ('local', 'national', 'global');
create type goal_type as enum ('lead_generation', 'awareness', 'activation', 'retention');

create type media_type as enum ('image', 'video', 'audio', 'document', 'text');
create type asset_mode as enum ('source', 'generated', 'edited', 'template');

create type platform_type as enum ('instagram', 'facebook', 'linkedin', 'tiktok', 'youtube', 'blog', 'email');
create type content_format as enum ('post', 'story', 'reel', 'short', 'carousel', 'article', 'email');
create type approval_status as enum ('draft', 'in_review', 'approved', 'rejected', 'scheduled', 'published');
create type package_status as enum ('draft', 'ready', 'approved', 'published', 'archived');

create type trend_source as enum ('manual', 'google_trends', 'social', 'news', 'internal');
create type visual_provider as enum ('openai', 'replicate', 'stability', 'midjourney', 'other');
create type job_status as enum ('queued', 'processing', 'completed', 'failed');
