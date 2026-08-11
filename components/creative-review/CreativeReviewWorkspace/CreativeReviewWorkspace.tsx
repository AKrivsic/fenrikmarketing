"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import type { CreativeReviewPageData } from "@/lib/api/creative-review-admin";
import {
  canContinueCreativeReviewGeneration,
  computeCreativeReviewRunProgress,
} from "@/lib/creative-review/progress";
import { continueCreativeReviewGenerationAction } from "@/app/projects/[id]/creative-review/actions";
import { CreativeReviewPackagePanel } from "@/components/creative-review/CreativeReviewPackagePanel/CreativeReviewPackagePanel";
import styles from "./CreativeReviewWorkspace.module.css";

interface CreativeReviewWorkspaceProps {
  projectId: string;
  runId: string;
  initialData: CreativeReviewPageData;
}

const RUN_STATUS_LABEL: Record<string, string> = {
  queued: "Ve frontě",
  running: "Probíhá",
  completed: "Hotovo",
  failed: "Selhalo",
  cancelled: "Zastaveno",
  waiting_for_creative_review: "Čeká na creative review",
};

export function CreativeReviewWorkspace({
  projectId,
  runId,
  initialData,
}: CreativeReviewWorkspaceProps) {
  const [data, setData] = useState(initialData);
  const [dirtyPackageIds, setDirtyPackageIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [continueError, setContinueError] = useState<string | null>(null);
  const [continueIssues, setContinueIssues] = useState<string[]>([]);
  const [continueFlash, setContinueFlash] = useState<string | null>(null);
  const [isContinuing, startContinueTransition] = useTransition();

  const dirtyCount = dirtyPackageIds.size;
  const hasUnsaved = dirtyCount > 0;

  useEffect(() => {
    if (!hasUnsaved) return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [hasUnsaved]);

  const onDirtyChange = useCallback((packageId: string, dirty: boolean) => {
    setDirtyPackageIds((prev) => {
      const next = new Set(prev);
      if (dirty) next.add(packageId);
      else next.delete(packageId);
      return next;
    });
  }, []);

  const onPackageSaved = useCallback(
    (pkg: CreativeReviewPageData["packages"][number]) => {
      setData((prev) => {
        const packages = prev.packages.map((row) =>
          row.packageId === pkg.packageId ? pkg : row,
        );
        return {
          ...prev,
          packages,
          progress: computeCreativeReviewRunProgress(
            packages.map((row) => row.creativeReview),
          ),
        };
      });
      onDirtyChange(pkg.packageId, false);
    },
    [onDirtyChange],
  );

  const confirmLeave = useCallback(() => {
    if (!hasUnsaved) return true;
    return window.confirm(
      "Máte neuložené změny. Opravdu opustit Creative Review?",
    );
  }, [hasUnsaved]);

  const progress = useMemo(() => {
    if (data.progress) return data.progress;
    return computeCreativeReviewRunProgress(
      data.packages.map((pkg) => pkg.creativeReview),
    );
  }, [data.packages, data.progress]);

  const canContinue = useMemo(
    () =>
      canContinueCreativeReviewGeneration({
        runStatus: data.run.status,
        progress,
      }) && !hasUnsaved,
    [data.run.status, progress, hasUnsaved],
  );

  function handleContinue() {
    setContinueError(null);
    setContinueIssues([]);
    setContinueFlash(null);
    startContinueTransition(async () => {
      const result = await continueCreativeReviewGenerationAction(
        projectId,
        runId,
      );
      if (!result.ok) {
        setContinueError(result.error);
        setContinueIssues(
          (result.issues ?? []).map(
            (issue) => `${issue.path}: ${issue.message}`,
          ),
        );
        return;
      }
      setData((prev) => ({
        ...prev,
        run: { ...prev.run, status: result.status },
      }));
      setContinueFlash(
        result.code === "already_continued"
          ? "Continue Generation už běžel — video jobs ověřeny / znovu odeslány."
          : "Continue Generation spuštěno — video jobs vytvořeny.",
      );
    });
  }

  return (
    <div className={styles.workspace}>
      <div className={styles.toolbar}>
        <Link
          href={`/projects/${projectId}/production`}
          className={styles.back}
          onClick={(event) => {
            if (!confirmLeave()) event.preventDefault();
          }}
        >
          ← Zpět na Content Production
        </Link>
        {hasUnsaved ? (
          <span className={styles.unsaved} role="status">
            Neuložené změny ({dirtyCount})
          </span>
        ) : null}
      </div>

      <header className={styles.header}>
        <h2 className={styles.title}>Creative Review</h2>
        <dl className={styles.meta}>
          <div>
            <dt>Projekt</dt>
            <dd>{data.project.name}</dd>
          </div>
          <div>
            <dt>Běh</dt>
            <dd>
              <code className={styles.mono}>{data.run.id.slice(0, 8)}…</code>
              <span className={styles.badge} data-status={data.run.status}>
                {RUN_STATUS_LABEL[data.run.status] ?? data.run.status}
              </span>
            </dd>
          </div>
          <div>
            <dt>Packages</dt>
            <dd>
              {progress.total} / {data.run.packageCount}
            </dd>
          </div>
        </dl>

        <dl className={styles.progress} aria-label="Run progress">
          <div>
            <dt>Approved</dt>
            <dd>{progress.approved}</dd>
          </div>
          <div>
            <dt>Ready</dt>
            <dd>{progress.ready}</dd>
          </div>
          <div>
            <dt>Waiting for translation</dt>
            <dd>{progress.waitingForTranslation}</dd>
          </div>
          <div>
            <dt>Pending</dt>
            <dd>{progress.pending}</dd>
          </div>
        </dl>

        <div className={styles.continueRow}>
          <button
            type="button"
            className={styles.continueBtn}
            onClick={handleContinue}
            disabled={!canContinue || isContinuing}
          >
            {isContinuing ? "Spouštím…" : "Continue Generation"}
          </button>
          {data.run.status === "waiting_for_creative_review" &&
          progress.approved < progress.total ? (
            <p className={styles.progressHint}>
              Schvalte všechny balíčky, abyste mohli pokračovat.
            </p>
          ) : null}
          {hasUnsaved ? (
            <p className={styles.progressHint}>
              Nejdřív uložte změny balíčků.
            </p>
          ) : null}
          {data.run.status === "running" ? (
            <p className={styles.progressHint}>
              Běh pokračuje — video jobs jsou ve frontě / processing.
            </p>
          ) : null}
        </div>

        {continueError ? (
          <div className={styles.continueError} role="alert">
            <p>{continueError}</p>
            {continueIssues.length > 0 ? (
              <ul>
                {continueIssues.map((issue) => (
                  <li key={issue}>{issue}</li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}
        {continueFlash ? (
          <p className={styles.continueSuccess} role="status">
            {continueFlash}
          </p>
        ) : null}
      </header>

      {data.packages.length === 0 ? (
        <p className={styles.empty} role="status">
          Tento běh zatím nemá žádné balíčky s Creative Review drafteem.
        </p>
      ) : (
        <ul className={styles.packageList}>
          {data.packages.map((pkg) => (
            <li key={pkg.packageId}>
              <CreativeReviewPackagePanel
                projectId={projectId}
                runId={runId}
                pkg={pkg}
                onDirtyChange={onDirtyChange}
                onSaved={onPackageSaved}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
