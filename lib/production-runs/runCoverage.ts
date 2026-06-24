import type {
  ContentItem,
  ContentPackage,
  Json,
  ProductionRun,
  Project,
  VideoJob,
} from "@/lib/supabase/types";

export interface RunCoverageStrategyItem {
  id: string;
  brief: Json | null;
}
import { normalizeFunnelStage, type FunnelStage } from "@/lib/ai/types";
import { parseProjectKnowledge } from "@/lib/knowledge/types";

export type CoverageLabel = "Good" | "Limited" | "Estimated" | "Repetitive" | "Not available";

export interface RunCoverageSummary {
  funnel: CoverageLabel;
  topics: CoverageLabel;
  strengths: CoverageLabel;
  audience: CoverageLabel;
  scenarios: CoverageLabel;
}

export interface RunCoverageReport {
  summary: RunCoverageSummary;
  funnel: {
    totalPackages: number;
    byStage: Record<FunnelStage, number>;
  };
  creativeModes: {
    available: boolean;
    byMode: Record<string, number>;
    dominantMode: string | null;
    dominantShare: number | null;
  };
  topics: {
    totalPackages: number;
    uniqueTopics: number;
    uniqueAngles: number;
    repeatedTopics: { text: string; count: number }[];
    repeatedAngles: { text: string; count: number }[];
  };
  painPoints: {
    total: number;
    usedCount: number;
    estimated: boolean;
    used: { text: string; matchCount: number; explicit: boolean }[];
    unused: string[];
  };
  strengths: {
    total: number;
    usedCount: number;
    estimated: boolean;
    used: { text: string; matchCount: number }[];
    unused: string[];
  };
  audience: {
    available: boolean;
    total: number;
    usedCount: number;
    estimated: boolean;
    used: { text: string; matchCount: number }[];
    unused: string[];
  };
  scenarios: {
    repeated: { text: string; count: number }[];
  };
  warnings: string[];
}

export interface ComputeRunCoverageInput {
  project: Project;
  run: ProductionRun;
  packages: ContentPackage[];
  strategyItems: RunCoverageStrategyItem[];
  contentItems: ContentItem[];
  videoJobs: VideoJob[];
}

const FUNNEL_STAGES: FunnelStage[] = [
  "awareness",
  "problem_aware",
  "solution_aware",
  "conversion",
];

const KNOWN_CREATIVE_MODES = new Set([
  "standard",
  "story",
  "shock",
  "contrarian",
  "myth_buster",
  "humor",
  "mistake",
  "comparison",
  "micro_case",
  "observation",
]);

function asRecord(value: Json | null | undefined): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[.,;:!?"']+$/g, "")
    .trim();
}

function countOccurrences(values: string[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const raw of values) {
    const text = raw.trim();
    if (!text) continue;
    const key = normalizeText(text);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return counts;
}

function repeatedFromCounts(
  counts: Map<string, number>,
  displayByKey: Map<string, string>,
): { text: string; count: number }[] {
  const out: { text: string; count: number }[] = [];
  for (const [key, count] of counts) {
    if (count <= 1) continue;
    out.push({ text: displayByKey.get(key) ?? key, count });
  }
  return out.sort((a, b) => b.count - a.count || a.text.localeCompare(b.text));
}

export function normalizeAudienceSegments(project: Project): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  const push = (value: string) => {
    const text = value.trim();
    if (!text) return;
    const key = normalizeText(text);
    if (seen.has(key)) return;
    seen.add(key);
    out.push(text);
  };

  const knowledge = parseProjectKnowledge(project.knowledge);
  if (knowledge) {
    for (const segment of knowledge.cards.customer.target_audience) {
      push(segment);
    }
  }

  const ta = project.target_audience;
  if (ta && typeof ta === "object" && !Array.isArray(ta)) {
    const record = ta as Record<string, unknown>;
    const segments = record.segments;
    if (Array.isArray(segments)) {
      for (const entry of segments) {
        if (typeof entry === "string") push(entry);
      }
    }
    for (const [key, value] of Object.entries(record)) {
      if (key === "segments") continue;
      if (typeof value === "string") push(value);
    }
  } else if (typeof ta === "string") {
    push(ta);
  }

  return out;
}

function readBriefString(
  brief: Json | null | undefined,
  key: string,
): string | null {
  const record = asRecord(brief);
  if (!record) return null;
  const value = record[key];
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : null;
}

function readExplicitPainPoint(
  strategyBrief: Json | null | undefined,
  generationMetadata: Json | null | undefined,
): string | null {
  for (const source of [strategyBrief, generationMetadata]) {
    const record = asRecord(source);
    if (!record) continue;
    for (const key of ["pain_point", "painPoint", "assigned_pain_point"]) {
      const value = record[key];
      if (typeof value === "string" && value.trim()) return value.trim();
    }
  }
  return null;
}

function collectPackageText(
  pkg: ContentPackage,
  items: ContentItem[],
): string {
  const brief = asRecord(pkg.package_brief);
  const parts: string[] = [pkg.title ?? ""];

  if (brief) {
    for (const key of ["hook", "voiceover_text", "subtitles", "scenario"]) {
      const value = brief[key];
      if (typeof value === "string") parts.push(value);
    }
    const cta = asRecord(brief.cta as Json);
    if (cta && typeof cta.text === "string") parts.push(cta.text);
    const video = asRecord(brief.video as Json);
    if (video) {
      if (typeof video.concept === "string") parts.push(video.concept);
      if (typeof video.script === "string") parts.push(video.script);
    }
    const outputs = asRecord(brief.platform_outputs as Json);
    if (outputs) {
      for (const output of Object.values(outputs)) {
        const row = asRecord(output as Json);
        if (!row) continue;
        if (typeof row.caption === "string") parts.push(row.caption);
        if (typeof row.cta === "string") parts.push(row.cta);
        const variants = row.caption_variants;
        if (Array.isArray(variants)) {
          for (const v of variants) {
            if (typeof v === "string") parts.push(v);
          }
        }
      }
    }
  }

  for (const item of items) {
    if (item.package_id !== pkg.id) continue;
    if (typeof item.caption === "string") parts.push(item.caption);
    if (typeof item.body === "string") parts.push(item.body);
    if (typeof item.title === "string") parts.push(item.title);
  }

  return parts.join("\n");
}

function matchCountInCorpus(needle: string, corpus: string): number {
  const hay = normalizeText(corpus);
  const n = normalizeText(needle);
  if (!n || n.length < 4) {
    if (n && hay.includes(n)) return 1;
    return 0;
  }
  if (hay.includes(n)) return 1;
  const words = n.split(" ").filter((w) => w.length >= 4);
  if (words.length === 0) return 0;
  const hits = words.filter((w) => hay.includes(w)).length;
  return hits >= Math.ceil(words.length * 0.6) ? 1 : 0;
}

function readCreativeModeFromJob(input: Json | null | undefined): string | null {
  const record = asRecord(input);
  if (!record) return null;
  const mode = record.creative_mode;
  return typeof mode === "string" && mode.trim() ? mode.trim() : null;
}

function readCreativeModeFromMetadata(meta: Json | null | undefined): string | null {
  const record = asRecord(meta);
  if (!record) return null;
  const mode = record.creative_mode;
  return typeof mode === "string" && mode.trim() ? mode.trim() : null;
}

function newestJobsByContentItem(jobs: VideoJob[]): Map<string, VideoJob> {
  const map = new Map<string, VideoJob>();
  for (const job of jobs) {
    const itemId = job.content_item_id;
    if (!itemId) continue;
    const existing = map.get(itemId);
    if (!existing || job.created_at > existing.created_at) {
      map.set(itemId, job);
    }
  }
  return map;
}

function strategyItemById(
  items: RunCoverageStrategyItem[],
): Map<string, RunCoverageStrategyItem> {
  return new Map(items.map((item) => [item.id, item]));
}

function primaryItemForPackage(
  packageId: string,
  items: ContentItem[],
): ContentItem | null {
  const primaries = items.filter(
    (item) => item.package_id === packageId && item.language === null,
  );
  if (primaries.length === 0) return null;
  const videoFirst = primaries.find((item) =>
    ["tiktok", "instagram", "youtube", "facebook"].includes(item.platform),
  );
  return videoFirst ?? primaries[0];
}

export function computeRunCoverage(input: ComputeRunCoverageInput): RunCoverageReport {
  const { project, packages, strategyItems, contentItems, videoJobs } = input;
  const warnings: string[] = [];

  const byStage: Record<FunnelStage, number> = {
    awareness: 0,
    problem_aware: 0,
    solution_aware: 0,
    conversion: 0,
  };

  for (const pkg of packages) {
    const stage =
      normalizeFunnelStage(pkg.funnel_stage) ??
      normalizeFunnelStage(
        readBriefString(pkg.package_brief, "funnel_stage"),
      );
    if (stage) byStage[stage] += 1;
  }

  const totalPackages = packages.length;
  const distinctFunnelStages = FUNNEL_STAGES.filter((s) => byStage[s] > 0).length;

  if (
    totalPackages > 0 &&
    distinctFunnelStages === 1 &&
    byStage.awareness === totalPackages
  ) {
    warnings.push(
      "All packages are Awareness. This may be expected for a free sample run, but weekly plans usually need more funnel variety.",
    );
  }

  const strategyMap = strategyItemById(strategyItems);
  const jobsByItem = newestJobsByContentItem(videoJobs);

  const topics: string[] = [];
  const angles: string[] = [];
  const topicDisplay = new Map<string, string>();
  const angleDisplay = new Map<string, string>();

  for (const pkg of packages) {
    const item = pkg.strategy_item_id
      ? strategyMap.get(pkg.strategy_item_id)
      : undefined;
    const topic =
      readBriefString(item?.brief ?? null, "topic") ??
      readBriefString(pkg.package_brief, "topic") ??
      "";
    const angle =
      readBriefString(item?.brief ?? null, "angle") ??
      readBriefString(pkg.package_brief, "angle") ??
      "";
    if (topic) {
      topics.push(topic);
      topicDisplay.set(normalizeText(topic), topic);
    }
    if (angle) {
      angles.push(angle);
      angleDisplay.set(normalizeText(angle), angle);
    }
  }

  const topicCounts = countOccurrences(topics);
  const angleCounts = countOccurrences(angles);
  const uniqueTopics = topicCounts.size;
  const uniqueAngles = angleCounts.size;

  const repeatedTopics = repeatedFromCounts(topicCounts, topicDisplay);
  const repeatedAngles = repeatedFromCounts(angleCounts, angleDisplay);

  if (totalPackages > 0 && uniqueTopics / totalPackages < 0.7) {
    warnings.push("Topic variety may be low.");
  }

  const creativeByMode: Record<string, number> = {};
  let creativeAvailable = false;

  for (const pkg of packages) {
    const primary = primaryItemForPackage(pkg.id, contentItems);
    let mode: string | null = null;
    if (primary) {
      const job = jobsByItem.get(primary.id);
      if (job) mode = readCreativeModeFromJob(job.input);
      if (!mode) mode = readCreativeModeFromMetadata(primary.generation_metadata);
    }
    if (!mode) {
      for (const item of contentItems) {
        if (item.package_id !== pkg.id) continue;
        mode = readCreativeModeFromMetadata(item.generation_metadata);
        if (mode) break;
      }
    }
    if (!mode) continue;
    creativeAvailable = true;
    const bucket = KNOWN_CREATIVE_MODES.has(mode) ? mode : "other";
    creativeByMode[bucket] = (creativeByMode[bucket] ?? 0) + 1;
  }

  let dominantMode: string | null = null;
  let dominantShare: number | null = null;
  const modeEntries = Object.entries(creativeByMode);
  if (modeEntries.length > 0 && totalPackages > 0) {
    const [topMode, topCount] = modeEntries.reduce((best, entry) =>
      entry[1] > best[1] ? entry : best,
    );
    dominantMode = topMode;
    dominantShare = topCount / totalPackages;
    if (dominantShare > 0.5) {
      warnings.push("One creative mode dominates this run.");
    }
  }

  const projectPains = (project.pain_points ?? []).filter(
    (p) => typeof p === "string" && p.trim(),
  );
  const painUsed: RunCoverageReport["painPoints"]["used"] = [];
  const painUnused: string[] = [];
  let anyExplicitPain = false;

  for (const pain of projectPains) {
    let matchCount = 0;
    let explicit = false;
    for (const pkg of packages) {
      const strategyItem = pkg.strategy_item_id
        ? strategyMap.get(pkg.strategy_item_id)
        : undefined;
      const primary = primaryItemForPackage(pkg.id, contentItems);
      const explicitPain = readExplicitPainPoint(
        strategyItem?.brief ?? null,
        primary?.generation_metadata ?? null,
      );
      if (explicitPain && normalizeText(explicitPain) === normalizeText(pain)) {
        explicit = true;
        anyExplicitPain = true;
        matchCount += 1;
        continue;
      }
      const corpus = collectPackageText(pkg, contentItems);
      const topic =
        readBriefString(strategyItem?.brief ?? null, "topic") ?? pkg.title;
      const angle = readBriefString(strategyItem?.brief ?? null, "angle") ?? "";
      const combined = `${topic}\n${angle}\n${corpus}`;
      matchCount += matchCountInCorpus(pain, combined);
    }
    if (matchCount > 0) {
      painUsed.push({ text: pain, matchCount, explicit });
    } else {
      painUnused.push(pain);
    }
  }

  const strengthsList = (project.product_strengths ?? []).filter(
    (s) => typeof s === "string" && s.trim(),
  );
  const strengthUsed: RunCoverageReport["strengths"]["used"] = [];
  const strengthUnused: string[] = [];

  for (const strength of strengthsList) {
    let matchCount = 0;
    for (const pkg of packages) {
      matchCount += matchCountInCorpus(
        strength,
        collectPackageText(pkg, contentItems),
      );
    }
    if (matchCount > 0) {
      strengthUsed.push({ text: strength, matchCount });
    } else {
      strengthUnused.push(strength);
    }
  }

  if (
    strengthsList.length > 0 &&
    strengthUsed.length === 0 &&
    totalPackages > 0
  ) {
    warnings.push("Product strengths are weakly represented in this run.");
  }

  const audienceSegments = normalizeAudienceSegments(project);
  const audienceUsed: RunCoverageReport["audience"]["used"] = [];
  const audienceUnused: string[] = [];

  if (audienceSegments.length === 0) {
    // no segments
  } else {
    for (const segment of audienceSegments) {
      let matchCount = 0;
      for (const pkg of packages) {
        const strategyItem = pkg.strategy_item_id
          ? strategyMap.get(pkg.strategy_item_id)
          : undefined;
        const topic =
          readBriefString(strategyItem?.brief ?? null, "topic") ?? pkg.title;
        const angle = readBriefString(strategyItem?.brief ?? null, "angle") ?? "";
        matchCount += matchCountInCorpus(
          segment,
          `${topic}\n${angle}\n${collectPackageText(pkg, contentItems)}`,
        );
      }
      if (matchCount > 0) {
        audienceUsed.push({ text: segment, matchCount });
      } else {
        audienceUnused.push(segment);
      }
    }
  }

  const scenarios: string[] = [];
  const scenarioDisplay = new Map<string, string>();
  for (const pkg of packages) {
    const scenario = readBriefString(pkg.package_brief, "scenario");
    if (!scenario) continue;
    scenarios.push(scenario);
    scenarioDisplay.set(normalizeText(scenario), scenario);
  }
  const scenarioCounts = countOccurrences(scenarios);
  const repeatedScenarios = repeatedFromCounts(scenarioCounts, scenarioDisplay);
  for (const entry of repeatedScenarios) {
    if (entry.count >= 3) {
      warnings.push("Scenario repetition detected.");
      break;
    }
  }

  const funnelSummary: CoverageLabel =
    totalPackages === 0
      ? "Limited"
      : distinctFunnelStages >= 2 || totalPackages <= 2
        ? "Good"
        : "Limited";

  const topicsSummary: CoverageLabel =
    totalPackages === 0
      ? "Limited"
      : uniqueTopics / totalPackages >= 0.7
        ? "Good"
        : "Limited";

  const strengthsSummary: CoverageLabel =
    strengthsList.length === 0
      ? "Not available"
      : strengthUsed.length >= Math.max(1, Math.ceil(strengthsList.length * 0.3))
        ? "Good"
        : strengthUsed.length === 0
          ? "Limited"
          : "Estimated";

  const audienceSummary: CoverageLabel =
    audienceSegments.length === 0
      ? "Not available"
      : audienceUsed.length >= Math.max(1, Math.ceil(audienceSegments.length * 0.3))
        ? "Good"
        : audienceUsed.length === 0
          ? "Limited"
          : "Estimated";

  const scenariosSummary: CoverageLabel =
    repeatedScenarios.some((r) => r.count >= 3)
      ? "Repetitive"
      : "Good";

  return {
    summary: {
      funnel: funnelSummary,
      topics: topicsSummary,
      strengths: strengthsSummary,
      audience: audienceSummary,
      scenarios: scenariosSummary,
    },
    funnel: { totalPackages, byStage },
    creativeModes: {
      available: creativeAvailable,
      byMode: creativeByMode,
      dominantMode,
      dominantShare,
    },
    topics: {
      totalPackages,
      uniqueTopics,
      uniqueAngles,
      repeatedTopics,
      repeatedAngles,
    },
    painPoints: {
      total: projectPains.length,
      usedCount: painUsed.length,
      estimated: !anyExplicitPain,
      used: painUsed,
      unused: painUnused,
    },
    strengths: {
      total: strengthsList.length,
      usedCount: strengthUsed.length,
      estimated: true,
      used: strengthUsed,
      unused: strengthUnused,
    },
    audience: {
      available: audienceSegments.length > 0,
      total: audienceSegments.length,
      usedCount: audienceUsed.length,
      estimated: true,
      used: audienceUsed,
      unused: audienceUnused,
    },
    scenarios: { repeated: repeatedScenarios },
    warnings: [...new Set(warnings)],
  };
}
