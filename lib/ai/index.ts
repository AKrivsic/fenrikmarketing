import { ClaudeProvider } from "@/lib/ai/claude";
import {
  OpenAIImageProvider,
  OpenAISpeechProvider,
  OpenAITextProvider,
} from "@/lib/ai/openai";
import type {
  ImageProvider,
  SpeechProvider,
  TextProvider,
} from "@/lib/ai/types";

// Single place that hard-codes the provider routing rules from the spec:
//   - Claude  -> strategy, copywriting, scoring, evergreen generation
//   - OpenAI  -> images, TTS, structured JSON repair / helper
//   - AI Visual Engine never calls OpenAI directly; it uses getImageProvider().
//   - MVP default image_provider = openai.

let claude: TextProvider | null = null;
let openaiText: TextProvider | null = null;
let openaiImage: ImageProvider | null = null;
let openaiSpeech: SpeechProvider | null = null;

function claudeProvider(): TextProvider {
  if (!claude) claude = new ClaudeProvider();
  return claude;
}

function openaiTextProvider(): TextProvider {
  if (!openaiText) openaiText = new OpenAITextProvider();
  return openaiText;
}

// --- Claude-backed roles -------------------------------------------------

export function getStrategyProvider(): TextProvider {
  return claudeProvider();
}

export function getCopywritingProvider(): TextProvider {
  return claudeProvider();
}

export function getScoringProvider(): TextProvider {
  return claudeProvider();
}

export function getEvergreenProvider(): TextProvider {
  return claudeProvider();
}

// --- OpenAI-backed roles -------------------------------------------------

// Structured JSON repair / helper tasks only.
export function getJsonRepairProvider(): TextProvider {
  return openaiTextProvider();
}

// image_provider abstraction. The AI Visual Engine must obtain its provider
// here. MVP default = openai.
export function getImageProvider(): ImageProvider {
  if (!openaiImage) openaiImage = new OpenAIImageProvider();
  return openaiImage;
}

export function getSpeechProvider(): SpeechProvider {
  if (!openaiSpeech) openaiSpeech = new OpenAISpeechProvider();
  return openaiSpeech;
}

export * from "@/lib/ai/types";
