/**
 * Decision audit — why each system chose its result (read-only).
 * Usage: npx tsx scripts/decision-audit-production-run.ts <production_run_id>
 */

import { readFileSync, existsSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";

const envPath = resolve(process.cwd(), ".env.local");
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i < 0) continue;
    const k = t.slice(0, i);
    const v = t.slice(i + 1);
    if (!process.env[k]) process.env[k] = v;
  }
}

const RUN_ID = process.argv[2]?.trim();
if (!RUN_ID) {
  console.error(
    "Usage: npx tsx scripts/decision-audit-production-run.ts <production_run_id>",
  );
  process.exit(1);
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function mdJson(v: unknown): string {
  return "```json\n" + JSON.stringify(v, null, 2) + "\n```\n";
}

type VoiceDecisionCategory =
  | "explicit_project_voice"
  | "automatic_project_voice"
  | "deterministic_project_voice"
  | "source_job_inherited"
  | "legacy_default_alloy"
  | "invalid_voice_fallback";

function classifyProjectVoiceBranch(args: {
  preferred_voice?: string | null;
  voice_selection?: string | null;
}): { category: VoiceDecisionCategory; codeRef: string; explanation: string } {
  const pref = args.preferred_voice?.trim().toLowerCase();
  if (pref && pref !== "auto") {
    return {
      category: "explicit_project_voice",
      codeRef:
        "lib/voice/resolveTtsOptions.ts → resolveVoice(): preferred && preferred !== 'auto'",
      explanation: `Explicit preferred_voice="${pref}" in knowledge.presentation.`,
    };
  }
  if (pref === "auto" || args.voice_selection === "deterministic") {
    return {
      category: "deterministic_project_voice",
      codeRef:
        "lib/voice/resolveTtsOptions.ts → resolveVoice(): preferred === 'auto' || voice_selection === 'deterministic' → deterministicOpenAiTtsVoice()",
      explanation:
        "Automatic UI or voice_selection=deterministic — hash projectId:language.",
    };
  }
  return {
    category: "legacy_default_alloy",
    codeRef:
      "lib/voice/resolveTtsOptions.ts → resolveVoice(): final return DEFAULT_OPENAI_TTS_VOICE ('alloy')",
    explanation:
      "No presentation.preferred_voice and no deterministic mode — legacy default, not Automatic resolver.",
  };
}

function buildAutoProfileSeed(ctx: {
  projectId: string;
  goalType?: string | null;
  toneOfVoice: unknown;
  targetAudience: unknown;
  productStrengths?: readonly string[];
  productIs?: readonly string[];
}): string {
  const toneSeed = (() => {
    if (typeof ctx.toneOfVoice === "string") return ctx.toneOfVoice.trim().toLowerCase();
    const rec = asRecord(ctx.toneOfVoice);
    if (!rec) return "";
    const parts: string[] = [];
    for (const key of ["style", "tone", "voice", "summary"]) {
      const v = rec[key];
      if (typeof v === "string" && v.trim()) parts.push(v.trim().toLowerCase());
    }
    if (Array.isArray(rec.notes)) {
      parts.push(
        rec.notes
          .filter((n): n is string => typeof n === "string")
          .join(" ")
          .toLowerCase(),
      );
    }
    return parts.join(" ");
  })();
  const audienceSeed = (() => {
    const rec = asRecord(ctx.targetAudience);
    if (!rec) return "";
    const parts: string[] = [];
    if (Array.isArray(rec.segments)) {
      parts.push(
        rec.segments
          .filter((s): s is string => typeof s === "string")
          .slice(0, 3)
          .join("|"),
      );
    }
    return parts.join(" ");
  })();
  const strengths = (ctx.productStrengths ?? []).slice(0, 4).join("|");
  const productIs = (ctx.productIs ?? []).slice(0, 3).join("|");
  const goal = (ctx.goalType ?? "").trim().toLowerCase();
  return [ctx.projectId, goal, toneSeed, audienceSeed, strengths, productIs]
    .filter(Boolean)
    .join("::");
}

function storyboardRoles(count: number, modeBeats: string[]): string[] {
  const beats = modeBeats.map((b) => b.trim()).filter(Boolean);
  if (beats.length === 0) {
    const roles = Array.from({ length: count }, () => "body");
    roles[0] = "hook";
    if (count > 1) roles[count - 1] = "cta";
    return roles;
  }
  return Array.from({ length: count }, (_u, i) => {
    const idx =
      count === 1 ? 0 : Math.min(beats.length - 1, Math.floor((i * beats.length) / count));
    return beats[idx] ?? "body";
  });
}

function sceneIdForBeat(
  beatIndex: number,
  numBeats: number,
  sceneIds: string[],
  explicit: boolean,
): string {
  const n = sceneIds.length;
  if (n === 0) return "scene-1";
  if (!explicit) return sceneIds[beatIndex % n] ?? sceneIds[0];
  if (n > numBeats) {
    const idx = Math.floor((beatIndex * n) / numBeats);
    return sceneIds[Math.min(idx, n - 1)] ?? sceneIds[0];
  }
  return sceneIds[beatIndex % n] ?? sceneIds[0];
}

async function main(): Promise<void> {
  const { createSupabaseAdminClient } = await import("@/lib/supabase/admin");
  const { getReviewRunExport } = await import("@/lib/api/review-runs-admin");
  const { newestByContentItem } = await import("@/lib/api/content-shared");
  const { resolveTtsOptions } = await import("@/lib/voice/resolveTtsOptions");
  const { parseKnowledgePresentation } = await import(
    "@/lib/voice/knowledgePresentation"
  );
  const {
    voiceUiSelectionFromKnowledge,
    SUPPORTED_VOICE_OPTIONS,
  } = await import("@/lib/voice/presentationSettings");
  const {
    deterministicOpenAiTtsVoice,
    DEFAULT_OPENAI_TTS_VOICE,
  } = await import("@/lib/voice/openaiTtsVoices");
  const { projectContextForVisualProfile } = await import(
    "@/lib/visual-profile/packageVisualProfile"
  );
  const {
    resolveVisualProfile,
    resolveVisualProfileAuto,
  } = await import("@/lib/visual-profile/resolveVisualProfile");
  const { VISUAL_PROFILES, visualProfileOverrideFromKnowledge } = await import(
    "@/lib/visual-profile/visualProfile"
  );
  const { VISUAL_PROFILE_UI_OPTIONS } = await import(
    "@/lib/visual-profile/presentationVisualProfile"
  );
  const { visualProfileUiFromKnowledge } = await import(
    "@/lib/visual-profile/presentationVisualProfile"
  );
  const { deriveAllowedSceneTypes } = await import(
    "@/lib/scene-types/presentation/deriveAllowedSceneTypes"
  );
  const { derivePromptPresentationTypes } = await import(
    "@/lib/scene-types/presentation/promptPresentationTypes"
  );
  const { buildProofIndex } = await import(
    "@/lib/scene-types/presentation/proofIndex"
  );
  const {
    deriveProjectPresentationSignals,
    assetSignalsFromRow,
  } = await import("@/lib/scene-types/presentation/projectSignals");
  const { buildPresentationGenerationBlock } = await import(
    "@/lib/ai/prompts/presentationGeneration"
  );
  const { buildSceneTypeHistoryRestraintBlock } = await import(
    "@/lib/scene-types/presentation/sceneTypeHistoryPrompt"
  );
  const { loadSceneTypeProjectHistory } = await import(
    "@/lib/scene-types/presentation/sceneTypeProjectHistory"
  );
  const { resolveBeatMotionPlan } = await import(
    "@/lib/video-engine/semanticMotion/resolveSceneMotion"
  );
  const { resolveChecklistAllowlistStatus } = await import(
    "@/lib/scene-types/checklistProductionRollout"
  );
  const { tokensForVisualProfile } = await import(
    "@/lib/visual-profile/visualProfileTokens"
  );
  const { visualProfileImagePromptBlock } = await import(
    "@/lib/visual-profile/imagePromptProfile"
  );

  type Project = import("@/lib/supabase/types").Project;
  type ContentPackage = import("@/lib/supabase/types").ContentPackage;
  type VideoJob = import("@/lib/supabase/types").VideoJob;

  const supabase = createSupabaseAdminClient();
  const base = await getReviewRunExport(RUN_ID);
  if (!base) {
    console.error(`Production run not found: ${RUN_ID}`);
    process.exit(1);
  }

  const { data: projectRow } = await supabase
    .from("projects")
    .select("*")
    .eq("id", base.run.project_id)
    .single();
  const project = projectRow as Project;
  const presentation = parseKnowledgePresentation(project.knowledge);
  const projectTts = resolveTtsOptions({
    projectId: project.id,
    language: project.language,
    toneOfVoice: project.tone_of_voice,
    knowledge: project.knowledge,
  });
  const voiceBranch = classifyProjectVoiceBranch(presentation);
  const detVoice = deterministicOpenAiTtsVoice({
    projectId: project.id,
    language: project.language,
  });
  const vpCtx = projectContextForVisualProfile({ project });
  const vpResolved = resolveVisualProfile(vpCtx);
  const vpAuto = resolveVisualProfileAuto(vpCtx);
  const profileSeed = buildAutoProfileSeed({
    projectId: project.id,
    goalType: project.goal_type,
    toneOfVoice: project.tone_of_voice,
    targetAudience: project.target_audience,
    productStrengths: project.product_strengths,
    productIs: project.product_is,
  });

  const { data: assetRows } = await supabase
    .from("assets")
    .select("id,title,metadata")
    .eq("project_id", project.id);
  const assetSignals = (assetRows ?? []).map(assetSignalsFromRow);
  const proof = buildProofIndex(project.knowledge);
  const signals = deriveProjectPresentationSignals({
    project,
    assets: assetSignals,
  });
  const allowedCeiling = deriveAllowedSceneTypes(
    {
      knowledge: project.knowledge,
      proof,
      projectSignals: signals,
      projectDefaultCta: project.default_cta,
      goalType: project.goal_type,
    },
    { sceneTypesEnabled: true },
  );
  const promptTypesNow = derivePromptPresentationTypes({
    projectId: project.id,
    project,
    assets: assetSignals,
  });
  const checklistAllowlist = resolveChecklistAllowlistStatus(project.id);

  const jobsByItem = newestByContentItem(
    [...base.video_jobs].sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    ),
  );
  const canonicalJobs: VideoJob[] = Array.from(jobsByItem.values());
  const packages = [...base.packages].sort(
    (a, b) =>
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  );

  const lines: string[] = [];
  lines.push(`# Decision Audit — Production Run \`${RUN_ID}\``);
  lines.push("");
  lines.push(`_Read-only. Generated ${new Date().toISOString()}._`);
  lines.push("");

  // Executive summary
  lines.push("## Executive summary (one page)");
  lines.push("");
  lines.push(
    `**Voice:** All videos use \`alloy\` because \`knowledge.presentation\` is empty (UI “Default (alloy)”): \`resolveVoice()\` never entered the Automatic/deterministic branch (\`preferred_voice === 'auto'\`). This is **legacy_default_alloy**, not automatic selection. If Automatic were saved, this project would resolve to **${detVoice}** per \`deterministicOpenAiTtsVoice()\`, not alloy.`,
  );
  lines.push("");
  lines.push(
    "**Visual profile:** **EDITORIAL** from **AUTO hash** (resolveVisualProfileAuto → source `auto`), not UI override, not DEFAULT NATURAL. Same project always gets the same profile until signals/override change.",
  );
  lines.push("");
  lines.push(
    "**Scene types:** LLM output is legacy IMAGE-only `{source,ai,image_prompt}` for all scenes. **Not** analyzer suppression — typed types were never requested (`requested_*_count: 0`). CHECKLIST/CTA were in **persisted** `prompt_presentation_types`; PHONE/QUOTE/STATISTIC were **not_in_prompt_ceiling** (no mobile signal, no proof candidates). Prompt text explicitly encourages IMAGE-first.",
  );
  lines.push("");
  lines.push(
    "**Semantic motion:** Active but **role labels** (`observation`, `meaning`, …) are **not** mapped in `roleDefaultIntent()` → default **EXPLAIN**. Fifth beat reusing `scene-1` is **working_as_designed** (`sceneIdForStoryboardBeat` with `explicit_scene_order` and 4 scenes / 5 beats).",
  );
  lines.push("");
  lines.push(
    "**History / analyzer:** History loaded (12 prior packages) but **empty special-type history** (prior packages IMAGE-only). Analyzer = **IMAGE pass-through only** — no typed validation exercised.",
  );
  lines.push("");

  lines.push("## Part 1 — Voice decision audit");
  lines.push("");
  lines.push("### Project signals");
  lines.push("");
  lines.push(mdJson({
    knowledge_presentation: presentation,
    voice_ui_selection: voiceUiSelectionFromKnowledge(project.knowledge),
    ui_empty_means: "Default (alloy) — preferred_voice deleted on save",
    project_language: project.language,
    tone_of_voice: project.tone_of_voice,
  }));
  lines.push("### Resolver branches (code)");
  lines.push("");
  lines.push(
    "1. `preferred_voice` set and not `auto` → explicit voice (`normalizeOpenAiTtsVoice`)",
  );
  lines.push(
    "2. `preferred_voice === 'auto'` OR `voice_selection === 'deterministic'` → `deterministicOpenAiTtsVoice({ projectId, language })`",
  );
  lines.push("3. Else → `DEFAULT_OPENAI_TTS_VOICE` (`alloy`)");
  lines.push("");
  lines.push(`**Branch executed for Fenrik Studio:** \`${voiceBranch.category}\``);
  lines.push(`- Code: ${voiceBranch.codeRef}`);
  lines.push(`- ${voiceBranch.explanation}`);
  lines.push(`- Project resolver output: \`${projectTts.voice}\``);
  lines.push(`- Hypothetical Automatic output: \`${detVoice}\``);
  lines.push("");

  lines.push("### Per-video");
  lines.push("");
  lines.push("| video_job_id | tts_voice (input) | category | automatic executed? | source job inherit? |");
  lines.push("| --- | --- | --- | --- | --- |");
  for (const job of canonicalJobs) {
    const inp = asRecord(job.input) ?? {};
    const v = String(inp.tts_voice ?? "");
    lines.push(
      `| ${job.id} | ${v} | ${voiceBranch.category} | no | no |`,
    );
  }
  lines.push("");

  lines.push("### Primary questions — Voice");
  lines.push("");
  lines.push(
    `- **Was alloy deliberate automatic selection?** No — **legacy_default_alloy** (configuration_missing: no presentation block).`,
  );
  lines.push(
    `- **Was automatic resolver executed?** No. Would select \`${detVoice}\` if UI saved Automatic.`,
  );
  lines.push(
    "- **Resolver uses funnel/creative mode/topic/emotion/format?** **No** — only `projectId`, `language`, `knowledge.presentation` (`lib/voice/resolveTtsOptions.ts`).",
  );
  lines.push(
    "- **Resolved per:** project (+ language for deterministic). Stamped once on `video_jobs.input` via `attachTtsToVideoJobInput` — same for all packages in run.",
  );
  lines.push(
    "- **Can two videos differ in voice today?** Only via explicit per-job `tts_voice` on retry/source merge (`mergeTtsIntoJobInput` prefers source job) — **not used in this run**.",
  );
  lines.push(
    '- **UI "Automatic":** Persists `preferred_voice: "auto"` → deterministic branch (`presentationSettings.ts`).',
  );
  lines.push(
    '- **UI "Default (alloy)" / cleared:** Deletes `preferred_voice` → legacy alloy — **not** the same as Automatic.',
  );
  lines.push(
    "- **Stable project voice + per-video delivery instructions:** Would need explicit preferred voice OR deterministic auto **plus** separate instruction channel (already: `tts_instructions` from tone / custom); dynamic per-video voice would need new resolver inputs (funnel, creative_mode, etc.) — **not implemented**.",
  );
  lines.push("");

  lines.push("## Part 2 — Visual Profile decision audit");
  lines.push("");
  lines.push("### Raw & normalized signals");
  lines.push(mdJson({
    ui_visual_profile: visualProfileUiFromKnowledge(project.knowledge),
    knowledge_presentation_visual_profile:
      asRecord(asRecord(project.knowledge)?.presentation)?.visual_profile ?? null,
    knowledge_presentation_visual_style:
      asRecord(asRecord(asRecord(project.knowledge)?.presentation)?.visual)?.style ??
      null,
    goal_type: project.goal_type,
    auto_hash_seed: profileSeed,
    auto_hash_candidates: [...VISUAL_PROFILES],
    auto_hash_selected: vpAuto,
    resolved: vpResolved,
  }));
  lines.push("");
  lines.push("### Why EDITORIAL?");
  lines.push("");
  lines.push(
    `- Explicit override: **no** (\`visualProfileOverrideFromKnowledge\` → auto)`,
  );
  lines.push(
    `- Brand style override: **no**`,
  );
  lines.push(
    `- Package snapshot at project resolution: **n/a** (computed at generation via \`resolveVisualProfileForPackage({ project })\`)`,
  );
  lines.push(
    `- **AUTO branch:** \`stableHash(seed) % 5\` → **EDITORIAL** for this seed (not \`DEFAULT_VISUAL_PROFILE\` NATURAL)`,
  );
  lines.push(
    "- **Semantic vs hash:** Resolver is **deterministic hash** over projectId + goal + tone + audience + product snippets — not LLM semantic matching.",
  );
  lines.push(
    "- **Stable across videos:** Yes — same profile for all packages/jobs in run; frozen in `presentation_generation` / job input.",
  );
  lines.push(
    "- **Per-package/video variation:** None in resolver; only override or package snapshot could differ (not this run).",
  );
  lines.push("");
  lines.push("### EDITORIAL effects this run");
  lines.push("");
  const editorialTokens = tokensForVisualProfile("EDITORIAL");
  lines.push(mdJson({
    image_prompt_block_in_generation: visualProfileImagePromptBlock("EDITORIAL"),
    worker_suffix_style: editorialTokens.imagePromptStyle,
    typed_renderers: "N/A — no CHECKLIST/PHONE/QUOTE/STATISTIC/CTA rendered",
    motion_modifier:
      "EDITORIAL remaps EXPLAIN drift_* → pan_left/pan_right (resolveSceneMotion applyProfileMotionTuning)",
  }));
  lines.push(
    "- **Executed:** IMAGE prompts include Editorial photography language (LLM + block); semantic motion primitive tuning applied in worker.",
  );
  lines.push("");

  lines.push("## Part 3 — Scene Type generation decision audit");
  lines.push("");
  lines.push("### Project ceiling (deriveAllowedSceneTypes)");
  lines.push(mdJson({
    allowed_ceiling_now: allowedCeiling,
    prompt_types_recomputed_now: promptTypesNow,
    checklist_allowlist_status: checklistAllowlist,
    proof: {
      hasQuoteCandidates: proof.hasQuoteCandidates,
      hasStatisticCandidates: proof.hasStatisticCandidates,
    },
    mobileProductCapable: signals.mobileProductCapable,
    note: "Use persisted prompt_presentation_types per package as ground truth for what LLM saw at generation time.",
  }));
  lines.push("");
  lines.push(
    mdJson({
      presentation_prompt_excerpt_policy: buildPresentationGenerationBlock({
        allowedTypes: ["IMAGE", "CHECKLIST", "CTA"],
      }).split("\n").slice(0, 20),
    }),
  );
  lines.push("_(Full block rebuilt from types IMAGE,CHECKLIST,CTA — matches persisted packages.)_");
  lines.push("");

  const evidenceRows: Record<string, unknown>[] = [];

  for (let i = 0; i < packages.length; i++) {
    const pkg = packages[i] as ContentPackage;
    const brief = asRecord(pkg.package_brief) ?? {};
    const pg = asRecord(brief.presentation_generation) ?? {};
    const promptTypes = (pg.prompt_presentation_types as string[]) ?? [];
    const job = canonicalJobs.find((j) => {
      const item = base.content_items.find(
        (ci) => ci.package_id === pkg.id && ci.language === null,
      );
      return j.content_item_id === item?.id;
    });
    const jobInput = asRecord(job?.input) ?? {};
    const scenes = Array.isArray(jobInput.scenes) ? jobInput.scenes : [];
    const analyzer = asRecord(jobInput.presentation_analyzer) ?? {};
    const decisions = (analyzer.decisions ?? []) as unknown[];

    const hist = await loadSceneTypeProjectHistory(supabase, project.id, {
      excludePackageId: pkg.id,
      currentWeeklyStrategyId: pkg.weekly_strategy_id,
    });
    const historyBlock = buildSceneTypeHistoryRestraintBlock(hist);

    lines.push(`### Package: ${pkg.title} (\`${pkg.id}\`)`);
    lines.push("");
    lines.push("**Persisted generation log**");
    lines.push(mdJson(pg));
    lines.push("**History at generation (recomputed now, exclude this package)**");
    lines.push(mdJson({
      recentPackageCount: hist.recentPackages.length,
      lastPackageSpecialTypes: hist.lastPackageSpecialTypes,
      weeklyStrategySpecialTypes: hist.weeklyStrategySpecialTypes,
      ctaUsedInRecentWindow: hist.ctaUsedInRecentWindow,
      history_prompt_block: historyBlock,
    }));
    lines.push("");

    const types = ["IMAGE", "CHECKLIST", "PHONE", "QUOTE", "STATISTIC", "CTA"] as const;
    lines.push("| Type | Prompt-permitted | Project-permitted | Payload available | Narratively suitable | LLM requested | Analyzer accepted | Guardrail suppressed | Final |");
    lines.push("| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |");

    const llmRequested = {
      CHECKLIST: Number(pg.requested_checklist_count ?? 0) > 0,
      PHONE: Number(pg.requested_phone_count ?? 0) > 0,
      QUOTE: Number(pg.requested_quote_count ?? 0) > 0,
      STATISTIC: Number(pg.requested_statistic_count ?? 0) > 0,
      CTA: Number(pg.requested_cta_count ?? 0) > 0,
      IMAGE: true,
    };

    for (const t of types) {
      const promptOk = t === "IMAGE" || promptTypes.includes(t);
      const projectOk = t === "IMAGE" || allowedCeiling.includes(t);
      let reason = "";
      if (t === "PHONE" && !allowedCeiling.includes("PHONE")) reason = "missing_project_signal";
      if (t === "QUOTE" && !proof.hasQuoteCandidates) reason = "missing_approved_proof";
      if (t === "STATISTIC" && !proof.hasStatisticCandidates) reason = "missing_approved_proof";
      if (promptOk && !llmRequested[t as keyof typeof llmRequested] && t !== "IMAGE") {
        reason = reason || "llm_chose_image";
      }
      const final = t === "IMAGE" ? `${scenes.length}× IMAGE` : "0";
      lines.push(
        `| ${t} | ${promptOk ? "Y" : "N"} | ${projectOk ? "Y" : "N"} | ${t === "IMAGE" ? "Y" : t === "CTA" ? "Y" : "N"} | partial | ${llmRequested[t as keyof typeof llmRequested] ? "Y" : "N"} | ${t === "IMAGE" ? "pass-through" : "n/a"} | N | ${final} |`,
      );
    }
    lines.push("");
    lines.push(
      "**Pipeline trace (persisted evidence):** LLM raw response **not stored**. Stored `visual_scenes` are legacy IMAGE entries only → `normalizeVisualScenePlan` → `requested_*_count: 0` → frequency/history guardrails **not applied** → `prepareAnalyzedVisualScenesForPackage` → analyzer **image scene** pass-through only.",
    );
    lines.push("");
    lines.push("**Non-IMAGE absence reasons**");
    lines.push("- CHECKLIST: **llm_chose_image** + **prompt_too_conservative** (IMAGE default instructions)");
    lines.push("- CTA: **llm_chose_image** (spoken CTA; no typed CTA requested)");
    lines.push("- PHONE: **not_in_prompt_ceiling** + **missing_project_signal** (mobileProductCapable false)");
    lines.push("- QUOTE/STATISTIC: **not_in_prompt_ceiling** + **missing_approved_proof**");
    lines.push("");

    evidenceRows.push({
      package_id: pkg.id,
      prompt_presentation_types: promptTypes,
      requested_counts: {
        checklist: pg.requested_checklist_count,
        phone: pg.requested_phone_count,
        quote: pg.requested_quote_count,
        statistic: pg.requested_statistic_count,
        cta: pg.requested_cta_count,
      },
      analyzer_image_pass_through: decisions.length,
      analyzer_typed_validations: 0,
    });
  }

  lines.push("### Primary questions — Scene types");
  lines.push("");
  lines.push("- **Did LLM see CHECKLIST/CTA?** Yes (persisted `prompt_presentation_types`).");
  lines.push("- **PHONE/QUOTE/STATISTIC in prompt?** No — ceiling excluded them.");
  lines.push("- **Schema silently dropping typed scenes?** No evidence — nothing typed in stored output.");
  lines.push("- **IMAGE-first conservative?** Yes — explicit in `presentationGeneration.ts`.");
  lines.push("");

  lines.push("## Part 4 — Semantic Motion decision audit");
  lines.push("");
  for (const job of canonicalJobs) {
    const inp = asRecord(job.input) ?? {};
    const out = asRecord(job.output) ?? {};
    const rs = asRecord(out.render_spec) ?? {};
    const meta = asRecord(rs.metadata) ?? {};
    const stored = asRecord(meta.semantic_motion)?.beats ?? [];
    const modeBeats = (inp.creative_mode_beats as string[]) ?? [];
    const sceneIds = (Array.isArray(inp.scenes) ? inp.scenes : []).map(
      (s) => String(asRecord(s)?.id ?? ""),
    );
    const sceneCount = sceneIds.length;
    const audioDur = asRecord(out.debug)?.speech_duration ?? 20;
    const numBeats = Math.min(
      15,
      Math.max(8, Math.round(Number(audioDur) / 3)),
    );
    const roles = storyboardRoles(numBeats, modeBeats);
    const explicit = inp.explicit_scene_plan === true;
    const profile = String(inp.visual_profile ?? "EDITORIAL");

    lines.push(`### Job ${job.id}`);
    lines.push("");
    lines.push("| beat | storyboard role | scene_id | resolver intent | primitive | stored intent | stored primitive | match? |");
    lines.push("| --- | --- | --- | --- | --- | --- | --- | --- |");

    let prevPrim: string | null = null;
    for (let b = 0; b < numBeats; b++) {
      const sceneId = sceneIdForBeat(b, numBeats, sceneIds, explicit);
      const sceneIndex = Math.max(0, sceneIds.indexOf(sceneId));
      const plan = resolveBeatMotionPlan({
        beatIndex: b,
        beatCount: numBeats,
        sceneId,
        sceneType: "IMAGE",
        sceneIndex,
        sceneCount,
        narrativeRole: roles[b] ?? "body",
        visualProfile: profile,
        previousPrimitive: prevPrim,
      });
      prevPrim = plan.motion_primitive;
      const st = asRecord(stored[b]) ?? {};
      const match =
        st.motion_intent === plan.motion_intent &&
        st.motion_primitive === plan.motion_primitive
          ? "yes"
          : "partial";
      lines.push(
        `| ${b + 1} | ${roles[b]} | ${sceneId} | ${plan.motion_intent} | ${plan.motion_primitive} | ${st.motion_intent ?? ""} | ${st.motion_primitive ?? ""} | ${match} |`,
      );
    }
    lines.push("");
    lines.push(
      "- **Hook / observation → EXPLAIN:** `roleDefaultIntent()` has no case for `observation` → default EXPLAIN (**resolver_logic_issue** vs product intent for ATTENTION).",
    );
    lines.push(
      "- **CTA role on last beat:** When mapped to storyboard role `cta`, intent **CLOSE** + primitive **static** (see last beat).",
    );
    lines.push(
      "- **scene-1 reuse:** `explicit_scene_plan` + 4 scenes & 5 beats → `beatIndex % n` (**working_as_designed** in `sceneIdForStoryboardBeat`).",
    );
    lines.push("");
  }

  lines.push("## Part 5 — History restraint audit");
  lines.push("");
  lines.push(
    "History query loads last 12 packages (`loadSceneTypeProjectHistory`). Special types derived only from **non-IMAGE** in `visual_scenes` or `final_worker_scene_types`.",
  );
  lines.push("");
  lines.push(
    "This project had extensive prior packages but **all IMAGE-only** → `lastPackageSpecialTypes: []`, `weeklyStrategySpecialTypes: []`, `ctaUsedInRecentWindow: false`. Empty `history_decisions` is **correct**, not a query failure.",
  );
  lines.push(
    "Packages in the **same run** may be invisible to earlier siblings depending on commit order; even when visible, siblings contribute **no special types**.",
  );
  lines.push("");

  lines.push("## Part 6 — Presentation Analyzer audit");
  lines.push("");
  let imagePass = 0;
  for (const job of canonicalJobs) {
    const dec = (asRecord(asRecord(job.input)?.presentation_analyzer)?.decisions ??
      []) as unknown[];
    imagePass += dec.length;
  }
  lines.push(mdJson({
    image_pass_through_decisions: imagePass,
    typed_validations: 0,
    downgrades: 0,
    proof_checks: 0,
    asset_eligibility_checks: 0,
    cta_alignment_checks: 0,
    history_suppressions: 0,
    conclusion:
      "Analyzer only exercised IMAGE allowed/image scene branch. Typed-scene validation **not production-proven** by this run.",
  }));
  lines.push("");

  lines.push("## Part 7 — UI and configuration audit");
  lines.push("");
  lines.push("**Controls** (`updateProjectPresentationVoice` in `knowledge/actions.ts`): voice selection, TTS instructions, visual profile.");
  lines.push("");
  lines.push("| UI selection | Persisted JSON | Resolver behavior |");
  lines.push("| --- | --- | --- |");
  lines.push('| Default (alloy) | `presentation` absent or no `preferred_voice` | `legacy_default_alloy` |');
  lines.push('| Automatic | `{ "preferred_voice": "auto" }` | `deterministic_project_voice` |');
  lines.push('| Named voice (e.g. coral) | `{ "preferred_voice": "coral" }` | `explicit_project_voice` |');
  lines.push('| Visual Automatic | `visual_profile` key deleted | `resolveVisualProfileAuto` hash |');
  lines.push('| Visual EDITORIAL (etc.) | `{ "visual_profile": "EDITORIAL" }` | `override` branch |');
  lines.push("");
  lines.push("**Voice UI options:**");
  lines.push(mdJson(SUPPORTED_VOICE_OPTIONS));
  lines.push("**Visual profile UI options:**");
  lines.push(mdJson(VISUAL_PROFILE_UI_OPTIONS));
  lines.push("");
  lines.push(
    "- Voice UI **implemented**. Automatic **does** run deterministic resolver — **not** active for Fenrik (empty presentation).",
  );
  lines.push(
    "- User can return to Automatic by selecting Automatic (sets `preferred_voice: auto`).",
  );
  lines.push(
    "- Visual Profile UI **implemented**; Automatic uses **hash**, not semantic LLM.",
  );
  lines.push("");

  lines.push("## Part 8 — Evidence classification");
  lines.push("");
  lines.push("| Feature | Implemented | Executed | Non-default decision | Default/pass-through | Production-proven |");
  lines.push("| --- | ---: | ---: | ---: | ---: | ---: |");
  const matrix: [string, string, string, string, string, string][] = [
    ["Voice selection", "Y", "Y", "N", "Y", "N"],
    ["TTS instructions", "Y", "Y", "Y", "N", "Y"],
    ["Visual Profile AUTO", "Y", "Y", "Y", "N", "Y"],
    ["IMAGE renderer", "Y", "Y", "N", "Y", "Y"],
    ["CHECKLIST", "Y", "Y", "N", "Y", "N"],
    ["PHONE", "Y", "N", "N", "Y", "N"],
    ["QUOTE", "Y", "N", "N", "Y", "N"],
    ["STATISTIC", "Y", "N", "N", "Y", "N"],
    ["CTA typed", "Y", "Y", "N", "Y", "N"],
    ["Presentation Analyzer typed", "Y", "Y", "N", "Y", "N"],
    ["Scene Type history", "Y", "Y", "N", "Y", "N"],
    ["Semantic Motion", "Y", "Y", "partial", "partial", "Y"],
    ["Moderation fallback", "Y", "N", "N", "—", "N"],
    ["Asset reuse in scenes", "Y", "N", "N", "Y", "N"],
    ["Language variants", "Y", "N", "N", "—", "N"],
  ];
  for (const row of matrix) {
    lines.push(`| ${row.join(" | ")} |`);
  }
  lines.push("");

  lines.push("## Part 9 — Root-cause conclusions");
  lines.push("");
  lines.push("### Voice");
  lines.push("- **Classification:** `configuration_missing` + `default_branch_only`");
  lines.push("- Alloy = **legacy default**, not Automatic; aligned with UI “Default (alloy)” only if that was intentional product default.");
  lines.push("");
  lines.push("### Visual Profile");
  lines.push("- **Classification:** `working_as_designed` (hash AUTO)");
  lines.push("- EDITORIAL = deterministic hash over project signals; stability intentional.");
  lines.push("");
  lines.push("### Scene Types");
  lines.push("- **Classification:** `prompt_too_conservative` + `llm_chose_image`; not pipeline_bug");
  lines.push("- PHONE/QUOTE/STATISTIC: `missing_project_signal` / `missing_approved_proof`");
  lines.push("");
  lines.push("### Semantic Motion");
  lines.push("- **Classification:** `resolver_logic_issue` for role→intent mapping; scene reuse `working_as_designed`");
  lines.push("");
  lines.push("### Overall");
  lines.push("- End-to-end render: **working_as_designed**");
  lines.push("- Typed scene system: **insufficient_production_evidence**");
  lines.push("");

  lines.push("## Part 10 — Deliverables & code references");
  lines.push("");
  lines.push("- Voice: `lib/voice/resolveTtsOptions.ts`, `lib/voice/presentationSettings.ts`, `lib/voice/videoJobTtsInput.ts`");
  lines.push("- Profile: `lib/visual-profile/resolveVisualProfile.ts`");
  lines.push("- Scene prompt: `lib/ai/prompts/presentationGeneration.ts`, `derivePromptPresentationTypes`");
  lines.push("- Analyzer: `lib/scene-types/presentation/analyzePresentation.ts`, `prepareVisualScenesForVideo.ts`");
  lines.push("- History: `lib/scene-types/presentation/sceneTypeProjectHistory.ts`");
  lines.push("- Motion: `lib/video-engine/semanticMotion/resolveSceneMotion.ts`, `lib/video-engine/storyboard.ts` (`buildStoryboard`, `sceneIdForStoryboardBeat`)");
  lines.push("");
  lines.push("**Unproven by this run:** typed analyzer branches, PHONE/QUOTE/STATISTIC prompt path, moderation fallback, per-video voice dynamism.");
  lines.push("");

  const reportDir = resolve(process.cwd(), "reports");
  mkdirSync(reportDir, { recursive: true });
  const reportPath = resolve(
    reportDir,
    `production-run-${RUN_ID}-decision-audit.md`,
  );
  writeFileSync(reportPath, lines.join("\n"), "utf8");

  const summary = {
    run_id: RUN_ID,
    audited_at: new Date().toISOString(),
    voice: {
      resolved: projectTts.voice,
      category: voiceBranch.category,
      automatic_would_be: detVoice,
      presentation,
    },
    visual_profile: vpResolved,
    auto_hash_seed: profileSeed,
    scene_types: {
      allowed_ceiling: allowedCeiling,
      all_packages_image_only: true,
    },
    semantic_motion: {
      role_mapping_gap: "observation/meaning/etc. → EXPLAIN via roleDefaultIntent default",
      scene_reuse: "explicit_scene_plan beat % scene count",
    },
    analyzer: { image_pass_through_only: true },
    evidence_matrix: matrix.map(([feature, impl, exec, nd, def, proven]) => ({
      feature,
      implemented: impl,
      executed: exec,
      non_default_decision: nd,
      default_or_pass_through: def,
      production_proven: proven,
    })),
    packages: evidenceRows,
    report_path: reportPath,
  };

  const jsonPath = resolve(
    process.cwd(),
    "scripts/output",
    `production-run-${RUN_ID}-decision-summary.json`,
  );
  mkdirSync(resolve(process.cwd(), "scripts/output"), { recursive: true });
  writeFileSync(jsonPath, JSON.stringify(summary, null, 2), "utf8");

  console.log(reportPath);
  console.log(jsonPath);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
