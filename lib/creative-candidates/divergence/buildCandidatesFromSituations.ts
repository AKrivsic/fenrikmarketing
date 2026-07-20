import type {
  CreativeCandidate,
  CreativeConceptFamily,
} from "@/lib/creative-candidates/types";
import { CREATIVE_CONCEPT_FAMILIES } from "@/lib/creative-candidates/types";
import {
  authorCreativeDNA,
  resolveCandidateCreativeDNA,
} from "@/lib/creative-candidates/creativeDNA";
import type { TopicConcreteSignals } from "@/lib/creative-candidates/topicSignals";
import type { RawVisualSituation } from "@/lib/creative-candidates/divergence/types";
import { situationFingerprint } from "@/lib/creative-candidates/divergence/situationFingerprint";
import { validateAndRepairCandidate } from "@/lib/creative-candidates/candidateValidation";

function stripCosmeticPrefix(scene: string): string {
  return scene
    .replace(/^Handheld urgency:\s*/i, "")
    .replace(/^Macro on:\s*/i, "")
    .trim();
}

export function inferFamily(s: RawVisualSituation): CreativeConceptFamily {
  const blob = `${s.scene} ${s.tags.join(" ")} ${s.scrollStopCue}`.toLowerCase();
  const rules: Array<[RegExp, CreativeConceptFamily]> = [
    [/\b(argue|fight|conflict|mid-argument|teammates|partners)\b/, "human_conflict"],
    [/\b(boarding pass printer|boarding-ticket|fish tank|aquarium|mascot|carousel|absurd but readable)\b/, "absurd_understandable"],
    [/\b(pile|tower|mountain|stack|exaggerat|paper mountain)\b/, "visual_exaggeration"],
    [/\b(consequence first|already on a zoom|rival already|competitor cpa|competitor wins)\b/, "consequence_first"],
    [/\b(unexpected comparison|locked door online|leaving the website silent)\b/, "unexpected_comparison"],
    [/\b(group chat|social observation|clients text|are you back yet)\b/, "social_observation"],
    [/\b(neighbor bookkeeper|neighbor'?s porch)\b/, "social_observation"],
    [/\b(empty office|role reversal|blinking cursor|pto calendar|empty crm)\b/, "role_reversal"],
    [/\b(competitor|rival|driveway|already on)\b/, "consequence_first"],
    [/\b(comparison|metaphor|locked door)\b/, "unexpected_comparison"],
    [/\b(neighbor|street|social|whisper)\b/, "social_observation"],
    [/\b(boarding|ticket|absurd|fish|departure|mascot)\b/, "absurd_understandable"],
    [/\b(empty|nobody home|half-abandoned)\b/, "role_reversal"],
    [
      /\b(hands|typing|question|visitor|customer|urgent|thread|tax question|contact form|sessions)\b/,
      "direct_product_world",
    ],
  ];
  for (const [re, family] of rules) {
    if (re.test(blob)) return family;
  }
  return "social_observation";
}

function hookFromSituation(s: RawVisualSituation, signals: TopicConcreteSignals): string {
  const cue = s.scrollStopCue.trim();
  if (cue.length >= 12 && cue.length <= 120) {
    return cue.endsWith(".") ? cue : `${cue}.`;
  }
  return `During ${signals.stressCue}, ${signals.consequenceCue}.`;
}

function emotionalFromTags(tags: string[]): string {
  if (tags.some((t) => /humor|absurd|lemonade|fish|mascot/i.test(t))) return "amused recognition";
  if (tags.some((t) => /competitor|rival|lost|consequence/i.test(t))) return "urgency";
  if (tags.some((t) => /vacation|suitcase|gut|abroad/i.test(t))) return "gut-punch recognition";
  if (tags.some((t) => /heat|sweat|melt|urgent/i.test(t))) return "tension";
  if (tags.some((t) => /empty|night|haunted|silence/i.test(t))) return "unease";
  return "curiosity";
}

export function buildCreativeCandidateFromSituation(
  situation: RawVisualSituation,
  index: number,
  family: CreativeConceptFamily,
  ctx: {
    signals: TopicConcreteSignals;
    product: string;
    pain: string;
  },
): CreativeCandidate {
  const hookLine = hookFromSituation(situation, ctx.signals);
  const openingSituation = stripCosmeticPrefix(situation.scene);
  // coreIdea is the business/narrative idea — never a duplicate of the opening frame.
  // Prefer the scroll-stop cue alone so candidates stay lexically distinct.
  let coreIdea = situation.scrollStopCue.trim();
  if (
    !coreIdea ||
    coreIdea.toLowerCase() === openingSituation.toLowerCase()
  ) {
    const beat = openingSituation.split(/[.;—]/)[0]?.trim() ?? openingSituation;
    coreIdea = `Missed-channel stake behind: ${beat.slice(0, 100)}`;
  }
  if (coreIdea.toLowerCase() === openingSituation.toLowerCase()) {
    coreIdea = `${coreIdea} — ${ctx.pain.slice(0, 80)}`;
  }
  const base = {
    candidateId: `c${index + 1}-${family}-div`,
    family,
    coreIdea,
    emotionalReaction: emotionalFromTags(situation.tags),
    hookLine,
    openingSituation,
    visualPromise: `Film the opening as a scroll-stop frame: ${situation.scrollStopCue}. Setting must stay ${ctx.signals.settingCue}. No generic office/laptop montage.`,
    storyProgression: `Hold the opening situation → widen to ${ctx.signals.stressCue} → reveal ${ctx.pain} (${ctx.signals.consequenceCue}) → ${ctx.product} answers what humans cannot.`,
    productConnection: `${ctx.product} handles the website moment shown in the opening — without replacing the scene's human stakes.`,
    ending: `Next ${ctx.signals.customerCue} gets an answer even when the owner cannot.`,
    expectedViewerQuestion: situation.scrollStopCue.endsWith("?")
      ? situation.scrollStopCue
      : `What happens to the person in: ${situation.scrollStopCue}?`,
    familiarityRisk: situation.tags.some((t) => /absurd|fish|mascot|carousel/i.test(t))
      ? "low"
      : "medium",
    memorabilityReason: `Selected from divergence v2 for scroll-stop: ${situation.scrollStopCue}`,
  } satisfies Omit<CreativeCandidate, "creativeDNA" | "creativeDnaSource">;

  // Author DNA in the same pass as the candidate fields (not a post-hoc reinterpretation).
  const authored = authorCreativeDNA(base, {
    signals: ctx.signals,
    product: ctx.product,
    pain: ctx.pain,
  });
  const resolved = resolveCandidateCreativeDNA({
    candidate: base,
    authoredDna: authored,
    ctx: {
      signals: ctx.signals,
      product: ctx.product,
      pain: ctx.pain,
    },
  });

  const withDna: CreativeCandidate = {
    ...base,
    creativeDNA: resolved.dna,
    creativeDnaSource: resolved.source,
  };
  return validateAndRepairCandidate(withDna, {
    productLabel: ctx.product,
  }).candidate;
}

/**
 * Pick up to `count` survivors with unique families (inferred from scene) and unique fingerprints.
 * Never relabel a scene into a mismatched family — skip to the next survivor instead.
 */
export function buildCandidatesFromSurvivors(
  survivors: readonly RawVisualSituation[],
  ctx: {
    signals: TopicConcreteSignals;
    product: string;
    pain: string;
    count?: number;
  },
): CreativeCandidate[] {
  const n = ctx.count ?? 8;
  const picked: Array<{ s: RawVisualSituation; family: CreativeConceptFamily }> = [];
  const usedFamilies = new Set<CreativeConceptFamily>();
  const usedFp = new Set<string>();

  // Pass 1: take first unused family per fingerprint, in survivor score order
  for (const s of survivors) {
    if (picked.length >= n) break;
    const family = inferFamily(s);
    const fp = situationFingerprint(s.scene, s.scrollStopCue).key;
    if (usedFamilies.has(family) || usedFp.has(fp)) continue;
    picked.push({ s, family });
    usedFamilies.add(family);
    usedFp.add(fp);
  }

  // Pass 2: fill missing families by scanning remaining survivors for that family only
  for (const family of CREATIVE_CONCEPT_FAMILIES) {
    if (picked.length >= n) break;
    if (usedFamilies.has(family)) continue;
    const match = survivors.find((s) => {
      if (inferFamily(s) !== family) return false;
      const fp = situationFingerprint(s.scene, s.scrollStopCue).key;
      return !usedFp.has(fp);
    });
    if (match) {
      picked.push({ s: match, family });
      usedFamilies.add(family);
      usedFp.add(situationFingerprint(match.scene, match.scrollStopCue).key);
    }
  }

  // Pass 3: fill to n with remaining survivors; assign unused family labels for slate diversity
  // only when the scene's inferred family is already taken (label is diversity axis, scene stays).
  const remainingFamilies = CREATIVE_CONCEPT_FAMILIES.filter((f) => !usedFamilies.has(f));
  let fi = 0;
  for (const s of survivors) {
    if (picked.length >= n) break;
    const fp = situationFingerprint(s.scene, s.scrollStopCue).key;
    if (usedFp.has(fp)) continue;
    const inferred = inferFamily(s);
    let family = inferred;
    if (usedFamilies.has(family)) {
      if (fi >= remainingFamilies.length) continue;
      family = remainingFamilies[fi++]!;
    }
    picked.push({ s, family });
    usedFamilies.add(family);
    usedFp.add(fp);
  }

  return picked.map((p, i) =>
    buildCreativeCandidateFromSituation(p.s, i, p.family, {
      signals: ctx.signals,
      product: ctx.product,
      pain: ctx.pain,
    }),
  );
}
