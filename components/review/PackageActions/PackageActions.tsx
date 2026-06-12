"use client";

import { useState, useTransition } from "react";
import {
  generateLanguageVariants,
  regeneratePackage,
  type ActionResult,
} from "@/lib/review/actions";
import styles from "./PackageActions.module.css";

interface PackageActionsProps {
  projectId: string;
  packageId: string | null;
  // True when the package qualifies for translation generation (package-level,
  // video-platform primaries approved, no variants yet).
  canGenerateVariants: boolean;
  // True when the package already has at least one translation.
  hasTranslations: boolean;
  // Reason the package is NOT yet eligible for translations, shown instead of
  // silently hiding the action. Null when eligible OR already translated.
  translationReason: string | null;
}

// Package-scoped review actions hoisted out of the per-item cards so they live
// next to the package video. Approve / reject / edit stay on each content item;
// "Regenerate package" and the package-level "Generate translations" act on the
// whole package. Translations target ONLY video platforms (enforced by the
// backend workflow); LinkedIn / X never get variants.
export function PackageActions({
  projectId,
  packageId,
  canGenerateVariants,
  hasTranslations,
  translationReason,
}: PackageActionsProps) {
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (!packageId) return null;

  function run(action: () => Promise<ActionResult>, successNotice: string) {
    setError(null);
    setNotice(null);
    startTransition(async () => {
      const result = await action();
      if (result.ok) {
        setNotice(successNotice);
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <div className={styles.container}>
      <div className={styles.buttons}>
        <button
          type="button"
          className={styles.regenerate}
          disabled={isPending}
          onClick={() =>
            run(
              () => regeneratePackage(packageId, projectId),
              "Regenerace balíčku byla spuštěna.",
            )
          }
        >
          Regenerate package
        </button>
        {canGenerateVariants ? (
          <button
            type="button"
            className={styles.generate}
            disabled={isPending}
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

      {/* Never silently hide the action: explain why it isn't available yet. */}
      {!canGenerateVariants && !hasTranslations && translationReason ? (
        <p className={styles.reason}>{translationReason}</p>
      ) : null}

      {error ? <p className={styles.error}>{error}</p> : null}
      {notice ? <p className={styles.notice}>{notice}</p> : null}
    </div>
  );
}
