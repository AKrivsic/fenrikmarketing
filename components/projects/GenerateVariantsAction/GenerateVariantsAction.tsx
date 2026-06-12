"use client";

import { useState, useTransition } from "react";
import { generateLanguageVariantsForItem } from "@/lib/review/actions";
import styles from "./GenerateVariantsAction.module.css";

interface GenerateVariantsActionProps {
  projectId: string;
  itemId: string;
}

// Approved-tab-only action. Review UX Consolidation V1 made the Approved tab
// read-only, which removed the only place that surfaced "Generate language
// variants" for approved primary content. This component re-exposes JUST that
// single action (no approve / reject / edit / regenerate) by reusing the shared
// item-level generateLanguageVariantsForItem Server Action. It is rendered only
// when the entry is eligible (entry.canGenerateItemVariants), so it carries no
// eligibility logic of its own. Item-level so an approved item localizes even
// while sibling items in the same package are still draft.
export function GenerateVariantsAction({
  projectId,
  itemId,
}: GenerateVariantsActionProps) {
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    setError(null);
    setNotice(null);
    startTransition(async () => {
      const result = await generateLanguageVariantsForItem(itemId, projectId);
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
        disabled={isPending || !itemId}
        onClick={handleClick}
      >
        Generate language variants
      </button>
      {error ? <p className={styles.error}>{error}</p> : null}
      {notice ? <p className={styles.notice}>{notice}</p> : null}
    </div>
  );
}
