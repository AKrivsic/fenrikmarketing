import type { JobStatus } from "@/lib/supabase/types";
import type { ProjectVideoEntry } from "@/lib/api/project-content-admin";

export interface ProjectVideoVersionEntry {
  jobId: string;
  status: JobStatus;
  createdAt: string;
  completedAt: string | null;
  videoUrl: string | null;
  thumbnailUrl: string | null;
  subtitleUrl: string | null;
  hasMp4: boolean;
  hasSubtitle: boolean;
  hasThumbnail: boolean;
  isEditorRerender: boolean;
  /** Short label for the version picker. */
  versionLabel: string;
}

export interface ProjectVideoGroup {
  groupKey: string;
  contentItemId: string | null;
  itemTitle: string | null;
  platform: ProjectVideoEntry["platform"];
  format: ProjectVideoEntry["format"];
  provider: string;
  /** Job used for the main preview + downloads in the group header. */
  displayJobId: string;
  displayStatus: JobStatus;
  displayVideoUrl: string | null;
  displayThumbnailUrl: string | null;
  displayErrorMessage: string | null;
  /** Completed job that owns the scene editor (render_spec source). */
  editorSourceJobId: string | null;
  canEditScenes: boolean;
  activeRenderInFlight: boolean;
  versions: ProjectVideoVersionEntry[];
}

function isActiveStatus(status: JobStatus): boolean {
  return status === "queued" || status === "processing";
}

function formatVersionLabel(
  index: number,
  total: number,
  job: ProjectVideoEntry,
): string {
  const ordinal = total - index;
  const kind = job.isEditorRerender ? "editor" : "render";
  return `v${ordinal} · ${kind}`;
}

/** Groups flat video_jobs rows by content_item_id (standalone jobs stay solo). */
export function groupProjectVideoJobs(
  jobs: ProjectVideoEntry[],
  options: { editorSourceByItem?: Map<string, string> } = {},
): ProjectVideoGroup[] {
  const editorSourceByItem = options.editorSourceByItem ?? new Map();
  const byKey = new Map<string, ProjectVideoEntry[]>();
  for (const job of jobs) {
    const key = job.contentItemId ?? `detached:${job.id}`;
    const bucket = byKey.get(key) ?? [];
    bucket.push(job);
    byKey.set(key, bucket);
  }

  const groups: ProjectVideoGroup[] = [];

  for (const [groupKey, bucket] of byKey) {
    const sorted = [...bucket].sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
    const head = sorted[0]!;
    const active = sorted.find((j) => isActiveStatus(j.status));
    const display = active ?? sorted.find((j) => j.status === "completed") ?? head;
    const draftSourceId = head.contentItemId
      ? editorSourceByItem.get(head.contentItemId)
      : undefined;
    const editorSource =
      (draftSourceId
        ? sorted.find((j) => j.id === draftSourceId && j.canEditScenes)
        : undefined) ??
      sorted.find((j) => j.status === "completed" && j.canEditScenes) ??
      null;

    const versions: ProjectVideoVersionEntry[] = sorted.map((job, index) => ({
      jobId: job.id,
      status: job.status,
      createdAt: job.createdAt,
      completedAt: job.completedAt,
      videoUrl: job.videoUrl,
      thumbnailUrl: job.thumbnailUrl,
      subtitleUrl: job.subtitleUrl,
      hasMp4: job.hasMp4,
      hasSubtitle: job.hasSubtitle,
      hasThumbnail: job.hasThumbnail,
      isEditorRerender: job.isEditorRerender,
      versionLabel: formatVersionLabel(index, sorted.length, job),
    }));

    groups.push({
      groupKey,
      contentItemId: head.contentItemId,
      itemTitle: head.itemTitle,
      platform: head.platform,
      format: head.format,
      provider: head.provider,
      displayJobId: display.id,
      displayStatus: display.status,
      displayVideoUrl: display.videoUrl,
      displayThumbnailUrl: display.thumbnailUrl,
      displayErrorMessage: display.errorMessage,
      editorSourceJobId: editorSource?.id ?? null,
      canEditScenes: editorSource !== null,
      activeRenderInFlight: active !== undefined,
      versions,
    });
  }

  return groups.sort(
    (a, b) =>
      new Date(b.versions[0]?.createdAt ?? 0).getTime() -
      new Date(a.versions[0]?.createdAt ?? 0).getTime(),
  );
}
