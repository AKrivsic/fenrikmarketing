/**
 * Build the delta Repair prompt — Typed Pack + delta + prior package.
 * Does NOT call Presentation / buildGenerateContentPackagePrompt.
 */

import type { RepairContext } from "@/lib/architecture/repairDelta/types";
import {
  renderPreserveBlock,
  renderDeltaHeader,
  renderPriorPackageBlock,
  renderSceneRepair,
  renderVoiceRepair,
  renderCTARepair,
  renderAssetRepair,
  renderPlatformRepair,
  renderRepairTask,
  selectRepairRendererIds,
} from "@/lib/architecture/repairDelta/renderers";

export function buildRepairDeltaPrompt(ctx: RepairContext): string {
  const { decisionPacks, repairDelta, generatedPackage, winner } = ctx;
  const requireVideo = ctx.requireVideo ?? true;
  const rendererIds = selectRepairRendererIds(repairDelta.patchTargets);

  const sections: string[] = [
    "You are repairing a content package draft. This is NOT a new generation.",
    "Preserve every authoritative decision already made upstream.",
    "",
  ];

  if (rendererIds.includes("preserve")) {
    sections.push(renderPreserveBlock(decisionPacks, winner, repairDelta), "");
  }
  if (rendererIds.includes("delta")) {
    sections.push(renderDeltaHeader(repairDelta), "");
  }

  const scene = renderSceneRepair(generatedPackage, repairDelta);
  if (scene) sections.push(scene, "");

  const voice = renderVoiceRepair(generatedPackage, repairDelta);
  if (voice) sections.push(voice, "");

  const cta = renderCTARepair(generatedPackage, repairDelta);
  if (cta) sections.push(cta, "");

  const asset = renderAssetRepair(generatedPackage, repairDelta);
  if (asset) sections.push(asset, "");

  const platform = renderPlatformRepair(generatedPackage, repairDelta);
  if (platform) sections.push(platform, "");

  sections.push(renderPriorPackageBlock(generatedPackage), "");
  sections.push(renderRepairTask(repairDelta, requireVideo));

  if (ctx.funnelStageLabel) {
    sections.push(
      "",
      `Rules: funnel_stage MUST remain "${ctx.funnelStageLabel}".`,
    );
  }

  return sections.join("\n");
}
