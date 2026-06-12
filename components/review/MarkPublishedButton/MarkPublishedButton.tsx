"use client";

import { useState, useTransition } from "react";
import { markContentItemPublished } from "@/lib/review/actions";
import styles from "./MarkPublishedButton.module.css";

interface MarkPublishedButtonProps {
  itemId: string;
  projectId: string;
}

// Manual "Mark published" control for a SINGLE approved item. Used after the
// user copies the publish-ready text/video into Metricool by hand. Calls the
// shared markContentItemPublished Server Action (approved → published only).
// Rendered only for approved items by the caller, so it carries no status logic.
export function MarkPublishedButton({
  itemId,
  projectId,
}: MarkPublishedButtonProps) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    setError(null);
    startTransition(async () => {
      const result = await markContentItemPublished(itemId, projectId);
      if (!result.ok) setError(result.error);
    });
  }

  return (
    <div className={styles.container}>
      <button
        type="button"
        className={styles.publish}
        disabled={isPending || !itemId}
        onClick={handleClick}
      >
        Mark published
      </button>
      {error ? <p className={styles.error}>{error}</p> : null}
    </div>
  );
}
