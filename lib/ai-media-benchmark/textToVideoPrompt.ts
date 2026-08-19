import {
  formatBrandVisualProfileForPrompt,
  type BrandVisualProfile,
} from "@/lib/ai-media-benchmark/brandVisualProfile";
import { ROUND_A_PORTRAIT_RATIO } from "@/lib/ai-media-benchmark/catalog";

export const TEXT_TO_VIDEO_SHARED_PROMPT_MAX_UTF16 = 1000;

export interface TextToVideoSceneIdea {
  id: string;
  label: string;
  coreIdea: string;
}

export const TEXT_TO_VIDEO_SCENE_IDEAS: readonly TextToVideoSceneIdea[] = [
  {
    id: "arrival-and-task",
    label: "Příchod a krátký úkol",
    coreIdea:
      "A skilled professional arrives at a real workplace, greets a colleague, and immediately starts a short practical task.",
  },
  {
    id: "walkthrough-handoff",
    label: "Prohlídka a předání",
    coreIdea:
      "Two colleagues walk through a workplace and one hands the other a tool or folder while they keep moving.",
  },
  {
    id: "outdoor-to-indoor",
    label: "Z venku dovnitř",
    coreIdea:
      "A worker walks from outdoor light into an indoor workplace and sets down a bag to begin work.",
  },
] as const;

export const DEFAULT_TEXT_TO_VIDEO_SCENE_IDEA_ID = "arrival-and-task";

export function getTextToVideoSceneIdea(id: string | null | undefined): TextToVideoSceneIdea {
  const found = TEXT_TO_VIDEO_SCENE_IDEAS.find((idea) => idea.id === id);
  return found ?? TEXT_TO_VIDEO_SCENE_IDEAS[0]!;
}

export function composeTextToVideoPrompt(args: {
  idea: TextToVideoSceneIdea;
  profile: BrandVisualProfile;
  maxUtf16?: number;
}): string {
  const max = args.maxUtf16 ?? TEXT_TO_VIDEO_SHARED_PROMPT_MAX_UTF16;
  const motion =
    "Visible natural motion: walking, turning, a handshake or handoff, fabric and tools moving. One continuous camera move, documentary energy, professional look.";
  const forbid =
    "Do not generate logos, readable text, captions, UI screens, or a specific website. Do not freeze into a still.";
  const frame = `4-second portrait ${ROUND_A_PORTRAIT_RATIO} shot.`;
  const fullProfile = formatBrandVisualProfileForPrompt(args.profile);
  const compactProfile = formatBrandVisualProfileForPrompt({
    ...args.profile,
    productSummary: null,
  });
  const candidates = [
    [frame, args.idea.coreIdea, motion, fullProfile, forbid].join(" "),
    [frame, args.idea.coreIdea, motion, compactProfile, forbid].join(" "),
    [frame, args.idea.coreIdea, motion, forbid].join(" "),
  ];
  for (const candidate of candidates) {
    if (candidate.length <= max) return candidate;
  }
  return candidates[candidates.length - 1]!.slice(0, max).trim();
}

export function promptForbidsLogoAndReadableText(prompt: string): boolean {
  const lower = prompt.toLowerCase();
  const forbidsLogo =
    lower.includes("do not generate logos") || lower.includes("never show");
  const forbidsText = lower.includes("readable text") || lower.includes("readable on-screen text");
  const requestsLogo = /\b(show|include|add|place)\b.{0,40}\b(a |the |company )?logo\b/i.test(
    prompt,
  );
  return forbidsLogo && forbidsText && !requestsLogo;
}

export function assertSharedRoundTPrompt(prompt: string): void {
  if (prompt.length > TEXT_TO_VIDEO_SHARED_PROMPT_MAX_UTF16) {
    throw new Error("text_to_video_prompt_too_long");
  }
  if (!promptForbidsLogoAndReadableText(prompt)) {
    throw new Error("text_to_video_prompt_missing_logo_text_ban");
  }
}
