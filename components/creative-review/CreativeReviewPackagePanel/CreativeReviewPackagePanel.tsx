"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import {
  approveCreativeReviewPackageAction,
  saveCreativeReviewPackageAction,
  saveCreativeReviewTextToVideoSceneAction,
  saveCreativeReviewTextToVideoSoundPlanAction,
  saveCreativeReviewVoiceDirectionAction,
  unapproveCreativeReviewPackageAction,
} from "@/app/projects/[id]/creative-review/actions";
import { VOICE_DIRECTION_STYLE_LABELS } from "@/lib/content-package/voiceDirectionContract";
import type { VoiceDirectionStyle } from "@/lib/content-package/voiceDirectionContract";
import type { CreativeReviewPackageView } from "@/lib/api/creative-review-admin";
import {
  computeCreativeReviewDurationEstimate,
  formatDurationSeconds,
} from "@/lib/creative-review/duration";
import { creativeReviewNeedsEnglishPreviewUpdate } from "@/lib/creative-review/lifecycle";
import type { CreativeReview, CreativeReviewScene } from "@/lib/creative-review/types";
import type { ValidationIssue } from "@/lib/ai/validateAiOutput";
import styles from "./CreativeReviewPackagePanel.module.css";

interface CreativeReviewPackagePanelProps {
  projectId: string;
  runId: string;
  pkg: CreativeReviewPackageView;
  onDirtyChange: (packageId: string, dirty: boolean) => void;
  onSaved: (pkg: CreativeReviewPackageView) => void;
  /** When true, all edits and workflow actions are disabled. */
  readOnly?: boolean;
  /** Optional explanation shown when readOnly. */
  readOnlyMessage?: string;
}

interface SceneDraft {
  id: string;
  intentLocalizedEdit: string;
  directorNotes: string;
}

function formatTimestamp(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function historyActionLabel(event: string): string {
  switch (event) {
    case "seed":
      return "Seed";
    case "save":
      return "Save";
    case "translate":
      return "Automatic translation";
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
    case "manual_review_cancelled":
      return "Manual Review cancelled";
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
    intentLocalizedEdit: scene.intent.localized_edit,
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
    if (draft.intentLocalizedEdit !== scene.intent.localized_edit) return false;
    if (draft.directorNotes !== scene.director_notes) return false;
  }
  return true;
}

function isTypedOverlay(scene: CreativeReviewScene): boolean {
  return (
    scene.intent.visual_source === "typed_overlay" ||
    ["CHECKLIST", "QUOTE", "STATISTIC", "CTA"].includes(
      scene.intent.presentation_type ?? "",
    )
  );
}

export function CreativeReviewPackagePanel({
  projectId,
  runId,
  pkg,
  onDirtyChange,
  onSaved,
  readOnly = false,
  readOnlyMessage = "This package is read-only for the current run status.",
}: CreativeReviewPackagePanelProps) {
  const review = pkg.creativeReview;
  const hasReview = pkg.loadState === "ok" && review !== null;
  const editable = hasReview && !readOnly;

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
  const t2v = pkg.videoCreativeSummary;
  const [voiceStyle, setVoiceStyle] = useState<VoiceDirectionStyle>(
    t2v?.voiceDirection?.style ?? "auto",
  );
  const [voiceInstruction, setVoiceInstruction] = useState(
    t2v?.voiceDirection?.custom_instruction ?? "",
  );

  useEffect(() => {
    setVoiceStyle(t2v?.voiceDirection?.style ?? "auto");
    setVoiceInstruction(t2v?.voiceDirection?.custom_instruction ?? "");
  }, [t2v?.voiceDirection?.style, t2v?.voiceDirection?.custom_instruction]);

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
    if (!review || readOnly) return false;
    return !draftsEqual(voiceoverEdit, sceneDrafts, review);
  }, [review, voiceoverEdit, sceneDrafts, readOnly]);

  useEffect(() => {
    onDirtyChange(pkg.packageId, dirty);
  }, [dirty, onDirtyChange, pkg.packageId]);

  const title =
    pkg.title.trim().length > 0
      ? pkg.title
      : `Package #${pkg.packageIndex + 1}`;

  const voiceoverStatusLabel =
    pkg.voiceoverStatus === "edited" ? "Edited" : "Unchanged";

  const validationLabel =
    pkg.loadState === "ok" && serverIssues.length === 0
      ? "OK"
      : pkg.loadState === "missing"
        ? "Missing draft"
        : "Invalid";

  const packageStatus = review?.status ?? "draft";
  const englishConfirmed = review?.voiceover.english_confirmed ?? false;
  const englishPreview = review?.voiceover.english_preview ?? null;
  const englishOutdated = review
    ? creativeReviewNeedsEnglishPreviewUpdate(review)
    : true;
  const canRunWorkflow = editable && !dirty && !isPending;

  const duration = useMemo(() => {
    if (!review) return null;
    return computeCreativeReviewDurationEstimate({
      originalAi: review.voiceover.original_ai,
      localizedEdit: voiceoverEdit,
    });
  }, [review, voiceoverEdit]);

  function updateScene(
    sceneId: string,
    patch: Partial<Pick<SceneDraft, "intentLocalizedEdit" | "directorNotes">>,
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
            intentLocalizedEdit: scene.intentLocalizedEdit,
            directorNotes: scene.directorNotes,
          })),
        },
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
          data-tone={englishOutdated ? "waiting" : englishConfirmed ? "ok" : "waiting"}
        >
          EN: {englishOutdated ? "Outdated" : englishConfirmed ? "Current" : "Pending"}
        </span>
        <span className={styles.pill} data-tone={pkg.voiceoverStatus}>
          VO: {voiceoverStatusLabel}
        </span>
        <span className={styles.pill}>Scenes: {pkg.sceneCount}</span>
        <span className={styles.pill}>
          Version {review?.version ?? "—"} · {formatTimestamp(pkg.updatedAt)}
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
        {!hasReview ? (
          <div className={styles.blocked} role="alert">
            <p className={styles.error}>
              {pkg.loadState === "missing"
                ? "This package has no creative_review draft — editing is disabled."
                : "Stored creative_review is invalid — editing is disabled."}
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
            {readOnly ? (
              <p className={styles.muted} role="status">
                {readOnlyMessage}
              </p>
            ) : null}
            <section className={styles.section} aria-labelledby={`${pkg.packageId}-status`}>
              <h3 id={`${pkg.packageId}-status`} className={styles.sectionTitle}>
                Status
              </h3>
              <p className={styles.muted}>
                {statusLabel(packageStatus)}
                {review!.approved ? " · approved" : ""}
                {englishOutdated
                  ? " · English preview outdated — save to refresh"
                  : englishConfirmed
                    ? " · English preview current"
                    : " · waiting for English preview"}
              </p>
            </section>

            <section className={styles.section} aria-labelledby={`${pkg.packageId}-vo`}>
              <h3 id={`${pkg.packageId}-vo`} className={styles.sectionTitle}>
                Voiceover
              </h3>
              {duration ? (
                <p className={styles.muted} role="note">
                  Original: {formatDurationSeconds(duration.originalSeconds)}
                  {" · "}
                  Estimated: {formatDurationSeconds(duration.estimatedSeconds)}
                  {" · "}
                  Difference:{" "}
                  {duration.differenceSeconds >= 0 ? "+" : ""}
                  {formatDurationSeconds(duration.differenceSeconds)}
                  {Math.abs(duration.differenceSeconds) >= 2
                    ? " (warning: large change)"
                    : ""}
                </p>
              ) : null}
              <label className={styles.field}>
                <span className={styles.label}>Original</span>
                <textarea
                  className={styles.textarea}
                  value={review!.voiceover.original_ai}
                  readOnly
                  rows={3}
                  aria-readonly="true"
                />
              </label>
              <label className={styles.field}>
                <span className={styles.label}>Localized</span>
                <textarea
                  className={styles.textarea}
                  value={voiceoverEdit}
                  onChange={(e) => {
                    setVoiceoverEdit(e.target.value);
                    setSavedFlash(false);
                  }}
                  rows={4}
                  disabled={isPending || review!.approved || readOnly}
                />
              </label>
              <label className={styles.field}>
                <span className={styles.label}>
                  English Preview
                  {review!.voiceover.english_preview_outdated
                    ? " (outdated)"
                    : ""}
                </span>
                <textarea
                  className={styles.textarea}
                  value={englishPreview ?? ""}
                  readOnly
                  rows={3}
                  aria-readonly="true"
                  placeholder="English preview is created automatically during generation and refreshed on Save."
                />
              </label>
              <label className={styles.field}>
                <span className={styles.label}>Final approved</span>
                <textarea
                  className={styles.textarea}
                  value={review!.voiceover.final_approved}
                  readOnly
                  rows={3}
                  aria-readonly="true"
                />
              </label>
            </section>

            {pkg.packageVideoMode === "text_to_video" && t2v ? (
              <section
                className={styles.section}
                aria-labelledby={`${pkg.packageId}-t2v`}
              >
                <h3 id={`${pkg.packageId}-t2v`} className={styles.sectionTitle}>
                  Generované video — plán
                </h3>
                {t2v.t2vRepetitionBlockedBanner ? (
                  <p className={styles.muted}>{t2v.t2vRepetitionBlockedBanner}</p>
                ) : null}
                <p className={styles.muted}>
                  Hook: {t2v.hook ?? "—"} · Plán: {t2v.planStatus ?? "—"} ·
                  Opakování: {t2v.repetitionStatus ?? "—"}
                  {t2v.repetitionReasons.length > 0
                    ? ` (${t2v.repetitionReasons.join("; ")})`
                    : ""}
                </p>
                <p className={styles.muted}>
                  Hudba: {t2v.musicMode ?? "—"}
                  {t2v.musicMood ? ` · ${t2v.musicMood}` : ""}
                </p>
                <p className={styles.muted}>
                  Automatická hudba (režim auto) vyžaduje aktivní licencovanou
                  ElevenLabs Music generaci ve workeru — jinak produkce skončí
                  chybou před audio POSTem.
                </p>
                {t2v.budgetEstimateLabel ? (
                  <p className={styles.muted}>{t2v.budgetEstimateLabel}</p>
                ) : null}
                {t2v.voiceCategoryLabel ? (
                  <p className={styles.muted}>
                    Kategorie hlasu (ElevenLabs): {t2v.voiceCategoryLabel}
                  </p>
                ) : null}
                <label className={styles.field}>
                  <span className={styles.label}>Hlasová režie</span>
                  <select
                    className={styles.textarea}
                    value={voiceStyle}
                    disabled={!editable || isPending}
                    onChange={(e) =>
                      setVoiceStyle(e.target.value as VoiceDirectionStyle)
                    }
                  >
                    {(Object.keys(VOICE_DIRECTION_STYLE_LABELS) as VoiceDirectionStyle[]).map(
                      (key) => (
                        <option key={key} value={key}>
                          {VOICE_DIRECTION_STYLE_LABELS[key]}
                        </option>
                      ),
                    )}
                  </select>
                </label>
                <label className={styles.field}>
                  <span className={styles.label}>Vlastní instrukce (volitelné)</span>
                  <textarea
                    className={styles.textarea}
                    rows={2}
                    value={voiceInstruction}
                    disabled={!editable || isPending}
                    onChange={(e) => setVoiceInstruction(e.target.value)}
                    placeholder="Např. První větu důrazně, vysvětlení klidně a CTA energicky."
                  />
                </label>
                <button
                  type="button"
                  className={styles.save}
                  disabled={!editable || isPending}
                  onClick={() => {
                    startTransition(async () => {
                      const result = await saveCreativeReviewVoiceDirectionAction(
                        projectId,
                        runId,
                        pkg.packageId,
                        {
                          style: voiceStyle,
                          ...(voiceInstruction.trim()
                            ? { custom_instruction: voiceInstruction.trim() }
                            : {}),
                        },
                      );
                      handleMutationResult(result);
                    });
                  }}
                >
                  Uložit hlasovou režii
                </button>
                <ul className={styles.sceneList}>
                  {t2v.scenes.map((scene) => (
                    <li key={scene.sceneId} className={styles.sceneCard}>
                      <strong>Scéna {scene.order + 1}</strong>
                      <p className={styles.muted}>{scene.humanMeaning}</p>
                      <label className={styles.field}>
                        <span className={styles.label}>Vizuální představa</span>
                        <textarea
                          className={styles.textarea}
                          rows={3}
                          defaultValue={scene.humanVisualEdit}
                          disabled={!editable || isPending}
                          id={`t2v-scene-${scene.sceneId}`}
                        />
                      </label>
                      <label className={styles.field}>
                        <span className={styles.label}>Zvuk scény</span>
                        <select
                          className={styles.textarea}
                          defaultValue={scene.soundMode}
                          disabled={!editable || isPending}
                          id={`t2v-sound-mode-${scene.sceneId}`}
                        >
                          <option value="auto">Automaticky</option>
                          <option value="none">Bez efektu</option>
                          <option value="custom">Vlastní popis</option>
                        </select>
                      </label>
                      <label className={styles.field}>
                        <span className={styles.label}>Popis efektu (věta)</span>
                        <textarea
                          className={styles.textarea}
                          rows={2}
                          defaultValue={scene.soundEffectDescription ?? ""}
                          disabled={!editable || isPending}
                          id={`t2v-sound-desc-${scene.sceneId}`}
                          placeholder="Např. Silný zvuk vzplanutí peněz."
                        />
                      </label>
                      <label className={styles.field}>
                        <span className={styles.label}>Umístění efektu</span>
                        <select
                          className={styles.textarea}
                          defaultValue={scene.soundAnchor ?? "scene_beginning"}
                          disabled={!editable || isPending}
                          id={`t2v-sound-anchor-${scene.sceneId}`}
                        >
                          <option value="scene_start">Začátek scény</option>
                          <option value="scene_beginning">Začátek scény (jemně)</option>
                          <option value="scene_middle">Střed scény</option>
                          <option value="scene_end">Konec scény</option>
                          <option value="voice_phrase">Při frázi ve voiceoveru</option>
                        </select>
                      </label>
                      <label className={styles.field}>
                        <span className={styles.label}>Fráze ve voiceoveru</span>
                        <input
                          className={styles.textarea}
                          defaultValue={scene.voicePhrase ?? ""}
                          disabled={!editable || isPending}
                          id={`t2v-sound-phrase-${scene.sceneId}`}
                          placeholder="Přesná fráze z approved voiceoveru"
                        />
                      </label>
                      <button
                        type="button"
                        className={styles.save}
                        disabled={!editable || isPending}
                        onClick={() => {
                          const el = document.getElementById(
                            `t2v-scene-${scene.sceneId}`,
                          ) as HTMLTextAreaElement | null;
                          const value = el?.value?.trim() ?? "";
                          if (!value) return;
                          startTransition(async () => {
                            const result =
                              await saveCreativeReviewTextToVideoSceneAction(
                                projectId,
                                runId,
                                pkg.packageId,
                                scene.sceneId,
                                value,
                              );
                            handleMutationResult(result);
                          });
                        }}
                      >
                        Uložit scénu
                      </button>
                      <button
                        type="button"
                        className={styles.save}
                        disabled={!editable || isPending}
                        onClick={() => {
                          const modeEl = document.getElementById(
                            `t2v-sound-mode-${scene.sceneId}`,
                          ) as HTMLSelectElement | null;
                          const descEl = document.getElementById(
                            `t2v-sound-desc-${scene.sceneId}`,
                          ) as HTMLTextAreaElement | null;
                          const anchorEl = document.getElementById(
                            `t2v-sound-anchor-${scene.sceneId}`,
                          ) as HTMLSelectElement | null;
                          const phraseEl = document.getElementById(
                            `t2v-sound-phrase-${scene.sceneId}`,
                          ) as HTMLInputElement | null;
                          const mode = (modeEl?.value ?? "auto") as
                            | "auto"
                            | "none"
                            | "custom";
                          startTransition(async () => {
                            const result =
                              await saveCreativeReviewTextToVideoSoundPlanAction(
                                projectId,
                                runId,
                                pkg.packageId,
                                scene.sceneId,
                                {
                                  mode,
                                  ...(descEl?.value?.trim()
                                    ? {
                                        custom_effect_description:
                                          descEl.value.trim(),
                                      }
                                    : {}),
                                  ...(anchorEl?.value
                                    ? {
                                        anchor: anchorEl.value as
                                          | "scene_start"
                                          | "scene_beginning"
                                          | "scene_middle"
                                          | "scene_end"
                                          | "voice_phrase",
                                      }
                                    : {}),
                                  ...(phraseEl?.value?.trim()
                                    ? { voice_phrase: phraseEl.value.trim() }
                                    : {}),
                                },
                              );
                            handleMutationResult(result);
                          });
                        }}
                      >
                        Uložit zvuk scény
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            <section
              className={styles.section}
              aria-labelledby={`${pkg.packageId}-scenes`}
            >
              <h3 id={`${pkg.packageId}-scenes`} className={styles.sectionTitle}>
                Creative Intent
              </h3>
              {review!.scenes.length === 0 ? (
                <p className={styles.muted}>This package has no scenes.</p>
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
                          {scene.intent.english_preview_outdated ? (
                            <span className={styles.metaChip}>EN outdated</span>
                          ) : null}
                        </header>
                        {isTypedOverlay(scene) ? (
                          <p className={styles.muted}>
                            Typed overlay — Creative Intent is editorial. Structured
                            payload is preserved on Continue Generation.
                          </p>
                        ) : null}
                        <label className={styles.field}>
                          <span className={styles.label}>Original</span>
                          <textarea
                            className={styles.textarea}
                            value={scene.intent.original}
                            readOnly
                            rows={2}
                            aria-readonly="true"
                          />
                        </label>
                        <label className={styles.field}>
                          <span className={styles.label}>Localized</span>
                          <textarea
                            className={styles.textarea}
                            value={draft.intentLocalizedEdit}
                            onChange={(e) =>
                              updateScene(scene.id, {
                                intentLocalizedEdit: e.target.value,
                              })
                            }
                            rows={2}
                            disabled={isPending || review!.approved || readOnly}
                          />
                        </label>
                        <label className={styles.field}>
                          <span className={styles.label}>
                            English Preview
                            {scene.intent.english_preview_outdated
                              ? " (outdated)"
                              : ""}
                          </span>
                          <textarea
                            className={styles.textarea}
                            value={scene.intent.english_preview ?? ""}
                            readOnly
                            rows={2}
                            aria-readonly="true"
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
                            disabled={isPending || review!.approved || readOnly}
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
                Unsaved changes — Save refreshes English Preview automatically.
              </p>
            ) : null}

            {englishOutdated && !dirty ? (
              <p className={styles.muted} role="status">
                English preview is outdated — save Localized text to refresh translation.
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
                Saved.
              </p>
            ) : null}

            <div className={styles.actions}>
              <button
                type="button"
                className={styles.save}
                onClick={handleSave}
                disabled={isPending || !dirty || review!.approved || readOnly}
              >
                {isPending ? "Saving…" : "Save"}
              </button>
              <button
                type="button"
                className={styles.reset}
                onClick={handleReset}
                disabled={isPending || !dirty}
              >
                Discard
              </button>
              {!review!.approved ? (
                <button
                  type="button"
                  className={styles.approve}
                  onClick={handleApprove}
                  disabled={!canRunWorkflow || englishOutdated}
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
