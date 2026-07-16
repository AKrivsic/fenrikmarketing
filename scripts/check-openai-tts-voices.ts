// OpenAI TTS voice resolution — Voice v2 family + package selection.
//   npm run check:openai-tts-voices

import assert from "node:assert/strict";
import {
  DEFAULT_OPENAI_TTS_VOICE,
  deterministicOpenAiTtsVoice,
  normalizeOpenAiTtsVoice,
} from "@/lib/voice/openaiTtsVoices";
import { buildTtsInstructions, buildTtsInstructionsForVideoJob } from "@/lib/voice/buildTtsInstructions";
import { resolveTtsOptions } from "@/lib/voice/resolveTtsOptions";
import { resolveTtsOptionsFromJobInput } from "@/lib/voice/resolveTtsOptions";
import {
  mergeTtsIntoJobInput,
  hasExplicitTtsVoice,
  recentSelectedVoicesFromPackages,
} from "@/lib/voice/videoJobTtsInput";
import {
  mergePresentationIntoKnowledge,
  validatePresentationSave,
  voiceUiSelectionFromKnowledge,
} from "@/lib/voice/presentationSettings";
import {
  pickSecondaryVoice,
  resolveProjectVoiceFamily,
  resolveVoiceSelection,
  selectVoiceForPackage,
} from "@/lib/voice/resolveVoiceFamily";

let passed = 0;
let failed = 0;

function check(name: string, fn: () => void): void {
  try {
    fn();
    passed++;
    console.log(`  ok  ${name}`);
  } catch (err) {
    failed++;
    console.error(` FAIL ${name}`, err);
  }
}

check("1. explicit named voice remains fixed (no secondary)", () => {
  const family = resolveProjectVoiceFamily({
    projectId: "proj-1",
    language: "en",
    knowledge: { presentation: { preferred_voice: "nova" } },
  });
  assert.equal(family.primary, "nova");
  assert.equal(family.secondary, null);
  assert.equal(family.source, "explicit");

  const selected = selectVoiceForPackage({
    family,
    packageSignals: {
      creativeMode: "humor",
      funnelStage: "Awareness",
      visualProfile: "BOLD",
    },
  });
  assert.equal(selected.voice, "nova");
  assert.equal(selected.source, "explicit");
});

check("2. missing/auto voice resolves deterministic primary + secondary family", () => {
  const missing = resolveProjectVoiceFamily({
    projectId: "family-proj",
    language: "en",
    knowledge: {},
    toneOfVoice: { notes: ["warm"] },
    targetAudience: { description: "creators" },
  });
  const auto = resolveProjectVoiceFamily({
    projectId: "family-proj",
    language: "en",
    knowledge: { presentation: { preferred_voice: "auto" } },
    toneOfVoice: { notes: ["warm"] },
    targetAudience: { description: "creators" },
  });
  assert.equal(
    missing.primary,
    deterministicOpenAiTtsVoice({ projectId: "family-proj", language: "en" }),
  );
  assert.ok(missing.secondary);
  assert.notEqual(missing.primary, missing.secondary);
  assert.equal(missing.primary, auto.primary);
  assert.equal(missing.secondary, auto.secondary);
  assert.equal(missing.source, "auto_family");
});

check("3. same project/language resolves the same family", () => {
  const a = resolveProjectVoiceFamily({
    projectId: "stable-id",
    language: "de",
    knowledge: {},
    toneOfVoice: { notes: ["clear"] },
    targetAudience: "SMBs",
  });
  const b = resolveProjectVoiceFamily({
    projectId: "stable-id",
    language: "de",
    knowledge: {},
    toneOfVoice: { notes: ["clear"] },
    targetAudience: "SMBs",
  });
  assert.equal(a.primary, b.primary);
  assert.equal(a.secondary, b.secondary);
});

check("4. different projects may resolve different families", () => {
  const a = resolveProjectVoiceFamily({
    projectId: "project-aaa",
    language: "en",
    knowledge: {},
  });
  const b = resolveProjectVoiceFamily({
    projectId: "project-zzz",
    language: "en",
    knowledge: {},
  });
  // Primaries differ for most project id pairs; secondary may still differ via seed.
  assert.ok(
    a.primary !== b.primary || a.secondary !== b.secondary,
    "expected different family across projects",
  );
});

check("5. package context can select secondary when materially stronger", () => {
  const family = resolveProjectVoiceFamily({
    projectId: "stable-id",
    language: "en",
    knowledge: {},
  });
  assert.ok(family.secondary);
  // Force a family where secondary is high-energy and primary is steady.
  const forced = {
    primary: "onyx" as const,
    secondary: "nova" as const,
    source: "auto_family" as const,
  };
  const selected = selectVoiceForPackage({
    family: forced,
    packageSignals: {
      creativeMode: "shock",
      funnelStage: "Awareness",
      visualProfile: "BOLD",
      topic: "bold disruptive prediction",
      angle: "provocative take",
    },
  });
  assert.equal(selected.voice, "nova");
  assert.equal(selected.source, "package_secondary");
  assert.ok(selected.scores.secondary > selected.scores.primary);
});

check("6. primary remains selected when clearly stronger", () => {
  const forced = {
    primary: "onyx" as const,
    secondary: "nova" as const,
    source: "auto_family" as const,
  };
  const selected = selectVoiceForPackage({
    family: forced,
    packageSignals: {
      creativeMode: "comparison",
      funnelStage: "Conversion",
      visualProfile: "PREMIUM",
      topic: "enterprise trust proof",
      angle: "credible professional case",
    },
  });
  assert.equal(selected.voice, "onyx");
  assert.equal(selected.source, "package_primary");
  assert.ok(selected.scores.primary > selected.scores.secondary);
});

check("7. recent repetition acts only as soft tie-breaker", () => {
  const forced = {
    primary: "onyx" as const,
    secondary: "nova" as const,
    source: "auto_family" as const,
  };
  // Clear winner without recent: primary stays.
  const clear = selectVoiceForPackage({
    family: forced,
    packageSignals: {
      creativeMode: "comparison",
      funnelStage: "Conversion",
      visualProfile: "PREMIUM",
      recentSelectedVoices: ["onyx", "onyx", "onyx", "onyx"],
    },
  });
  assert.equal(clear.voice, "onyx");

  // Close scores: heavy primary repetition can tip secondary.
  const closeBase = selectVoiceForPackage({
    family: forced,
    packageSignals: {
      creativeMode: "observation",
      funnelStage: "Solution Aware",
      visualProfile: "EDITORIAL",
    },
  });
  const margin = Math.abs(
    closeBase.scores.primary - closeBase.scores.secondary,
  );
  assert.ok(margin <= 4, `expected close scores, got margin ${margin}`);

  const tipped = selectVoiceForPackage({
    family: forced,
    packageSignals: {
      creativeMode: "observation",
      funnelStage: "Solution Aware",
      visualProfile: "EDITORIAL",
      recentSelectedVoices: ["onyx", "onyx", "onyx"],
    },
  });
  assert.equal(tipped.voice, "nova");
  assert.ok(
    tipped.reasons.some((r) => r.includes("soft_tie_recent_primary")),
  );
});

check("8. no random alternation or quotas", () => {
  const family = resolveProjectVoiceFamily({
    projectId: "quota-proj",
    language: "en",
    knowledge: {},
  });
  const signals = {
    creativeMode: "comparison",
    funnelStage: "Conversion",
    visualProfile: "PREMIUM",
    topic: "enterprise trust proof",
  };
  const voices = Array.from({ length: 10 }, () =>
    selectVoiceForPackage({ family, packageSignals: signals }).voice,
  );
  assert.ok(voices.every((v) => v === voices[0]));
  // Secondary pick is deterministic from seed (no Math.random).
  const s1 = pickSecondaryVoice({ primary: "shimmer", seed: "a::en::tone" });
  const s2 = pickSecondaryVoice({ primary: "shimmer", seed: "a::en::tone" });
  assert.equal(s1, s2);
});

check("9. delivery instructions vary by package context", () => {
  const a = resolveTtsOptions({
    projectId: "stable-id",
    language: "en",
    toneOfVoice: { notes: ["practical"] },
    knowledge: { presentation: { preferred_voice: "alloy" } },
    videoContext: { funnelStage: "Problem Aware", creativeMode: "mistake" },
  });
  const b = resolveTtsOptions({
    projectId: "stable-id",
    language: "en",
    toneOfVoice: { notes: ["practical"] },
    knowledge: { presentation: { preferred_voice: "alloy" } },
    videoContext: { funnelStage: "Conversion", creativeMode: "humor" },
  });
  assert.equal(a.voice, "alloy");
  assert.equal(b.voice, "alloy");
  assert.notEqual(a.instructions, b.instructions);
  assert.ok(a.instructions?.toLowerCase().includes("empathetic"));
  assert.ok(b.instructions?.toLowerCase().includes("playful"));
});

check("10. retry/rerender preserves selected voice and instructions", () => {
  const merged = mergeTtsIntoJobInput(
    { voiceover_text: "Hi" },
    {
      sourceInput: {
        tts_voice: "shimmer",
        tts_instructions: "Warm storytelling pace.",
        resolved_primary_voice: "shimmer",
        resolved_secondary_voice: "onyx",
        selected_voice: "shimmer",
        voice_source: "package_primary",
        delivery_reason: "original",
      },
      projectTts: {
        voice: "nova",
        instructions: "Should not replace.",
        selected_voice: "nova",
      },
    },
  );
  assert.equal(merged.tts_voice, "shimmer");
  assert.equal(merged.tts_instructions, "Warm storytelling pace.");
  assert.equal(merged.selected_voice, "shimmer");
  assert.equal(merged.resolved_primary_voice, "shimmer");
  assert.equal(merged.resolved_secondary_voice, "onyx");
});

check("11. legacy jobs with only tts_voice still work", () => {
  const fromJob = resolveTtsOptionsFromJobInput({
    tts_voice: "coral",
    tts_instructions: "Steady.",
  });
  assert.equal(fromJob.voice, "coral");
  assert.equal(fromJob.instructions, "Steady.");

  const merged = mergeTtsIntoJobInput(
    { voiceover_text: "Script" },
    {
      sourceInput: { tts_voice: "coral" },
      projectTts: { voice: "alloy", instructions: "Ignored." },
    },
  );
  assert.equal(merged.tts_voice, "coral");
});

check("12. existing UI Automatic and explicit voice saves remain compatible", () => {
  assert.equal(voiceUiSelectionFromKnowledge({}), "auto");

  const autoSave = validatePresentationSave({
    voiceSelection: "auto",
    ttsInstructions: "",
  });
  assert.equal(autoSave.ok, true);
  if (!autoSave.ok) return;
  assert.equal(autoSave.presentation.preferred_voice, "auto");
  assert.equal(
    voiceUiSelectionFromKnowledge(
      mergePresentationIntoKnowledge({}, autoSave.presentation),
    ),
    "auto",
  );

  const explicitSave = validatePresentationSave({
    voiceSelection: "alloy",
    ttsInstructions: "",
  });
  assert.equal(explicitSave.ok, true);
  if (!explicitSave.ok) return;
  assert.equal(explicitSave.presentation.preferred_voice, "alloy");

  const resolved = resolveVoiceSelection({
    projectId: "ui-proj",
    language: "en",
    knowledge: mergePresentationIntoKnowledge({}, autoSave.presentation),
  });
  assert.ok(resolved.secondary);
  assert.equal(
    resolved.primary,
    deterministicOpenAiTtsVoice({ projectId: "ui-proj", language: "en" }),
  );
});

check("missing presentation uses deterministic Automatic primary", () => {
  const opts = resolveTtsOptions({
    projectId: "proj-1",
    language: "en",
    toneOfVoice: {},
    knowledge: {},
  });
  assert.equal(
    opts.voice,
    deterministicOpenAiTtsVoice({ projectId: "proj-1", language: "en" }),
  );
  assert.equal(opts.resolved_primary_voice, opts.voice);
  assert.ok(opts.resolved_secondary_voice);
});

check("explicit alloy uses alloy", () => {
  const opts = resolveTtsOptions({
    projectId: "proj-1",
    language: "en",
    toneOfVoice: {},
    knowledge: { presentation: { preferred_voice: "alloy" } },
  });
  assert.equal(opts.voice, DEFAULT_OPENAI_TTS_VOICE);
  assert.equal(opts.resolved_secondary_voice, null);
});

check("invalid preferred_voice falls back to alloy", () => {
  const opts = resolveTtsOptions({
    projectId: "proj-1",
    language: "en",
    toneOfVoice: {},
    knowledge: {
      presentation: { preferred_voice: "not-a-voice" },
    },
  });
  assert.equal(opts.voice, DEFAULT_OPENAI_TTS_VOICE);
});

check("tone_of_voice notes produce instructions", () => {
  const instructions = buildTtsInstructions({
    toneOfVoice: { notes: ["warm", "confident"] },
    language: "en",
  });
  assert.ok(instructions?.includes("warm"));
  assert.ok(instructions?.includes("confident"));
});

check("explicit tts_instructions override tone", () => {
  const instructions = buildTtsInstructions({
    toneOfVoice: { notes: ["ignored"] },
    explicitInstructions: "Calm and precise.",
    language: "en",
  });
  assert.equal(instructions, "Calm and precise.");
});

check("job input without tts fields resolves to alloy", () => {
  const opts = resolveTtsOptionsFromJobInput({
    voiceover_text: "Hello",
  });
  assert.equal(opts.voice, DEFAULT_OPENAI_TTS_VOICE);
  assert.equal(opts.instructions, undefined);
});

check("job input passes through stored tts fields", () => {
  const opts = resolveTtsOptionsFromJobInput({
    tts_voice: "shimmer",
    tts_instructions: "Energetic delivery.",
  });
  assert.equal(opts.voice, "shimmer");
  assert.equal(opts.instructions, "Energetic delivery.");
});

check("normalizeOpenAiTtsVoice is case-insensitive", () => {
  assert.equal(normalizeOpenAiTtsVoice("Nova"), "nova");
});

check("merge fills missing voice from project resolver", () => {
  const merged = mergeTtsIntoJobInput(
    {},
    {
      sourceInput: {},
      projectTts: { voice: "coral" },
    },
  );
  assert.equal(merged.tts_voice, "coral");
  assert.equal(merged.tts_instructions, undefined);
});

check("explicit tts_instructions merge with video delivery hints", () => {
  const instructions = buildTtsInstructionsForVideoJob({
    toneOfVoice: { notes: ["warm"] },
    explicitInstructions: "Calm and precise.",
    language: "en",
    videoContext: {
      funnelStage: "Awareness",
      creativeMode: "observation",
      narrativeRoles: ["observation", "meaning", "reveal", "cta"],
    },
  });
  assert.ok(instructions?.includes("Calm and precise."));
  assert.ok(instructions?.includes("conversational"));
});

check("presentation save rejects unsupported voice", () => {
  const result = validatePresentationSave({
    voiceSelection: "not-real",
    ttsInstructions: "",
  });
  assert.equal(result.ok, false);
});

check("recentSelectedVoicesFromPackages reads brief audit fields", () => {
  const voices = recentSelectedVoicesFromPackages([
    {
      package_brief: {
        presentation_generation: { selected_voice: "Shimmer" },
      },
    },
    { package_brief: { tts_voice: "onyx" } },
  ]);
  assert.deepEqual(voices, ["shimmer", "onyx"]);
});

check("legacy source without tts fields resolves project voice", () => {
  const merged = mergeTtsIntoJobInput(
    { voiceover_text: "Script" },
    {
      sourceInput: { voiceover_text: "Script" },
      projectTts: {
        voice: deterministicOpenAiTtsVoice({
          projectId: "legacy-proj",
          language: "en",
        }),
      },
    },
  );
  assert.equal(
    merged.tts_voice,
    deterministicOpenAiTtsVoice({ projectId: "legacy-proj", language: "en" }),
  );
  assert.equal(hasExplicitTtsVoice(merged), true);
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
