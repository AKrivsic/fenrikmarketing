import type { SupabaseClient } from "@supabase/supabase-js";
import type { WorkerCallback } from "@/lib/video-engine/schemas/workerCallbackSchema";
import {
  persistVideoJobArtifacts,
  renewVideoJobLease,
} from "@/lib/production-runtime";
import { AI_VIDEO_INPUT_FINGERPRINT_VERSION } from "@/lib/video-worker/aiVideoCheckpointFingerprint";
import {
  buildAiVideoFinalDurableOutput,
  readAiVideoMeta,
} from "@/lib/video-worker/aiVideoJobOutput";
import type { AiVideoPersistedArtifacts } from "@/lib/video-worker/aiVideoStaging";
import {
  bestEffortCleanupStaging,
  promoteStagingToFinalArtifacts,
  type AiVideoArtifactStorageDeps,
} from "@/video-worker/aiVideoArtifactStorage";
import type { RunAiVideoClipJobPhaseResult } from "@/video-worker/aiVideoClipJobPhase";

export type FinalizeAiVideoClipJobResult =
  | { status: "completed"; artifactsPersisted: true; callbackSent: true }
  | {
      status: "completed";
      artifactsPersisted: true;
      callbackSent: false;
    }
  | { status: "already_completed"; artifactsPersisted: false; callbackSent: boolean }
  | { status: "lease_lost"; artifactsPersisted: false; callbackSent: false };

export async function finalizeAiVideoClipJob(args: {
  projectId: string;
  videoJobId: string;
  leaseOwner: string;
  leaseSupabase: SupabaseClient;
  subtitlesBurnInRequested: boolean;
  jobInputFingerprint: string;
  phase: RunAiVideoClipJobPhaseResult;
  sendCallback: (callback: WorkerCallback) => Promise<void>;
  persistArtifacts?: typeof persistVideoJobArtifacts;
  storage?: AiVideoArtifactStorageDeps;
  renewLease?: typeof renewVideoJobLease;
}): Promise<FinalizeAiVideoClipJobResult> {
  const persist = args.persistArtifacts ?? persistVideoJobArtifacts;
  const renew = args.renewLease ?? renewVideoJobLease;

  const assertLeaseHeld = async (): Promise<void> => {
    const ok = await renew(args.leaseSupabase, {
      jobId: args.videoJobId,
      projectId: args.projectId,
      ownerToken: args.leaseOwner,
    });
    if (!ok) {
      throw new FinalizeLeaseLostError("lease_renew_failed_before_promotion");
    }
  };

  if (args.phase.kind === "already_completed") {
    let callbackSent = false;
    try {
      await args.sendCallback(
        buildCompletedCallback(args.videoJobId, args.phase.artifacts),
      );
      callbackSent = true;
    } catch {
      callbackSent = false;
    }
    return {
      status: "already_completed",
      artifactsPersisted: false,
      callbackSent,
    };
  }

  if (args.phase.kind === "lease_lost") {
    return {
      status: "lease_lost",
      artifactsPersisted: false,
      callbackSent: false,
    };
  }

  try {
    await assertLeaseHeld();

    const promoted = await promoteStagingToFinalArtifacts({
      projectId: args.projectId,
      videoJobId: args.videoJobId,
      staging: args.phase.staging,
      subtitlesWanted: args.subtitlesBurnInRequested,
      storage: args.storage,
      assertLeaseHeld,
    });

    await assertLeaseHeld();

    const priorNested = args.phase.debug["ai_video"];
    const priorAi = readAiVideoMeta(
      priorNested && typeof priorNested === "object"
        ? { ai_video: priorNested }
        : {},
    );
    const output = buildAiVideoFinalDurableOutput({
      mp4_url: promoted.mp4Url,
      thumbnail_url: promoted.thumbnailUrl,
      subtitle_url: promoted.subtitleUrl,
      render_spec: args.phase.renderSpec,
      debug: args.phase.debug,
      aiMeta: {
        input_fingerprint: args.jobInputFingerprint,
        input_fingerprint_version: AI_VIDEO_INPUT_FINGERPRINT_VERSION,
        generation: priorAi?.generation,
        assembly: priorAi?.assembly,
        final_artifacts: {
          mp4: promoted.finalRefs.mp4,
          thumbnail: promoted.finalRefs.thumbnail,
          ...(promoted.finalRefs.subtitles
            ? { subtitles: promoted.finalRefs.subtitles }
            : {}),
        },
      },
    });

    const persisted = await persist(args.leaseSupabase, {
      jobId: args.videoJobId,
      projectId: args.projectId,
      ownerToken: args.leaseOwner,
      output,
    });

    if (!persisted) {
      return {
        status: "lease_lost",
        artifactsPersisted: false,
        callbackSent: false,
      };
    }

    const callbackPayload: WorkerCallback = {
      video_job_id: args.videoJobId,
      status: "completed",
      mp4_url: promoted.mp4Url,
      thumbnail_url: promoted.thumbnailUrl,
      ...(promoted.subtitleUrl ? { subtitle_url: promoted.subtitleUrl } : {}),
      render_spec: args.phase.renderSpec,
      debug: args.phase.debug,
    };

    let callbackSent = false;
    try {
      await args.sendCallback(callbackPayload);
      callbackSent = true;
    } catch {
      callbackSent = false;
    }

    await args.phase.cleanupLocal().catch(() => undefined);
    const cleanup = await bestEffortCleanupStaging({
      staging: args.phase.staging,
      storage: args.storage,
    });
    if (cleanup.cleaned || cleanup.error) {
      void cleanup;
    }

    return {
      status: "completed",
      artifactsPersisted: true,
      callbackSent,
    };
  } catch (err) {
    if (err instanceof FinalizeLeaseLostError) {
      return {
        status: "lease_lost",
        artifactsPersisted: false,
        callbackSent: false,
      };
    }
    throw err;
  }
}

class FinalizeLeaseLostError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FinalizeLeaseLostError";
  }
}

function buildCompletedCallback(
  videoJobId: string,
  artifacts: AiVideoPersistedArtifacts,
): WorkerCallback {
  return {
    video_job_id: videoJobId,
    status: "completed",
    mp4_url: artifacts.mp4Url,
    thumbnail_url: artifacts.thumbnailUrl,
    ...(artifacts.subtitleUrl ? { subtitle_url: artifacts.subtitleUrl } : {}),
    render_spec: artifacts.renderSpec,
    debug: artifacts.debug,
  };
}
