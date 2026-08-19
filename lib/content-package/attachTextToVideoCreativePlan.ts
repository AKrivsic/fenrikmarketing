import type { SupabaseClient } from "@supabase/supabase-js";
import type { GenerationMode } from "@/lib/ai/generationMode";
import { defersVideoUntilCreativeReview } from "@/lib/ai/generationMode";
import type { AntiRepetitionMemory } from "@/lib/ai/types";
import type { PackageVideoProductionMode } from "@/lib/content-package/packageVideoProductionMode";
import {
  applyRepetitionResultToPlan,
  approveTextToVideoCreativePlan,
  buildTextToVideoCreativePlan,
  checkTextToVideoRepetition,
  deriveHookFromVoiceover,
  readTextToVideoCreativePlan,
  serializeTextToVideoCreativePlan,
  voiceDirectionFromBriefOrDefault,
  VIDEO_TEXT_TO_VIDEO_CREATIVE_PLAN_KEY,
} from "@/lib/content-package/textToVideoCreativePlan";
import {
  proposeAutoSoundPlanFromCreativePlan,
} from "@/lib/content-package/textToVideoSoundPlan";
import {
  serializeVideoCreativeIntegrity,
  syncVideoCreativeIntegrityFromSources,
  VIDEO_CREATIVE_INTEGRITY_KEY,
} from "@/lib/content-package/videoCreativeIntegrity";

async function loadRecentPlanFingerprints(
  supabase: SupabaseClient,
  projectId: string,
  excludePackageId: string,
): Promise<string[]> {
  const { data } = await supabase
    .from("content_packages")
    .select("id, package_brief")
    .eq("project_id", projectId)
    .neq("id", excludePackageId)
    .order("created_at", { ascending: false })
    .limit(30);
  const fps: string[] = [];
  for (const row of data ?? []) {
    const brief = row.package_brief as Record<string, unknown> | null;
    if (!brief) continue;
    const plan = readTextToVideoCreativePlan(brief);
    if (plan?.plan_fingerprint) fps.push(plan.plan_fingerprint);
  }
  return fps;
}

export async function loadRecentTextToVideoPlanFingerprints(
  supabase: SupabaseClient,
  projectId: string,
  excludePackageId: string,
): Promise<string[]> {
  return loadRecentPlanFingerprints(supabase, projectId, excludePackageId);
}

export async function attachTextToVideoCreativePlanToBrief(args: {
  supabase: SupabaseClient;
  projectId: string;
  packageId: string;
  brief: Record<string, unknown>;
  generationMode: GenerationMode;
  memory: AntiRepetitionMemory;
}): Promise<Record<string, unknown>> {
  const vo =
    typeof args.brief.voiceover_text === "string"
      ? args.brief.voiceover_text.trim()
      : "";
  if (!vo) return args.brief;

  const direction = voiceDirectionFromBriefOrDefault(args.brief);
  const hook =
    typeof args.brief.hook === "string" && args.brief.hook.trim()
      ? args.brief.hook.trim()
      : deriveHookFromVoiceover(vo);
  const priorFps = await loadRecentPlanFingerprints(
    args.supabase,
    args.projectId,
    args.packageId,
  );

  let plan = buildTextToVideoCreativePlan({
    packageId: args.packageId,
    voiceoverText: vo,
    hookOverride: hook,
    voiceDirection: direction,
  });

  const repetition = checkTextToVideoRepetition({
    plan,
    memory: args.memory,
    priorPlanFingerprints: priorFps,
  });
  plan = applyRepetitionResultToPlan(
    plan,
    repetition,
    new Date().toISOString(),
  );

  if (
    !defersVideoUntilCreativeReview(args.generationMode) &&
    plan.repetition.status === "passed" &&
    plan.status !== "repetition_blocked"
  ) {
    plan = approveTextToVideoCreativePlan(plan, new Date().toISOString());
  }

  const integrity = syncVideoCreativeIntegrityFromSources({
    voiceoverText: vo,
    hookText: hook,
    voiceDirection: direction,
    plan,
    packageVideoMode: "text_to_video",
  });

  return {
    ...args.brief,
    hook,
    [VIDEO_TEXT_TO_VIDEO_CREATIVE_PLAN_KEY]: serializeTextToVideoCreativePlan(plan),
    [VIDEO_CREATIVE_INTEGRITY_KEY]: serializeVideoCreativeIntegrity(integrity),
    video_text_to_video_sound_plan: proposeAutoSoundPlanFromCreativePlan(plan),
    video_paid_preflight: {
      similarity_check_status:
        plan.repetition.status === "passed"
          ? "passed"
          : plan.repetition.status === "blocked"
            ? "failed"
            : "not_run",
      confirm_paid_run: false,
    },
  };
}

export function syncStillPackageIntegrity(
  brief: Record<string, unknown>,
  packageVideoMode: PackageVideoProductionMode,
): Record<string, unknown> {
  const vo =
    typeof brief.voiceover_text === "string" ? brief.voiceover_text.trim() : "";
  const hook =
    typeof brief.hook === "string" && brief.hook.trim()
      ? brief.hook.trim()
      : deriveHookFromVoiceover(vo);
  const direction = voiceDirectionFromBriefOrDefault(brief);
  const integrity = syncVideoCreativeIntegrityFromSources({
    voiceoverText: vo,
    hookText: hook,
    voiceDirection: direction,
    plan: null,
    packageVideoMode,
  });
  return {
    ...brief,
    [VIDEO_CREATIVE_INTEGRITY_KEY]: serializeVideoCreativeIntegrity(integrity),
  };
}
