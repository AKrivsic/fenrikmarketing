"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteProjectAction } from "@/app/projects/actions";
import styles from "./ProjectList.module.css";

interface DeleteProjectButtonProps {
  projectId: string;
  projectName: string;
}

export function DeleteProjectButton({
  projectId,
  projectName,
}: DeleteProjectButtonProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    const confirmed = window.confirm(
      `Opravdu smazat projekt „${projectName}"? Tato akce je nevratná a odstraní i veškerý související obsah.`,
    );
    if (!confirmed) return;

    setError(null);
    startTransition(async () => {
      const result = await deleteProjectAction(projectId);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className={styles.deleteWrap}>
      <button
        type="button"
        className={styles.deleteButton}
        onClick={handleDelete}
        disabled={isPending}
        aria-label={`Smazat projekt ${projectName}`}
      >
        {isPending ? "Mažu…" : "Smazat"}
      </button>
      {error ? <span className={styles.deleteError}>{error}</span> : null}
    </div>
  );
}
