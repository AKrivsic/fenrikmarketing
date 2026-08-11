"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import {
  approveCreativeReviewPackageAction,
  confirmCreativeReviewTranslationAction,
  saveCreativeReviewPackageAction,
  translateCreativeReviewPackageAction,
  unapproveCreativeReviewPackageAction,
} from "@/app/projects/[id]/creative-review/actions";
import type { CreativeReviewPackageView } from "@/lib/api/creative-review-admin";
import type { CreativeReview, CreativeReviewScene } from "@/lib/creative-review/types";
import type { ValidationIssue } from "@/lib/ai/validateAiOutput";
import styles from "./CreativeReviewPackagePanel.module.css";

interface CreativeReviewPackagePanelProps {
  projectId: string;
  runId: string;
  pkg: CreativeReviewPackageView;
  onDirtyChange: (packageId: string, dirty: boolean) => void;
  onSaved: (pkg: CreativeReviewPackageView) => void;
}

interface SceneDraft {
  id: string;
  intentDescription: string;
  directorNotes: string;
}

function formatTimestamp(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

function historyActionLabel(event: string): string {
  switch (event) {
    case "seed":
      return "Seed";
    case "save":
      return "Save";
    case "translate":
      return "Translate";
    case "confirm_translation":
      return "Confirm translation";
    case "approve":
      return "Approve";
    case "unapprove":
      return "Unapprove";
    case "continue_generation_started":
      return "Continue Generation";
    case "creative_rebuild_completed":
      return "Creative rebuild";
    default:
      return event;
  }
}

function statusLabel(status: string): string {
  if (status === "draft") return "Draft";
  if (status === "ready") return "Ready";
  if (status === "approved") return "Approved";
  return status;
}

function visualSourceLabel(source: string): string {
  if (source === "generated") return "Generated";
  if (source === "asset") return "Asset";
  if (source === "typed_overlay") return "Typed overlay";
  return source;
}

function buildSceneDrafts(review: CreativeReview): SceneDraft[] {
  return review.scenes.map((scene) => ({
    id: scene.id,
    intentDescription: scene.intent.description,
    directorNotes: scene.director_notes,
  }));
}

function draftsEqual(
  voiceover: string,
  scenes: SceneDraft[],
  review: CreativeReview,
): boolean {
  if (voiceover !== review.voiceover.localized_edit) return false;
  if (scenes.length !== review.scenes.length) return false;
  for (let i = 0; i < scenes.length; i += 1) {
    const draft = scenes[i]!;
    const scene = review.scenes[i]!;
    if (draft.id !== scene.id) return false;
    if (draft.intentDescription !== scene.intent.description) return false;
    if (draft.directorNotes !== scene.director_notes) return false;
  }
  return true;
}

export function CreativeReviewPackagePanel({
  projectId,
  runId,
  pkg,
  onDirtyChange,
  onSaved,
}: CreativeReviewPackagePanelProps) {
  const review = pkg.creativeReview;
  const editable = pkg.loadState === "ok" && review !== null;

  const [open, setOpen] = useState(false);
  const [voiceoverEdit, setVoiceoverEdit] = useState(
    review?.voiceover.localized_edit ?? "",
  );
  const [sceneDrafts, setSceneDrafts] = useState<SceneDraft[]>(() =>
    review ? buildSceneDrafts(review) : [],
  );
  const [serverIssues, setServerIssues] = useState<ValidationIssue[]>(
    pkg.validationIssues,
  );
  const [error, setError] = useState<string | null>(null);
  const [savedFlash, setSavedFlash] = useState(false);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!pkg.creativeReview) {
      setVoiceoverEdit("");
      setSceneDrafts([]);
      setServerIssues(pkg.validationIssues);
      return;
    }
    setVoiceoverEdit(pkg.creativeReview.voiceover.localized_edit);
    setSceneDrafts(buildSceneDrafts(pkg.creativeReview));
    setServerIssues(pkg.validationIssues);
  }, [pkg]);

  const dirty = useMemo(() => {
    if (!review) return false;
    return !draftsEqual(voiceoverEdit, sceneDrafts, review);
  }, [review, voiceoverEdit, sceneDrafts]);

  useEffect(() => {
    onDirtyChange(pkg.packageId, dirty);
  }, [dirty, onDirtyChange, pkg.packageId]);

  const title =
    pkg.title.trim().length > 0
      ? pkg.title
      : `Package #${pkg.packageIndex + 1}`;

  const voiceoverStatusLabel =
    pkg.voiceoverStatus === "edited" ? "Upraveno" : "Bez úprav";

  const validationLabel =
    pkg.loadState === "ok" && serverIssues.length === 0
      ? "OK"
      : pkg.loadState === "missing"
        ? "Chybí draft"
        : "Neplatné";

  const packageStatus = review?.status ?? "draft";
  const englishConfirmed = review?.voiceover.english_confirmed ?? false;
  const englishPreview = review?.voiceover.english_preview ?? null;
  const canRunWorkflow = editable && !dirty && !isPending;

  function updateScene(
    sceneId: string,
    patch: Partial<Pick<SceneDraft, "intentDescription" | "directorNotes">>,
  ) {
    setSceneDrafts((prev) =>
      prev.map((scene) =>
        scene.id === sceneId ? { ...scene, ...patch } : scene,
      ),
    );
    setSavedFlash(false);
  }

  function handleMutationResult(
    result:
      | { ok: true; package: CreativeReviewPackageView }
      | {
          ok: false;
          error: string;
          issues?: ValidationIssue[];
          code?: string;
        },
  ) {
    if (!result.ok) {
      setError(result.error);
      setServerIssues(result.issues ?? []);
      return;
    }
    setSavedFlash(true);
    setError(null);
    setServerIssues([]);
    onSaved(result.package);
  }

  function handleSave() {
    if (!editable || !review) return;
    setError(null);
    setServerIssues([]);
    startTransition(async () => {
      const result = await saveCreativeReviewPackageAction(
        projectId,
        runId,
        pkg.packageId,
        review.version,
        {
          voiceoverLocalizedEdit: voiceoverEdit,
          scenes: sceneDrafts.map((scene) => ({
            id: scene.id,
            intentDescription: scene.intentDescription,
            directorNotes: scene.directorNotes,
          })),
        },
      );
      handleMutationResult(result);
    });
  }

  function handleTranslate() {
    if (!review || !canRunWorkflow) return;
    setError(null);
    setServerIssues([]);
    startTransition(async () => {
      const result = await translateCreativeReviewPackageAction(
        projectId,
        runId,
        pkg.packageId,
        review.version,
      );
      handleMutationResult(result);
    });
  }

  function handleConfirmTranslation() {
    if (!review || !canRunWorkflow) return;
    setError(null);
    setServerIssues([]);
    startTransition(async () => {
      const result = await confirmCreativeReviewTranslationAction(
        projectId,
        runId,
        pkg.packageId,
        review.version,
      );
      handleMutationResult(result);
    });
  }

  function handleApprove() {
    if (!review || !canRunWorkflow) return;
    setError(null);
    setServerIssues([]);
    startTransition(async () => {
      const result = await approveCreativeReviewPackageAction(
        projectId,
        runId,
        pkg.packageId,
        review.version,
      );
      handleMutationResult(result);
    });
  }

  function handleUnapprove() {
    if (!review || !canRunWorkflow) return;
    setError(null);
    setServerIssues([]);
    startTransition(async () => {
      const result = await unapproveCreativeReviewPackageAction(
        projectId,
        runId,
        pkg.packageId,
        review.version,
      );
      handleMutationResult(result);
    });
  }

  function handleReset() {
    if (!review) return;
    setVoiceoverEdit(review.voiceover.localized_edit);
    setSceneDrafts(buildSceneDrafts(review));
    setError(null);
    setServerIssues(pkg.validationIssues);
    setSavedFlash(false);
  }

  return (
    <details
      className={styles.panel}
      open={open}
      onToggle={(event) => {
        setOpen((event.target as HTMLDetailsElement).open);
      }}
    >
      <summary className={styles.summary}>
        <span className={styles.summaryTitle}>{title}</span>
        <span className={styles.pill} data-tone={packageStatus}>
          Status: {statusLabel(packageStatus)}
        </span>
        <span
          className={styles.pill}
          data-tone={englishConfirmed ? "ok" : "waiting"}
        >
          EN: {englishConfirmed ? "Confirmed" : "Pending"}
        </span>
        <span className={styles.pill} data-tone={pkg.voiceoverStatus}>
          VO: {voiceoverStatusLabel}
        </span>
        <span className={styles.pill}>Scény: {pkg.sceneCount}</span>
        <span className={styles.pill}>
          v{review?.version ?? "—"} · {formatTimestamp(pkg.updatedAt)}
        </span>
        <span
          className={styles.pill}
          data-tone={
            pkg.loadState === "ok" && serverIssues.length === 0 ? "ok" : "error"
          }
        >
          {validationLabel}
        </span>
      </summary>

      <div className={styles.body}>
        {!editable ? (
          <div className={styles.blocked} role="alert">
            <p className={styles.error}>
              {pkg.loadState === "missing"
                ? "Tento balíček nemá creative_review draft — nelze editovat."
                : "Uložený creative_review je neplatný — nelze editovat."}
            </p>
            {serverIssues.length > 0 ? (
              <ul className={styles.issueList}>
                {serverIssues.map((issue) => (
                  <li key={`${issue.path}:${issue.message}`}>
                    <code>{issue.path}</code>: {issue.message}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : (
          <>
            <section className={styles.section} aria-labelledby={`${pkg.packageId}-status`}>
              <h3 id={`${pkg.packageId}-status`} className={styles.sectionTitle}>
                Package Status
              </h3>
              <p className={styles.muted}>
                {statusLabel(packageStatus)}
                {review!.approved ? " · schváleno" : ""}
                {englishConfirmed
                  ? " · anglický překlad potvrzen"
                  : " · čeká na potvrzení překladu"}
              </p>
            </section>

            <section className={styles.section} aria-labelledby={`${pkg.packageId}-vo`}>
              <h3 id={`${pkg.packageId}-vo`} className={styles.sectionTitle}>
                Voiceover
              </h3>
              <label className={styles.field}>
                <span className={styles.label}>Original AI</span>
                <textarea
                  className={styles.textarea}
                  value={review!.voiceover.original_ai}
                  readOnly
                  rows={4}
                  aria-readonly="true"
                />
              </label>
              <label className={styles.field}>
                <span className={styles.label}>Localized edit</span>
                <textarea
                  className={styles.textarea}
                  value={voiceoverEdit}
                  onChange={(e) => {
                    setVoiceoverEdit(e.target.value);
                    setSavedFlash(false);
                  }}
                  rows={5}
                  disabled={isPending || review!.approved}
                />
              </label>
              <label className={styles.field}>
                <span className={styles.label}>English Preview</span>
                <textarea
                  className={styles.textarea}
                  value={englishPreview ?? ""}
                  readOnly
                  rows={4}
                  aria-readonly="true"
                  placeholder="Zatím bez překladu — stiskněte Confirm Translation."
                />
              </label>
              <label className={styles.field}>
                <span className={styles.label}>Final approved</span>
                <textarea
                  className={styles.textarea}
                  value={review!.voiceover.final_approved}
                  readOnly
                  rows={4}
                  aria-readonly="true"
                />
              </label>
              <div className={styles.actions}>
                <button
                  type="button"
                  className={styles.secondary}
                  onClick={handleTranslate}
                  disabled={!canRunWorkflow || review!.approved}
                >
                  {isPending ? "Překládám…" : "Confirm Translation"}
                </button>
                <button
                  type="button"
                  className={styles.secondary}
                  onClick={handleConfirmTranslation}
                  disabled={
                    !canRunWorkflow ||
                    review!.approved ||
                    !englishPreview ||
                    englishConfirmed
                  }
                >
                  Confirm Translation Result
                </button>
              </div>
            </section>

            <section
              className={styles.section}
              aria-labelledby={`${pkg.packageId}-scenes`}
            >
              <h3 id={`${pkg.packageId}-scenes`} className={styles.sectionTitle}>
                Scenes
              </h3>
              {review!.scenes.length === 0 ? (
                <p className={styles.muted}>Tento balíček nemá žádné scény.</p>
              ) : (
                <ul className={styles.sceneList}>
                  {review!.scenes.map((scene: CreativeReviewScene, index) => {
                    const draft = sceneDrafts.find((s) => s.id === scene.id);
                    if (!draft) return null;
                    return (
                      <li key={scene.id} className={styles.sceneCard}>
                        <header className={styles.sceneHead}>
                          <strong>Scene {index + 1}</strong>
                          <span className={styles.metaChip}>
                            {scene.intent.presentation_type ?? "—"}
                          </span>
                          <span className={styles.metaChip}>
                            {visualSourceLabel(scene.intent.visual_source)}
                          </span>
                          {scene.intent.asset_id ? (
                            <span className={styles.metaChip} title={scene.intent.asset_id}>
                              Asset
                              {scene.intent.used_as
                                ? `: ${scene.intent.used_as}`
                                : ""}
                            </span>
                          ) : null}
                        </header>
                        <label className={styles.field}>
                          <span className={styles.label}>Creative Intent</span>
                          <textarea
                            className={styles.textarea}
                            value={draft.intentDescription}
                            onChange={(e) =>
                              updateScene(scene.id, {
                                intentDescription: e.target.value,
                              })
                            }
                            rows={3}
                            disabled={isPending || review!.approved}
                          />
                        </label>
                        <label className={styles.field}>
                          <span className={styles.label}>Director Notes</span>
                          <textarea
                            className={styles.textarea}
                            value={draft.directorNotes}
                            onChange={(e) =>
                              updateScene(scene.id, {
                                directorNotes: e.target.value,
                              })
                            }
                            rows={2}
                            disabled={isPending || review!.approved}
                          />
                        </label>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>

            <section
              className={styles.section}
              aria-labelledby={`${pkg.packageId}-history`}
            >
              <h3
                id={`${pkg.packageId}-history`}
                className={styles.sectionTitle}
              >
                History
              </h3>
              <div className={styles.historyTableWrap}>
                <table className={styles.historyTable}>
                  <thead>
                    <tr>
                      <th scope="col">Version</th>
                      <th scope="col">Timestamp</th>
                      <th scope="col">Action</th>
                      <th scope="col">Actor</th>
                      <th scope="col">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {review!.history.map((entry, index) => (
                      <tr key={`${entry.version}-${entry.timestamp}-${index}`}>
                        <td>{entry.version}</td>
                        <td>{formatTimestamp(entry.timestamp)}</td>
                        <td>{historyActionLabel(entry.event)}</td>
                        <td>
                          {entry.actor.type}/{entry.actor.id}
                        </td>
                        <td>{statusLabel(entry.status)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            {dirty ? (
              <p className={styles.muted} role="status">
                Neuložené změny — nejdřív uložte, než spustíte překlad nebo schválení.
              </p>
            ) : null}

            {serverIssues.length > 0 ? (
              <ul className={styles.issueList} role="alert">
                {serverIssues.map((issue) => (
                  <li key={`${issue.path}:${issue.message}`}>
                    <code>{issue.path}</code>: {issue.message}
                  </li>
                ))}
              </ul>
            ) : null}

            {error ? (
              <p className={styles.error} role="alert">
                {error}
              </p>
            ) : null}

            {savedFlash && !dirty ? (
              <p className={styles.success} role="status">
                Uloženo.
              </p>
            ) : null}

            <div className={styles.actions}>
              <button
                type="button"
                className={styles.save}
                onClick={handleSave}
                disabled={isPending || !dirty || review!.approved}
              >
                {isPending ? "Ukládám…" : "Uložit"}
              </button>
              <button
                type="button"
                className={styles.reset}
                onClick={handleReset}
                disabled={isPending || !dirty}
              >
                Zahodit změny
              </button>
              {!review!.approved ? (
                <button
                  type="button"
                  className={styles.approve}
                  onClick={handleApprove}
                  disabled={!canRunWorkflow}
                >
                  Approve Package
                </button>
              ) : (
                <button
                  type="button"
                  className={styles.unapprove}
                  onClick={handleUnapprove}
                  disabled={!canRunWorkflow}
                >
                  Unapprove Package
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </details>
  );
}
