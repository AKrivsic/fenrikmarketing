-- 012_project_knowledge.sql
-- Knowledge Model V2 storage. Additive only, no business-scope change:
--   Add projects.knowledge (single JSONB block) holding the proposal/approval
--   surface for the onboarding cards (Product / Customer / Voice / Proof).
-- The existing Project Brain columns remain the "compiled" brain that every AI
-- workflow reads via projectBrainBlock(); knowledge is only the input/approval
-- layer on top of them. Existing projects keep the default {} and derive their
-- knowledge from the brain columns on first access (see lib/knowledge).
alter table projects
  add column if not exists knowledge jsonb not null default '{}'::jsonb;
