import type { SupabaseClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { STORAGE_BUCKETS } from "@/lib/api/storage";
import {
  elevenLabsMusicAllowedForProduction,
  estimateElevenLabsMusicCostUsd,
  estimateElevenLabsSfxCostUsd,
  isElevenLabsSoundEffectsEnabled,
} from "@/lib/elevenlabs/audioProductionConfig";
import { elevenLabsMusicGeneration } from "@/lib/elevenlabs/musicGeneration";
import {
  audioAssetInputFingerprint,
  elevenLabsSoundGeneration,
  elevenLabsErrorImpliesSubmissionUnknown,
} from "@/lib/elevenlabs/soundGeneration";
import {
  ElevenLabsAdapterError,
  elevenLabsErrorIsProviderRejected,
} from "@/lib/elevenlabs/adapter";
import type { TextToVideoMusicPlan } from "@/lib/content-package/textToVideoSoundPlan";
import { resolveTextToVideoMusicForProduction } from "@/lib/content-package/textToVideoMusicResolve";
import {
  ELEVEN_MUSIC_MODEL,
  ELEVEN_SFX_MODEL,
} from "@/lib/text-to-video/audioAssetConstants";
import {
  adoptExistingAudioAssetIfPresent,
  assertAllowedAudioAssetBucket,
  expectedAudioAssetStoragePath,
  uploadAudioAssetWithRetries,
  verifyAudioAssetBuffer,
  downloadAudioAssetArtifact,
  maxBytesForAudioAssetKind,
} from "@/lib/text-to-video/audioAssetArtifact";
import {
  claimAudioAssetSubmission,
  listAudioAssetsForPackageJob,
  loadOrCreateAudioAsset,
  markAudioAssetArtifactRecoveryRequired,
  markAudioAssetCompleted,
  markAudioAssetFailedPreSubmission,
  markAudioAssetNeedsReviewCompletedArtifact,
  markAudioAssetProviderRejectedOwned,
  markAudioAssetResponseReceived,
  markAudioAssetSubmissionUnknownOwned,
  type AudioAssetRow,
} from "@/lib/text-to-video/audioAssetRepository";
import type { ResolvedSfxPlacement } from "@/lib/text-to-video/textToVideoSfxAnchoring";
import { evaluateTextToVideoFullBudget } from "@/lib/text-to-video/textToVideoAudioBudget";
import { assertAssemblyPhasePackageBudget } from "@/lib/text-to-video/textToVideoPackageBudget";
import type { TextToVideoRunwayExecutionPlan } from "@/lib/text-to-video/runwayExecutionPlan";
import type { SceneVideoAttemptView } from "@/lib/scene-video-attempts";
import type { ManifestAudioBed } from "@/lib/video-reel-assembly/clipReadyManifestSchema";
import type { AudioMixSfxEvent } from "@/video-worker/services/audioMix/types";

const BUCKET = STORAGE_BUCKETS.videoRenders;

export class TextToVideoAudioPhaseError extends Error {
  readonly code: string;
  constructor(code: string) {
    super(code);
    this.code = code;
  }
}

export interface TextToVideoAudioPhaseResult {
  music: ManifestAudioBed;
  sfxEvents: AudioMixSfxEvent[];
  sfxPostCount: number;
  musicPostCount: number;
  audioAssetFingerprints: string[];
  tempDirs: string[];
}

function sfxSynthesisInput(placement: ResolvedSfxPlacement) {
  return {
    prompt: placement.prompt,
    duration_seconds: placement.duration_seconds,
    scene_id: placement.scene_id,
    model: ELEVEN_SFX_MODEL,
  };
}

async function materializeLocalAudio(
  audio: Buffer,
  prefix: string,
  tempDirs: string[],
): Promise<string> {
  const workDir = await mkdtemp(join(tmpdir(), prefix));
  tempDirs.push(workDir);
  const localPath = join(workDir, "asset.mp3");
  await writeFile(localPath, audio);
  return localPath;
}

async function reuseCompletedAudioAsset(args: {
  supabase: SupabaseClient;
  row: AudioAssetRow;
  projectId: string;
  packageId: string;
  assetKind: "sound_effect" | "music";
  expectedDurationSeconds: number;
  inputFingerprint: string;
  tempDirs: string[];
}): Promise<{ localPath: string } | null> {
  if (
    args.row.status !== "completed" ||
    !args.row.audio_bucket ||
    !args.row.audio_path
  ) {
    return null;
  }
  assertAllowedAudioAssetBucket(String(args.row.audio_bucket));
  const expectedPath = expectedAudioAssetStoragePath(
    args.projectId,
    args.packageId,
    args.assetKind,
    args.inputFingerprint,
    args.assetKind === "music" ? "music.mp3" : "sfx.mp3",
  );
  if (String(args.row.audio_path) !== expectedPath) {
    await markAudioAssetNeedsReviewCompletedArtifact(args.supabase, {
      rowId: args.row.id,
      code: "audio_path_fingerprint_mismatch",
    });
    throw new TextToVideoAudioPhaseError("audio_artifact_path_mismatch");
  }
  try {
    const audio = await downloadAudioAssetArtifact(
      args.supabase,
      String(args.row.audio_bucket),
      String(args.row.audio_path),
      maxBytesForAudioAssetKind(args.assetKind),
    );
    await verifyAudioAssetBuffer({
      audio,
      assetKind: args.assetKind,
      expectedDurationSeconds: args.expectedDurationSeconds,
      loopExpected: args.assetKind === "music",
    });
    const localPath = await materializeLocalAudio(
      audio,
      "fenrik-t2v-audio-reuse-",
      args.tempDirs,
    );
    return { localPath };
  } catch {
    await markAudioAssetNeedsReviewCompletedArtifact(args.supabase, {
      rowId: args.row.id,
      code: "completed_audio_artifact_invalid",
    });
    throw new TextToVideoAudioPhaseError("audio_completed_artifact_invalid");
  }
}

async function ensureSfxAsset(args: {
  supabase: SupabaseClient;
  projectId: string;
  packageId: string;
  videoJobId: string;
  owner: string;
  placement: ResolvedSfxPlacement;
  fetchImpl?: typeof fetch;
  shouldContinue?: () => boolean;
  tempDirs: string[];
}): Promise<{ localPath: string; providerPost: boolean; fingerprint: string }> {
  const synthesisInput = sfxSynthesisInput(args.placement);
  const fingerprint = audioAssetInputFingerprint(synthesisInput);
  const path = expectedAudioAssetStoragePath(
    args.projectId,
    args.packageId,
    "sound_effect",
    fingerprint,
    "sfx.mp3",
  );
  const row = await loadOrCreateAudioAsset(args.supabase, {
    projectId: args.projectId,
    packageId: args.packageId,
    videoJobId: args.videoJobId,
    assetKind: "sound_effect",
    scopeKey: args.placement.scene_id,
    fingerprint,
    modelId: ELEVEN_SFX_MODEL,
    prompt: args.placement.prompt,
    durationSeconds: args.placement.duration_seconds,
    estimatedCostUsd: estimateElevenLabsSfxCostUsd(args.placement.duration_seconds),
    synthesisInput,
  });

  const reused = await reuseCompletedAudioAsset({
    supabase: args.supabase,
    row,
    projectId: args.projectId,
    packageId: args.packageId,
    assetKind: "sound_effect",
    expectedDurationSeconds: args.placement.duration_seconds,
    inputFingerprint: fingerprint,
    tempDirs: args.tempDirs,
  });
  if (reused) return { ...reused, providerPost: false, fingerprint };

  if (row.status === "submission_unknown") {
    throw new TextToVideoAudioPhaseError("sfx_submission_unknown");
  }
  if (row.status === "artifact_recovery_required") {
    throw new TextToVideoAudioPhaseError("sfx_artifact_recovery_required");
  }

  const adopted = await adoptExistingAudioAssetIfPresent(args.supabase, {
    path,
    assetKind: "sound_effect",
    expectedDurationSeconds: args.placement.duration_seconds,
  });
  if (adopted) {
    await markAudioAssetCompleted(args.supabase, {
      rowId: row.id,
      owner: args.owner,
      bucket: BUCKET,
      path,
      durationSeconds: adopted.duration,
    }).catch(() => undefined);
    const localPath = await materializeLocalAudio(
      adopted.audio,
      "fenrik-t2v-sfx-adopt-",
      args.tempDirs,
    );
    return { localPath, providerPost: false, fingerprint };
  }

  if (args.shouldContinue && !args.shouldContinue()) {
    throw new TextToVideoAudioPhaseError("lease_lost");
  }
  const claimed = await claimAudioAssetSubmission(
    args.supabase,
    row,
    args.owner,
  );
  if (!claimed) throw new TextToVideoAudioPhaseError("sfx_claim_busy");

  let audio: Buffer | null = null;
  try {
    const res = await elevenLabsSoundGeneration(
      {
        text: args.placement.prompt,
        durationSeconds: args.placement.duration_seconds,
      },
      args.fetchImpl,
    );
    audio = res.audio;
    await markAudioAssetResponseReceived(args.supabase, {
      rowId: row.id,
      owner: args.owner,
    });
  } catch (err) {
    if (
      err instanceof ElevenLabsAdapterError &&
      elevenLabsErrorImpliesSubmissionUnknown(err)
    ) {
      await markAudioAssetSubmissionUnknownOwned(args.supabase, {
        rowId: row.id,
        owner: args.owner,
        code: err.code,
      });
      throw new TextToVideoAudioPhaseError("sfx_submission_unknown");
    }
    if (
      err instanceof ElevenLabsAdapterError &&
      elevenLabsErrorIsProviderRejected(err)
    ) {
      await markAudioAssetProviderRejectedOwned(args.supabase, {
        rowId: row.id,
        owner: args.owner,
        code: err.code,
      });
      throw new TextToVideoAudioPhaseError("sfx_provider_rejected");
    }
    await markAudioAssetFailedPreSubmission(args.supabase, {
      rowId: row.id,
      code: err instanceof ElevenLabsAdapterError ? err.code : "sfx_failed",
    });
    throw new TextToVideoAudioPhaseError("sfx_generation_failed");
  }

  try {
    await verifyAudioAssetBuffer({
      audio: audio!,
      assetKind: "sound_effect",
      expectedDurationSeconds: args.placement.duration_seconds,
    });
    await uploadAudioAssetWithRetries(args.supabase, path, audio!);
    await markAudioAssetCompleted(args.supabase, {
      rowId: row.id,
      owner: args.owner,
      bucket: BUCKET,
      path,
      durationSeconds: args.placement.duration_seconds,
    });
    const localPath = await materializeLocalAudio(
      audio!,
      "fenrik-t2v-sfx-new-",
      args.tempDirs,
    );
    return { localPath, providerPost: true, fingerprint };
  } catch (err) {
    await markAudioAssetArtifactRecoveryRequired(args.supabase, {
      rowId: row.id,
      owner: args.owner,
      code: err instanceof Error ? err.message : "sfx_artifact_failed",
    });
    throw new TextToVideoAudioPhaseError("sfx_artifact_recovery_required");
  }
}

async function ensureMusicAsset(args: {
  supabase: SupabaseClient;
  projectId: string;
  packageId: string;
  videoJobId: string;
  owner: string;
  prompt: string;
  durationSeconds: number;
  fetchImpl?: typeof fetch;
  shouldContinue?: () => boolean;
}): Promise<{ bed: ManifestAudioBed; providerPost: boolean; fingerprint: string }> {
  const synthesisInput = {
    prompt: args.prompt,
    duration_seconds: args.durationSeconds,
    model: ELEVEN_MUSIC_MODEL,
  };
  const fingerprint = audioAssetInputFingerprint(synthesisInput);
  const path = expectedAudioAssetStoragePath(
    args.projectId,
    args.packageId,
    "music",
    fingerprint,
    "music.mp3",
  );
  const row = await loadOrCreateAudioAsset(args.supabase, {
    projectId: args.projectId,
    packageId: args.packageId,
    videoJobId: args.videoJobId,
    assetKind: "music",
    scopeKey: "package",
    fingerprint,
    modelId: ELEVEN_MUSIC_MODEL,
    prompt: args.prompt,
    durationSeconds: args.durationSeconds,
    estimatedCostUsd: estimateElevenLabsMusicCostUsd(args.durationSeconds),
    synthesisInput,
  });

  if (row.status === "completed" && row.audio_bucket && row.audio_path) {
    assertAllowedAudioAssetBucket(String(row.audio_bucket));
    if (String(row.audio_path) !== path) {
      throw new TextToVideoAudioPhaseError("music_artifact_path_mismatch");
    }
    const audio = await downloadAudioAssetArtifact(
      args.supabase,
      BUCKET,
      path,
      maxBytesForAudioAssetKind("music"),
    );
    await verifyAudioAssetBuffer({
      audio,
      assetKind: "music",
      expectedDurationSeconds: args.durationSeconds,
      loopExpected: true,
    });
    return {
      bed: {
        bucket: BUCKET,
        path,
        gain: 0.12,
        loop: true,
        fadeInSeconds: 1,
        fadeOutSeconds: 2,
      },
      providerPost: false,
      fingerprint,
    };
  }

  if (row.status === "submission_unknown") {
    throw new TextToVideoAudioPhaseError("music_submission_unknown");
  }

  const adopted = await adoptExistingAudioAssetIfPresent(args.supabase, {
    path,
    assetKind: "music",
    expectedDurationSeconds: args.durationSeconds,
    loopExpected: true,
  });
  if (adopted) {
    await markAudioAssetCompleted(args.supabase, {
      rowId: row.id,
      owner: args.owner,
      bucket: BUCKET,
      path,
      durationSeconds: adopted.duration,
    }).catch(() => undefined);
    return {
      bed: {
        bucket: BUCKET,
        path,
        gain: 0.12,
        loop: true,
        fadeInSeconds: 1,
        fadeOutSeconds: 2,
      },
      providerPost: false,
      fingerprint,
    };
  }

  if (args.shouldContinue && !args.shouldContinue()) {
    throw new TextToVideoAudioPhaseError("lease_lost");
  }
  const claimed = await claimAudioAssetSubmission(
    args.supabase,
    row,
    args.owner,
  );
  if (!claimed) throw new TextToVideoAudioPhaseError("music_claim_busy");

  let audio: Buffer | null = null;
  try {
    const res = await elevenLabsMusicGeneration(
      { prompt: args.prompt, durationSeconds: args.durationSeconds },
      args.fetchImpl,
    );
    audio = res.audio;
    await markAudioAssetResponseReceived(args.supabase, {
      rowId: row.id,
      owner: args.owner,
    });
  } catch (err) {
    if (
      err instanceof ElevenLabsAdapterError &&
      elevenLabsErrorImpliesSubmissionUnknown(err)
    ) {
      await markAudioAssetSubmissionUnknownOwned(args.supabase, {
        rowId: row.id,
        owner: args.owner,
        code: err.code,
      });
      throw new TextToVideoAudioPhaseError("music_submission_unknown");
    }
    if (
      err instanceof ElevenLabsAdapterError &&
      elevenLabsErrorIsProviderRejected(err)
    ) {
      await markAudioAssetProviderRejectedOwned(args.supabase, {
        rowId: row.id,
        owner: args.owner,
        code: err.code,
      });
      throw new TextToVideoAudioPhaseError("music_provider_rejected");
    }
    await markAudioAssetFailedPreSubmission(args.supabase, {
      rowId: row.id,
      code: err instanceof ElevenLabsAdapterError ? err.code : "music_failed",
    });
    throw new TextToVideoAudioPhaseError("music_generation_failed");
  }

  try {
    await verifyAudioAssetBuffer({
      audio: audio!,
      assetKind: "music",
      expectedDurationSeconds: args.durationSeconds,
      loopExpected: true,
    });
    await uploadAudioAssetWithRetries(args.supabase, path, audio!);
    await markAudioAssetCompleted(args.supabase, {
      rowId: row.id,
      owner: args.owner,
      bucket: BUCKET,
      path,
      durationSeconds: args.durationSeconds,
    });
    return {
      bed: {
        bucket: BUCKET,
        path,
        gain: 0.12,
        loop: true,
        fadeInSeconds: 1,
        fadeOutSeconds: 2,
      },
      providerPost: true,
      fingerprint,
    };
  } catch (err) {
    await markAudioAssetArtifactRecoveryRequired(args.supabase, {
      rowId: row.id,
      owner: args.owner,
      code: err instanceof Error ? err.message : "music_artifact_failed",
    });
    throw new TextToVideoAudioPhaseError("music_artifact_recovery_required");
  }
}

export async function verifyExistingMusicAssetRef(
  supabase: SupabaseClient,
  music: TextToVideoMusicPlan,
  minDurationSeconds: number,
): Promise<ManifestAudioBed> {
  if (!music.existing_asset_bucket?.trim() || !music.existing_asset_path?.trim()) {
    throw new TextToVideoAudioPhaseError("music_existing_asset_missing");
  }
  assertAllowedAudioAssetBucket(music.existing_asset_bucket.trim());
  const audio = await downloadAudioAssetArtifact(
    supabase,
    music.existing_asset_bucket.trim(),
    music.existing_asset_path.trim(),
    maxBytesForAudioAssetKind("music"),
  );
  await verifyAudioAssetBuffer({
    audio,
    assetKind: "music",
    expectedDurationSeconds: minDurationSeconds,
    loopExpected: true,
  });
  return {
    bucket: music.existing_asset_bucket.trim(),
    path: music.existing_asset_path.trim(),
    gain: 0.12,
    loop: true,
    fadeInSeconds: 1,
    fadeOutSeconds: 2,
  };
}

export async function runTextToVideoAudioPhase(args: {
  supabase: SupabaseClient;
  projectId: string;
  packageId: string;
  videoJobId: string;
  confirmPaidRun: boolean;
  packageBudgetUsd: number;
  voiceSynthesisTextLength: number;
  executionPlan: TextToVideoRunwayExecutionPlan;
  existingBySceneId: Map<string, SceneVideoAttemptView | null>;
  sfxPlacements: ResolvedSfxPlacement[];
  music: TextToVideoMusicPlan;
  shouldContinue?: () => boolean;
  fetchImpl?: typeof fetch;
  claimOwner?: string;
}): Promise<TextToVideoAudioPhaseResult> {
  const packageBudgetUsd = assertAssemblyPhasePackageBudget(
    args.packageBudgetUsd,
  );
  const owner = args.claimOwner ?? randomUUID();
  const tempDirs: string[] = [];
  const resolvedMusic = resolveTextToVideoMusicForProduction({
    music: args.music,
    confirmPaidRun: args.confirmPaidRun,
  });

  const existingAudioAssets = await listAudioAssetsForPackageJob(args.supabase, {
    projectId: args.projectId,
    packageId: args.packageId,
    videoJobId: args.videoJobId,
  });

  const budget = evaluateTextToVideoFullBudget({
    plan: args.executionPlan,
    packageBudgetUsd,
    voiceSynthesisTextLength: args.voiceSynthesisTextLength,
    existingBySceneId: args.existingBySceneId,
    sfxPlacements: args.sfxPlacements,
    music: resolvedMusic,
    confirmPaidRun: args.confirmPaidRun,
    existingAudioAssets: existingAudioAssets.map((r) => ({
      status: r.status,
      estimated_cost_usd: r.estimated_cost_usd as number | null | undefined,
    })),
  });
  if (
    budget.blocked &&
    (args.sfxPlacements.length > 0 || resolvedMusic.mode === "eleven_generated")
  ) {
    throw new TextToVideoAudioPhaseError("budget_insufficient");
  }

  let sfxPostCount = 0;
  let musicPostCount = 0;
  const sfxEvents: AudioMixSfxEvent[] = [];
  const audioAssetFingerprints: string[] = [];

  try {
    if (args.sfxPlacements.length > 0) {
      if (!isElevenLabsSoundEffectsEnabled()) {
        throw new TextToVideoAudioPhaseError("sfx_disabled");
      }
      for (const placement of args.sfxPlacements) {
        if (args.shouldContinue && !args.shouldContinue()) {
          throw new TextToVideoAudioPhaseError("lease_lost");
        }
        const { localPath, providerPost, fingerprint } = await ensureSfxAsset({
          supabase: args.supabase,
          projectId: args.projectId,
          packageId: args.packageId,
          videoJobId: args.videoJobId,
          owner,
          placement,
          fetchImpl: args.fetchImpl,
          shouldContinue: args.shouldContinue,
          tempDirs,
        });
        if (providerPost) sfxPostCount += 1;
        audioAssetFingerprints.push(fingerprint);
        sfxEvents.push({
          path: localPath,
          startSeconds: placement.absolute_start_seconds,
          gain: placement.gain,
        });
      }
    }

    let music: ManifestAudioBed = null;
    if (resolvedMusic.mode === "none") {
      music = null;
    } else if (resolvedMusic.mode === "existing_asset") {
      const videoDur = args.executionPlan.items.reduce(
        (s, i) => s + i.requiredTrimSeconds,
        0,
      );
      music = await verifyExistingMusicAssetRef(
        args.supabase,
        resolvedMusic,
        videoDur,
      );
    } else if (resolvedMusic.mode === "eleven_generated") {
      if (
        !elevenLabsMusicAllowedForProduction({
          confirmPaidRun: args.confirmPaidRun,
        })
      ) {
        throw new TextToVideoAudioPhaseError("music_eleven_not_licensed");
      }
      const duration = args.executionPlan.items.reduce(
        (s, i) => s + i.requiredTrimSeconds,
        0,
      );
      const prompt =
        resolvedMusic.mood?.trim() ||
        "Subtle instrumental background for short social video, no vocals";
      const ensured = await ensureMusicAsset({
        supabase: args.supabase,
        projectId: args.projectId,
        packageId: args.packageId,
        videoJobId: args.videoJobId,
        owner,
        prompt,
        durationSeconds: duration,
        fetchImpl: args.fetchImpl,
        shouldContinue: args.shouldContinue,
      });
      music = ensured.bed;
      audioAssetFingerprints.push(ensured.fingerprint);
      if (ensured.providerPost) musicPostCount = 1;
    }

    return {
      music,
      sfxEvents,
      sfxPostCount,
      musicPostCount,
      audioAssetFingerprints,
      tempDirs,
    };
  } catch (e) {
    await cleanupTextToVideoAudioTempDirs(tempDirs);
    throw e;
  }
}

export async function cleanupTextToVideoAudioTempDirs(
  tempDirs: string[],
): Promise<void> {
  await Promise.all(
    tempDirs.map((d) => rm(d, { recursive: true, force: true }).catch(() => undefined)),
  );
}
