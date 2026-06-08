-- 011_content_items_language.sql
-- Foundation for language variants at the content-item level. Additive only.
--   - Add content_items.language (nullable language_code).
--   - NULL means "the project's primary language" (projects.language); callers
--     resolve it as effectiveLanguage = content_item.language ?? project.language.
--   - No backfill and no NOT NULL constraint yet: existing rows stay NULL and
--     keep behaving as primary-language content.

alter table content_items
  add column if not exists language language_code;
