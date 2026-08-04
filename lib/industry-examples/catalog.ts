import type { IndustryExampleData } from "@/lib/industry-examples/types";
import { hvacExample } from "@/lib/industry-examples/hvac";

/**
 * Registered public industry example pages.
 * Add new industries here so the public video allowlist stays in sync.
 */
export const INDUSTRY_EXAMPLE_CATALOG: readonly IndustryExampleData[] = [
  hvacExample,
];
