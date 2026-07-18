import type { ContentPackageOutput } from "@/lib/ai/schemas/contentPackage";
import {
  resolveChecklistGenerationMode,
  shouldRenderChecklistScenes,
} from "@/lib/scene-types/checklistGenerationMode";
import { isProjectAllowlistedForChecklist } from "@/lib/scene-types/checklistProductionRollout";
import {
  normalizePhoneScenePayloadRaw,
  parsePhoneScenePayload,
} from "@/lib/scene-types/phone/phoneScenePayload";
import { shouldRenderPhoneScenes } from "@/lib/scene-types/phone/phoneRenderGate";
import { parseQuoteScenePayload } from "@/lib/scene-types/quote/quoteScenePayload";
import { shouldRenderQuoteScenes } from "@/lib/scene-types/quote/quoteRenderGate";
import { parseStatisticScenePayload } from "@/lib/scene-types/statistic/statisticScenePayload";
import { shouldRenderStatisticScenes } from "@/lib/scene-types/statistic/statisticRenderGate";
import { parseCtaScenePayload } from "@/lib/scene-types/cta/ctaScenePayload";
import { shouldRenderCtaScenes } from "@/lib/scene-types/cta/ctaRenderGate";
import { parseProductDemoScenePayload } from "@/lib/scene-types/product-demo/productDemoBeat";
import { resolveAuthoritativeCtaReference } from "@/lib/scene-types/cta/ctaSourceOfTruth";
import { validateCtaSceneEligibility } from "@/lib/scene-types/presentation/ctaEligibility";
import { validateQuoteSceneEligibility } from "@/lib/scene-types/presentation/quoteEligibility";
import { validateStatisticSceneEligibility } from "@/lib/scene-types/presentation/statisticEligibility";
import type { SceneType } from "@/lib/scene-types/sceneType";
import { DEFAULT_SCENE_TYPE } from "@/lib/scene-types/sceneType";
import type { VisualScene } from "@/lib/scene-types/visualScene";
import type { ImageScenePayload } from "@/lib/scene-types/visualScene";
import {
  downgradeSceneToImage,
  listLikeNarration,
  narrationForScene,
} from "@/lib/scene-types/presentation/downgradeToImage";
import type { ProofIndex } from "@/lib/scene-types/presentation/proofIndex";
import type { ProjectPresentationSignals } from "@/lib/scene-types/presentation/projectSignals";
import { narrationSupportsPhoneBeat } from "@/lib/scene-types/presentation/projectSignals";
import { tokenOverlapRatio } from "@/lib/scene-types/presentation/textMatch";

export type PresentationDecisionRule =
  | "allowed"
  | "type_not_permitted"
  | "checklist_not_supported_by_narration"
  | "statistic_not_permitted"
  | "statistic_invalid_payload"
  | "statistic_proof_not_found"
  | "statistic_value_mismatch"
  | "statistic_unit_mismatch"
  | "statistic_label_mismatch"
  | "statistic_narration_not_supported"
  | "statistic_video_limit_exceeded"
  | "quote_not_permitted"
  | "quote_invalid_payload"
  | "quote_proof_not_found"
  | "quote_text_mismatch"
  | "quote_attribution_mismatch"
  | "quote_narration_not_supported"
  | "quote_video_limit_exceeded"
  | "quote_missing_proof"
  | "phone_not_permitted"
  | "phone_not_eligible"
  | "phone_asset_not_found"
  | "phone_mobile_capability_missing"
  | "phone_narration_not_supported"
  | "phone_video_limit_exceeded"
  | "cta_not_permitted"
  | "cta_invalid_payload"
  | "cta_action_mismatch"
  | "cta_unsupported_claim"
  | "cta_not_final_scene"
  | "cta_video_limit_exceeded"
  | "cta_contains_unsupported_claim"
  | "scene_type_recently_overused"
  | "cta_recently_used"
  | "checklist_recently_used"
  | "phone_recently_used"
  | "quote_recently_used"
  | "statistic_recently_used"
  | "downgraded_to_image"
  | "non_image_renderer_pending"
  | "checklist_shadow_mode"
  | "checklist_project_not_allowlisted";

export interface PresentationAnalyzerDecision {
  scene_id: string;
  requested_type: SceneType;
  final_type: SceneType;
  rule: PresentationDecisionRule;
  reason: string;
}

export interface AnalyzePresentationInput {
  scenes: VisualScene[];
  allowedSceneTypes: readonly SceneType[];
  voiceoverText: string;
  proof: ProofIndex;
  projectSignals: ProjectPresentationSignals;
  packageCtaText?: string | null;
  projectDefaultCta?: string | null;
  projectName?: string;
  projectId?: string;
}

export interface AnalyzePresentationResult {
  scenes: VisualScene[];
  decisions: PresentationAnalyzerDecision[];
  warnings: string[];
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}


function isTypeAllowed(
  allowed: readonly SceneType[],
  type: SceneType,
): boolean {
  return allowed.includes(type);
}

function validateChecklist(
  scene: VisualScene,
  narration: string,
): { ok: true } | { ok: false; reason: string } {
  const payload = asRecord(scene.payload);
  const itemsRaw = payload?.items;
  if (!Array.isArray(itemsRaw) || itemsRaw.length < 2) {
    return { ok: false, reason: "checklist requires at least two items" };
  }
  const items = itemsRaw
    .filter((i): i is string => typeof i === "string")
    .map((i) => i.trim())
    .filter((i) => i.length > 0);
  if (items.length < 2) {
    return { ok: false, reason: "checklist items invalid" };
  }
  if (!listLikeNarration(narration)) {
    return {
      ok: false,
      reason: "narration does not present a list or multiple steps",
    };
  }
  for (const item of items) {
    if (tokenOverlapRatio(item, narration) < 0.35) {
      return {
        ok: false,
        reason: `checklist item not supported by narration: ${item.slice(0, 40)}`,
      };
    }
  }
  return { ok: true };
}

function validateStatistic(
  scene: VisualScene,
  proof: ProofIndex,
  narration: string,
):
  | { ok: true }
  | { ok: false; rule: PresentationDecisionRule; reason: string } {
  const parsed = parseStatisticScenePayload(scene.payload);
  if (!parsed.ok) {
    return {
      ok: false,
      rule: "statistic_invalid_payload",
      reason: parsed.reason,
    };
  }

  const eligibility = validateStatisticSceneEligibility({
    payload: parsed.data,
    proof,
    narration,
  });
  if (!eligibility.ok) {
    return {
      ok: false,
      rule: eligibility.rule as PresentationDecisionRule,
      reason: eligibility.reason,
    };
  }
  return { ok: true };
}

function validateQuote(
  scene: VisualScene,
  proof: ProofIndex,
  narration: string,
):
  | { ok: true }
  | { ok: false; rule: PresentationDecisionRule; reason: string } {
  const parsed = parseQuoteScenePayload(scene.payload);
  if (!parsed.ok) {
    return {
      ok: false,
      rule: "quote_invalid_payload",
      reason: parsed.reason,
    };
  }

  const eligibility = validateQuoteSceneEligibility({
    payload: parsed.data,
    proof,
    narration,
  });
  if (!eligibility.ok) {
    return {
      ok: false,
      rule: eligibility.rule as PresentationDecisionRule,
      reason: eligibility.reason,
    };
  }
  return { ok: true };
}

function validatePhone(
  scene: VisualScene,
  narration: string,
  signals: ProjectPresentationSignals,
): { ok: true } | { ok: false; reason: string } {
  const normalized = normalizePhoneScenePayloadRaw(scene.payload);
  const parsed = normalized
    ? parsePhoneScenePayload(normalized)
    : parsePhoneScenePayload(scene.payload);
  if (!parsed.ok) {
    return { ok: false, reason: parsed.reason };
  }

  if (parsed.data.asset_id) {
    if (!signals.mobileAssetIds.has(parsed.data.asset_id)) {
      return { ok: false, reason: "screen asset is not a mobile UI asset" };
    }
  } else if (parsed.data.image_prompt) {
    if (!signals.mobileProductCapable) {
      return {
        ok: false,
        reason: "project has no mobile product capability for AI phone screen",
      };
    }
  }

  if (!narrationSupportsPhoneBeat(narration)) {
    return {
      ok: false,
      reason:
        "narration does not concern mobile workflow, social feed, or product UI on phone",
    };
  }

  return { ok: true };
}

function phoneValidationRule(reason: string): PresentationDecisionRule {
  if (reason.includes("mobile UI asset")) return "phone_asset_not_found";
  if (reason.includes("mobile product capability")) {
    return "phone_mobile_capability_missing";
  }
  if (reason.includes("narration does not concern")) {
    return "phone_narration_not_supported";
  }
  return "phone_not_eligible";
}

function validateCta(
  scene: VisualScene,
  args: {
    packageCtaText?: string | null;
    projectDefaultCta?: string | null;
    sceneIndex: number;
    sceneCount: number;
  },
):
  | { ok: true }
  | { ok: false; rule: PresentationDecisionRule; reason: string } {
  const parsed = parseCtaScenePayload(scene.payload);
  if (!parsed.ok) {
    return {
      ok: false,
      rule: "cta_invalid_payload",
      reason: parsed.reason,
    };
  }

  const reference = resolveAuthoritativeCtaReference({
    packageCtaText: args.packageCtaText,
    projectDefaultCta: args.projectDefaultCta,
  });

  const eligibility = validateCtaSceneEligibility({
    payload: parsed.data,
    reference,
    sceneIndex: args.sceneIndex,
    sceneCount: args.sceneCount,
  });
  if (!eligibility.ok) {
    return {
      ok: false,
      rule: eligibility.rule as PresentationDecisionRule,
      reason: eligibility.reason,
    };
  }
  return { ok: true };
}

function eligibilityCheck(args: {
  scene: VisualScene;
  allowed: readonly SceneType[];
  narration: string;
  proof: ProofIndex;
  signals: ProjectPresentationSignals;
  packageCtaText?: string | null;
  projectDefaultCta?: string | null;
  sceneIndex: number;
  sceneCount: number;
}):
  | { pass: true }
  | { pass: false; rule: PresentationDecisionRule; reason: string } {
  const requested = args.scene.type;

  if (requested === DEFAULT_SCENE_TYPE) {
    return { pass: true };
  }

  if (!isTypeAllowed(args.allowed, requested)) {
    return {
      pass: false,
      rule:
        requested === "PHONE"
          ? "phone_not_permitted"
          : requested === "QUOTE"
            ? "quote_not_permitted"
            : requested === "STATISTIC"
              ? "statistic_not_permitted"
              : requested === "CTA"
                ? "cta_not_permitted"
                : requested === "PRODUCT_DEMO"
                  ? "type_not_permitted"
                  : "type_not_permitted",
      reason: `${requested} not in project allowed_scene_types ceiling`,
    };
  }

  switch (requested) {
    case "CHECKLIST": {
      const r = validateChecklist(args.scene, args.narration);
      if (!r.ok) {
        return {
          pass: false,
          rule: "checklist_not_supported_by_narration",
          reason: r.reason,
        };
      }
      return { pass: true };
    }
    case "STATISTIC": {
      const r = validateStatistic(args.scene, args.proof, args.narration);
      if (!r.ok) {
        return {
          pass: false,
          rule: r.rule,
          reason: r.reason,
        };
      }
      return { pass: true };
    }
    case "QUOTE": {
      const r = validateQuote(args.scene, args.proof, args.narration);
      if (!r.ok) {
        return {
          pass: false,
          rule: r.rule,
          reason: r.reason,
        };
      }
      return { pass: true };
    }
    case "PHONE": {
      const r = validatePhone(args.scene, args.narration, args.signals);
      if (!r.ok) {
        return {
          pass: false,
          rule: phoneValidationRule(r.reason),
          reason: r.reason,
        };
      }
      return { pass: true };
    }
    case "CTA": {
      const r = validateCta(args.scene, {
        packageCtaText: args.packageCtaText,
        projectDefaultCta: args.projectDefaultCta,
        sceneIndex: args.sceneIndex,
        sceneCount: args.sceneCount,
      });
      if (!r.ok) {
        return {
          pass: false,
          rule: r.rule,
          reason: r.reason,
        };
      }
      return { pass: true };
    }
    case "PRODUCT_DEMO": {
      const parsed = parseProductDemoScenePayload(args.scene.payload);
      if (!parsed.ok) {
        return {
          pass: false,
          rule: "type_not_permitted",
          reason: parsed.reason,
        };
      }
      return { pass: true };
    }
    default:
      return {
        pass: false,
        rule: "type_not_permitted",
        reason: `unsupported scene type ${requested}`,
      };
  }
}

/**
 * Deterministic presentation gate. Never upgrades types. Non-IMAGE types that
 * pass eligibility are still downgraded to IMAGE until renderers exist (Phase 3).
 */
export function analyzePresentation(
  input: AnalyzePresentationInput,
): AnalyzePresentationResult {
  const decisions: PresentationAnalyzerDecision[] = [];
  const warnings: string[] = [];
  const outScenes: VisualScene[] = [];
  const count = input.scenes.length;

  for (let i = 0; i < input.scenes.length; i++) {
    const scene = input.scenes[i]!;
    const sceneId = scene.id ?? `scene-${i + 1}`;
    const requested = scene.type;
    const narration = narrationForScene({
      voiceoverText: input.voiceoverText,
      sceneIndex: i,
      sceneCount: count,
      narrationHint: scene.narration_hint,
    });

    if (requested === DEFAULT_SCENE_TYPE) {
      outScenes.push({ ...scene, id: sceneId, type: DEFAULT_SCENE_TYPE });
      decisions.push({
        scene_id: sceneId,
        requested_type: requested,
        final_type: DEFAULT_SCENE_TYPE,
        rule: "allowed",
        reason: "image scene",
      });
      continue;
    }

    const gate = eligibilityCheck({
      scene,
      allowed: input.allowedSceneTypes,
      narration,
      proof: input.proof,
      signals: input.projectSignals,
      packageCtaText: input.packageCtaText,
      projectDefaultCta: input.projectDefaultCta,
      sceneIndex: i,
      sceneCount: count,
    });

    let working: VisualScene = { ...scene, id: sceneId };

    if (!gate.pass) {
      working = downgradeSceneToImage({
        scene: working,
        narration,
        projectName: input.projectName,
        requestedType: requested,
      });
      decisions.push({
        scene_id: sceneId,
        requested_type: requested,
        final_type: DEFAULT_SCENE_TYPE,
        rule: gate.rule,
        reason: gate.reason,
      });
      warnings.push(`${sceneId}: ${gate.rule} — ${gate.reason}`);
      outScenes.push(working);
      continue;
    }

    if (requested === "CHECKLIST" && gate.pass) {
      if (shouldRenderChecklistScenes(input.projectId)) {
        outScenes.push({ ...working, id: sceneId, type: "CHECKLIST" });
        decisions.push({
          scene_id: sceneId,
          requested_type: requested,
          final_type: "CHECKLIST",
          rule: "allowed",
          reason: "eligible checklist; checklist renderer active",
        });
        continue;
      }

      const mode = resolveChecklistGenerationMode();
      working = downgradeSceneToImage({
        scene: working,
        narration,
        projectName: input.projectName,
        requestedType: requested,
      });
      const notAllowlisted =
        mode === "enabled" && !isProjectAllowlistedForChecklist(input.projectId);
      decisions.push({
        scene_id: sceneId,
        requested_type: requested,
        final_type: DEFAULT_SCENE_TYPE,
        rule:
          mode === "shadow"
            ? "checklist_shadow_mode"
            : notAllowlisted
              ? "checklist_project_not_allowlisted"
              : "non_image_renderer_pending",
        reason:
          mode === "shadow"
            ? "eligible checklist in shadow mode; compiled as IMAGE"
            : notAllowlisted
              ? "project not in CHECKLIST_ENABLED_PROJECT_IDS; compiled as IMAGE"
              : "eligible but checklist rendering disabled; compiled as IMAGE",
      });
      warnings.push(`${sceneId}: ${decisions[decisions.length - 1]!.rule}`);
      outScenes.push(working);
      continue;
    }

    if (requested === "PHONE" && gate.pass) {
      if (shouldRenderPhoneScenes()) {
        outScenes.push({ ...working, id: sceneId, type: "PHONE" });
        decisions.push({
          scene_id: sceneId,
          requested_type: requested,
          final_type: "PHONE",
          rule: "allowed",
          reason: "eligible phone scene; phone renderer active",
        });
        continue;
      }

      working = downgradeSceneToImage({
        scene: working,
        narration,
        projectName: input.projectName,
        requestedType: requested,
      });
      decisions.push({
        scene_id: sceneId,
        requested_type: requested,
        final_type: DEFAULT_SCENE_TYPE,
        rule: "non_image_renderer_pending",
        reason: "eligible but phone rendering disabled; compiled as IMAGE",
      });
      warnings.push(`${sceneId}: non_image_renderer_pending`);
      outScenes.push(working);
      continue;
    }

    if (requested === "QUOTE" && gate.pass) {
      if (shouldRenderQuoteScenes()) {
        outScenes.push({ ...working, id: sceneId, type: "QUOTE" });
        decisions.push({
          scene_id: sceneId,
          requested_type: requested,
          final_type: "QUOTE",
          rule: "allowed",
          reason: "eligible quote scene; quote renderer active",
        });
        continue;
      }

      working = downgradeSceneToImage({
        scene: working,
        narration,
        projectName: input.projectName,
        requestedType: requested,
      });
      decisions.push({
        scene_id: sceneId,
        requested_type: requested,
        final_type: DEFAULT_SCENE_TYPE,
        rule: "non_image_renderer_pending",
        reason: "eligible but quote rendering disabled; compiled as IMAGE",
      });
      warnings.push(`${sceneId}: non_image_renderer_pending`);
      outScenes.push(working);
      continue;
    }

    if (requested === "STATISTIC" && gate.pass) {
      if (shouldRenderStatisticScenes()) {
        outScenes.push({ ...working, id: sceneId, type: "STATISTIC" });
        decisions.push({
          scene_id: sceneId,
          requested_type: requested,
          final_type: "STATISTIC",
          rule: "allowed",
          reason: "eligible statistic scene; statistic renderer active",
        });
        continue;
      }

      working = downgradeSceneToImage({
        scene: working,
        narration,
        projectName: input.projectName,
        requestedType: requested,
      });
      decisions.push({
        scene_id: sceneId,
        requested_type: requested,
        final_type: DEFAULT_SCENE_TYPE,
        rule: "non_image_renderer_pending",
        reason: "eligible but statistic rendering disabled; compiled as IMAGE",
      });
      warnings.push(`${sceneId}: non_image_renderer_pending`);
      outScenes.push(working);
      continue;
    }

    if (requested === "CTA" && gate.pass) {
      if (shouldRenderCtaScenes()) {
        outScenes.push({ ...working, id: sceneId, type: "CTA" });
        decisions.push({
          scene_id: sceneId,
          requested_type: requested,
          final_type: "CTA",
          rule: "allowed",
          reason: "eligible cta scene; cta renderer active",
        });
        continue;
      }

      working = downgradeSceneToImage({
        scene: working,
        narration,
        projectName: input.projectName,
        requestedType: requested,
      });
      decisions.push({
        scene_id: sceneId,
        requested_type: requested,
        final_type: DEFAULT_SCENE_TYPE,
        rule: "non_image_renderer_pending",
        reason: "eligible but cta rendering disabled; compiled as IMAGE",
      });
      warnings.push(`${sceneId}: non_image_renderer_pending`);
      outScenes.push(working);
      continue;
    }

    if (requested === "PRODUCT_DEMO" && gate.pass) {
      outScenes.push({ ...working, id: sceneId, type: "PRODUCT_DEMO" });
      decisions.push({
        scene_id: sceneId,
        requested_type: requested,
        final_type: "PRODUCT_DEMO",
        rule: "allowed",
        reason: "structured product_demo; deterministic chat renderer",
      });
      continue;
    }

    // Eligible non-IMAGE without renderer — worker-safe as IMAGE until implemented.
    working = downgradeSceneToImage({
      scene: working,
      narration,
      projectName: input.projectName,
      requestedType: requested,
    });
    decisions.push({
      scene_id: sceneId,
      requested_type: requested,
      final_type: DEFAULT_SCENE_TYPE,
      rule: "non_image_renderer_pending",
      reason: "eligible but no renderer; compiled as IMAGE",
    });
    outScenes.push(working);
  }

  return { scenes: outScenes, decisions, warnings };
}

export function packageCtaTextFromPackage(
  pkg: Pick<ContentPackageOutput, "cta">,
): string | null {
  const text = pkg.cta?.text?.trim();
  return text && text.length > 0 ? text : null;
}
