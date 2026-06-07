"use client";

import { useState, useTransition } from "react";
import {
  approveItem,
  regeneratePackage,
  rejectItem,
  type ActionResult,
} from "@/app/review-queue/actions";
import styles from "./ReviewActions.module.css";

interface ReviewActionsProps {
  itemId: string;
  projectId: string;
  packageId: string | null;
  onEdit: () => void;
}

export function ReviewActions({
  itemId,
  projectId,
  packageId,
  onEdit,
}: ReviewActionsProps) {
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function run(action: () => Promise<ActionResult>, successNotice?: string) {
    setError(null);
    setNotice(null);
    startTransition(async () => {
      const result = await action();
      if (result.ok) {
        if (successNotice) setNotice(successNotice);
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <div className={styles.actions}>
      <div className={styles.buttons}>
        <button
          type="button"
          className={styles.approve}
          disabled={isPending}
          onClick={() => run(() => approveItem(itemId, projectId))}
        >
          Approve
        </button>
        <button
          type="button"
          className={styles.regenerate}
          disabled={isPending || !packageId}
          onClick={() =>
            run(
              () => regeneratePackage(packageId, projectId),
              "Regenerace byla spuštěna.",
            )
          }
        >
          Regenerate
        </button>
        <button
          type="button"
          className={styles.reject}
          disabled={isPending}
          onClick={() => run(() => rejectItem(itemId, projectId))}
        >
          Reject
        </button>
        <button
          type="button"
          className={styles.edit}
          disabled={isPending}
          onClick={onEdit}
        >
          Edit
        </button>
      </div>

      {error ? <p className={styles.error}>{error}</p> : null}
      {notice ? <p className={styles.notice}>{notice}</p> : null}
    </div>
  );
}
