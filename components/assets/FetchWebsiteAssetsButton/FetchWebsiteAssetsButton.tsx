"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { refetchProjectWebsiteAssetsAction } from "@/app/projects/[id]/assets/actions";
import styles from "./FetchWebsiteAssetsButton.module.css";

interface FetchWebsiteAssetsButtonProps {
  projectId: string;
}

export function FetchWebsiteAssetsButton({ projectId }: FetchWebsiteAssetsButtonProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    setError(null);
    setResult(null);
    startTransition(async () => {
      const response = await refetchProjectWebsiteAssetsAction(projectId);
      if (!response.ok) {
        setError(response.error);
        return;
      }
      setResult(
        [
          `Added ${response.added}, skipped ${response.skipped}, failed ${response.failed}.`,
          response.reason ? `(${response.reason})` : null,
        ]
          .filter(Boolean)
          .join(" "),
      );
      router.refresh();
    });
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.row}>
        <button
          type="button"
          className={styles.button}
          onClick={handleClick}
          disabled={isPending}
        >
          {isPending ? "Fetching assets…" : "Fetch assets from website"}
        </button>
      </div>
      {error ? <p className={styles.error}>{error}</p> : null}
      {result ? <p className={styles.result}>{result}</p> : null}
    </div>
  );
}
