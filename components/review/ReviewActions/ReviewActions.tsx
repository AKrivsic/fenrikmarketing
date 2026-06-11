"use client";

import { useState, useTransition } from "react";
import {
  approveItem,
  generateLanguageVariants,
  regenerateLanguageVariant,
  regeneratePackage,
  rejectItem,
  type ActionResult,
} from "@/lib/review/actions";
import type { LanguageCode } from "@/lib/supabase/types";
import styles from "./ReviewActions.module.css";

interface ReviewActionsProps {
  itemId: string;
  projectId: string;
  packageId: string | null;
  isLanguageVariant: boolean;
  canGenerateVariants: boolean;
  variantLanguage: LanguageCode | null;
  onEdit: () => void;
}

export function ReviewActions({
  itemId,
  projectId,
  packageId,
  isLanguageVariant,
  canGenerateVariants,
  variantLanguage,
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
        {isLanguageVariant ? (
          // Variant regenerate re-localizes ONLY this language and queues its
          // own video job. It MUST NOT call the package-level regenerate (which
          // would regenerate the primary package and every language).
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
                "Regenerace jazykové varianty byla spuštěna.",
              )
            }
          >
            Regenerate
          </button>
        ) : (
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
        {canGenerateVariants ? (
          <button
            type="button"
            className={styles.generate}
            disabled={isPending || !packageId}
            onClick={() =>
              run(
                () => generateLanguageVariants(packageId, projectId),
                "Generování jazykových variant bylo spuštěno.",
              )
            }
          >
            Generate language variants
          </button>
        ) : null}
      </div>

      {error ? <p className={styles.error}>{error}</p> : null}
      {notice ? <p className={styles.notice}>{notice}</p> : null}
    </div>
  );
}
