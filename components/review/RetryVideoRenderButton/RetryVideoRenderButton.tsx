"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { retryVideoRender } from "@/lib/review/actions";
import { isOperatorCancelMessage } from "@/lib/api/production-run-cancel";
import styles from "./RetryVideoRenderButton.module.css";

interface RetryVideoRenderButtonProps {
  projectId: string;
  // The failed video_jobs.id to retry. Null disables the action.
  videoJobId: string | null;
  /** When set to the operator Stop message, the retry control is hidden. */
  errorMessage?: string | null;
}

// Rendered only for a FAILED package video. Triggers retryVideoRender, which
// re-renders the SAME language from the existing scenes/render input (no text,
// content or image regeneration). After a successful dispatch the package re-
// reads with the new (rendering → completed) job, so the failed state clears.
// Operator-cancelled jobs are never offered a retry (server also rejects).
export function RetryVideoRenderButton({
  projectId,
  videoJobId,
  errorMessage = null,
}: RetryVideoRenderButtonProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (isOperatorCancelMessage(errorMessage)) {
    return null;
  }

  function handleClick() {
    setError(null);
    setNotice(null);
    startTransition(async () => {
      const result = await retryVideoRender(videoJobId, projectId);
      if (result.ok) {
        setNotice("Render videa byl znovu spuštěn.");
        router.refresh();
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
