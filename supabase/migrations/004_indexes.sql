create index idx_projects_owner on projects(owner_id);

create index idx_assets_project on assets(project_id);
create index idx_assets_media_type on assets(media_type);
create index idx_assets_tags on assets using gin(tags);
create index idx_assets_metadata on assets using gin(metadata);
create index idx_assets_reuse on assets(project_id, reuse_score desc, last_used_at desc);

create index idx_asset_variants_asset on asset_variants(asset_id);
create index idx_asset_variants_project on asset_variants(project_id);

create index idx_asset_usage_asset on asset_usage(asset_id);
create index idx_asset_usage_content on asset_usage(content_item_id);
create index idx_asset_usage_project_used_at on asset_usage(project_id, used_at desc);

create index idx_evergreen_project on evergreen_topics(project_id);
create index idx_evergreen_keywords on evergreen_topics using gin(keywords);

create index idx_trends_project_detected on trends(project_id, detected_at desc);
create index idx_trends_metadata on trends using gin(metadata);

create index idx_strategy_project on content_strategies(project_id);
create index idx_strategy_items_strategy on content_strategy_items(strategy_id);
create index idx_strategy_items_project on content_strategy_items(project_id);

create index idx_packages_project_status on content_packages(project_id, status);
create index idx_items_project_status on content_items(project_id, status);
create index idx_items_package on content_items(package_id);
create index idx_items_generation_metadata on content_items using gin(generation_metadata);

create index idx_ai_visuals_project on ai_visuals(project_id);
create index idx_ai_visuals_provider_job on ai_visuals(image_provider, provider_job_id);

create index idx_video_jobs_project_status on video_jobs(project_id, status);
create index idx_schedule_project_time on publishing_schedule(project_id, scheduled_at);
create index idx_versions_content on content_versions(content_item_id, version_no desc);
create index idx_performance_content_time on content_performance(content_item_id, measured_at desc);
