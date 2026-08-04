"use client";

import { useState } from "react";
import type { IndustryExamplePackage } from "@/lib/industry-examples/types";
import styles from "./IndustryPackageBrowser.module.css";

interface ExampleVideoProps {
  pkg: IndustryExamplePackage;
}

export function ExampleVideo({ pkg }: ExampleVideoProps) {
  const [failed, setFailed] = useState(false);
  const showVideo = Boolean(pkg.videoUrl) && !failed;

  if (!showVideo) {
    return (
      <div className={styles.videoPlaceholder}>
        <p className={styles.placeholderText}>
          Final edited video for this example will appear here once the render
          is linked.
        </p>
      </div>
    );
  }

  return (
    <video
      key={pkg.id}
      className={styles.video}
      src={pkg.videoUrl!}
      poster={pkg.videoPosterUrl ?? undefined}
      controls
      playsInline
      preload="metadata"
      onError={() => setFailed(true)}
    />
  );
}
