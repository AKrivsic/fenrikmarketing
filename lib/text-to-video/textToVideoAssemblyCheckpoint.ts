import type { SupabaseClient } from "@supabase/supabase-js";
import type { Json } from "@/lib/supabase/types";
import type { AiVideoStagingRefs } from "@/lib/video-worker/aiVideoStaging";
import {
  TEXT_TO_VIDEO_ASSEMBLY_CONTRACT_VERSION,
  TEXT_TO_VIDEO_ASSEMBLY_DELIVERY_HEIGHT,
  TEXT_TO_VIDEO_ASSEMBLY_DELIVERY_WIDTH,
} from "@/lib/text-to-video/textToVideoAssemblyConstants";
import { VIDEO_TEXT_TO_VIDEO_ASSEMBLY_CHECKPOINT_KEY } from "@/lib/text-to-video/runTextToVideoAssemblyPhase";

export interface DurableTextToVideoAssemblyCheckpoint {
  phase: "assembly_complete";
  assembly_contract_version?: number;
  delivery_width?: number;
  delivery_height?: number;
  assembly_fingerprint: string;
  execution_fingerprint: string;
  sound_plan_revision: number;
  trimmed_clips_fingerprint: string;
  voice_fingerprint: string;
  subtitle_fingerprint: string;
  staging: {
    mp4: { bucket: string; path: string };
    thumbnail: { bucket: string; path: string };
    subtitles?: { bucket: string; path: string };
  };
  estimate: true;
}

export async function persistTextToVideoAssemblyCheckpoint(args: {
  supabase: SupabaseClient;
  projectId: string;
  packageId: string;
  brief: Record<string, unknown>;
  checkpoint: DurableTextToVideoAssemblyCheckpoint;
}): Promise<Record<string, unknown>> {
  const brief = {
    ...args.brief,
    [VIDEO_TEXT_TO_VIDEO_ASSEMBLY_CHECKPOINT_KEY]: args.checkpoint,
  };
  const { data, error } = await args.supabase
    .from("content_packages")
    .update({ package_brief: brief as unknown as Json })
    .eq("id", args.packageId)
    .eq("project_id", args.projectId)
    .select("id")
    .maybeSingle();
  if (error) throw error;
  if (!data?.id) throw new Error("assembly_checkpoint_persist_failed");
  return brief;
}

export function stagingRefsToCheckpointStaging(
  refs: AiVideoStagingRefs,
): DurableTextToVideoAssemblyCheckpoint["staging"] {
  return {
    mp4: { bucket: refs.mp4.bucket, path: refs.mp4.path },
    thumbnail: { bucket: refs.thumbnail.bucket, path: refs.thumbnail.path },
    ...(refs.subtitles
      ? {
          subtitles: {
            bucket: refs.subtitles.bucket,
            path: refs.subtitles.path,
          },
        }
      : {}),
  };
}

export function readDurableTextToVideoAssemblyCheckpoint(
  brief: Record<string, unknown>,
): DurableTextToVideoAssemblyCheckpoint | null {
  const raw = brief[VIDEO_TEXT_TO_VIDEO_ASSEMBLY_CHECKPOINT_KEY];
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const cp = raw as DurableTextToVideoAssemblyCheckpoint;
  if (cp.phase !== "assembly_complete") return null;
  if (!cp.staging?.mp4?.bucket || !cp.staging?.mp4?.path) return null;
  if (!cp.staging?.thumbnail?.bucket || !cp.staging?.thumbnail?.path) return null;
  if (JSON.stringify(cp).includes("/tmp/")) return null;
  const deliveryW = cp.delivery_width;
  const deliveryH = cp.delivery_height;
  if (
    deliveryW !== TEXT_TO_VIDEO_ASSEMBLY_DELIVERY_WIDTH ||
    deliveryH !== TEXT_TO_VIDEO_ASSEMBLY_DELIVERY_HEIGHT
  ) {
    return null;
  }
  const contractV = cp.assembly_contract_version;
  if (
    contractV !== undefined &&
    contractV !== TEXT_TO_VIDEO_ASSEMBLY_CONTRACT_VERSION
  ) {
    return null;
  }
  return cp;
}

export async function verifyDurableAssemblyStagingObjects(
  supabase: SupabaseClient,
  staging: DurableTextToVideoAssemblyCheckpoint["staging"],
): Promise<boolean> {
  const probe = async (bucket: string, path: string): Promise<boolean> => {
    const { data, error } = await supabase.storage.from(bucket).download(path);
    return !error && Boolean(data);
  };
  if (!(await probe(staging.mp4.bucket, staging.mp4.path))) return false;
  if (!(await probe(staging.thumbnail.bucket, staging.thumbnail.path))) {
    return false;
  }
  if (staging.subtitles) {
    if (!(await probe(staging.subtitles.bucket, staging.subtitles.path))) {
      return false;
    }
  }
  return true;
}

export function checkpointStagingToAiVideoStagingRefs(
  staging: DurableTextToVideoAssemblyCheckpoint["staging"],
): AiVideoStagingRefs {
  return {
    mp4: { bucket: staging.mp4.bucket, path: staging.mp4.path },
    thumbnail: { bucket: staging.thumbnail.bucket, path: staging.thumbnail.path },
    ...(staging.subtitles
      ? {
          subtitles: {
            bucket: staging.subtitles.bucket,
            path: staging.subtitles.path,
          },
        }
      : {}),
  };
}
