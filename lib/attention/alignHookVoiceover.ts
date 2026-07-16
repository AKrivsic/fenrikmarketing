import { matchesGenericSetupOpener } from "@/lib/attention/cliches";

/**
 * Keep stored hook aligned with the first spoken thought.
 * Prefer the stronger of (hook, first voiceover sentence) when the voiceover
 * opens with a diluted generic setup while the hook is punchier — or when the
 * voiceover already opens stronger than a weak hook.
 */
export function alignHookWithFirstSpoken(args: {
  hook: string;
  voiceoverText: string;
}): { hook: string; voiceover_text: string; aligned: boolean; reason: string } {
  const hook = (args.hook ?? "").trim();
  const voiceover = (args.voiceoverText ?? "").trim();
  if (!hook || !voiceover) {
    return {
      hook,
      voiceover_text: voiceover,
      aligned: false,
      reason: "missing_hook_or_voiceover",
    };
  }

  const openingUnit = firstSpokenUnit(voiceover);
  if (!openingUnit) {
    return {
      hook,
      voiceover_text: voiceover,
      aligned: false,
      reason: "empty_first_sentence",
    };
  }

  const hookNorm = normalize(hook);
  const openingNorm = normalize(openingUnit);

  if (isAligned(hookNorm, openingNorm, voiceover)) {
    return {
      hook,
      voiceover_text: voiceover,
      aligned: true,
      reason: "already_aligned",
    };
  }

  const hookIsGeneric = !!matchesGenericSetupOpener(hook);
  const firstIsGeneric = !!matchesGenericSetupOpener(openingUnit);
  const hookStronger =
    !hookIsGeneric && (firstIsGeneric || hook.length <= openingUnit.length + 8);

  if (hookStronger) {
    // Replace the diluted opening with the stored hook; keep the rest.
    const rest = voiceover
      .slice(openingUnit.length)
      .replace(/^\s*[,;:—-]?\s*/, "");
    const rebuilt = rest ? `${hook} ${rest}`.replace(/\s+/g, " ").trim() : hook;
    return {
      hook,
      voiceover_text: rebuilt,
      aligned: true,
      reason: "hook_applied_to_voiceover_opening",
    };
  }

  // Voiceover opening is stronger — promote it to the stored hook.
  return {
    hook: openingUnit.replace(/[.!?]+$/, "").trim() || hook,
    voiceover_text: voiceover,
    aligned: true,
    reason: "hook_promoted_from_first_spoken",
  };
}

function isAligned(hookNorm: string, openingNorm: string, voiceover: string): boolean {
  if (hookNorm === openingNorm) return true;
  if (openingNorm.startsWith(hookNorm) || hookNorm.startsWith(openingNorm)) {
    return true;
  }
  // Hook may be two short phrases that appear at the start of the voiceover.
  const voNorm = normalize(voiceover);
  if (voNorm.startsWith(hookNorm)) return true;
  const hookPrefix = hookNorm.slice(0, Math.min(28, hookNorm.length));
  if (hookPrefix.length >= 12 && voNorm.startsWith(hookPrefix)) return true;
  if (hookPrefix.length >= 12 && openingNorm.startsWith(hookPrefix)) return true;
  return false;
}

function firstSpokenUnit(text: string): string {
  const trimmed = text.trim();
  // Prefer first sentence; allow two ultra-short phrases joined by period.
  const twoShort = trimmed.match(
    /^((?:\S+\s+){0,7}\S+[.!?])\s+((?:\S+\s+){0,5}\S+[.!?])(?:\s|$)/,
  );
  if (twoShort) {
    const combined = `${twoShort[1]} ${twoShort[2]}`.trim();
    if (combined.split(/\s+/).length <= 14) return combined;
  }
  const m = trimmed.match(/^(.+?[.!?])(?:\s|$)/);
  if (m?.[1] && m[1].split(/\s+/).length <= 16) return m[1].trim();
  const comma = trimmed.match(/^([^,]{3,80}),/);
  if (comma?.[1] && comma[1].split(/\s+/).length <= 10) {
    return `${comma[1].trim()},`;
  }
  const words = trimmed.split(/\s+/);
  return words.slice(0, 12).join(" ");
}

function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/[“”"']/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
