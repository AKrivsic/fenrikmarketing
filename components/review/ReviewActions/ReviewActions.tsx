"use client";

import { useState, useTransition } from "react";
import {
  approveAndPublishContentItem,
  approveItem,
  generateLanguageVariants,
  regenerateLanguageVariant,
  regeneratePackage,
  rejectItem,
  type ActionResult,
} from "@/lib/review/actions";
import { MarkPublishedButton } from "@/components/review/MarkPublishedButton/MarkPublishedButton";
import type { ApprovalStatus, LanguageCode } from "@/lib/supabase/types";
import styles from "./ReviewActions.module.css";

interface ReviewActionsProps {
  itemId: string;
  projectId: string;
  packageId: string | null;
  // Item workflow status. Drives which controls are shown:
  //   draft / in_review → Approve · Reject · Edit (+ per-variant Regenerate)
  //   approved          → Mark published only
  // Published / rejected items render no actions (the caller hides them).
  status: ApprovalStatus;
  isLanguageVariant: boolean;
  canGenerateVariants: boolean;
  variantLanguage: LanguageCode | null;
  // When true, the package-level Regenerate (primary) and Generate translations
  // buttons are omitted — they are rendered once in the package header. The
  // per-VARIANT Regenerate stays, since it targets a single language.
  packageActionsInHeader?: boolean;
  onEdit: () => void;
}

export function ReviewActions({
  itemId,
  projectId,
  packageId,
  status,
  isLanguageVariant,
  canGenerateVariants,
  variantLanguage,
  packageActionsInHeader = false,
  onEdit,
}: ReviewActionsProps) {
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Approve / Reject / Edit only make sense while the item is still under
  // review; once approved the only manual step is publishing.
  const isEditable = status === "draft" || status === "in_review";

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
      {isEditable ? (
        <div className={styles.buttons}>
          <button
            type="button"
            className={styles.approve}
            disabled={isPending}
            onClick={() => run(() => approveItem(itemId, projectId))}
          >
            Approve
          </button>
          {/* Solo-founder shortcut: skip the explicit approve step and mark this
              one item published immediately (after a manual Metricool paste). */}
          <button
            type="button"
            className={styles.approvePublish}
            disabled={isPending}
            onClick={() =>
              run(() => approveAndPublishContentItem(itemId, projectId))
            }
          >
            Approve &amp; Publish
          </button>
          {isLanguageVariant ? (
            // Variant regenerate re-localizes ONLY this language and queues its
            // own video job. It MUST NOT call the package-level regenerate.
            <button
              type="button"
              className={styles.regenerate}
              disabled={isPending || !packageId || !variantLanguage}
              onClick={() =>
                run(
                  () =>
                    regenerateLanguageVariant(
                      packageId,
                      projectId,
                      variantLanguage,
                    ),
                  "Regenerace překladu byla spuštěna.",
                )
              }
            >
              Regenerate
            </button>
          ) : packageActionsInHeader ? null : (
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
          )}
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
          {canGenerateVariants && !packageActionsInHeader ? (
            <button
              type="button"
              className={styles.generate}
              disabled={isPending || !packageId}
              onClick={() =>
                run(
                  () => generateLanguageVariants(packageId, projectId),
                  "Generování překladů bylo spuštěno.",
                )
              }
            >
              Generate translations
            </button>
          ) : null}
        </div>
      ) : null}

      {status === "approved" ? (
        <MarkPublishedButton itemId={itemId} projectId={projectId} />
      ) : null}

      {error ? <p className={styles.error}>{error}</p> : null}
      {notice ? <p className={styles.notice}>{notice}</p> : null}
    </div>
  );
}
