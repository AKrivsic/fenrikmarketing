"use client";

import { useSyncExternalStore } from "react";
import styles from "./VideoPreview.module.css";

interface VideoPreviewProps {
  videoUrl: string | null;
  thumbnailUrl: string | null;
}

function useIsClient(): boolean {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
}

// <video> is adjusted by the browser during hydration (extra attrs / subtree),
// which triggers React #418 when SSR'd inside ReviewPackageSection's video panel.
export function VideoPreview({ videoUrl, thumbnailUrl }: VideoPreviewProps) {
  const isClient = useIsClient();

  if (!videoUrl) {
    return (
      <div className={styles.fallback}>
        <p className={styles.fallbackText}>Video preview is not available yet.</p>
      </div>
    );
  }

  if (!isClient) {
    return (
      <div className={styles.wrapper}>
        <div className={styles.fallback}>
          <p className={styles.fallbackText}>Loading video preview…</p>
        </div>
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
