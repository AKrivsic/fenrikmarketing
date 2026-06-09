import styles from "./VideoDownloads.module.css";

interface VideoDownloadsProps {
  projectId: string;
  jobId: string | null;
  hasMp4: boolean;
  hasSubtitle: boolean;
  hasThumbnail: boolean;
}

type ArtifactType = "mp4" | "srt" | "thumbnail";

// Builds a link to the server-side download route, which streams the artifact
// with a Content-Disposition: attachment header. The signed storage URL itself
// is never exposed to the client.
function downloadHref(
  projectId: string,
  jobId: string,
  type: ArtifactType,
): string {
  return `/api/projects/${projectId}/video-download?jobId=${jobId}&type=${type}`;
}

export function VideoDownloads({
  projectId,
  jobId,
  hasMp4,
  hasSubtitle,
  hasThumbnail,
}: VideoDownloadsProps) {
  if (!jobId || (!hasMp4 && !hasSubtitle && !hasThumbnail)) {
    return null;
  }

  return (
    <div className={styles.downloads}>
      {hasMp4 ? (
        <a className={styles.button} href={downloadHref(projectId, jobId, "mp4")}>
          Download MP4
        </a>
      ) : null}
      {hasSubtitle ? (
        <a className={styles.button} href={downloadHref(projectId, jobId, "srt")}>
          Download SRT
        </a>
      ) : null}
      {hasThumbnail ? (
        <a
          className={styles.button}
          href={downloadHref(projectId, jobId, "thumbnail")}
        >
          Download Thumbnail
        </a>
      ) : null}
    </div>
  );
}
