import { T2V_CANONICAL_CREATIVE_CONTRACT_VERSION } from "@/lib/content-package/t2vCanonicalCreative";
import { creativeMemoryPromptBlock } from "@/lib/content-memory/projectCreativeMemory";
import type { ProjectCreativeMemory } from "@/lib/content-memory/projectCreativeMemory";

export function buildTextToVideoAuthoritativeCreativeBlock(args: {
  memory?: ProjectCreativeMemory | null;
  bannedNote?: string | null;
}): string {
  const memoryBlock = args.memory ? creativeMemoryPromptBlock(args.memory) : "";
  return [
    "TEXT-TO-VIDEO AUTHORITATIVE CREATIVE (you are the only creative author):",
    "- This is a 20–30 second short-form social video.",
    "- The first second MUST be a concrete visual event that can stop a scroll — not a title card, not a talking-head lecture, not a generic question overlay.",
    "- The hook must not be only a generic question or platitude.",
    "- The video must have real development: a visible change between the first and last frame.",
    "- There must be conflict, surprise, a reveal, or a payoff.",
    "- Scenes must not merely illustrate voiceover sentences. Visual metaphor, physical action, or an unexpected situation is allowed.",
    "- Honor Product Brain and product truth. Never invent claims.",
    "- Must be filmable as Runway Gen-4.5 text-to-video clips. Do not rely on the model generating correctly spelled readable text.",
    "- Do not automatically fall into: person sitting with a phone; scrolling a feed; laptop on a desk; slow push-in; a slight nod; quiet concern; composed smile; a sequence of passive reactions with no plot.",
    "- Phones/laptops/screens are allowed only when necessary AND they are not a repeat of recent memory.",
    args.bannedNote?.trim() ? `- HARD BAN: ${args.bannedNote.trim()}` : "",
    memoryBlock,
    "",
    "YOU OWN hook, complete voiceover, and the canonical storyboard. There is no later Opening Impact rewrite and no later Scene Intent essay.",
    "Do not copy any Opening Impact first_spoken_sentence. Invent the hook here.",
    "",
    `Include t2v_canonical_creative with contract_version ${T2V_CANONICAL_CREATIVE_CONTRACT_VERSION}:`,
    '{ "contract_version": 1, "core_idea": string, "primary_emotion": string, "conflict": string, "surprise": string, "beginning_to_end_change": string, "payoff": string, "visual_direction": { "art_direction": string, "lighting": string, "palette": string, "environment": string, "character_style": string } }',
    "",
    "Each visual_scene MUST include:",
    "id, source=ai, image_prompt (concrete visual event), motion_prompt (specific action, not slow push-in by default),",
    "voiceover_excerpt, environment, characters_action, camera (THIS scene only — never a film-wide paragraph),",
    "emotion, sound_intent (or empty), screen_policy (exactly one of no_screen | generic_unreadable_ui | provided_asset_overlay),",
    "continuity_hints.",
    "Prefer 4–5 scenes. Camera must be scene-specific. One continuous shot per clip. No extra cuts. No fade to black unless it is the approved final frame.",
    "screen_policy generic_unreadable_ui means unreadable chrome — never ask for a legible/readable feed, text, or screen.",
  ]
    .filter((line) => line !== "")
    .join("\n");
}
