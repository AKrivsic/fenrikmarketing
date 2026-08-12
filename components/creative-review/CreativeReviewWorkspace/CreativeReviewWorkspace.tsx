"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import type { CreativeReviewPageData } from "@/lib/api/creative-review-admin";
import { editorLanguageLabel } from "@/lib/admin/editorLanguage";
import {
  canContinueCreativeReviewGeneration,
  computeCreativeReviewRunProgress,
} from "@/lib/creative-review/progress";
import { canCancelManualReview } from "@/lib/creative-review/cancelGate";
import {
  cancelManualReviewAction,
  continueCreativeReviewGenerationAction,
  loadCreativeReviewAction,
} from "@/app/projects/[id]/creative-review/actions";
import { CreativeReviewPackagePanel } from "@/components/creative-review/CreativeReviewPackagePanel/CreativeReviewPackagePanel";
import styles from "./CreativeReviewWorkspace.module.css";

interface CreativeReviewWorkspaceProps {
  projectId: string;
  runId: string;
  initialData: CreativeReviewPageData;
}

const RUN_STATUS_LABEL: Record<string, string> = {
  queued: "Queued",
  running: "Running",
  completed: "Completed",
  failed: "Failed",
  cancelled: "Cancelled",
  waiting_for_creative_review: "Waiting for Creative Review",
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
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [isContinuing, startContinueTransition] = useTransition();
  const [isCancelling, startCancelTransition] = useTransition();

  const dirtyCount = dirtyPackageIds.size;
  const hasUnsaved = dirtyCount > 0;
  const isCancelled = data.run.status === "cancelled";
  const readOnly = data.run.status !== "waiting_for_creative_review";

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
      const has = prev.has(packageId);
      if (dirty === has) return prev;
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
      "You have unsaved changes. Leave Creative Review anyway?",
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
      !readOnly &&
      canContinueCreativeReviewGeneration({
        runStatus: data.run.status,
        progress,
      }) &&
      !hasUnsaved,
    [data.run.status, progress, hasUnsaved, readOnly],
  );

  const canCancel = useMemo(
    () =>
      canCancelManualReview({
        runStatus: data.run.status,
        generationMode: data.run.generationMode,
      }) && !isCancelling,
    [data.run.status, data.run.generationMode, isCancelling],
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
          ? "Continue Generation already ran — video jobs verified / re-dispatched."
          : "Continue Generation started — video jobs created.",
      );
    });
  }

  function handleCancelManualReview() {
    const confirmed = window.confirm(
      "Cancel Manual Review? This stops the run permanently. Packages and Creative Review history are kept. Continue Generation will be disabled.",
    );
    if (!confirmed) return;

    setCancelError(null);
    setContinueError(null);
    setContinueFlash(null);
    startCancelTransition(async () => {
      const result = await cancelManualReviewAction(projectId, runId);
      if (!result.ok) {
        setCancelError(result.error);
        return;
      }
      const refreshed = await loadCreativeReviewAction(projectId, runId);
      if (refreshed.ok) {
        setData(refreshed.data);
        setDirtyPackageIds(new Set());
        return;
      }
      setData((prev) => ({
        ...prev,
        run: { ...prev.run, status: "cancelled" },
      }));
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
          ← Back to Content Production
        </Link>
        {hasUnsaved ? (
          <span className={styles.unsaved} role="status">
            Unsaved changes ({dirtyCount})
          </span>
        ) : null}
      </div>

      <header className={styles.header}>
        <h2 className={styles.title}>Creative Review</h2>
        {isCancelled ? (
          <p className={styles.cancelledBanner} role="status">
            Manual Review cancelled
          </p>
        ) : readOnly ? (
          <p className={styles.cancelledBanner} role="status">
            Creative Review is read-only ({RUN_STATUS_LABEL[data.run.status] ?? data.run.status})
          </p>
        ) : null}
        <dl className={styles.meta}>
          <div>
            <dt>Project</dt>
            <dd>{data.project.name}</dd>
          </div>
          <div>
            <dt>Run</dt>
            <dd>
              <code className={styles.mono}>{data.run.id.slice(0, 8)}…</code>
              <span className={styles.badge} data-status={data.run.status}>
                {RUN_STATUS_LABEL[data.run.status] ?? data.run.status}
              </span>
            </dd>
          </div>
          <div>
            <dt>Editor Language</dt>
            <dd>{editorLanguageLabel(data.run.editorLanguage)}</dd>
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
            <dt>Waiting</dt>
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
            disabled={!canContinue || isContinuing || readOnly}
          >
            {isContinuing ? "Starting…" : "Continue Generation"}
          </button>
          {canCancel ? (
            <button
              type="button"
              className={styles.cancelBtn}
              onClick={handleCancelManualReview}
              disabled={isCancelling}
            >
              {isCancelling ? "Cancelling…" : "Cancel Manual Review"}
            </button>
          ) : null}
          {isCancelled ? (
            <p className={styles.progressHint}>
              Continue Generation is disabled because Manual Review was cancelled.
            </p>
          ) : null}
          {data.run.status === "waiting_for_creative_review" &&
          progress.approved < progress.total ? (
            <p className={styles.progressHint}>
              Approve all packages before continuing.
            </p>
          ) : null}
          {hasUnsaved ? (
            <p className={styles.progressHint}>
              Save package changes first.
            </p>
          ) : null}
          {data.run.status === "running" ? (
            <p className={styles.progressHint}>
              Run is continuing — video jobs are queued / processing.
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
        {cancelError ? (
          <div className={styles.continueError} role="alert">
            <p>{cancelError}</p>
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
          This run has no packages with a Creative Review draft yet.
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
                readOnly={readOnly}
                readOnlyMessage={
                  isCancelled
                    ? "Manual Review cancelled — this package is read-only."
                    : "This package is read-only for the current run status."
                }
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
