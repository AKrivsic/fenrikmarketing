/**
 * Platform dependency fingerprint — only fields that invalidate captions / social image.
 * Scene motion, camera, SFX, timing, voice direction do NOT enter this hash.
 */

import { createHash } from "node:crypto";
import { fingerprintText } from "@/lib/content-package/videoCreativeRevision";
import {
  PLATFORM_DEPENDENCY_FINGERPRINT_VERSION,
} from "@/lib/content-creative-core-v2/derivedOutputsTypes";
import type { ContentCreativeCoreV2 } from "@/lib/content-creative-core-v2/types";
import type { CreativeCoreV2ApprovedSnapshot } from "@/lib/content-creative-core-v2/approvedSnapshot";

export interface PlatformDependencyFields {
  core_idea: string;
  hook: string;
  voiceover: string;
  cta_intent: string;
  conflict: string;
  reveal_or_surprise: string;
  payoff: string;
  language?: string | null;
  platforms?: readonly string[];
}

export function platformDependencyFieldsFromCore(
  core: Pick<
    ContentCreativeCoreV2,
    | "core_idea"
    | "hook"
    | "voiceover"
    | "cta_intent"
    | "conflict"
    | "reveal_or_surprise"
    | "payoff"
  >,
  extras?: { language?: string | null; platforms?: readonly string[] },
): PlatformDependencyFields {
  return {
    core_idea: core.core_idea,
    hook: core.hook,
    voiceover: core.voiceover,
    cta_intent: core.cta_intent,
    conflict: core.conflict,
    reveal_or_surprise: core.reveal_or_surprise,
    payoff: core.payoff,
    language: extras?.language ?? null,
    platforms: extras?.platforms,
  };
}

export function computePlatformDependencyFingerprint(
  fields: PlatformDependencyFields,
): string {
  const canonical = JSON.stringify({
    v: PLATFORM_DEPENDENCY_FINGERPRINT_VERSION,
    core_idea: fingerprintText(fields.core_idea),
    hook: fingerprintText(fields.hook),
    voiceover: fingerprintText(fields.voiceover),
    cta_intent: fingerprintText(fields.cta_intent),
    conflict: fingerprintText(fields.conflict),
    reveal: fingerprintText(fields.reveal_or_surprise),
    payoff: fingerprintText(fields.payoff),
    language: (fields.language ?? "").trim().toLowerCase(),
    platforms: [...(fields.platforms ?? [])].map((p) => p.trim().toLowerCase()).sort(),
  });
  return createHash("sha256").update(canonical, "utf8").digest("hex").slice(0, 32);
}

export function approvedCoreSourceFingerprint(
  snapshot: CreativeCoreV2ApprovedSnapshot,
): string {
  const canonical = JSON.stringify({
    locked_at: snapshot.locked_at,
    core_idea: fingerprintText(snapshot.core.core_idea),
    hook: fingerprintText(snapshot.core.hook),
    voiceover: fingerprintText(snapshot.production_voiceover_en),
    creative_fingerprint: snapshot.creative_fingerprint,
  });
  return createHash("sha256").update(canonical, "utf8").digest("hex").slice(0, 32);
}

export function buildDerivedIdempotencyKey(args: {
  packageId: string;
  platformDependencyFingerprint: string;
  sourceApprovedCoreFingerprint: string;
}): string {
  return createHash("sha256")
    .update(
      `${args.packageId}:${args.sourceApprovedCoreFingerprint}:${args.platformDependencyFingerprint}`,
      "utf8",
    )
    .digest("hex")
    .slice(0, 40);
}
