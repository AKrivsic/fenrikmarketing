"use client";

import { useState, useTransition } from "react";
import { generateLanguageVariants } from "@/lib/review/actions";
import styles from "./GenerateVariantsAction.module.css";

interface GenerateVariantsActionProps {
  projectId: string;
  packageId: string | null;
}

// Approved-tab-only action. Review UX Consolidation V1 made the Approved tab
// read-only, which removed the only place that surfaced "Generate language
// variants" for approved primary packages. This component re-exposes JUST that
// single action (no approve / reject / edit / regenerate) by reusing the shared
// generateLanguageVariants Server Action. It is rendered only when the entry is
// eligible (entry.canGenerateVariants), so it carries no eligibility logic of
// its own.
export function GenerateVariantsAction({
  projectId,
  packageId,
}: GenerateVariantsActionProps) {
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    setError(null);
    setNotice(null);
    startTransition(async () => {
      const result = await generateLanguageVariants(packageId, projectId);
      if (result.ok) {
        setNotice("Generování jazykových variant bylo spuštěno.");
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <div className={styles.container}>
      <button
        type="button"
        className={styles.generate}
        disabled={isPending || !packageId}
        onClick={handleClick}
      >
        Generate language variants
      </button>
      {error ? <p className={styles.error}>{error}</p> : null}
      {notice ? <p className={styles.notice}>{notice}</p> : null}
    </div>
  );
}
