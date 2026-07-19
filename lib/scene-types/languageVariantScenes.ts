/**
 * Language-variant scene preparation (Sprint 5.3.2).
 *
 * Visual clone of the primary completed render_spec: same types, order,
 * payloads, and durable storage refs. Never downgrade typed scenes to IMAGE.
 * Never invent image_prompt or strip asset references.
 *
 * Embedded on-screen text may remain primary-language; that is preferred to
 * regenerating visuals. Future per-language typed payloads are out of scope.
 */

import type { SceneType } from "@/lib/scene-types/sceneType";
import { DEFAULT_SCENE_TYPE } from "@/lib/scene-types/sceneType";
import { isSceneTypesEnabled } from "@/lib/scene-types/config";
import {
  assertRenderFidelity,
  RenderProductDemoFailedError,
} from "@/lib/scene-types/presentation/renderFidelity";
import { parseProductDemoBeat } from "@/lib/scene-types/product-demo/productDemoBeat";

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function sceneTypeUpper(scene: Record<string, unknown>): string {
  return typeof scene.type === "string" ? scene.type.toUpperCase() : "";
}

function readStringField(
  scene: Record<string, unknown>,
  key: string,
): string | null {
  const value = scene[key];
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/** Explicit manual per-language visual override (future / manual workflow). */
export function hasLanguageVariantManualVisual(
  scene: Record<string, unknown>,
): boolean {
  return (
    scene.language_variant_manual_visual === true ||
    scene.manual_language_visual === true
  );
}

export function sceneHasDurableVisualRef(
  scene: Record<string, unknown>,
): boolean {
  return Boolean(
    readStringField(scene, "image_bucket") &&
      readStringField(scene, "image_path"),
  );
}

export class LanguageVariantVisualAssetMissingError extends Error {
  readonly code = "language_variant_visual_asset_missing" as const;
  readonly sceneId: string;
  readonly reason: string;

  constructor(message: string, args: { sceneId: string; reason: string }) {
    super(message);
    this.name = "LanguageVariantVisualAssetMissingError";
    this.sceneId = args.sceneId;
    this.reason = args.reason;
  }
}

export class LanguageVariantVisualFidelityError extends Error {
  readonly code = "language_variant_visual_fidelity_failed" as const;
  readonly diagnostics: Record<string, unknown>;

  constructor(message: string, diagnostics: Record<string, unknown> = {}) {
    super(message);
    this.name = "LanguageVariantVisualFidelityError";
    this.diagnostics = diagnostics;
  }
}

/**
 * Preserve a PRODUCT_DEMO worker/render_spec scene for a language variant.
 * Keeps type, payload_snapshot, and durable raster refs when present.
 */
export function preserveProductDemoForLanguageVariant(
  scene: Record<string, unknown>,
  sceneId: string,
): Record<string, unknown> {
  const payload =
    asRecord(scene.payload_snapshot) ?? asRecord(scene.payload) ?? null;
  if (!payload) {
    throw new RenderProductDemoFailedError(
      "render_product_demo_failed: language variant PRODUCT_DEMO missing payload",
      {
        stage: "language_variant_prepare",
        scene_id: sceneId,
        reason: "missing_product_demo_payload",
        forbidden_final_type: DEFAULT_SCENE_TYPE,
      },
    );
  }
  const parsed = parseProductDemoBeat(payload);
  if (!parsed.ok) {
    throw new RenderProductDemoFailedError(
      `render_product_demo_failed: language variant PRODUCT_DEMO invalid — ${parsed.reason}`,
      {
        stage: "language_variant_prepare",
        scene_id: sceneId,
        reason: parsed.reason,
        forbidden_final_type: DEFAULT_SCENE_TYPE,
      },
    );
  }

  return {
    ...scene,
    id: sceneId,
    type: "PRODUCT_DEMO",
    payload_snapshot: parsed.data as unknown as Record<string, unknown>,
  };
}

function payloadSnapshotEqual(
  a: Record<string, unknown>,
  b: Record<string, unknown>,
): boolean {
  const pa = asRecord(a.payload_snapshot) ?? asRecord(a.payload);
  const pb = asRecord(b.payload_snapshot) ?? asRecord(b.payload);
  return JSON.stringify(pa ?? null) === JSON.stringify(pb ?? null);
}

/**
 * Assert variant scenes are a visual clone of the primary list.
 * Allows differing storage refs only when a manual language visual is flagged.
 */
export function assertLanguageVariantVisualFidelity(args: {
  primary: Record<string, unknown>[];
  prepared: Record<string, unknown>[];
  stage?: string;
}): void {
  const stage = args.stage ?? "language_variant_visual_fidelity";
  if (args.prepared.length !== args.primary.length) {
    throw new LanguageVariantVisualFidelityError(
      `language_variant_visual_fidelity_failed: scene count ${args.prepared.length} !== primary ${args.primary.length}`,
      {
        stage,
        primary_count: args.primary.length,
        prepared_count: args.prepared.length,
      },
    );
  }

  for (let i = 0; i < args.primary.length; i++) {
    const primary = args.primary[i]!;
    const prepared = args.prepared[i]!;
    const primaryId =
      typeof primary.id === "string" && primary.id.trim()
        ? primary.id.trim()
        : `scene-${i + 1}`;
    const preparedId =
      typeof prepared.id === "string" && prepared.id.trim()
        ? prepared.id.trim()
        : `scene-${i + 1}`;
    const primaryType = sceneTypeUpper(primary) || DEFAULT_SCENE_TYPE;
    const preparedType = sceneTypeUpper(prepared) || DEFAULT_SCENE_TYPE;

    if (preparedType !== primaryType) {
      throw new LanguageVariantVisualFidelityError(
        `language_variant_visual_fidelity_failed: scene ${primaryId} type ${preparedType} !== primary ${primaryType}`,
        {
          stage,
          scene_id: primaryId,
          index: i,
          primary_type: primaryType,
          prepared_type: preparedType,
        },
      );
    }

    if (preparedId !== primaryId) {
      throw new LanguageVariantVisualFidelityError(
        `language_variant_visual_fidelity_failed: scene id order mismatch at index ${i}`,
        {
          stage,
          index: i,
          primary_id: primaryId,
          prepared_id: preparedId,
        },
      );
    }

    const manual =
      hasLanguageVariantManualVisual(primary) ||
      hasLanguageVariantManualVisual(prepared);

    if (!manual) {
      const pb = readStringField(primary, "image_bucket");
      const pp = readStringField(primary, "image_path");
      const vb = readStringField(prepared, "image_bucket");
      const vp = readStringField(prepared, "image_path");
      if (vb !== pb || vp !== pp) {
        throw new LanguageVariantVisualFidelityError(
          `language_variant_visual_fidelity_failed: scene ${primaryId} storage refs changed`,
          {
            stage,
            scene_id: primaryId,
            index: i,
            primary_bucket: pb,
            primary_path: pp,
            prepared_bucket: vb,
            prepared_path: vp,
          },
        );
      }

      const pa = readStringField(primary, "asset_id");
      const va = readStringField(prepared, "asset_id");
      if (va !== pa) {
        throw new LanguageVariantVisualFidelityError(
          `language_variant_visual_fidelity_failed: scene ${primaryId} asset_id changed`,
          {
            stage,
            scene_id: primaryId,
            index: i,
            primary_asset_id: pa,
            prepared_asset_id: va,
          },
        );
      }
    }

    if (!payloadSnapshotEqual(primary, prepared)) {
      // PRODUCT_DEMO normalize may re-serialize equivalent beat — compare via parse
      if (primaryType === "PRODUCT_DEMO" && preparedType === "PRODUCT_DEMO") {
        const rawP =
          asRecord(primary.payload_snapshot) ?? asRecord(primary.payload);
        const rawV =
          asRecord(prepared.payload_snapshot) ?? asRecord(prepared.payload);
        const parsedP = rawP ? parseProductDemoBeat(rawP) : null;
        const parsedV = rawV ? parseProductDemoBeat(rawV) : null;
        if (
          parsedP?.ok &&
          parsedV?.ok &&
          JSON.stringify(parsedP.data) === JSON.stringify(parsedV.data)
        ) {
          continue;
        }
      }
      throw new LanguageVariantVisualFidelityError(
        `language_variant_visual_fidelity_failed: scene ${primaryId} payload_snapshot changed`,
        { stage, scene_id: primaryId, index: i },
      );
    }
  }
}

/**
 * Prepare primary render_spec scenes for a language-variant video job.
 * Visual clone only — fail closed if durable rasters are missing.
 */
export function prepareRenderScenesForLanguageVariant(args: {
  scenes: Record<string, unknown>[];
  /** Localized VO — not used for visuals (kept for call-site compatibility). */
  voiceoverText?: string;
}): { scenes: Record<string, unknown>[]; warnings: string[] } {
  const warnings: string[] = [];
  const primary = args.scenes;

  if (primary.length === 0) {
    throw new LanguageVariantVisualAssetMissingError(
      "language_variant_visual_asset_missing: primary render has no scenes",
      { sceneId: "none", reason: "empty_scene_list" },
    );
  }

  const planned = primary.map((scene, index) => ({
    type: sceneTypeUpper(scene) || DEFAULT_SCENE_TYPE,
    id:
      typeof scene.id === "string" && scene.id.trim()
        ? scene.id.trim()
        : `scene-${index + 1}`,
  }));

  const out = primary.map((scene, index) => {
    const type = sceneTypeUpper(scene);
    const sceneId =
      typeof scene.id === "string" && scene.id.trim()
        ? scene.id.trim()
        : `scene-${index + 1}`;

    if (type === "PRODUCT_DEMO") {
      return preserveProductDemoForLanguageVariant(scene, sceneId);
    }

    // Visual clone — preserve every field including storage refs and payloads.
    return {
      ...scene,
      id: sceneId,
      ...(type ? { type } : {}),
    };
  });

  for (let i = 0; i < out.length; i++) {
    const scene = out[i]!;
    const sceneId =
      typeof scene.id === "string" && scene.id.trim()
        ? scene.id.trim()
        : planned[i]!.id;
    if (
      !sceneHasDurableVisualRef(scene) &&
      !hasLanguageVariantManualVisual(scene)
    ) {
      throw new LanguageVariantVisualAssetMissingError(
        `language_variant_visual_asset_missing: scene ${sceneId} missing image_bucket/image_path`,
        { sceneId, reason: "missing_durable_storage_ref" },
      );
    }
  }

  assertLanguageVariantVisualFidelity({
    primary,
    prepared: out,
    stage: "language_variant_prepare",
  });

  // PRODUCT_DEMO Render Fidelity (Sprint 5.3.1) — unchanged absolute rule.
  for (let i = 0; i < planned.length; i++) {
    if (planned[i]!.type !== "PRODUCT_DEMO") continue;
    const renderedType = sceneTypeUpper(out[i] ?? {});
    if (renderedType !== "PRODUCT_DEMO") {
      throw new RenderProductDemoFailedError(
        `render_product_demo_failed: language variant lost PRODUCT_DEMO at index ${i}`,
        {
          stage: "language_variant_prepare:product_demo",
          scene_id: planned[i]!.id,
          planned_type: "PRODUCT_DEMO",
          rendered_type: renderedType || "MISSING",
          reason: "product_demo_silently_downgraded_to_image",
        },
      );
    }
  }
  assertRenderFidelity({
    planned: planned.filter((s) => s.type === "PRODUCT_DEMO"),
    rendered: out
      .map((scene, index) => ({
        type: sceneTypeUpper(scene) || DEFAULT_SCENE_TYPE,
        id:
          typeof scene.id === "string" && scene.id.trim()
            ? scene.id.trim()
            : (planned[index]?.id ?? `scene-${index + 1}`),
      }))
      .filter((s) => s.type === "PRODUCT_DEMO"),
    stage: "language_variant_prepare:product_demo",
  });

  return { scenes: out, warnings };
}

export function sceneTypeFromWorkerScene(
  scene: Record<string, unknown>,
): SceneType {
  const raw = scene.type;
  if (typeof raw === "string" && raw.trim()) {
    return raw.trim().toUpperCase() as SceneType;
  }
  return DEFAULT_SCENE_TYPE;
}

export function checklistRendererActive(): boolean {
  return isSceneTypesEnabled();
}

/** Job input flags that mark a language-variant video render. */
export function isLanguageVariantVideoJobInput(
  input: Record<string, unknown> | null | undefined,
): boolean {
  if (!input) return false;
  return (
    input.generated_from_language_variant === true ||
    input.regenerated_language_variant === true
  );
}
