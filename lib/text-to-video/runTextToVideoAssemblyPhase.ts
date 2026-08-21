import type { SupabaseClient } from "@supabase/supabase-js";
import { readTextToVideoCreativePlan } from "@/lib/content-package/textToVideoCreativePlan";
import {
  parseTextToVideoSoundPlan,
  type TextToVideoMusicPlan,
} from "@/lib/content-package/textToVideoSoundPlan";
import { validateElevenLabsAlignment } from "@/lib/elevenlabs/adapter";
import { resolveTextToVideoMusicForProduction, TextToVideoMusicResolveError } from "@/lib/content-package/textToVideoMusicResolve";
import { assertAssemblyPhasePackageBudget } from "@/lib/text-to-video/textToVideoPackageBudget";
import { uploadOrReuseTrimmedSceneClip } from "@/lib/text-to-video/textToVideoTrimClipStorage";
import {
  cleanupTextToVideoAudioTempDirs,
} from "@/lib/text-to-video/runTextToVideoAudioPhase";
import {
  computeTextToVideoAssemblyFingerprint,
  subtitleContentFingerprint,
  transitionPlanFingerprint,
} from "@/lib/text-to-video/textToVideoAssemblyFingerprint";
import {
  validateTextToVideoFinalMp4,
  validateTextToVideoSrtContent,
  validateTextToVideoThumbnail,
} from "@/lib/text-to-video/textToVideoFinalArtifactValidation";
import { isElevenLabsSoundEffectsEnabled } from "@/lib/elevenlabs/audioProductionConfig";
import { assembleVideoReel } from "@/lib/video-reel-assembly/assembleVideoReel";
import { buildClipReadyManifest } from "@/lib/video-reel-assembly/buildClipReadyManifest";
import {
  VIDEO_SCENE_CLIPS_CHECKPOINT_KEY,
  type TextToVideoSceneClipsCheckpoint,
} from "@/lib/text-to-video/sceneClipsCheckpoint";
import { validateSceneClipsCheckpointStructure } from "@/lib/text-to-video/sceneClipsCheckpointValidation";
import { buildTextToVideoRunwayExecutionPlan } from "@/lib/text-to-video/runwayExecutionPlan";
import {
  VIDEO_VOICE_SYNTHESIS_CHECKPOINT_KEY,
  type VoiceSynthesisCheckpoint,
} from "@/lib/text-to-video/voiceSynthesisCheckpoint";
import { downloadSceneVideoAttemptClip } from "@/lib/text-to-video/sceneAttemptClipOps";
import { trimTextToVideoSceneClip } from "@/lib/text-to-video/trimTextToVideoSceneClip";
import { resolveSfxPlacements } from "@/lib/text-to-video/textToVideoSfxAnchoring";
import { runTextToVideoAudioPhase } from "@/lib/text-to-video/runTextToVideoAudioPhase";
import { listSceneVideoAttemptsForScene } from "@/lib/scene-video-attempts";
import { loadTextToVideoAttemptByScene } from "@/lib/text-to-video/textToVideoAttemptSelection";
import {
  buildTextToVideoClipAssignments,
  buildTextToVideoRenderSpecOutput,
} from "@/lib/text-to-video/textToVideoReelBridge";
import { createHash } from "node:crypto";
import { mkdtemp, writeFile, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { DurableAssetDownloader } from "@/video-worker/services/reel/durableDownload";
import { createWorkerDurableAssetDownloader } from "@/video-worker/createWorkerDurableDownloader";
import type { DurableTextToVideoAssemblyCheckpoint } from "@/lib/text-to-video/textToVideoAssemblyCheckpoint";

export const VIDEO_TEXT_TO_VIDEO_ASSEMBLY_CHECKPOINT_KEY =
  "video_text_to_video_assembly_checkpoint" as const;

export type TextToVideoAssemblyCheckpoint = DurableTextToVideoAssemblyCheckpoint;

export interface TextToVideoAssemblyPhaseResult {
  brief: Record<string, unknown>;
  assemblyFingerprint: string;
  executionFingerprint: string;
  soundPlanRevision: number;
  voiceFingerprint: string;
  trimmedClipsFingerprint: string;
  subtitleFingerprint: string;
  mp4Path: string;
  thumbnailPath: string;
  srtPath?: string;
  cleanupAll: () => Promise<void>;
  renderSpec: import("@/lib/video-engine/schemas/renderSchema").RenderSpecOutput;
  audioTempDirs: string[];
}

export class TextToVideoAssemblyError extends Error {
  readonly code: string;
  constructor(code: string) {
    super(code);
    this.code = code;
  }
}

function sha256Buffer(content: Buffer): string {
  return createHash("sha256").update(content).digest("hex");
}

export async function validateTextToVideoAssemblyOutputs(args: {
  mp4Path: string;
  thumbnailPath: string;
  srtPath?: string;
  approvedVoiceover: string;
  expectedDurationSeconds: number;
}): Promise<void> {
  await validateTextToVideoFinalMp4({
    mp4Path: args.mp4Path,
    expectedDurationSeconds: args.expectedDurationSeconds,
  });
  await validateTextToVideoThumbnail({ thumbnailPath: args.thumbnailPath });
  if (args.srtPath) {
    const srt = await readFile(args.srtPath, "utf8");
    validateTextToVideoSrtContent({ srt, approvedVoiceover: args.approvedVoiceover });
  }
}

export async function runTextToVideoAssemblyPhase(args: {
  projectId: string;
  packageId: string;
  videoJobId: string;
  brief: Record<string, unknown>;
  confirmPaidRun: boolean;
  subtitlesBurnIn: boolean;
  packageBudgetUsd: number;
  voiceSynthesisTextLength: number;
  supabase: SupabaseClient;
  shouldContinue?: () => boolean;
  downloader?: DurableAssetDownloader;
  fetchImpl?: typeof fetch;
}): Promise<TextToVideoAssemblyPhaseResult> {
  if (args.shouldContinue && !args.shouldContinue()) {
    throw new TextToVideoAssemblyError("lease_lost");
  }
  const voiceRaw = args.brief[VIDEO_VOICE_SYNTHESIS_CHECKPOINT_KEY];
  if (!voiceRaw || typeof voiceRaw !== "object") {
    throw new TextToVideoAssemblyError("voice_checkpoint_missing");
  }
  const voice = voiceRaw as VoiceSynthesisCheckpoint;
  const clipsRaw = args.brief[VIDEO_SCENE_CLIPS_CHECKPOINT_KEY];
  if (!clipsRaw || typeof clipsRaw !== "object") {
    throw new TextToVideoAssemblyError("scene_clips_checkpoint_missing");
  }
  const clipsCheckpoint = clipsRaw as TextToVideoSceneClipsCheckpoint;
  const plan = readTextToVideoCreativePlan(args.brief);
  if (!plan) throw new TextToVideoAssemblyError("creative_plan_missing");
  const vo =
    typeof args.brief.voiceover_text === "string"
      ? args.brief.voiceover_text.trim()
      : "";
  const alignRow = await args.supabase
    .from("text_to_video_voice_syntheses")
    .select("alignment")
    .eq("id", voice.synthesis_attempt_id)
    .maybeSingle();
  const alignment = validateElevenLabsAlignment(alignRow.data?.alignment);
  const executionPlan = buildTextToVideoRunwayExecutionPlan({
    plan,
    voiceCheckpoint: voice,
    alignment,
    approvedVoiceover: vo,
  });
  if (
    !validateSceneClipsCheckpointStructure(
      clipsCheckpoint,
      {
        executionFingerprint: executionPlan.executionFingerprint,
        voiceCheckpointFingerprint: voice.synthesis_fingerprint,
        creativePlanFingerprint: plan.plan_fingerprint,
        synthesisFingerprint: voice.synthesis_fingerprint,
      },
      executionPlan,
    )
  ) {
    throw new TextToVideoAssemblyError("scene_clips_checkpoint_invalid");
  }

  const soundPlan =
    parseTextToVideoSoundPlan(args.brief.video_text_to_video_sound_plan) ??
    parseTextToVideoSoundPlan({
      schema_version: 1,
      revision: 0,
      music: { mode: "none" },
      scene_sound: {},
    })!;

  try {
    resolveTextToVideoMusicForProduction({
      music: soundPlan.music,
      confirmPaidRun: args.confirmPaidRun,
    });
  } catch (e: unknown) {
    if (e instanceof TextToVideoMusicResolveError) {
      throw new TextToVideoAssemblyError("music_auto_unavailable");
    }
    throw e;
  }

  const packageBudgetUsd = assertAssemblyPhasePackageBudget(args.packageBudgetUsd);
  const voiceSynthesisTextLength = args.voiceSynthesisTextLength;

  const sfxPlacements = resolveSfxPlacements({
    scenes: executionPlan.items,
    sceneSound: soundPlan.scene_sound,
    alignment,
    approvedVoiceover: vo,
    videoDurationSeconds: voice.audio_duration_seconds,
  });
  if (sfxPlacements.length > 0 && !isElevenLabsSoundEffectsEnabled()) {
    throw new TextToVideoAssemblyError("sfx_disabled");
  }

  const existingBySceneId = new Map<
    string,
    import("@/lib/scene-video-attempts").SceneVideoAttemptView | null
  >();
  for (const item of executionPlan.items) {
    const list = await listSceneVideoAttemptsForScene(
      { videoJobId: args.videoJobId, sceneId: item.sceneId },
      { supabase: args.supabase },
    );
    existingBySceneId.set(item.sceneId, loadTextToVideoAttemptByScene(list, item));
  }

  const audio = await runTextToVideoAudioPhase({
    supabase: args.supabase,
    projectId: args.projectId,
    packageId: args.packageId,
    videoJobId: args.videoJobId,
    confirmPaidRun: args.confirmPaidRun,
    packageBudgetUsd,
    voiceSynthesisTextLength,
    executionPlan,
    existingBySceneId,
    sfxPlacements,
    music: soundPlan.music,
    shouldContinue: args.shouldContinue,
    fetchImpl: args.fetchImpl,
  });

  const trimHashes: string[] = [];
  const clipRefs: Array<{
    sceneId: string;
    bucket: string;
    path: string;
    attemptId: string;
    duration: number;
  }> = [];

  for (const ref of clipsCheckpoint.scenes) {
    if (args.shouldContinue && !args.shouldContinue()) {
      throw new TextToVideoAssemblyError("lease_lost");
    }
    const item = executionPlan.items.find((i) => i.sceneId === ref.scene_id)!;
    const raw = await downloadSceneVideoAttemptClip(
      args.supabase,
      ref.output_bucket,
      ref.output_path,
    );
    const trimmed = await trimTextToVideoSceneClip({
      inputBuffer: raw,
      requiredTrimSeconds: ref.required_trim_seconds,
    });
    const stored = await uploadOrReuseTrimmedSceneClip({
      supabase: args.supabase,
      projectId: args.projectId,
      videoJobId: args.videoJobId,
      sceneId: ref.scene_id,
      executionFingerprint: executionPlan.executionFingerprint,
      requestFingerprint: ref.request_fingerprint,
      requiredTrimSeconds: ref.required_trim_seconds,
      providerDurationSeconds: ref.provider_duration_seconds,
      trimmedBuffer: trimmed,
    });
    trimHashes.push(stored.sha256);
    clipRefs.push({
      sceneId: ref.scene_id,
      bucket: stored.bucket,
      path: stored.path,
      attemptId: ref.attempt_id,
      duration: ref.required_trim_seconds,
    });
    void item;
  }

  const trimmedFingerprint = createHash("sha256")
    .update(trimHashes.join("|"), "utf8")
    .digest("hex")
    .slice(0, 24);

  const workDir = await mkdtemp(join(tmpdir(), "fenrik-t2v-asm-"));
  const audioLocal = join(workDir, "voice.mp3");
  const { data: audioBlob, error: audioErr } = await args.supabase.storage
    .from(voice.audio_bucket)
    .download(voice.audio_path);
  if (audioErr || !audioBlob) throw new TextToVideoAssemblyError("voice_audio_missing");
  const audioBuf = Buffer.from(await audioBlob.arrayBuffer());
  await writeFile(audioLocal, audioBuf);
  const voiceSha = sha256Buffer(audioBuf);

  const srt =
    typeof args.brief.subtitles === "string" ? args.brief.subtitles : undefined;
  const srtPath = srt ? join(workDir, "subs.srt") : undefined;
  if (srtPath && srt) await writeFile(srtPath, srt);

  const renderSpec = buildTextToVideoRenderSpecOutput({
    executionPlan,
    voiceoverDurationSeconds: voice.audio_duration_seconds,
    clipRefs,
  });
  const assignments = buildTextToVideoClipAssignments(clipRefs);
  const manifest = buildClipReadyManifest({
    renderSpec,
    assignments,
    voiceoverText: vo,
    voiceoverSha256: voiceSha,
    subtitlesBurnInRequested: args.subtitlesBurnIn,
    music: audio.music,
    ambient: null,
  });

  const downloader = args.downloader ?? createWorkerDurableAssetDownloader();
  const reel = await assembleVideoReel({
    manifest,
    voiceoverLocalPath: audioLocal,
    subtitlesLocalPath: args.subtitlesBurnIn ? srtPath : undefined,
    downloader,
    voiceoverDurationSeconds: voice.audio_duration_seconds,
    tempRoot: workDir,
    sfx: audio.sfxEvents,
  });

  if (reel.status !== "ok") {
    throw new TextToVideoAssemblyError(reel.reason);
  }

  await validateTextToVideoAssemblyOutputs({
    mp4Path: reel.mp4Path,
    thumbnailPath: reel.thumbnailPath,
    srtPath: args.subtitlesBurnIn ? srtPath : undefined,
    approvedVoiceover: vo,
    expectedDurationSeconds: voice.audio_duration_seconds,
  });

  const subtitleFingerprint = subtitleContentFingerprint(srt);
  const transitionKey = transitionPlanFingerprint(
    executionPlan.items.map((i) => i.sceneId),
    executionPlan.items.map((_, idx) => (idx === 0 ? "none" : "fade")),
  );
  const assemblyFingerprint = computeTextToVideoAssemblyFingerprint({
    executionFingerprint: executionPlan.executionFingerprint,
    voiceSynthesisFingerprint: voice.synthesis_fingerprint,
    measuredAudioDurationSeconds: voice.audio_duration_seconds,
    trimmedClipSha256Ordered: trimHashes,
    soundPlan,
    audioAssetFingerprints: audio.audioAssetFingerprints,
    sfxPlacements,
    musicRef: audio.music
      ? { bucket: audio.music.bucket, path: audio.music.path }
      : null,
    subtitleFingerprint,
    transitionPlanKey: transitionKey,
  });

  return {
    brief: args.brief,
    assemblyFingerprint,
    executionFingerprint: executionPlan.executionFingerprint,
    soundPlanRevision: soundPlan.revision,
    voiceFingerprint: voice.synthesis_fingerprint,
    trimmedClipsFingerprint: trimmedFingerprint,
    subtitleFingerprint,
    mp4Path: reel.mp4Path,
    thumbnailPath: reel.thumbnailPath,
    srtPath,
    cleanupAll: async () => {
      await reel.cleanupAll();
      await cleanupTextToVideoAudioTempDirs(audio.tempDirs);
    },
    renderSpec,
    audioTempDirs: audio.tempDirs,
  };
}
