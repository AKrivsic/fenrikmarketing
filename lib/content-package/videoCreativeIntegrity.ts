import type { PackageVideoProductionMode } from "@/lib/content-package/packageVideoProductionMode";
import {
  DEFAULT_PACKAGE_VIDEO_PRODUCTION_MODE,
  parsePackageVideoProductionMode,
} from "@/lib/content-package/packageVideoProductionMode";
import type { TextToVideoCreativePlan } from "@/lib/content-package/textToVideoCreativePlan";
import { TEXT_TO_VIDEO_TIMING_MEASURED } from "@/lib/content-package/textToVideoCreativePlan";
import {
  planMatchesApprovedSources,
  readTextToVideoCreativePlan,
} from "@/lib/content-package/textToVideoCreativePlan";
import type { VoiceDirectionContract } from "@/lib/content-package/voiceDirectionContract";
import {
  defaultVoiceDirectionContract,
  parseVoiceDirectionContract,
} from "@/lib/content-package/voiceDirectionContract";
import {
  hookFingerprint,
  voiceoverRevisionId,
} from "@/lib/content-package/videoCreativeRevision";

export type VideoDerivativeStatus = "current" | "stale";

export interface VideoCreativeIntegrity {
  approved_voiceover_text: string | null;
  voiceover_revision_id: string | null;
  approved_hook_text: string | null;
  hook_fingerprint: string | null;
  hook_status: VideoDerivativeStatus;
  subtitles_status: VideoDerivativeStatus;
  visual_plan_status: VideoDerivativeStatus;
  audio_timing_status: VideoDerivativeStatus;
  voice_direction_revision: number;
  creative_plan_revision_id: string | null;
  creative_plan_fingerprint: string | null;
  plan_sync_status: VideoDerivativeStatus;
}

export const VIDEO_CREATIVE_INTEGRITY_KEY = "video_creative_integrity" as const;
export const PACKAGE_VIDEO_MODE_BRIEF_KEY = "package_video_mode" as const;
export const VIDEO_VOICE_DIRECTION_KEY = "video_voice_direction" as const;
export const VIDEO_PAID_PREFLIGHT_KEY = "video_paid_preflight" as const;

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

export function defaultVideoCreativeIntegrity(
  voiceoverText: string | null = null,
): VideoCreativeIntegrity {
  const vo = voiceoverText?.trim() || null;
  return {
    approved_voiceover_text: vo,
    voiceover_revision_id: vo ? voiceoverRevisionId(vo) : null,
    approved_hook_text: null,
    hook_fingerprint: null,
    hook_status: "stale",
    subtitles_status: "stale",
    visual_plan_status: "stale",
    audio_timing_status: "stale",
    voice_direction_revision: 0,
    creative_plan_revision_id: null,
    creative_plan_fingerprint: null,
    plan_sync_status: "stale",
  };
}

export function readVideoCreativeIntegrity(
  brief: Record<string, unknown> | null | undefined,
): VideoCreativeIntegrity {
  const root = asRecord(brief?.[VIDEO_CREATIVE_INTEGRITY_KEY]);
  if (!root) {
    const vo =
      typeof brief?.voiceover_text === "string"
        ? brief.voiceover_text.trim()
        : null;
    return defaultVideoCreativeIntegrity(vo || null);
  }
  const status = (field: unknown): VideoDerivativeStatus =>
    field === "stale" ? "stale" : "current";
  return {
    approved_voiceover_text:
      typeof root.approved_voiceover_text === "string"
        ? root.approved_voiceover_text
        : null,
    voiceover_revision_id:
      typeof root.voiceover_revision_id === "string"
        ? root.voiceover_revision_id
        : null,
    approved_hook_text:
      typeof root.approved_hook_text === "string"
        ? root.approved_hook_text
        : null,
    hook_fingerprint:
      typeof root.hook_fingerprint === "string" ? root.hook_fingerprint : null,
    hook_status: status(root.hook_status),
    subtitles_status: status(root.subtitles_status),
    visual_plan_status: status(root.visual_plan_status),
    audio_timing_status: status(root.audio_timing_status),
    voice_direction_revision:
      typeof root.voice_direction_revision === "number" &&
      Number.isFinite(root.voice_direction_revision)
        ? Math.max(0, Math.trunc(root.voice_direction_revision))
        : 0,
    creative_plan_revision_id:
      typeof root.creative_plan_revision_id === "string"
        ? root.creative_plan_revision_id
        : null,
    creative_plan_fingerprint:
      typeof root.creative_plan_fingerprint === "string"
        ? root.creative_plan_fingerprint
        : null,
    plan_sync_status: status(root.plan_sync_status ?? root.visual_plan_status),
  };
}

export function serializeVideoCreativeIntegrity(
  integrity: VideoCreativeIntegrity,
): Record<string, unknown> {
  return { ...integrity };
}

/**
 * Marks derivatives current only when revision/fingerprint bindings match sources.
 */
export function syncVideoCreativeIntegrityFromSources(args: {
  voiceoverText: string;
  hookText: string;
  voiceDirection: VoiceDirectionContract;
  plan: TextToVideoCreativePlan | null;
  packageVideoMode: PackageVideoProductionMode;
}): VideoCreativeIntegrity {
  const vo = args.voiceoverText.trim();
  const hook = args.hookText.trim();
  const voRev = voiceoverRevisionId(vo);
  const hookFp = hook ? hookFingerprint(hook) : null;
  const dirRev = args.voiceDirection.revision ?? 0;

  let planSync: VideoDerivativeStatus = "stale";
  let planRevId: string | null = null;
  let planFp: string | null = null;
  let visualStatus: VideoDerivativeStatus = "stale";

  if (args.packageVideoMode === "still") {
    planSync = "current";
    visualStatus = "current";
  } else if (args.plan) {
    const matches = planMatchesApprovedSources({
      plan: args.plan,
      voiceoverText: vo,
      hookText: hook,
      voiceDirectionRevision: dirRev,
    });
    if (
      matches &&
      args.plan.status === "approved" &&
      args.plan.repetition.status === "passed"
    ) {
      planSync = "current";
      visualStatus = "current";
      planRevId = args.plan.voiceover_revision_id;
      planFp = args.plan.plan_fingerprint;
    }
  }

  const voMatches =
    voRev.length > 0 &&
    (!args.plan || args.plan.voiceover_revision_id === voRev);
  const hookMatches = hookFp && args.plan?.hook_fingerprint === hookFp;
  const measuredAudioOk =
    args.plan?.timing_status === TEXT_TO_VIDEO_TIMING_MEASURED &&
    args.plan.measured_audio_revision_id?.trim() ===
      args.plan.voiceover_revision_id.trim();

  return {
    approved_voiceover_text: vo || null,
    voiceover_revision_id: voRev || null,
    approved_hook_text: hook || null,
    hook_fingerprint: hookFp,
    hook_status:
      args.packageVideoMode === "still"
        ? "current"
        : hookMatches && voMatches
          ? "current"
          : "stale",
    subtitles_status: voMatches ? "current" : "stale",
    visual_plan_status: visualStatus,
    audio_timing_status:
      measuredAudioOk
        ? "current"
        : dirRev === (args.plan?.voice_direction_revision ?? dirRev) &&
            planSync === "current"
          ? "current"
          : args.packageVideoMode === "still"
            ? "current"
            : "stale",
    voice_direction_revision: dirRev,
    creative_plan_revision_id: planRevId,
    creative_plan_fingerprint: planFp,
    plan_sync_status: planSync,
  };
}

/** @deprecated Prefer syncVideoCreativeIntegrityFromSources */
export function markVideoCreativeCurrentAfterRebuild(args: {
  voiceoverText: string;
  voiceDirectionRevision?: number;
  hookText?: string;
  plan?: TextToVideoCreativePlan | null;
  packageVideoMode?: PackageVideoProductionMode;
}): VideoCreativeIntegrity {
  return syncVideoCreativeIntegrityFromSources({
    voiceoverText: args.voiceoverText,
    hookText: args.hookText ?? deriveHookFallback(args.voiceoverText),
    voiceDirection: {
      style: "auto",
      revision: args.voiceDirectionRevision ?? 0,
    },
    plan: args.plan ?? null,
    packageVideoMode: args.packageVideoMode ?? "still",
  });
}

function deriveHookFallback(voiceover: string): string {
  return voiceover.split(/\r?\n/)[0]?.trim() ?? voiceover.trim().slice(0, 120);
}

export function invalidateVideoDerivativesOnVoiceoverChange(
  brief: Record<string, unknown>,
  nextVoiceoverText: string,
): Record<string, unknown> {
  const prior = readVideoCreativeIntegrity(brief);
  const vo = nextVoiceoverText.trim();
  const next: VideoCreativeIntegrity = {
    ...prior,
    approved_voiceover_text: vo || null,
    voiceover_revision_id: vo ? voiceoverRevisionId(vo) : null,
    hook_status: "stale",
    subtitles_status: "stale",
    visual_plan_status: "stale",
    plan_sync_status: "stale",
    creative_plan_revision_id: null,
    creative_plan_fingerprint: null,
    approved_hook_text: prior.approved_hook_text,
    hook_fingerprint: prior.hook_fingerprint,
  };
  const plan = readTextToVideoCreativePlan(brief);
  return {
    ...brief,
    [VIDEO_CREATIVE_INTEGRITY_KEY]: serializeVideoCreativeIntegrity(next),
    ...(plan
      ? {
          video_text_to_video_creative_plan: {
            ...plan,
            status: "stale",
            repetition: { ...plan.repetition, status: "not_run", blocked_reasons: [] },
          },
        }
      : {}),
  };
}

export function invalidateVisualPlanOnSceneEdit(
  brief: Record<string, unknown>,
): Record<string, unknown> {
  const prior = readVideoCreativeIntegrity(brief);
  const plan = readTextToVideoCreativePlan(brief);
  return {
    ...brief,
    [VIDEO_CREATIVE_INTEGRITY_KEY]: serializeVideoCreativeIntegrity({
      ...prior,
      visual_plan_status: "stale",
      plan_sync_status: "stale",
      creative_plan_revision_id: null,
      creative_plan_fingerprint: null,
    }),
    ...(plan
      ? {
          video_text_to_video_creative_plan: {
            ...plan,
            status: "draft",
            repetition: { ...plan.repetition, status: "not_run", blocked_reasons: [] },
          },
        }
      : {}),
  };
}

export function invalidateAudioTimingOnVoiceDirectionChange(
  brief: Record<string, unknown>,
  nextDirection: VoiceDirectionContract,
): Record<string, unknown> {
  const prior = readVideoCreativeIntegrity(brief);
  const plan = readTextToVideoCreativePlan(brief);
  return {
    ...brief,
    [VIDEO_VOICE_DIRECTION_KEY]: nextDirection,
    [VIDEO_CREATIVE_INTEGRITY_KEY]: serializeVideoCreativeIntegrity({
      ...prior,
      audio_timing_status: "stale",
      plan_sync_status: "stale",
      voice_direction_revision: nextDirection.revision,
      creative_plan_revision_id: null,
      creative_plan_fingerprint: null,
    }),
    ...(plan
      ? {
          video_text_to_video_creative_plan: {
            ...plan,
            status: "stale",
            voice_direction_revision: nextDirection.revision,
          },
        }
      : {}),
  };
}

export function stampPackageVideoModeOnBrief(
  brief: Record<string, unknown>,
  mode: PackageVideoProductionMode,
): Record<string, unknown> {
  const raw = brief[PACKAGE_VIDEO_MODE_BRIEF_KEY];
  if (raw === undefined || raw === null || raw === "") {
    return { ...brief, [PACKAGE_VIDEO_MODE_BRIEF_KEY]: mode };
  }
  const existing = parsePackageVideoProductionMode(raw);
  if (existing !== mode) {
    throw new Error("package_video_mode_immutable_for_run");
  }
  return brief;
}

export function ensureBriefVideoProductionDefaults(
  brief: Record<string, unknown>,
  runMode: PackageVideoProductionMode = DEFAULT_PACKAGE_VIDEO_PRODUCTION_MODE,
): Record<string, unknown> {
  let next = stampPackageVideoModeOnBrief(brief, runMode);
  if (!asRecord(next[VIDEO_CREATIVE_INTEGRITY_KEY])) {
    const vo =
      typeof next.voiceover_text === "string"
        ? next.voiceover_text.trim()
        : null;
    next = {
      ...next,
      [VIDEO_CREATIVE_INTEGRITY_KEY]: serializeVideoCreativeIntegrity(
        defaultVideoCreativeIntegrity(vo),
      ),
    };
  }
  if (!parseVoiceDirectionContract(next[VIDEO_VOICE_DIRECTION_KEY])) {
    next = {
      ...next,
      [VIDEO_VOICE_DIRECTION_KEY]: defaultVoiceDirectionContract(),
    };
  }
  return next;
}
