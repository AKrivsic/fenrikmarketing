import styles from "./VideoPreview.module.css";

interface VideoPreviewProps {
  videoUrl: string | null;
  thumbnailUrl: string | null;
}

export function VideoPreview({ videoUrl, thumbnailUrl }: VideoPreviewProps) {
  if (!videoUrl) {
    return (
      <div className={styles.fallback}>
        <p className={styles.fallbackText}>Video preview is not available yet.</p>
      </div>
    );
  }

  return (
    <div className={styles.wrapper}>
      <video
        className={styles.video}
        src={videoUrl}
        poster={thumbnailUrl ?? undefined}
        controls
        preload="metadata"
      />
    </div>
  );
}
