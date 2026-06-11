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
  // True when the package qualifies for language-variant generation. Computed at
  // the package level so the action stays visible regardless of the run filter.
  canGenerateVariants: boolean;
}

// Package-scoped review actions hoisted out of the per-item cards so the
// platform/language/status filter can never hide them. Approve / reject / edit
// stay on each content item; "Regenerate package" and "Generate language
// variants" act on the whole package and live here, next to the video.
export function PackageActions({
  projectId,
  packageId,
  canGenerateVariants,
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
