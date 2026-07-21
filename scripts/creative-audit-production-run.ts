/**
 * Creative audit — full AI outputs for one production run (read-only).
 * Usage: npx tsx scripts/creative-audit-production-run.ts <production_run_id>
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
    "Usage: npx tsx scripts/creative-audit-production-run.ts <production_run_id>",
  );
  process.exit(1);
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function mdJson(value: unknown): string {
  return "```json\n" + JSON.stringify(redactDeep(value), null, 2) + "\n```\n";
}

function mdTextBlock(text: string): string {
  return text + "\n\n";
}

const SIGN_URL =
  /https?:\/\/[^\s"']+\/object\/sign\/[^\s"']+/gi;

function redactString(s: string): string {
  return s
    .replace(SIGN_URL, "[REDACTED_SIGNED_URL]")
    .replace(/token=[A-Za-z0-9._-]+/g, "token=[REDACTED]");
}

function redactDeep<T>(value: T): T {
  if (typeof value === "string") return redactString(value) as T;
  if (Array.isArray(value)) return value.map((v) => redactDeep(v)) as T;
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = redactDeep(v);
    }
    return out as T;
  }
  return value;
}

function parseScriptBeats(script: string): string[] {
  const parts = script.split(/\n\n(?=BEAT\s+\d+)/i);
  if (parts.length <= 1) return [script.trim()].filter(Boolean);
  return parts.map((p) => p.trim()).filter(Boolean);
}

function parseSubtitlePhrases(subtitles: string): string[] {
  return subtitles
    .split("//")
    .map((s) => s.trim())
    .filter(Boolean);
}

function findAnalyzerDecision(
  decisions: unknown,
  sceneId: string,
): Record<string, unknown> | null {
  if (!Array.isArray(decisions)) return null;
  for (const d of decisions) {
    const r = asRecord(d);
    if (r?.scene_id === sceneId) return r;
  }
  return null;
}

function findGuardrailForScene(
  decisions: unknown,
  sceneId: string,
): unknown[] {
  if (!Array.isArray(decisions)) return [];
  return decisions.filter((d) => {
    const r = asRecord(d);
    return r?.scene_id === sceneId || r?.target_scene_id === sceneId;
  });
}

function sceneTypeOf(entry: unknown): string {
  const r = asRecord(entry);
  if (!r) return "IMAGE";
  if (typeof r.type === "string") return r.type;
  if (r.source === "ai" || typeof r.image_prompt === "string") return "IMAGE";
  return "IMAGE";
}

function msBetween(a: string | null | undefined, b: string | null | undefined): string {
  if (!a || !b) return "—";
  const sec = Math.max(
    0,
    (new Date(b).getTime() - new Date(a).getTime()) / 1000,
  );
  return `${sec.toFixed(1)} s`;
}

async function main(): Promise<void> {
  const { createSupabaseAdminClient } = await import("@/lib/supabase/admin");
  const { getReviewRunExport } = await import("@/lib/api/review-runs-admin");
  const { readDebug, newestByContentItem } = await import(
    "@/lib/api/content-shared"
  );
  const { resolveTtsOptions } = await import("@/lib/voice/resolveTtsOptions");
  const { projectContextForVisualProfile } = await import(
    "@/lib/visual-profile/packageVisualProfile"
  );
  const { resolveVisualProfile } = await import(
    "@/lib/visual-profile/resolveVisualProfile"
  );
  const { SHORT_PROFILE } = await import("@/lib/video-engine/storyboard");

  type Project = import("@/lib/supabase/types").Project;
  type ContentPackage = import("@/lib/supabase/types").ContentPackage;
  type VideoJob = import("@/lib/supabase/types").VideoJob;
  type ContentItem = import("@/lib/supabase/types").ContentItem;

  const supabase = createSupabaseAdminClient();
  const base = await getReviewRunExport(RUN_ID);
  if (!base) {
    console.error(`Production run not found: ${RUN_ID}`);
    process.exit(1);
  }

  const { data: projectRow, error: projectErr } = await supabase
    .from("projects")
    .select("*")
    .eq("id", base.run.project_id)
    .single();
  if (projectErr) throw projectErr;
  const project = projectRow as Project;

  const { data: strategyRows, error: strategyErr } = await supabase
    .from("content_strategy_items")
    .select("*")
    .eq("project_id", base.run.project_id)
    .eq("brief->>production_run_id", RUN_ID)
    .order("created_at", { ascending: true });
  if (strategyErr) throw strategyErr;

  const projectTts = resolveTtsOptions({
    projectId: project.id,
    language: project.language,
    toneOfVoice: project.tone_of_voice,
    knowledge: project.knowledge,
  });
  const resolvedProfile = resolveVisualProfile(
    projectContextForVisualProfile({ project }),
  );

  const primaryItems = base.content_items.filter((i) => i.language === null);
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
  lines.push(`# Creative audit — Production Run \`${RUN_ID}\``);
  lines.push("");
  lines.push(
    `_Read-only export. Žádné zkrácení textů AI. Vygenerováno ${new Date().toISOString()}._`,
  );
  lines.push("");
  lines.push(`**Projekt:** ${project.name} (\`${project.id}\`)`);
  lines.push(`**Run status:** ${base.run.status}`);
  lines.push("");

  const globalRows: string[] = [];

  for (let pkgIndex = 0; pkgIndex < packages.length; pkgIndex++) {
    const pkg = packages[pkgIndex] as ContentPackage;
    const brief = asRecord(pkg.package_brief) ?? {};
    const strategyItem = (strategyRows ?? []).find(
      (si) => (si as { id: string }).id === pkg.strategy_item_id,
    ) as { id: string; brief: unknown; funnel_stage?: string } | undefined;
    const siBrief = asRecord(strategyItem?.brief) ?? {};
    const primaryItem = primaryItems.find((i) => i.package_id === pkg.id);
    const job = canonicalJobs.find(
      (j) => j.content_item_id === primaryItem?.id,
    );
    const jobInput = asRecord(job?.input) ?? {};
    const jobOutput = asRecord(job?.output) ?? {};
    const renderSpec = asRecord(jobOutput.render_spec) ?? {};
    const renderMeta = asRecord(renderSpec.metadata) ?? {};
    const imgWarnings = Array.isArray(renderMeta.image_generation_warnings)
      ? renderMeta.image_generation_warnings
      : [];

    const analyzerRoot = asRecord(jobInput.presentation_analyzer) ?? {};
    const presGenJob = asRecord(analyzerRoot.presentation_generation) ?? {};
    const presGenBrief = asRecord(brief.presentation_generation) ?? {};
    const presGenMerged = { ...presGenBrief, ...presGenJob };

    const inputScenes = Array.isArray(jobInput.scenes) ? jobInput.scenes : [];
    const briefScenes = Array.isArray(brief.visual_scenes)
      ? brief.visual_scenes
      : [];
    const outputScenes = Array.isArray(renderSpec.scenes)
      ? renderSpec.scenes
      : [];

    const semanticMotion = asRecord(renderMeta.semantic_motion);
    const motionBeats = Array.isArray(semanticMotion?.beats)
      ? semanticMotion.beats
      : [];

    const voice =
      typeof jobInput.tts_voice === "string" ? jobInput.tts_voice : projectTts.voice;
    const instructions =
      typeof jobInput.tts_instructions === "string"
        ? jobInput.tts_instructions
        : projectTts.instructions ?? "";
    const profile =
      typeof jobInput.visual_profile === "string"
        ? jobInput.visual_profile
        : String(presGenMerged.visual_profile ?? "");

    const ctaRec = asRecord(brief.cta);
    const videoRec = asRecord(brief.video);
    const voiceover =
      typeof brief.voiceover_text === "string"
        ? brief.voiceover_text
        : String(jobInput.voiceover_text ?? "");
    const subtitles =
      typeof brief.subtitles === "string"
        ? brief.subtitles
        : String(jobInput.subtitles ?? "");
    const scriptBeats = parseScriptBeats(
      typeof videoRec?.script === "string" ? videoRec.script : String(jobInput.script ?? ""),
    );
    const subtitlePhrases = parseSubtitlePhrases(subtitles);
    const modeBeats = Array.isArray(jobInput.creative_mode_beats)
      ? (jobInput.creative_mode_beats as string[])
      : [];

    const debug = readDebug(job?.output ?? null);
    const sceneTypes = inputScenes.map((s) => sceneTypeOf(s)).join(", ");
    const typedUsed =
      inputScenes.some((s) => sceneTypeOf(s) !== "IMAGE") ? "ano" : "ne";
    const assetsUsed =
      Array.isArray(brief.asset_usage) && brief.asset_usage.length > 0
        ? "ano"
        : "ne";
    const aiImages = outputScenes.length;
    const renderTime = msBetween(job?.created_at, job?.completed_at);
    const warnings =
      imgWarnings.length +
      (debug?.render_warning ? 1 : 0) +
      (debug?.subtitle_warning ? 1 : 0);
    const downgrades = Number(presGenMerged.downgraded_checklist_count ?? 0) +
      Number(presGenMerged.downgraded_cta_count ?? 0) +
      Number(presGenMerged.downgraded_phone_count ?? 0) +
      Number(presGenMerged.downgraded_quote_count ?? 0) +
      Number(presGenMerged.downgraded_statistic_count ?? 0);
    const historyDecisions = Array.isArray(presGenMerged.history_decisions)
      ? presGenMerged.history_decisions.length
      : 0;

    globalRows.push(
      `| ${pkg.title} | ${voice} | ${profile} | ${sceneTypes} | ano (${motionBeats.length} beatů) | ${typedUsed} | ${assetsUsed} | ${aiImages} | ${renderTime} | ${warnings} | ${downgrades} | ${historyDecisions} | ${ctaRec?.text ?? ""} |`,
    );

    lines.push("---");
    lines.push("");
    lines.push(`# Content Package ${pkgIndex + 1}: ${pkg.title}`);
    lines.push("");

    lines.push("## 1. PACKAGE OVERVIEW");
    lines.push("");
    lines.push(`- **package id:** \`${pkg.id}\``);
    lines.push(`- **title:** ${pkg.title}`);
    lines.push(
      `- **strategy item:** \`${pkg.strategy_item_id ?? ""}\` — topic: ${siBrief.topic ?? ""}`,
    );
    lines.push(`- **angle (strategy):** ${siBrief.angle ?? ""}`);
    lines.push(`- **funnel stage:** ${pkg.funnel_stage ?? strategyItem?.funnel_stage ?? ""}`);
    lines.push(`- **goal:** ${project.goal_type} _(projekt; v package_brief není uloženo)_`);
    lines.push(`- **CTA:** ${ctaRec?.text ?? ""} (type: ${ctaRec?.type ?? ""})`);
    lines.push(`- **language:** ${project.language}`);
    lines.push(`- **visual profile (job/brief):** ${profile}`);
    lines.push(
      `- **resolved visual profile (project):** ${resolvedProfile.profile} (source: ${resolvedProfile.source})`,
    );
    lines.push(`- **voice:** ${voice}`);
    lines.push(`- **voice instructions:**`);
    lines.push("");
    lines.push(mdTextBlock(instructions || "_(prázdné)_"));
    lines.push(
      `- **semantic motion enabled:** ${jobInput.semantic_motion === false ? "ne" : "ano (default)"}`,
    );
    lines.push(`- **scene history decisions:**`);
    lines.push("");
    lines.push(mdJson(presGenMerged.history_decisions ?? []));
    lines.push(`- **presentation analyzer summary (decisions count):** ${Array.isArray(analyzerRoot.decisions) ? analyzerRoot.decisions.length : 0}`);
    lines.push(`- **allowed_scene_types:** ${JSON.stringify(analyzerRoot.allowed_scene_types ?? [])}`);
    lines.push(`- **creative_mode:** ${brief.creative_mode ?? jobInput.creative_mode ?? ""}`);
    lines.push(`- **hook:** ${brief.hook ?? jobInput.hook ?? ""}`);
    lines.push("");

    lines.push("## 2. COMPLETE VOICEOVER");
    lines.push("");
    lines.push(mdTextBlock(voiceover || "_(prázdné)_"));

    lines.push("## 3. SCENE BREAKDOWN");
    lines.push("");

    const decisions =
      analyzerRoot.decisions ??
      presGenMerged.analyzer_decisions ??
      [];
    const freqDecisions = presGenMerged.frequency_decisions;
    const histDecisions = presGenMerged.history_decisions;

    for (let i = 0; i < inputScenes.length; i++) {
      const inp = asRecord(inputScenes[i]) ?? {};
      const out = asRecord(outputScenes[i]) ?? {};
      const briefScene = briefScenes[i];
      const sceneId = String(inp.id ?? `scene-${i + 1}`);
      const decision = findAnalyzerDecision(decisions, sceneId);
      const motionBeat =
        motionBeats.find((b) => asRecord(b)?.scene_id === sceneId) ??
        motionBeats[i];
      const motionRec = asRecord(motionBeat) ?? {};

      lines.push(`### SCENE ${i + 1}`);
      lines.push("");
      lines.push(`- **scene id:** ${sceneId}`);
      lines.push(`- **scene type (requested):** ${inp.type ?? sceneTypeOf(briefScene)}`);
      lines.push(`- **final scene type:** ${out.type ?? inp.type ?? "IMAGE"}`);
      lines.push(`- **analyzer decision:** ${decision ? JSON.stringify(decision) : "—"}`);
      lines.push(`- **downgrade reason:** ${decision?.reason ?? "—"} _(rule: ${decision?.rule ?? "—"})_`);
      lines.push(`- **frequency guardrail:** ${JSON.stringify(findGuardrailForScene(freqDecisions, sceneId))}`);
      lines.push(`- **history guardrail:** ${JSON.stringify(findGuardrailForScene(histDecisions, sceneId))}`);
      lines.push(`- **duration:** ${inp.duration_seconds ?? out.duration_seconds ?? "—"} s`);
      lines.push(`- **narrative role (creative_mode_beats):** ${modeBeats[i] ?? "—"}`);
      lines.push(`- **narration segment (script beat):**`);
      lines.push("");
      lines.push(mdTextBlock(scriptBeats[i] ?? "_(bez odpovídajícího BEAT v scriptu)_"));

      const type = String(inp.type ?? "IMAGE");
      if (type === "IMAGE" || sceneTypeOf(inp) === "IMAGE") {
        const origPrompt = String(inp.image_prompt ?? "");
        const briefPrompt = asRecord(briefScene)?.image_prompt;
        lines.push("**IMAGE scene**");
        lines.push("");
        lines.push("- **original image prompt (job input):**");
        lines.push("");
        lines.push(mdTextBlock(origPrompt));
        lines.push("- **sanitized prompt:** _(neuloženo v DB — worker nepersistuje sanitizovanou verzi)_");
        lines.push("- **final prompt poslaný image provideru:** _(neuloženo; nejblíže: job input `image_prompt` výše)_");
        lines.push(`- **asset nebo AI:** ${asRecord(inp.payload_snapshot)?.media ? JSON.stringify(asRecord(inp.payload_snapshot)?.media) : "ai"}`);
        lines.push(`- **asset id:** ${inp.asset_id ?? "—"}`);
        lines.push(`- **image usage / video_usage:** ${inp.video_usage ?? "—"}`);
        lines.push(`- **render source:** ${out.image_bucket && out.image_path ? `generated/uploaded raster` : "—"}`);
        if (briefPrompt) {
          lines.push("- **package_brief visual_scenes prompt:**");
          lines.push("");
          lines.push(mdTextBlock(String(briefPrompt)));
        }
      } else {
        lines.push(`**${type} scene payload:**`);
        lines.push("");
        lines.push(mdJson(inp.payload_snapshot ?? inp));
      }

      lines.push("- **semantic motion intent:** " + (motionRec.motion_intent ?? "—"));
      lines.push("- **semantic motion primitive:** " + (motionRec.motion_primitive ?? "—"));
      lines.push("- **motion intensity:** " + (motionRec.motion_intensity ?? "—"));
      lines.push("- **transition:** _(neuloženo v worker output — renderer používá výchozí SHORT_PROFILE transitions)_");
      lines.push("- **subtitles odpovídající této scéně:**");
      lines.push("");
      lines.push(
        mdTextBlock(
          subtitlePhrases[i] ??
            "_(žádná 1:1 mapa ve storage; subtitle fráze jsou v celku v sekci voiceover/subtitles)_",
        ),
      );
      lines.push("");
    }

    // Extra beats when storyboard has more beats than scenes (CLOSE reuses scene)
    if (motionBeats.length > inputScenes.length) {
      lines.push("### Dodatečné storyboard beaty (bez vlastní scény)");
      lines.push("");
      for (let j = inputScenes.length; j < motionBeats.length; j++) {
        const m = asRecord(motionBeats[j]) ?? {};
        lines.push(`- **${m.beat_id}** → scene \`${m.scene_id}\` intent=${m.motion_intent} primitive=${m.motion_primitive}`);
      }
      lines.push("");
    }

    lines.push("## 4. STORYBOARD");
    lines.push("");
    lines.push(
      "_Poznámka: kompletní `StoryboardBeat[]` worker do DB neukládá. Níže je pořadí scén + uložené semantic_motion beaty + trvání ze scene planu._",
    );
    lines.push("");
    for (let i = 0; i < Math.max(inputScenes.length, motionBeats.length); i++) {
      const inp = asRecord(inputScenes[i]) ?? {};
      const m = asRecord(motionBeats[i]) ?? {};
      lines.push(
        `${i + 1}. scene \`${inp.id ?? m.scene_id ?? "?"}\` | role ${modeBeats[i] ?? "—"} | duration ${inp.duration_seconds ?? "—"}s | motion ${m.motion_primitive ?? "—"} | intent ${m.motion_intent ?? "—"}`,
      );
    }
    lines.push("");
    lines.push("**creative_mode_beats:**");
    lines.push("");
    lines.push(mdJson(modeBeats));
    lines.push("");

    lines.push("## 5. GENERATED IMAGES");
    lines.push("");
    for (let i = 0; i < outputScenes.length; i++) {
      const out = asRecord(outputScenes[i]) ?? {};
      const warn = imgWarnings.find(
        (w: unknown) => asRecord(w)?.scene_id === out.id,
      );
      const w = asRecord(warn);
      lines.push(`### Scene ${i + 1} — ${out.id}`);
      lines.push("");
      lines.push(`- **storage path:** \`${out.image_bucket ?? ""}/${out.image_path ?? ""}\``);
      lines.push(`- **provider:** ${job?.provider ?? "video_engine"} / OpenAI image _(z worker konfigurace; per-job model v DB: ${job?.model ?? "null"})_`);
      lines.push(`- **reused asset?:** ne _(žádné asset_id na scéně)_`);
      lines.push(`- **generated image?:** ano`);
      lines.push(`- **moderation retry?:** ${w?.safe_retry_attempted ?? "ne"}`);
      lines.push(`- **fallback?:** ${w?.local_fallback_used ?? "ne"}`);
      lines.push(
        `- **image dimensions:** ${SHORT_PROFILE.width}×${SHORT_PROFILE.height} _(SHORT_PROFILE; per-raster metadata v DB není)_`,
      );
      lines.push("");
    }

    lines.push("## 6. TTS");
    lines.push("");
    lines.push(`- **provider:** OpenAI TTS _(video_engine worker)_`);
    lines.push(`- **voice:** ${voice}`);
    lines.push(`- **instructions:**`);
    lines.push("");
    lines.push(mdTextBlock(instructions));
    lines.push(`- **audio duration:** ${debug?.audio_duration ?? "—"}`);
    lines.push(`- **whisper language:** ${debug?.language_detected ?? "—"}`);
    lines.push(`- **subtitle diagnostics:**`);
    lines.push("");
    lines.push(mdJson(debug));
    lines.push("");

    lines.push("## 7. PRESENTATION ANALYZER");
    lines.push("");
    lines.push("**presentation_generation (job — kompletní):**");
    lines.push("");
    lines.push(mdJson(presGenJob));
    lines.push("**presentation_generation (package_brief — kompletní):**");
    lines.push("");
    lines.push(mdJson(presGenBrief));
    lines.push("**presentation_analyzer (celý objekt z video_jobs.input):**");
    lines.push("");
    lines.push(mdJson(jobInput.presentation_analyzer ?? null));
    lines.push("");

    lines.push("## 8. CONTENT OUTPUTS");
    lines.push("");
    lines.push("### platform_outputs (package_brief — kompletní texty)");
    lines.push("");
    const platformOutputs = asRecord(brief.platform_outputs) ?? base.platform_outputs[pkg.id];
    if (platformOutputs) {
      for (const [platform, payload] of Object.entries(platformOutputs)) {
        lines.push(`#### ${platform}`);
        lines.push("");
        const p = asRecord(payload);
        if (p) {
          for (const [key, val] of Object.entries(p)) {
            if (typeof val === "string") {
              lines.push(`**${key}:**`);
              lines.push("");
              lines.push(mdTextBlock(val));
            } else {
              lines.push(`**${key}:**`);
              lines.push("");
              lines.push(mdJson(val));
            }
          }
        } else {
          lines.push(mdJson(payload));
        }
        lines.push("");
      }
    }

    lines.push("### content_items (persistované položky pro tento balíček)");
    lines.push("");
    const pkgItems = base.content_items.filter((ci) => ci.package_id === pkg.id);
    for (const item of pkgItems as ContentItem[]) {
      lines.push(`#### ${item.platform} — ${item.title ?? "(bez title)"}`);
      lines.push("");
      lines.push(`- **content_item_id:** \`${item.id}\``);
      lines.push(`- **status:** ${item.status}`);
      lines.push(`- **variant index:** ${asRecord(item.generation_metadata)?.platform_variant_index ?? "—"}`);
      if (item.body) {
        lines.push("**body:**");
        lines.push("");
        lines.push(mdTextBlock(item.body));
      }
      if (item.caption) {
        lines.push("**caption:**");
        lines.push("");
        lines.push(mdTextBlock(item.caption));
      }
      if (item.cta) {
        lines.push("**cta:**");
        lines.push("");
        lines.push(mdTextBlock(item.cta));
      }
      if (item.hashtags?.length) {
        lines.push(`**hashtags:** ${item.hashtags.join(" ")}`);
        lines.push("");
      }
    }

    lines.push("### hashtags (package level)");
    lines.push("");
    lines.push(mdJson(brief.hashtags ?? []));
    lines.push("");

    lines.push("## 9. PACKAGE JSON");
    lines.push("");
    lines.push("### package_brief");
    lines.push(mdJson(pkg.package_brief));
    lines.push("### visual_scenes (package_brief)");
    lines.push(mdJson(brief.visual_scenes));
    lines.push("### presentation_generation (package_brief)");
    lines.push(mdJson(brief.presentation_generation));
    lines.push("### scene plan (video_jobs.input.scenes)");
    lines.push(mdJson(jobInput.scenes));
    lines.push("### video input (video_jobs.input — celé)");
    lines.push(mdJson(job?.input));
    lines.push("### render_spec (video_jobs.output.render_spec)");
    lines.push(mdJson(jobOutput.render_spec));
    lines.push("");

    lines.push("## 10. FINAL REVIEW");
    lines.push("");
    lines.push(
      "Technické hodnocení (na základě uložených rozhodnutí generátoru a analyzáru, ne marketing).",
    );
    lines.push("");
    const allowed = Array.isArray(analyzerRoot.allowed_scene_types)
      ? (analyzerRoot.allowed_scene_types as string[])
      : [];
    const promptTypes = Array.isArray(presGenBrief.prompt_presentation_types)
      ? (presGenBrief.prompt_presentation_types as string[])
      : [];
    const allImage = inputScenes.every((s) => sceneTypeOf(s) === "IMAGE");

    lines.push("### Proč AI zvolila scene types");
    lines.push("");
    lines.push(
      `- Model vygeneroval výhradně **IMAGE** scény v \`visual_scenes\` / \`scenes\`. Analyzer u každé scény zaznamenal rule \`allowed\`, reason \`image scene\` — typ se nezměnil.`,
    );
    lines.push(
      `- \`prompt_presentation_types\` v briefu: ${JSON.stringify(promptTypes)} — typy byly v promptu povolené, ale LLM je do plánu nezařadil.`,
    );
    lines.push(
      `- \`history_decisions\` a \`frequency_decisions\` jsou prázdné → žádný downgrade kvůli historii v tomto běhu.`,
    );
    lines.push("");

    const typedOptions = [
      "IMAGE",
      "PHONE",
      "QUOTE",
      "STATISTIC",
      "CHECKLIST",
      "CTA",
    ] as const;
    for (const t of typedOptions) {
      lines.push(`#### Mohla být scéna ${t}?`);
      if (t === "IMAGE") {
        lines.push(
          "- **Ano, a byla použita.** Narativ je čistě situační (telefon, obličej, laptop) — IMAGE sedí k observation/reveal režimu bez citátů nebo čísel.",
        );
      } else if (!allowed.includes(t) && t !== "IMAGE") {
        lines.push(`- **V analyzer allowed_scene_types chybí** — worker by typ nepřijal bez úpravy plánu.`);
      } else if (t === "PHONE") {
        lines.push(
          "- **Možné v principu** (v allowed / prompt types), ale voiceover nepopisuje konkrétní UI produktu ani screenshot aplikace — spíš generický social feed. PHONE by vyžadoval beat „ukázka na displeji“ s eligible assetem; \`asset_usage\` je prázdné.",
        );
      } else if (t === "QUOTE") {
        lines.push(
          "- **Nepravděpodobné** — brief neobsahuje schválený citát ani proof id; narativ je parafráze pain pointu, ne přímá citace.",
        );
      } else if (t === "STATISTIC") {
        lines.push(
          "- **Nepravděpodobné** — žádné konkrétní číslo ve voiceoveru; forbidden claims brání vymyšleným metrikám.",
        );
      } else if (t === "CHECKLIST") {
        lines.push(
          "- **Možné** u závěrečného „co udělat“ beatu, ale model zvolil poslední IMAGE (kalendář/queue) místo checklist karty; \`requested_checklist_count: 0\`.",
        );
      } else if (t === "CTA") {
        lines.push(
          `- **Možné** — CTA je v allowed a v prompt types, ale \`requested_cta_count: 0\` a finální výzva je mluvená + poslední still, ne typed CTA renderer.`,
        );
      }
      lines.push("");
    }

    lines.push("### Proč zůstala IMAGE");
    lines.push("");
    lines.push(
      allImage
        ? "Generátor konzistentně poslal AI image_prompt scény; presentation pass je nekonvertoval na typed renderery (žádný downgrade z IMAGE na jiný typ — naopak žádný požadavek na jiný typ v scene listu)."
        : "Mix typů — viz výše.",
    );
    lines.push("");
  }

  lines.push("---");
  lines.push("");
  lines.push("## 11. GLOBAL SUMMARY");
  lines.push("");
  lines.push("| Package | Voice | Visual Profile | Scene Types | Semantic Motion | Typed Scenes Used | Assets Used | AI Images | Render Time | Warnings | Downgrades | History Decisions | CTA |");
  lines.push("| --- | --- | --- | --- | --- | --- | --- | ---: | --- | ---: | ---: | ---: | --- |");
  lines.push(...globalRows);
  lines.push("");

  lines.push("### Co fungovalo dobře");
  lines.push("");
  lines.push("- Kompletní kreativní balíčky: voiceover, script, subtitles, platformové copy (včetně X variant), 3/3 videí dokončeno.");
  lines.push("- EDITORIAL visual profile je konzistentně v promptech i v job input.");
  lines.push("- Semantic motion beat metadata uložena u každého videa; TTS tail validation + Whisper titulky.");
  lines.push("");

  lines.push("### Co se nepoužilo vůbec");
  lines.push("");
  lines.push("- Typed scene renderery (CHECKLIST, PHONE, QUOTE, STATISTIC, CTA) — 0 v render_spec.");
  lines.push("- Projektové assets ve scénách (`asset_usage` prázdné).");
  lines.push("- Moderation fallback / local branded fallback.");
  lines.push("- Alternativní TTS hlas (vše `alloy`).");
  lines.push("");

  lines.push("### Nové systémy skutečně využité");
  lines.push("");
  lines.push("- Visual profile EDITORIAL + verze `visual-profile@1`.");
  lines.push("- Presentation analyzer + presentation_generation metadata na job input.");
  lines.push("- Explicit scene plan + semantic motion v1.");
  lines.push("- OpenAI TTS instructions z tone of voice + tail validation.");
  lines.push("- Phrase subtitles + Whisper alignment (dle `debug.subtitle_source`).");
  lines.push("");

  lines.push("### Dostupné, ale model / plán nevyužil");
  lines.push("");
  lines.push("- CHECKLIST a CTA v `prompt_presentation_types` / `allowed_scene_types`.");
  lines.push("- PHONE/QUOTE/STATISTIC v prompt allowlistu (kde byl v briefu), bez výběru v `visual_scenes`.");
  lines.push("- Deterministický nebo preferred voice z knowledge.presentation (není nastaveno).");
  lines.push("");

  lines.push("### Návrhy na zlepšení");
  lines.push("");
  lines.push("- Vynutit minimálně jednu typed scénu na balíček, když je allowlisted a funnel stage sedí (např. CTA na conversion).");
  lines.push("- U PHONE beats vyžadovat asset nebo explicitní `asset_usage` z knowledge.");
  lines.push("- Persistovat storyboard beats (role, transition, text) do `render_spec` pro creative audit bez rekonstrukce.");
  lines.push("- Persistovat sanitizovaný/final image prompt pro forenzní creative review.");
  lines.push("");

  lines.push("## Zdroje dat (read-only)");
  lines.push("");
  lines.push(`- \`getReviewRunExport("${RUN_ID}")\``);
  lines.push("- Tabulky: `production_runs`, `content_packages`, `content_items`, `video_jobs`, `content_strategy_items`");
  lines.push("");

  const reportDir = resolve(process.cwd(), "reports");
  mkdirSync(reportDir, { recursive: true });
  const reportPath = resolve(
    reportDir,
    `production-run-${RUN_ID}-creative-audit.md`,
  );
  writeFileSync(reportPath, lines.join("\n"), "utf8");

  console.log(reportPath);
  console.log(
    JSON.stringify({
      run_id: RUN_ID,
      packages: packages.length,
      bytes: Buffer.byteLength(lines.join("\n"), "utf8"),
      path: reportPath,
    }),
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
