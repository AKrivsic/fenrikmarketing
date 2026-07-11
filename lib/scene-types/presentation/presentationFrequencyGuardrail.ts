import type { ContentPackageOutput } from "@/lib/ai/schemas/contentPackage";
import {
  applyChecklistFrequencyToPackage,
  type ChecklistFrequencyDecision,
} from "@/lib/scene-types/presentation/checklistFrequencyGuardrail";
import {
  applyPhoneFrequencyToPackage,
  type PhoneFrequencyDecision,
} from "@/lib/scene-types/presentation/phoneFrequencyGuardrail";
import {
  applyQuoteFrequencyToPackage,
  type QuoteFrequencyDecision,
} from "@/lib/scene-types/presentation/quoteFrequencyGuardrail";
import {
  applyStatisticFrequencyToPackage,
  type StatisticFrequencyDecision,
} from "@/lib/scene-types/presentation/statisticFrequencyGuardrail";
import {
  applyCtaFrequencyToPackage,
  type CtaFrequencyDecision,
} from "@/lib/scene-types/presentation/ctaFrequencyGuardrail";

export type PresentationFrequencyDecision =
  | ChecklistFrequencyDecision
  | PhoneFrequencyDecision
  | QuoteFrequencyDecision
  | StatisticFrequencyDecision
  | CtaFrequencyDecision;

/** Applies CHECKLIST, PHONE, QUOTE, STATISTIC, then CTA per-video limits (order preserved). */
export function applyPresentationFrequencyToPackage(
  pkg: ContentPackageOutput,
): PresentationFrequencyDecision[] {
  const checklist = applyChecklistFrequencyToPackage(pkg);
  const phone = applyPhoneFrequencyToPackage(pkg);
  const quote = applyQuoteFrequencyToPackage(pkg);
  const statistic = applyStatisticFrequencyToPackage(pkg);
  const cta = applyCtaFrequencyToPackage(pkg);
  return [...checklist, ...phone, ...quote, ...statistic, ...cta];
}
