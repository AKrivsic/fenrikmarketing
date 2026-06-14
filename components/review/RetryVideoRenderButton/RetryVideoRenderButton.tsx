"use client";

import { useState, useTransition } from "react";
import { retryVideoRender } from "@/lib/review/actions";
import styles from "./RetryVideoRenderButton.module.css";

interface RetryVideoRenderButtonProps {
  projectId: string;
  // The failed video_jobs.id to retry. Null disables the action.
  videoJobId: string | null;
}

// Rendered only for a FAILED package video. Triggers retryVideoRender, which
// re-renders the SAME language from the existing scenes/render input (no text,
// content or image regeneration). After a successful dispatch the package re-
// reads with the new (rendering → completed) job, so the failed state clears.
export function RetryVideoRenderButton({
  projectId,
  videoJobId,
}: RetryVideoRenderButtonProps) {
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    setError(null);
    setNotice(null);
    startTransition(async () => {
      const result = await retryVideoRender(videoJobId, projectId);
      if (result.ok) {
        setNotice("Render videa byl znovu spuštěn.");
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <div className={styles.container}>
      <button
        type="button"
        className={styles.retry}
        disabled={isPending || !videoJobId}
        onClick={handleClick}
      >
        {isPending ? "Spouštím…" : "Retry video render"}
      </button>
      {error ? <p className={styles.error}>{error}</p> : null}
      {notice ? <p className={styles.notice}>{notice}</p> : null}
    </div>
  );
}
