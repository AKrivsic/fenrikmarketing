// Dependency-free smoke test for Website URL & CTA Usage V1. Runs via Node's
// built-in type stripping + the "@/" alias loader:
//   npm run check:website-url
//
// Covers the pure pieces only (mirrors the other check-* scripts, no test
// framework, node:assert/strict):
//   - canonical website URL extraction + normalization
//   - the WEBSITE / LINK RULES prompt block (present iff a URL exists)
//   - per-platform link rules + no-URL-in-voiceover/image guards
//   - the deterministic CTA URL post-process (platform/stage/cta-type guards)

import assert from "node:assert/strict";
import type { Json, Project } from "@/lib/supabase/types";
import {
  canonicalWebsiteUrl,
  normalizeWebsiteUrl,
} from "@/lib/knowledge/websiteUrl";
import { websiteLinkRulesBlock } from "@/lib/ai/prompts/context";
import {
  appendUrlToText,
  maybeAppendWebsiteUrl,
  xUrlVariantCount,
  xUrlVariantIndices,
} from "@/lib/ai/websiteLinks";

let passed = 0;
let failed = 0;

function check(name: string, fn: () => void): void {
  try {
    fn();
    passed++;
    console.log(`  ok  ${name}`);
  } catch (err) {
    failed++;
    const message = err instanceof Error ? err.message : String(err);
    console.error(`  FAIL ${name}`);
    console.error(`       ${message.replace(/\n/g, "\n       ")}`);
  }
}

function section(title: string): void {
  console.log(`\n${title}`);
}

function buildProject(knowledge: Json): Project {
  return {
    id: "p-1",
    owner_id: "u-1",
    name: "Úklidy Praha",
    type: "local_service",
    language: "cs",
    enabled_languages: [],
    market_scope: "local",
    target_audience: {},
    goal_type: "lead_generation",
    product_is: ["cleaning service"],
    product_is_not: [],
    product_strengths: ["fast"],
    pain_points: ["no time"],
    forbidden_claims: [],
    tone_of_voice: {},
    platforms: ["instagram", "facebook"],
    publishing_rules: {},
    default_cta: null,
    knowledge,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  };
}

// --- normalizeWebsiteUrl ----------------------------------------------------

section("normalizeWebsiteUrl");

check("prepends https:// for a bare host", () => {
  assert.equal(normalizeWebsiteUrl("example.com"), "https://example.com");
});

check("preserves an explicit https URL with path verbatim", () => {
  assert.equal(
    normalizeWebsiteUrl("https://foo.com/cleaning?ref=ig"),
    "https://foo.com/cleaning?ref=ig",
  );
});

check("preserves an explicit http URL", () => {
  assert.equal(normalizeWebsiteUrl("http://foo.com"), "http://foo.com");
});

check("returns null for empty / whitespace / nullish", () => {
  assert.equal(normalizeWebsiteUrl(""), null);
  assert.equal(normalizeWebsiteUrl("   "), null);
  assert.equal(normalizeWebsiteUrl(null), null);
  assert.equal(normalizeWebsiteUrl(undefined), null);
});

check("returns null for a host without a dot", () => {
  assert.equal(normalizeWebsiteUrl("localhost"), null);
});

check("returns null for non-http(s) schemes", () => {
  assert.equal(normalizeWebsiteUrl("ftp://foo.com"), null);
  assert.equal(normalizeWebsiteUrl("javascript:alert(1)"), null);
});

// --- canonicalWebsiteUrl ----------------------------------------------------

section("canonicalWebsiteUrl");

check("reads knowledge.source_url and normalizes it", () => {
  const project = buildProject({ source_url: "uklidy-praha.cz" });
  assert.equal(canonicalWebsiteUrl(project), "https://uklidy-praha.cz");
});

check("reads source_url even when cards are present", () => {
  const project = buildProject({
    source_url: "https://uklidy-praha.cz",
    cards: {},
  });
  assert.equal(canonicalWebsiteUrl(project), "https://uklidy-praha.cz");
});

check("returns null when knowledge has no source_url", () => {
  assert.equal(canonicalWebsiteUrl(buildProject({})), null);
});

check("returns null when source_url is blank", () => {
  assert.equal(canonicalWebsiteUrl(buildProject({ source_url: "  " })), null);
});

// --- websiteLinkRulesBlock --------------------------------------------------

section("websiteLinkRulesBlock");

check("is empty when the project has no canonical URL", () => {
  assert.equal(websiteLinkRulesBlock(buildProject({})), "");
});

check("includes the canonical URL and the rules header when present", () => {
  const block = websiteLinkRulesBlock(
    buildProject({ source_url: "https://uklidy-praha.cz" }),
  );
  assert.ok(block.includes("WEBSITE / LINK RULES"));
  assert.ok(block.includes("https://uklidy-praha.cz"));
});

check("forbids URLs in voiceover and image prompts", () => {
  const block = websiteLinkRulesBlock(
    buildProject({ source_url: "https://uklidy-praha.cz" }),
  );
  assert.ok(/voiceover_text/.test(block));
  assert.ok(/image_prompts/.test(block));
  assert.ok(/never invent/i.test(block));
  assert.ok(/NEVER translate/i.test(block));
});

check("lists per-platform link rules for every package platform", () => {
  const block = websiteLinkRulesBlock(
    buildProject({ source_url: "https://uklidy-praha.cz" }),
  );
  for (const platform of [
    "tiktok",
    "instagram",
    "youtube",
    "linkedin",
    "facebook",
    "google_business",
    "x",
  ]) {
    assert.ok(
      block.includes(`- ${platform}:`),
      `missing per-platform rule for ${platform}`,
    );
  }
});

// --- maybeAppendWebsiteUrl (deterministic post-process) ---------------------

section("maybeAppendWebsiteUrl");

const URL = "https://uklidy-praha.cz";

check("appends URL for youtube + conversion + lead-style CTA", () => {
  const out = maybeAppendWebsiteUrl({
    platform: "youtube",
    cta: "Objednejte si úklid",
    funnelStage: "conversion",
    ctaType: "lead",
    websiteUrl: URL,
  });
  assert.ok(out.includes(URL));
});

check("appends URL for linkedin + solution_aware + book", () => {
  const out = maybeAppendWebsiteUrl({
    platform: "linkedin",
    cta: "Rezervujte termín",
    funnelStage: "solution_aware",
    ctaType: "book",
    websiteUrl: URL,
  });
  assert.ok(out.includes(URL));
});

check("appends URL for facebook + conversion + contact", () => {
  const out = maybeAppendWebsiteUrl({
    platform: "facebook",
    cta: "Napište nám",
    funnelStage: "conversion",
    ctaType: "contact",
    websiteUrl: URL,
  });
  assert.ok(out.includes(URL));
});

check("never appends to tiktok / instagram / google_business / x", () => {
  for (const platform of ["tiktok", "instagram", "google_business", "x"]) {
    const cta = "Napište nám";
    const out = maybeAppendWebsiteUrl({
      platform,
      cta,
      funnelStage: "conversion",
      ctaType: "lead",
      websiteUrl: URL,
    });
    assert.equal(out, cta, `should not append for ${platform}`);
  }
});

check("does not append for awareness / problem_aware stages", () => {
  for (const stage of ["awareness", "problem_aware"] as const) {
    const cta = "Sledujte nás";
    const out = maybeAppendWebsiteUrl({
      platform: "youtube",
      cta,
      funnelStage: stage,
      ctaType: "lead",
      websiteUrl: URL,
    });
    assert.equal(out, cta);
  }
});

check("does not append for non-conversion CTA types", () => {
  const cta = "Zjistěte více";
  const out = maybeAppendWebsiteUrl({
    platform: "youtube",
    cta,
    funnelStage: "conversion",
    ctaType: "learn_more",
    websiteUrl: URL,
  });
  assert.equal(out, cta);
});

check("is idempotent when a URL is already present", () => {
  const cta = `Objednejte na ${URL}`;
  const out = maybeAppendWebsiteUrl({
    platform: "youtube",
    cta,
    funnelStage: "conversion",
    ctaType: "lead",
    websiteUrl: URL,
  });
  assert.equal(out, cta);
});

check("does not append when there is no website URL", () => {
  const cta = "Objednejte si úklid";
  const out = maybeAppendWebsiteUrl({
    platform: "youtube",
    cta,
    funnelStage: "conversion",
    ctaType: "lead",
    websiteUrl: null,
  });
  assert.equal(out, cta);
});

check("adds a period separator when the CTA has no terminal punctuation", () => {
  const out = maybeAppendWebsiteUrl({
    platform: "youtube",
    cta: "Objednejte si úklid",
    funnelStage: "conversion",
    ctaType: "lead",
    websiteUrl: URL,
  });
  assert.equal(out, `Objednejte si úklid. ${URL}`);
});

check("keeps existing terminal punctuation", () => {
  const out = maybeAppendWebsiteUrl({
    platform: "facebook",
    cta: "Napište nám!",
    funnelStage: "conversion",
    ctaType: "contact",
    websiteUrl: URL,
  });
  assert.equal(out, `Napište nám! ${URL}`);
});

// --- appendUrlToText (shared caption/cta append) ----------------------------

section("appendUrlToText");

check("appends the URL with a period separator", () => {
  assert.equal(appendUrlToText("Více info", URL), `Více info. ${URL}`);
});

check("keeps existing terminal punctuation", () => {
  assert.equal(appendUrlToText("Více info?", URL), `Více info? ${URL}`);
});

check("is a no-op when an http URL already exists", () => {
  const caption = `Koukni na ${URL}`;
  assert.equal(appendUrlToText(caption, URL), caption);
});

check("is a no-op when any http(s) URL already exists", () => {
  const caption = "Detail na http://jine.cz";
  assert.equal(appendUrlToText(caption, URL), caption);
});

check("returns the text unchanged when there is no website URL", () => {
  assert.equal(appendUrlToText("Více info", null), "Více info");
});

check("returns just the URL for an empty caption", () => {
  assert.equal(appendUrlToText("   ", URL), URL);
});

// --- X URL Distribution V1 — counts -----------------------------------------

section("xUrlVariantCount (conversion / solution-aware)");

check("count 1 -> 0 URLs", () => {
  assert.equal(xUrlVariantCount(1, "conversion"), 0);
});

check("counts 2..9 -> exactly 1 URL", () => {
  for (const n of [2, 3, 4, 5, 6, 7, 8, 9]) {
    assert.equal(xUrlVariantCount(n, "conversion"), 1, `count ${n}`);
  }
});

check("count 10 -> 2 URLs", () => {
  assert.equal(xUrlVariantCount(10, "conversion"), 2);
});

check("count 15 -> 3 URLs", () => {
  assert.equal(xUrlVariantCount(15, "conversion"), 3);
});

check("count 20 -> 4 URLs (roughly every 5th)", () => {
  assert.equal(xUrlVariantCount(20, "conversion"), 4);
});

check("solution_aware behaves like conversion", () => {
  assert.equal(xUrlVariantCount(10, "solution_aware"), 2);
});

section("xUrlVariantCount (awareness / problem-aware soft stages)");

check("soft stage with < 3 variants -> 0 URLs", () => {
  assert.equal(xUrlVariantCount(2, "awareness"), 0);
  assert.equal(xUrlVariantCount(2, "problem_aware"), 0);
});

check("soft stage with 3+ variants -> exactly 1 URL", () => {
  assert.equal(xUrlVariantCount(3, "awareness"), 1);
  assert.equal(xUrlVariantCount(5, "problem_aware"), 1);
});

check("soft stage caps at 1 URL even for large batches", () => {
  assert.equal(xUrlVariantCount(15, "awareness"), 1);
});

// --- X URL Distribution V1 — indices ----------------------------------------

section("xUrlVariantIndices");

function assertNotAdjacent(indices: Set<number>): void {
  const sorted = [...indices].sort((a, b) => a - b);
  for (let i = 1; i < sorted.length; i++) {
    assert.notEqual(
      sorted[i] - sorted[i - 1],
      1,
      `indices ${sorted[i - 1]} and ${sorted[i]} are adjacent`,
    );
  }
}

check("count 1 -> no indices", () => {
  assert.equal(xUrlVariantIndices(1, "conversion").size, 0);
});

check("count 3 -> exactly 1 index, centered", () => {
  const idx = xUrlVariantIndices(3, "conversion");
  assert.equal(idx.size, 1);
  assert.ok(idx.has(1));
});

check("count 5 -> exactly 1 index, centered", () => {
  const idx = xUrlVariantIndices(5, "conversion");
  assert.equal(idx.size, 1);
  assert.ok(idx.has(2));
});

check("count 10 -> 2 indices, not adjacent", () => {
  const idx = xUrlVariantIndices(10, "conversion");
  assert.equal(idx.size, 2);
  assertNotAdjacent(idx);
  assert.deepEqual([...idx].sort((a, b) => a - b), [2, 7]);
});

check("count 15 -> 3 indices, not adjacent", () => {
  const idx = xUrlVariantIndices(15, "conversion");
  assert.equal(idx.size, 3);
  assertNotAdjacent(idx);
});

check("every index is within range", () => {
  for (const n of [3, 5, 10, 15, 20]) {
    for (const i of xUrlVariantIndices(n, "conversion")) {
      assert.ok(i >= 0 && i < n, `index ${i} out of range for count ${n}`);
    }
  }
});

check("soft stage distributes a single centered URL for 3+ variants", () => {
  const idx = xUrlVariantIndices(10, "awareness");
  assert.equal(idx.size, 1);
  assert.ok(idx.has(5));
});

// --- non-X behavior unchanged -----------------------------------------------

section("non-X platforms ignore X distribution");

check("X is still excluded from the per-CTA append", () => {
  const cta = "Napište nám";
  assert.equal(
    maybeAppendWebsiteUrl({
      platform: "x",
      cta,
      funnelStage: "conversion",
      ctaType: "lead",
      websiteUrl: URL,
    }),
    cta,
  );
});

// --- summary ---------------------------------------------------------------

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
