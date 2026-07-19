/**
 * Sprint 5 — Render Fidelity.
 * Planned scene types must survive into rendered/worker scenes.
 * PRODUCT_DEMO must never silently become IMAGE.
 */

import {
  DEFAULT_SCENE_TYPE,
  effectiveSceneType,
  type SceneType,
} from "@/lib/scene-types/sceneType";

export const RENDER_PRODUCT_DEMO_FAILED = "render_product_demo_failed" as const;
export const RENDER_FIDELITY_VERSION = "render-fidelity@1" as const;

export class RenderProductDemoFailedError extends Error {
  readonly code = RENDER_PRODUCT_DEMO_FAILED;
  readonly diagnostics: Record<string, unknown>;

  constructor(message: string, diagnostics: Record<string, unknown> = {}) {
    super(message);
    this.name = "RenderProductDemoFailedError";
    this.diagnostics = {
      code: RENDER_PRODUCT_DEMO_FAILED,
      version: RENDER_FIDELITY_VERSION,
      ...diagnostics,
    };
  }
}

export interface RenderFidelitySceneRef {
  type: SceneType | string;
  id?: string | null;
}

export interface RenderFidelityViolation {
  index: number;
  planned_id: string | null;
  rendered_id: string | null;
  planned_type: SceneType;
  rendered_type: SceneType | "MISSING";
  reason: string;
}

export type RenderFidelityResult =
  | {
      passed: true;
      version: typeof RENDER_FIDELITY_VERSION;
      planned_types: SceneType[];
      rendered_types: SceneType[];
    }
  | {
      passed: false;
      version: typeof RENDER_FIDELITY_VERSION;
      code: typeof RENDER_PRODUCT_DEMO_FAILED | "render_fidelity_failed";
      summary: string;
      planned_types: SceneType[];
      rendered_types: Array<SceneType | "MISSING">;
      violations: RenderFidelityViolation[];
    };

function asType(value: unknown): SceneType {
  return effectiveSceneType(value, DEFAULT_SCENE_TYPE);
}

/**
 * Validate planned_scene.type === rendered_scene.type for every scene.
 * PRODUCT_DEMO mismatches fail with render_product_demo_failed.
 */
export function validateRenderFidelity(args: {
  planned: readonly RenderFidelitySceneRef[];
  rendered: readonly RenderFidelitySceneRef[];
}): RenderFidelityResult {
  const plannedTypes = args.planned.map((s) => asType(s.type));
  const renderedTypes = args.rendered.map((s) => asType(s.type));
  const violations: RenderFidelityViolation[] = [];
  const max = Math.max(plannedTypes.length, renderedTypes.length);

  for (let i = 0; i < max; i++) {
    const planned = args.planned[i];
    const rendered = args.rendered[i];
    const plannedType = planned ? asType(planned.type) : null;
    const renderedType = rendered ? asType(rendered.type) : null;

    if (!planned && rendered) {
      violations.push({
        index: i,
        planned_id: null,
        rendered_id: rendered.id?.trim() || null,
        planned_type: DEFAULT_SCENE_TYPE,
        rendered_type: renderedType ?? "MISSING",
        reason: "extra_rendered_scene_without_plan",
      });
      continue;
    }

    if (planned && !rendered) {
      violations.push({
        index: i,
        planned_id: planned.id?.trim() || null,
        rendered_id: null,
        planned_type: plannedType!,
        rendered_type: "MISSING",
        reason:
          plannedType === "PRODUCT_DEMO"
            ? "planned_product_demo_missing_from_render"
            : "planned_scene_missing_from_render",
      });
      continue;
    }

    if (plannedType !== renderedType) {
      violations.push({
        index: i,
        planned_id: planned?.id?.trim() || null,
        rendered_id: rendered?.id?.trim() || null,
        planned_type: plannedType!,
        rendered_type: renderedType ?? "MISSING",
        reason:
          plannedType === "PRODUCT_DEMO" && renderedType === DEFAULT_SCENE_TYPE
            ? "product_demo_silently_downgraded_to_image"
            : `type_mismatch:${plannedType}->${renderedType}`,
      });
    }
  }

  if (violations.length === 0) {
    return {
      passed: true,
      version: RENDER_FIDELITY_VERSION,
      planned_types: plannedTypes,
      rendered_types: renderedTypes,
    };
  }

  const productDemoViolation = violations.some(
    (v) =>
      v.planned_type === "PRODUCT_DEMO" ||
      v.reason.includes("product_demo"),
  );

  const renderedWithMissing: Array<SceneType | "MISSING"> = [];
  for (let i = 0; i < max; i++) {
    renderedWithMissing.push(
      args.rendered[i] ? asType(args.rendered[i]!.type) : "MISSING",
    );
  }

  return {
    passed: false,
    version: RENDER_FIDELITY_VERSION,
    code: productDemoViolation
      ? RENDER_PRODUCT_DEMO_FAILED
      : "render_fidelity_failed",
    summary: productDemoViolation
      ? "PRODUCT_DEMO planned but not preserved in render"
      : "planned scene types do not match rendered scene types",
    planned_types: plannedTypes,
    rendered_types: renderedWithMissing,
    violations,
  };
}

/** Throw when fidelity fails — PRODUCT_DEMO mismatches use render_product_demo_failed. */
export function assertRenderFidelity(args: {
  planned: readonly RenderFidelitySceneRef[];
  rendered: readonly RenderFidelitySceneRef[];
  stage?: string;
}): void {
  const result = validateRenderFidelity(args);
  if (result.passed) return;
  throw new RenderProductDemoFailedError(
    `${result.code}: ${result.summary}`,
    {
      stage: args.stage ?? "render_fidelity",
      summary: result.summary,
      violations: result.violations,
      planned_types: result.planned_types,
      rendered_types: result.rendered_types,
    },
  );
}

/**
 * Cap scene list to max while never dropping PRODUCT_DEMO in favor of IMAGE.
 * Removes non-PRODUCT_DEMO scenes first (from the front) until under cap.
 */
export function capScenesPreservingProductDemo<T extends { type?: unknown }>(
  scenes: readonly T[],
  max: number,
): T[] {
  if (scenes.length <= max) return [...scenes];
  const out = [...scenes];
  while (out.length > max) {
    const dropIdx = out.findIndex(
      (s) => String(s.type ?? "").toUpperCase() !== "PRODUCT_DEMO",
    );
    if (dropIdx >= 0) {
      out.splice(dropIdx, 1);
      continue;
    }
    // Only PRODUCT_DEMO left over cap — keep the last `max` demos.
    out.splice(0, out.length - max);
  }
  return out;
}
