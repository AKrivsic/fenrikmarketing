// Dependency-free smoke test for the language localization schema + prompt.
// Runs via Node's built-in type stripping + the "@/" alias loader:
//   npm run check:localize-content-package
//
// Mirrors scripts/check-content-package-guardrails.ts (no test framework,
// node:assert/strict). It intentionally covers only the pure pieces (schema +
// prompt builder): the workflow module imports lib/ai/workflows/shared.ts whose
// WorkflowError uses a TypeScript parameter property, which Node's strip-only
// loader cannot parse. The workflow itself is covered by `tsc --noEmit`.

import assert from "node:assert/strict";
import type { Project } from "@/lib/supabase/types";
import { validate } from "@/lib/ai/validateAiOutput";
import { localizeContentPackageSchema } from "@/lib/ai/schemas/localizeContentPackage";
import {
  buildLocalizeContentPackagePrompt,
  type LocalizeContentPackagePromptInput,
} from "@/lib/ai/prompts/localizeContentPackage";

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

// --- fixtures --------------------------------------------------------------

function buildProject(): Project {
  return {
    id: "p-1",
    owner_id: "u-1",
    name: "Úklidy Praha",
    type: "local_service",
    language: "cs",
    enabled_languages: ["de", "fr"],
    market_scope: "local",
    target_audience: {},
    goal_type: "lead_generation",
    product_is: ["cleaning service"],
    product_is_not: ["a franchise"],
    product_strengths: ["fast", "local"],
    pain_points: ["no time"],
    forbidden_claims: ["guaranteed results"],
    tone_of_voice: {},
    platforms: ["instagram", "facebook"],
    publishing_rules: {},
    default_cta: "Book now",
    knowledge: {},
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  };
}

function buildSource(): LocalizeContentPackagePromptInput["source"] {
  return {
    voiceoverText: "Ušetřete čas s naším úklidem.",
    subtitles: "Ušetřete čas s naším úklidem.",
    cta: { type: "lead", text: "Objednat" },
    platformItems: [
      {
        platform: "instagram",
        title: "Úklid",
        body: "Tělo",
        caption: "Rychlý úklid v Praze",
        hashtags: ["uklid", "praha"],
        cta: "Objednat",
      },
      {
        platform: "facebook",
        title: "Úklid",
        body: "Tělo",
        caption: "Spolehlivý úklid",
        hashtags: ["uklid"],
        cta: "Objednat",
      },
    ],
  };
}

// --- schema ----------------------------------------------------------------

section("localize schema — positive");

check("valid localized output passes", () => {
  const result = validate(localizeContentPackageSchema, {
    voiceover_text: "x",
    subtitles: "y",
    platform_outputs: [
      { platform: "instagram", caption: "c", cta: "cta", hashtags: ["a"] },
    ],
  });
  assert.equal(result.ok, true);
});

check("cta is optional", () => {
  const result = validate(localizeContentPackageSchema, {
    voiceover_text: "x",
    subtitles: "y",
    platform_outputs: [{ platform: "instagram", caption: "c", cta: "cta" }],
  });
  assert.equal(result.ok, true);
});

section("localize schema — negative");

check("missing caption fails", () => {
  const result = validate(localizeContentPackageSchema, {
    voiceover_text: "x",
    subtitles: "y",
    platform_outputs: [{ platform: "instagram", cta: "cta" }],
  });
  assert.equal(result.ok, false);
});

check("empty platform_outputs fails", () => {
  const result = validate(localizeContentPackageSchema, {
    voiceover_text: "x",
    subtitles: "y",
    platform_outputs: [],
  });
  assert.equal(result.ok, false);
});

// --- prompt ----------------------------------------------------------------

section("localize prompt");

check("prompt includes source + target language and platforms", () => {
  const prompt = buildLocalizeContentPackagePrompt({
    project: buildProject(),
    sourceLanguage: "cs",
    targetLanguage: "de",
    source: buildSource(),
  });
  assert.ok(prompt.includes("Czech"));
  assert.ok(prompt.includes("German"));
  assert.ok(prompt.includes("instagram"));
  assert.ok(prompt.includes("facebook"));
  assert.ok(prompt.includes("forbidden_claims"));
});

check("prompt omits cta line when source has no package cta", () => {
  const source = buildSource();
  source.cta = null;
  const prompt = buildLocalizeContentPackagePrompt({
    project: buildProject(),
    sourceLanguage: "cs",
    targetLanguage: "fr",
    source,
  });
  assert.ok(prompt.includes("French"));
  assert.ok(prompt.includes("(none — omit the cta field in the output)"));
});

// --- summary ---------------------------------------------------------------

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
