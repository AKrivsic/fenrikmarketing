import type {
  CreativeCandidate,
  CreativeConceptFamily,
} from "@/lib/creative-candidates/types";
import { CREATIVE_CONCEPT_FAMILIES } from "@/lib/creative-candidates/types";
import type { TopicConcreteSignals } from "@/lib/creative-candidates/generateCandidates";
import type { RawVisualSituation } from "@/lib/creative-candidates/divergence/types";

function inferFamily(s: RawVisualSituation): CreativeConceptFamily {
  const blob = `${s.scene} ${s.tags.join(" ")}`.toLowerCase();
  const rules: Array<[RegExp, CreativeConceptFamily]> = [
    [/\b(argue|fight|conflict|mid-argument)\b/, "human_conflict"],
    [/\b(boarding|ticket|absurd|fish|departure|tube-man|mascot)\b/, "absurd_understandable"],
    [/\b(pile|tower|mountain|stack|exaggerat)\b/, "visual_exaggeration"],
    [/\b(competitor|rival|driveway|lost|consequence|split)\b/, "consequence_first"],
    [/\b(empty|role|auto-repl|half-abandoned|nobody home)\b/, "role_reversal"],
    [/\b(neighbor|street|social|whisper|parade|barber)\b/, "social_observation"],
    [/\b(comparison|like|AC|windows|lemonade|metaphor)\b/, "unexpected_comparison"],
    [/\b(hands|typing|question|chat|visitor|customer|urgent|thread)\b/, "direct_product_world"],
  ];
  for (const [re, family] of rules) {
    if (re.test(blob)) return family;
  }
  const idx =
    CREATIVE_CONCEPT_FAMILIES.indexOf(
      CREATIVE_CONCEPT_FAMILIES[s.tags.length % CREATIVE_CONCEPT_FAMILIES.length]!,
    );
  return CREATIVE_CONCEPT_FAMILIES[idx >= 0 ? idx : 0]!;
}

function hookFromSituation(s: RawVisualSituation, signals: TopicConcreteSignals): string {
  const cue = s.scrollStopCue.trim();
  if (cue.length >= 12 && cue.length <= 120) {
    return cue.endsWith(".") ? cue : `${cue}.`;
  }
  const firstClause = s.scene.split(/[.;—]/)[0]?.trim() ?? s.scene;
  if (firstClause.length > 20 && firstClause.length < 100) {
    return firstClause.endsWith(".") ? firstClause : `${firstClause}.`;
  }
  return `During ${signals.stressCue}, this is the moment demand slips away — not in a meeting, in this scene.`;
}

function emotionalFromTags(tags: string[]): string {
  if (tags.some((t) => /humor|absurd|lemonade|fish|mascot/i.test(t))) return "amused recognition";
  if (tags.some((t) => /competitor|rival|lost|consequence/i.test(t))) return "urgency";
  if (tags.some((t) => /heat|sweat|melt|urgent/i.test(t))) return "tension";
  if (tags.some((t) => /empty|night|haunted|silence/i.test(t))) return "unease";
  return "curiosity";
}

export function buildCreativeCandidateFromSituation(
  situation: RawVisualSituation,
  index: number,
  ctx: {
    signals: TopicConcreteSignals;
    product: string;
    pain: string;
  },
): CreativeCandidate {
  const family = inferFamily(situation);
  const hookLine = hookFromSituation(situation, ctx.signals);
  const openingSituation = situation.scene;

  return {
    candidateId: `c${index + 1}-${family}-div`,
    family,
    coreIdea: situation.scene,
    emotionalReaction: emotionalFromTags(situation.tags),
    hookLine,
    openingSituation,
    visualPromise: `Film the opening as a scroll-stop frame: ${situation.scrollStopCue}. No generic office/laptop montage.`,
    storyProgression: `Hold the opening situation → widen to ${ctx.signals.stressCue} → reveal ${ctx.pain} on the website channel → ${ctx.product} answers what humans cannot.`,
    productConnection: `${ctx.product} handles the website moment shown in the opening — without replacing the scene's human stakes.`,
    ending: `Next ${ctx.signals.customerCue} gets an answer while the crew stays in the field.`,
    expectedViewerQuestion: situation.scrollStopCue.endsWith("?")
      ? situation.scrollStopCue
      : `What happens to the person in: ${situation.scrollStopCue}?`,
    familiarityRisk: situation.tags.some((t) => /absurd|fish|mascot|tube/i.test(t))
      ? "low"
      : "medium",
    memorabilityReason: `Selected from divergence v2 for scroll-stop: ${situation.scrollStopCue}`,
  };
}

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
  const usedFamilies = new Set<CreativeConceptFamily>();
  const picked: RawVisualSituation[] = [];

  for (const s of survivors) {
    if (picked.length >= n) break;
    const fam = inferFamily(s);
    if (usedFamilies.has(fam) && picked.length < n - 1) {
      const remainingFamilies = CREATIVE_CONCEPT_FAMILIES.filter((f) => !usedFamilies.has(f));
      if (remainingFamilies.length > 0 && survivors.length > picked.length + 3) {
        continue;
      }
    }
    picked.push(s);
    usedFamilies.add(fam);
  }

  while (picked.length < n && picked.length < survivors.length) {
    const next = survivors.find((s) => !picked.some((p) => p.id === s.id));
    if (!next) break;
    picked.push(next);
  }

  return picked.map((s, i) =>
    buildCreativeCandidateFromSituation(s, i, {
      signals: ctx.signals,
      product: ctx.product,
      pain: ctx.pain,
    }),
  );
}
