-- First-touch attribution fields for free-sample / sample request funnel.
alter table sample_requests
  add column if not exists utm_source text,
  add column if not exists utm_medium text,
  add column if not exists utm_campaign text,
  add column if not exists utm_content text,
  add column if not exists utm_term text,
  add column if not exists fbclid text,
  add column if not exists landing_page text,
  add column if not exists referrer text;
