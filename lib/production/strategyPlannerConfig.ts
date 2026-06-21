// Production strategy planner feature flags (env-only, default safe legacy path).

export type ProductionStrategyPlannerMode = "legacy" | "ai";

export function readProductionStrategyPlannerMode(): ProductionStrategyPlannerMode {
  const raw = process.env.PRODUCTION_STRATEGY_PLANNER?.trim().toLowerCase();
  return raw === "ai" ? "ai" : "legacy";
}

export function readProductionPlannerMax(): number {
  const raw = Number(process.env.PRODUCTION_PLANNER_MAX);
  return Number.isFinite(raw) && raw > 0 ? Math.trunc(raw) : 21;
}

export function readContentStrategyPlannerMaxTokens(): number {
  const raw = Number(process.env.CONTENT_STRATEGY_PLANNER_MAX_TOKENS);
  return Number.isFinite(raw) && raw > 0 ? Math.trunc(raw) : 8192;
}
