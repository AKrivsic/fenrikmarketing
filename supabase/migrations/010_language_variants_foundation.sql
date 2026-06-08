-- 010_language_variants_foundation.sql
-- Foundation for language variants. Additive only, no business-scope change:
--   1. Extend the language_code enum with de / fr / es / it.
--   2. Add projects.enabled_languages (additional variant languages).
-- The primary language stays projects.language; enabled_languages lists ONLY
-- the extra mutation languages and never overrides the primary.

-- ---------------------------------------------------------------------------
-- 1. language_code enum: add de / fr / es / it (safe if value already exists).
--    Same pattern as migration 008 adding platform_type 'google_business'.
--    The new values are NOT used as literals in this migration, so adding them
--    here is safe even when the migration runs inside a transaction.
-- ---------------------------------------------------------------------------
alter type language_code add value if not exists 'de';
alter type language_code add value if not exists 'fr';
alter type language_code add value if not exists 'es';
alter type language_code add value if not exists 'it';

-- ---------------------------------------------------------------------------
-- 2. projects.enabled_languages: additional (non-primary) variant languages.
--    NOT NULL default '{}' -> existing projects keep an empty set (no variants).
--    The primary language is projects.language and is intentionally NOT stored
--    here; callers subtract it when generating variants.
-- ---------------------------------------------------------------------------
alter table projects
  add column if not exists enabled_languages language_code[] not null default '{}';
