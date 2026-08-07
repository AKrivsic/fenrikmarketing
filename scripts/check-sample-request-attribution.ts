// Dependency-free checks for sample-request attribution + consent helpers.
//   npm run check:sample-request-attribution

import assert from "node:assert/strict";
import {
  captureFirstTouchFromLocation,
  mergeFirstTouchPreserveExisting,
  sanitizeAttributionValue,
  sanitizeFirstTouchAttribution,
} from "@/lib/analytics/attribution";
import {
  hasAnalyticsConsent,
  parseAnalyticsConsent,
} from "@/lib/analytics/consent";

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

section("sanitizeAttributionValue");

check("empty string becomes null", () => {
  assert.equal(sanitizeAttributionValue("utm_source", "  "), null);
});

check("trims and keeps value", () => {
  assert.equal(sanitizeAttributionValue("utm_source", " meta "), "meta");
});

check("strips control characters", () => {
  assert.equal(
    sanitizeAttributionValue("utm_campaign", "spring\u0000sale"),
    "springsale",
  );
});

check("truncates to field max length", () => {
  const long = "x".repeat(250);
  const out = sanitizeAttributionValue("utm_source", long);
  assert.equal(out?.length, 200);
});

check("non-string becomes null", () => {
  assert.equal(sanitizeAttributionValue("fbclid", 123 as unknown as string), null);
});

section("sanitizeFirstTouchAttribution");

check("maps all fields and nulls empties", () => {
  const out = sanitizeFirstTouchAttribution({
    utm_source: "fb",
    utm_medium: "",
    utm_campaign: "launch",
    utm_content: null,
    utm_term: undefined,
    fbclid: " abc ",
    landing_page: "https://fenrik.studio/?utm_source=fb",
    referrer: "https://facebook.com/",
  });
  assert.equal(out.utm_source, "fb");
  assert.equal(out.utm_medium, null);
  assert.equal(out.utm_campaign, "launch");
  assert.equal(out.utm_content, null);
  assert.equal(out.utm_term, null);
  assert.equal(out.fbclid, "abc");
  assert.equal(out.landing_page, "https://fenrik.studio/?utm_source=fb");
  assert.equal(out.referrer, "https://facebook.com/");
});

section("captureFirstTouchFromLocation");

check("reads utm params, fbclid, landing, referrer", () => {
  const out = captureFirstTouchFromLocation({
    href: "https://fenrik.studio/?utm_source=meta&utm_medium=paid&fbclid=xyz",
    searchParams: new URLSearchParams(
      "utm_source=meta&utm_medium=paid&fbclid=xyz",
    ),
    referrer: "https://l.facebook.com/",
  });
  assert.equal(out.utm_source, "meta");
  assert.equal(out.utm_medium, "paid");
  assert.equal(out.fbclid, "xyz");
  assert.equal(
    out.landing_page,
    "https://fenrik.studio/?utm_source=meta&utm_medium=paid&fbclid=xyz",
  );
  assert.equal(out.referrer, "https://l.facebook.com/");
});

section("mergeFirstTouchPreserveExisting");

check("does not overwrite existing first-touch fields", () => {
  const existing = sanitizeFirstTouchAttribution({
    utm_source: "first",
    utm_medium: null,
    landing_page: "https://fenrik.studio/first",
  });
  const incoming = sanitizeFirstTouchAttribution({
    utm_source: "second",
    utm_medium: "cpc",
    landing_page: "https://fenrik.studio/second",
  });
  const merged = mergeFirstTouchPreserveExisting(existing, incoming);
  assert.equal(merged.utm_source, "first");
  assert.equal(merged.utm_medium, "cpc");
  assert.equal(merged.landing_page, "https://fenrik.studio/first");
});

section("consent helpers");

check("parseAnalyticsConsent accepts only known values", () => {
  assert.equal(parseAnalyticsConsent("accepted"), "accepted");
  assert.equal(parseAnalyticsConsent("rejected"), "rejected");
  assert.equal(parseAnalyticsConsent("maybe"), null);
  assert.equal(parseAnalyticsConsent(null), null);
});

check("hasAnalyticsConsent is true only for accepted", () => {
  assert.equal(hasAnalyticsConsent("accepted"), true);
  assert.equal(hasAnalyticsConsent("rejected"), false);
  assert.equal(hasAnalyticsConsent(null), false);
});

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
