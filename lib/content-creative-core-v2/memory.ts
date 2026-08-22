/**
 * Cross-run creative memory for Creative Core v2 (still + T2V + text-only).
 * Reads existing package shapes; does not require a new DB table.
 */

import {
  CREATIVE_CORE_V2_MEMORY_CONFIG,
  CREATIVE_CORE_V2_MEMORY_VERSION,
} from "@/lib/content-creative-core-v2/config";
import {
  computeCreativeFingerprint,
  keyFromText,
} from "@/lib/content-creative-core-v2/fingerprint";
import type {
  CreativeMemoryRecordV2,
  CreativeMemorySourceStatus,
  CreativeMemoryV2,
} from "@/lib/content-creative-core-v2/types";

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function readString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function daysBetween(isoA: string | null, isoB: string): number {
  if (!isoA) return 0;
  const a = Date.parse(isoA);
  const b = Date.parse(isoB);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return 0;
  return Math.max(0, (b - a) / (1000 * 60 * 60 * 24));
}

/**
 * Age + recency-count + rejection boost → protection weight.
 * Higher = stronger block against reuse.
 */
export function computeProtectionWeight(args: {
  createdAt: string | null;
  nowIso: string;
  indexFromNewest: number;
  rejected: boolean;
}): number {
  const cfg = CREATIVE_CORE_V2_MEMORY_CONFIG;
  let weight: number = cfg.ancientWeight;
  const ageDays = daysBetween(args.createdAt, args.nowIso);

  /**
   * Last N packages get a count-based boost, but only while still within
   * recentDays. Pure age decay always applies beyond that window so ancient
   * motifs can return with a different scenario/POV/execution.
   */
  if (args.indexFromNewest < cfg.veryRecentCount && ageDays <= cfg.recentDays) {
    weight = cfg.veryRecentWeight;
  } else if (ageDays <= cfg.recentDays) {
    weight = cfg.recentWeight;
  } else if (ageDays <= cfg.mediumDays) {
    weight = cfg.mediumWeight;
  } else if (ageDays <= cfg.oldDays) {
    weight = cfg.oldWeight;
  } else {
    weight = cfg.ancientWeight;
  }

  if (args.rejected && ageDays <= cfg.rejectedBoostDays) {
    weight = Math.min(1.35, weight + cfg.rejectedWeightBoost);
  }
  return weight;
}

export function resolveSourceStatus(args: {
  packageStatus?: string | null;
  runStatus?: string | null;
  reviewStatus?: string | null;
  reviewApproved?: boolean;
  explicitRejected?: boolean;
}): CreativeMemorySourceStatus {
  if (args.explicitRejected) return "rejected";
  if (args.runStatus === "cancelled") return "cancelled";
  if (args.packageStatus === "published") return "published";
  if (
    args.packageStatus === "approved" ||
    args.reviewApproved ||
    args.reviewStatus === "approved"
  ) {
    return "approved";
  }
  if (args.reviewStatus === "ready" || args.packageStatus === "ready") {
    return "ready";
  }
  return "draft";
}

/**
 * Creative rejection is explicit only.
 * A technical / unspecified cancelled run is NOT treated as a creative reject.
 */
export function isCreativeRejection(args: {
  explicitRejected?: boolean;
  rejectionReason?: string | null;
}): boolean {
  if (args.explicitRejected === true) return true;
  return Boolean(args.rejectionReason?.trim());
}

export interface BuildMemoryRecordInput {
  packageId: string;
  createdAt?: string | null;
  packageStatus?: string | null;
  runStatus?: string | null;
  reviewStatus?: string | null;
  reviewApproved?: boolean;
  explicitRejected?: boolean;
  rejectionReason?: string | null;
  painPoint?: string | null;
  centralTopic?: string | null;
  angle?: string | null;
  hook?: string | null;
  setting?: string | null;
  props?: string | null;
  visual?: string | null;
  emotion?: string | null;
  conflict?: string | null;
  reveal?: string | null;
  payoff?: string | null;
  cta?: string | null;
  narrative?: string | null;
  povHint?: string | null;
}

export function buildMemoryRecord(
  input: BuildMemoryRecordInput,
  args: { nowIso: string; indexFromNewest: number },
): CreativeMemoryRecordV2 {
  const creativelyRejected = isCreativeRejection({
    explicitRejected: input.explicitRejected,
    rejectionReason: input.rejectionReason,
  });
  const source_status = resolveSourceStatus({
    packageStatus: input.packageStatus,
    runStatus: input.runStatus,
    reviewStatus: input.reviewStatus,
    reviewApproved: input.reviewApproved,
    explicitRejected: creativelyRejected,
  });
  const fingerprint = computeCreativeFingerprint({
    pain_point: input.painPoint,
    topic: input.centralTopic,
    angle: input.angle,
    hook: input.hook,
    setting: input.setting,
    props: input.props,
    visual: input.visual,
    emotion: input.emotion,
    conflict: input.conflict,
    reveal: input.reveal,
    payoff: input.payoff,
    cta: input.cta,
    narrative: input.narrative,
  });
  if (input.povHint?.trim()) {
    fingerprint.pov_key = keyFromText(input.povHint, 4) || fingerprint.pov_key;
  }
  const propList =
    fingerprint.prop_keys.length > 0
      ? fingerprint.prop_keys
      : readString(input.props)
        ? [readString(input.props)]
        : [];

  return {
    package_id: input.packageId,
    created_at: input.createdAt?.trim() || null,
    source_status,
    // Only explicit creative rejection gets rejected=true (hard-block boost).
    // Technical cancelled stays rejected=false with source_status=cancelled.
    rejected: creativelyRejected || source_status === "rejected",
    rejection_reason: input.rejectionReason?.trim() || null,
    pain_point: input.painPoint?.trim() || null,
    central_topic: (input.centralTopic ?? "").trim(),
    scenario_family: fingerprint.scenario_key || "other",
    pov: fingerprint.pov_key,
    opening_mechanism: fingerprint.opening_mechanism,
    narrative_mechanism: fingerprint.narrative_mechanism,
    setting: (input.setting ?? "").trim(),
    dominant_visual_motif: fingerprint.visual_motif_key || "other",
    dominant_props: propList,
    emotional_arc: (input.emotion ?? "").trim(),
    conflict: (input.conflict ?? "").trim(),
    reveal_or_surprise: (input.reveal ?? "").trim(),
    payoff: (input.payoff ?? "").trim(),
    cta_mechanism: fingerprint.cta_mechanism,
    fingerprint,
    protection_weight: computeProtectionWeight({
      createdAt: input.createdAt ?? null,
      nowIso: args.nowIso,
      indexFromNewest: args.indexFromNewest,
      rejected: creativelyRejected || source_status === "rejected",
    }),
  };
}

export function assembleCreativeMemory(
  inputs: BuildMemoryRecordInput[],
  options: { nowIso?: string } = {},
): CreativeMemoryV2 {
  const nowIso = options.nowIso ?? new Date().toISOString();
  const sorted = [...inputs].sort((a, b) => {
    const da = Date.parse(a.createdAt ?? "") || 0;
    const db = Date.parse(b.createdAt ?? "") || 0;
    return db - da;
  });
  const records = sorted
    .slice(0, CREATIVE_CORE_V2_MEMORY_CONFIG.packageScanLimit)
    .map((input, index) =>
      buildMemoryRecord(input, { nowIso, indexFromNewest: index }),
    );
  return {
    version: CREATIVE_CORE_V2_MEMORY_VERSION,
    now_iso: nowIso,
    records,
  };
}

/**
 * Extract a memory input from a persisted package_brief (still / T2V / legacy).
 * Pure — no DB. Used by tests and by optional loaders in later steps.
 */
export function memoryInputFromPackageBrief(args: {
  packageId: string;
  brief: Record<string, unknown>;
  title?: string | null;
  createdAt?: string | null;
  packageStatus?: string | null;
  runStatus?: string | null;
  topic?: string | null;
  angle?: string | null;
  painPoint?: string | null;
}): BuildMemoryRecordInput {
  const brief = args.brief;
  const pg = asRecord(brief.presentation_generation);
  const concept = asRecord(pg?.video_concept);
  const identity = asRecord(pg?.visual_identity);
  const review = asRecord(brief.creative_review);
  const t2v = asRecord(brief.t2v_canonical_creative);
  const coreV2 = asRecord(brief.content_creative_core_v2);
  const rejection = asRecord(brief.t2v_creative_rejection);
  const visualScenes = Array.isArray(brief.visual_scenes)
    ? (brief.visual_scenes as unknown[])
        .map((s) => {
          const rec = asRecord(s);
          return [readString(rec?.image_prompt), readString(rec?.motion_prompt)].join(
            " ",
          );
        })
        .join(" ")
    : "";
  const coreScenes = Array.isArray(coreV2?.scenes)
    ? (coreV2?.scenes as unknown[])
        .map((s) => {
          const rec = asRecord(s);
          return [
            readString(rec?.visual_event),
            readString(rec?.environment),
            readString(rec?.action),
          ].join(" ");
        })
        .join(" ")
    : "";

  const fp = asRecord(coreV2?.creative_fingerprint);
  return {
    packageId: args.packageId,
    createdAt: args.createdAt ?? null,
    packageStatus: args.packageStatus ?? null,
    runStatus: args.runStatus ?? null,
    reviewStatus: readString(review?.status),
    reviewApproved: review?.approved === true,
    explicitRejected:
      brief.t2v_creative_rejected === true || rejection != null,
    rejectionReason:
      readString(rejection?.reason) ||
      readString(brief.creative_rejection_reason) ||
      null,
    painPoint:
      args.painPoint ||
      readString(pg?.selected_pain_point) ||
      readString(fp?.pain_key) ||
      null,
    centralTopic:
      readString(coreV2?.core_idea) ||
      args.topic ||
      readString(t2v?.core_idea) ||
      readString(concept?.core_idea) ||
      readString(args.title) ||
      "",
    angle: args.angle || readString(t2v?.conflict) || "",
    hook: readString(coreV2?.hook) || readString(brief.hook),
    setting:
      readString(identity?.environment) ||
      readString(asRecord(concept?.visual_direction)?.environment) ||
      readString(asRecord(t2v?.visual_direction)?.environment),
    props: coreScenes || visualScenes,
    visual: coreScenes || visualScenes,
    emotion:
      readString(coreV2?.main_emotion) ||
      readString(t2v?.primary_emotion) ||
      readString(concept?.emotional_tone),
    conflict: readString(coreV2?.conflict) || readString(t2v?.conflict),
    reveal:
      readString(coreV2?.reveal_or_surprise) || readString(t2v?.surprise),
    payoff: readString(coreV2?.payoff) || readString(t2v?.payoff),
    cta: readString(coreV2?.cta_intent) || readString(asRecord(brief.cta)?.text),
    narrative:
      readString(coreV2?.visible_change) ||
      readString(t2v?.beginning_to_end_change),
  };
}

export function buildCreativeMemory(
  packages: Array<{
    packageId: string;
    brief: Record<string, unknown>;
    title?: string | null;
    createdAt?: string | null;
    packageStatus?: string | null;
    runStatus?: string | null;
    topic?: string | null;
    angle?: string | null;
    painPoint?: string | null;
  }>,
  options: { nowIso?: string } = {},
): CreativeMemoryV2 {
  return assembleCreativeMemory(
    packages.map((p) => memoryInputFromPackageBrief(p)),
    options,
  );
}

/** Compact prompt block — fingerprints + keys, not full voiceovers. */
export function creativeMemoryPromptBlockV2(memory: CreativeMemoryV2): string {
  if (memory.records.length === 0) return "";
  const lines = memory.records
    .slice(0, CREATIVE_CORE_V2_MEMORY_CONFIG.promptRecordLimit)
    .map((r, i) => {
      return (
        `- #${i + 1} [w=${r.protection_weight.toFixed(2)}|${r.source_status}` +
        `${r.rejected ? "/rejected" : ""}] ` +
        `pain="${(r.pain_point ?? "").slice(0, 60)}"; ` +
        `scenario=${r.scenario_family || "other"}; pov=${r.pov}; ` +
        `open=${r.opening_mechanism}; setting=${r.setting.slice(0, 40) || r.fingerprint.setting_key}; ` +
        `props=${r.dominant_props.slice(0, 3).join(",")}; ` +
        `conflict=${(r.conflict || r.fingerprint.conflict_key).slice(0, 50)}; ` +
        `topic="${r.central_topic.slice(0, 80)}"` +
        (r.rejection_reason ? `; reject="${r.rejection_reason.slice(0, 60)}"` : "")
      );
    });
  return [
    "CROSS-RUN CREATIVE MEMORY (do not repeat — includes cancelled and rejected):",
    ...lines,
    "MEMORY RULES:",
    "- A paraphrase of the same situation is NOT a new topic.",
    "- A different character in the same plot is NOT a new story.",
    "- Same opening mechanism + same conflict is NOT enough.",
    "- Same setting and dominant props with the same payoff is NOT enough.",
    "- Very recent and rejected drafts are strongly protected; ancient motifs may return only with a different scenario, POV, and execution.",
    "- If unused pain points exist, do not reuse the most recent pain while its protection is still strong.",
  ].join("\n");
}

export function lastUsedPainKey(memory: CreativeMemoryV2): string | null {
  for (const r of memory.records) {
    const key = r.fingerprint.pain_key || keyFromText(r.pain_point ?? "");
    if (key) return key;
  }
  return null;
}

export function unusedPainPoints(
  projectPains: readonly string[],
  memory: CreativeMemoryV2,
): string[] {
  const last = lastUsedPainKey(memory);
  const out: string[] = [];
  const seen = new Set<string>();
  for (const raw of projectPains) {
    const key = keyFromText(raw, 6);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    if (last && key === last) continue;
    out.push(raw.trim());
  }
  return out;
}
