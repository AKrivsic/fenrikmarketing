// OpenAI TTS voice resolution — deterministic selection + backwards compatibility.
//   npm run check:openai-tts-voices

import assert from "node:assert/strict";
import {
  DEFAULT_OPENAI_TTS_VOICE,
  deterministicOpenAiTtsVoice,
  normalizeOpenAiTtsVoice,
} from "@/lib/voice/openaiTtsVoices";
import { buildTtsInstructions } from "@/lib/voice/buildTtsInstructions";
import { resolveTtsOptions } from "@/lib/voice/resolveTtsOptions";
import { resolveTtsOptionsFromJobInput } from "@/lib/voice/resolveTtsOptions";
import {
  mergeTtsIntoJobInput,
  hasExplicitTtsVoice,
} from "@/lib/voice/videoJobTtsInput";
import {
  mergePresentationIntoKnowledge,
  validatePresentationSave,
  voiceUiSelectionFromKnowledge,
} from "@/lib/voice/presentationSettings";

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

check("default voice is alloy when presentation is empty", () => {
  const opts = resolveTtsOptions({
    projectId: "proj-1",
    language: "en",
    toneOfVoice: {},
    knowledge: {},
  });
  assert.equal(opts.voice, DEFAULT_OPENAI_TTS_VOICE);
  assert.equal(opts.instructions, undefined);
});

check("preferred_voice overrides default", () => {
  const opts = resolveTtsOptions({
    projectId: "proj-1",
    language: "en",
    toneOfVoice: {},
    knowledge: {
      presentation: { preferred_voice: "nova" },
    },
  });
  assert.equal(opts.voice, "nova");
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

check("voice_selection deterministic is stable per project", () => {
  const a = resolveTtsOptions({
    projectId: "stable-id",
    language: "de",
    toneOfVoice: {},
    knowledge: { presentation: { voice_selection: "deterministic" } },
  });
  const b = resolveTtsOptions({
    projectId: "stable-id",
    language: "de",
    toneOfVoice: {},
    knowledge: { presentation: { voice_selection: "deterministic" } },
  });
  assert.equal(a.voice, b.voice);
  assert.notEqual(a.voice, DEFAULT_OPENAI_TTS_VOICE);
});

check("preferred_voice auto uses deterministic voice", () => {
  const opts = resolveTtsOptions({
    projectId: "auto-proj",
    language: "en",
    toneOfVoice: {},
    knowledge: { presentation: { preferred_voice: "auto" } },
  });
  assert.equal(
    opts.voice,
    deterministicOpenAiTtsVoice({ projectId: "auto-proj", language: "en" }),
  );
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

check("merge preserves source tts_voice over project default", () => {
  const merged = mergeTtsIntoJobInput(
    { voiceover_text: "Hi" },
    {
      sourceInput: { tts_voice: "nova" },
      projectTts: { voice: "alloy" },
    },
  );
  assert.equal(merged.tts_voice, "nova");
});

check("merge preserves source tts_instructions", () => {
  const merged = mergeTtsIntoJobInput(
    {},
    {
      sourceInput: {
        tts_voice: "shimmer",
        tts_instructions: "Calm delivery.",
      },
      projectTts: { voice: "alloy", instructions: "Ignored." },
    },
  );
  assert.equal(merged.tts_voice, "shimmer");
  assert.equal(merged.tts_instructions, "Calm delivery.");
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

check("legacy source without tts fields resolves project alloy", () => {
  const merged = mergeTtsIntoJobInput(
    { voiceover_text: "Script" },
    {
      sourceInput: { voiceover_text: "Script" },
      projectTts: { voice: DEFAULT_OPENAI_TTS_VOICE },
    },
  );
  assert.equal(merged.tts_voice, DEFAULT_OPENAI_TTS_VOICE);
  assert.equal(hasExplicitTtsVoice(merged), true);
});

check("presentation save rejects unsupported voice", () => {
  const result = validatePresentationSave({
    voiceSelection: "not-real",
    ttsInstructions: "",
  });
  assert.equal(result.ok, false);
});

check("presentation save stores auto and clears default voice key", () => {
  const result = validatePresentationSave({
    voiceSelection: "auto",
    ttsInstructions: "",
  });
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.presentation.preferred_voice, "auto");
  const merged = mergePresentationIntoKnowledge(
    { cards: {}, presentation: { preferred_voice: "nova" } },
    result.presentation,
  ) as Record<string, unknown>;
  const presentation = merged.presentation as Record<string, unknown>;
  assert.equal(presentation.preferred_voice, "auto");
  assert.equal(voiceUiSelectionFromKnowledge(merged), "auto");
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
