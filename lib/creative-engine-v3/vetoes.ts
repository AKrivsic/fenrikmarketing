/**
 * Deterministic vetoes for invented concepts.
 * Never substitutes a prepared/template concept.
 */

import {
  fingerprintsCollide,
  isDarkOfficeAtmosphere,
  normalizeFingerprintText,
  tokenOverlapCount,
} from "@/lib/creative-engine-v3/conceptFingerprint";
import type {
  ConceptVeto,
  CreativeBrief,
  CreativeConceptFingerprint,
  InventedCreativeConcept,
} from "@/lib/creative-engine-v3/types";

const GENERIC_B2B_RE =
  /\b(most businesses|in today's world|let's be honest|laptop montage|staring at (a |the )?laptop|generic office|open[- ]plan office|talking head|corporate dashboard|saas dashboard|zoom call grid|handshake stock|glass boardroom)\b/i;

const UNRENDERABLE_RE =
  /\b(impossible physics|unfilmable|requires live cgi crowd of thousands|needs photoreal celebrity cameo|full feature film|real-time multiplayer|8k volumetric)\b/i;

const ARTIFICIAL_PRODUCT_RE =
  /\b(then somehow the product|insert product logo|product appears magically|generic success montage|buy now overlay)\b/i;

function hookKey(hook: string): string {
  return normalizeFingerprintText(hook);
}

function nearDuplicateConcepts(
  a: InventedCreativeConcept,
  b: InventedCreativeConcept,
): boolean {
  if (hookKey(a.hook_line) === hookKey(b.hook_line)) return true;
  if (
    normalizeFingerprintText(a.opening_two_seconds) ===
    normalizeFingerprintText(b.opening_two_seconds)
  ) {
    return true;
  }
  // Compare commercial identity fields only (not shared product/ending boilerplate).
  const identityScore =
    Math.min(3, tokenOverlapCount(a.fingerprint.core_premise, b.fingerprint.core_premise)) +
    Math.min(
      3,
      tokenOverlapCount(
        a.fingerprint.opening_mechanism,
        b.fingerprint.opening_mechanism,
      ),
    ) +
    Math.min(3, tokenOverlapCount(a.fingerprint.visual_world, b.fingerprint.visual_world)) +
    Math.min(3, tokenOverlapCount(a.fingerprint.hero_object, b.fingerprint.hero_object));
  // Require strong overlap across multiple identity fields (avoid false positives
  // when models share scaffolding words like "world" / "opening").
  return identityScore >= 11;
}

function atmosphereBlob(c: InventedCreativeConcept): string {
  return `${c.atmosphere.time_of_day} ${c.atmosphere.palette_intent} ${c.atmosphere.lighting_intent} ${c.fingerprint.palette_atmosphere}`;
}

function productIntegrationWeak(c: InventedCreativeConcept): boolean {
  const role = c.product_role.trim();
  if (role.length < 12) return true;
  if (/^(the product|our product|it helps|solves problems)\.?$/i.test(role)) {
    return true;
  }
  if (ARTIFICIAL_PRODUCT_RE.test(role) || ARTIFICIAL_PRODUCT_RE.test(c.ending_payoff)) {
    return true;
  }
  // Must mention something product-like beyond empty filler
  const blob = `${role} ${c.fingerprint.product_mechanism}`.toLowerCase();
  const productHints = /\b(answer|chat|reply|visitor|lead|question|website|inbox|automat|qualif|book|schedule|capture)\b/;
  return !productHints.test(blob) && role.split(/\s+/).length < 6;
}

export function vetoInventedConcepts(args: {
  concepts: readonly InventedCreativeConcept[];
  brief: CreativeBrief;
}): {
  survivors: InventedCreativeConcept[];
  rejected: ConceptVeto[];
} {
  const rejected: ConceptVeto[] = [];
  const survivors: InventedCreativeConcept[] = [];
  const seenHooks = new Set<string>();
  const recent = args.brief.memory.recent_fingerprints;
  const forbiddenAtm = args.brief.memory.forbidden_atmospheres.map(
    normalizeFingerprintText,
  );

  for (const concept of args.concepts) {
    const reasons: string[] = [];

    if (!concept.concept_id?.trim()) reasons.push("missing_concept_id");
    if (!concept.hook_line?.trim()) reasons.push("empty_hook");
    if (!concept.opening_two_seconds?.trim()) reasons.push("empty_opening");
    if (!concept.visual_world?.trim()) reasons.push("empty_visual_world");

    const hk = hookKey(concept.hook_line);
    if (hk && seenHooks.has(hk)) reasons.push("duplicate_hook_in_batch");

    for (const other of survivors) {
      if (nearDuplicateConcepts(concept, other)) {
        reasons.push(`near_duplicate_of_${other.concept_id}`);
        break;
      }
    }

    for (const fp of recent) {
      if (fingerprintsCollide(concept.fingerprint, fp)) {
        reasons.push("fingerprint_collision_recent_package");
        break;
      }
    }

    const genericBlob = [
      concept.central_idea,
      concept.opening_two_seconds,
      concept.hook_line,
      concept.visual_world,
      concept.why_stops_scroll,
    ].join(" ");
    if (GENERIC_B2B_RE.test(genericBlob)) {
      reasons.push("generic_b2b_fallback");
    }

    const atm = atmosphereBlob(concept);
    if (isDarkOfficeAtmosphere(atm)) {
      const recentDark = recent.some((fp) =>
        isDarkOfficeAtmosphere(fp.palette_atmosphere),
      );
      const forbiddenDark = forbiddenAtm.some((a) =>
        /dark-office|night-office|blue-corporate/.test(a),
      );
      if (recentDark || forbiddenDark) {
        reasons.push("repeated_dark_office_atmosphere");
      }
    }

    const atmKey = normalizeFingerprintText(concept.fingerprint.palette_atmosphere);
    if (
      atmKey &&
      forbiddenAtm.includes(atmKey) &&
      tokenOverlapCount(atmKey, atmKey) >= 0
    ) {
      // Exact atmosphere reuse from memory
      if (
        args.brief.memory.recent_fingerprints.some(
          (fp) =>
            normalizeFingerprintText(fp.palette_atmosphere) === atmKey,
        )
      ) {
        reasons.push("repeated_visual_atmosphere");
      }
    }

    if (productIntegrationWeak(concept)) {
      reasons.push("artificial_or_empty_product_integration");
    }

    const riskBlob = concept.production_risks.join(" ");
    if (
      UNRENDERABLE_RE.test(concept.opening_two_seconds) ||
      UNRENDERABLE_RE.test(riskBlob) ||
      concept.production_risks.some((r) => /unfilmable|impossible/i.test(r))
    ) {
      reasons.push("clearly_unrenderable");
    }

    // Deduplicate reasons
    const unique = [...new Set(reasons)];
    if (unique.length > 0) {
      rejected.push({ concept_id: concept.concept_id || "unknown", reasons: unique });
      continue;
    }

    seenHooks.add(hk);
    survivors.push(concept);
  }

  return { survivors, rejected };
}

export function formatRejectionAppendix(rejected: readonly ConceptVeto[]): string {
  if (rejected.length === 0) return "";
  return rejected
    .map((r) => `- ${r.concept_id}: ${r.reasons.join(", ")}`)
    .join("\n");
}
