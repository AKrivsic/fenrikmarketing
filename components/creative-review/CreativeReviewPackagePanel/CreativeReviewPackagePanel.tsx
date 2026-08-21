"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import {
  approveCreativeReviewPackageAction,
  restoreCanonicalVideoPlanAction,
  saveCreativeReviewPackageAction,
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
import { textToVideoOperatorApprovalState } from "@/lib/content-package/textToVideoManualReview";
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
  soundMode: "none" | "custom";
  soundEffectDescription: string;
  soundAnchor: string;
  voicePhrase: string;
}

function buildSceneDrafts(
  review: CreativeReview,
  t2v?: CreativeReviewPackageView["videoCreativeSummary"],
): SceneDraft[] {
  return review.scenes.map((scene) => {
    const overlay = t2v?.scenes.find((item) => item.sceneId === scene.id);
    return {
      id: scene.id,
      intentLocalizedEdit: scene.intent.localized_edit,
      directorNotes: scene.director_notes,
      soundMode: overlay?.soundMode === "custom" ? "custom" : "none",
      soundEffectDescription: overlay?.soundEffectDescription ?? "",
      soundAnchor: overlay?.soundAnchor ?? "scene_beginning",
      voicePhrase: overlay?.voicePhrase ?? "",
    };
  });
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

function t2vApprovalLabel(state: string): string {
  if (state === "waiting_for_translation") return "Čeká na překlad";
  if (state === "ready_to_approve") return "Připraveno ke schválení";
  if (state === "approved") return "Schváleno";
  if (state === "stale_after_change") return "Zastaralé po změně";
  return "Rozpracováno";
}

function musicOperatorLabel(mode: string | null): string {
  if (mode === "eleven_generated") return "Hudba: ElevenLabs";
  if (mode === "existing_asset") return "Hudba: existující asset";
  return "Bez hudby";
}

function sceneDurationLabel(
  seconds: number,
  timingStatus: string | null,
): string {
  const rounded = Math.round(seconds * 10) / 10;
  const suffix =
    timingStatus === "measured" ? "změřená délka" : "předběžný odhad";
  return `${rounded} s · ${suffix}`;
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
    review ? buildSceneDrafts(review, pkg.videoCreativeSummary) : [],
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

  /* eslint-disable react-hooks/set-state-in-effect -- hydrate controlled drafts from the persisted package after Save/Restore */
  useEffect(() => {
    const summary = pkg.videoCreativeSummary;
    setVoiceStyle(summary?.voiceDirection?.style ?? "auto");
    setVoiceInstruction(summary?.voiceDirection?.custom_instruction ?? "");
    if (!pkg.creativeReview) {
      setVoiceoverEdit("");
      setSceneDrafts([]);
      setServerIssues(pkg.validationIssues);
      return;
    }
    setVoiceoverEdit(pkg.creativeReview.voiceover.localized_edit);
    setSceneDrafts(buildSceneDrafts(pkg.creativeReview, summary));
    setServerIssues(pkg.validationIssues);
  }, [pkg]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const isT2v = pkg.packageVideoMode === "text_to_video";

  const dirty = useMemo(() => {
    if (!review || readOnly) return false;
    const contentDirty = !draftsEqual(voiceoverEdit, sceneDrafts, review);
    if (!isT2v) return contentDirty;
    const voiceDirty =
      voiceStyle !== (t2v?.voiceDirection?.style ?? "auto") ||
      voiceInstruction !== (t2v?.voiceDirection?.custom_instruction ?? "");
    const soundDirty = sceneDrafts.some((draft) => {
      const overlay = t2v?.scenes.find((item) => item.sceneId === draft.id);
      const expectedMode = overlay?.soundMode === "custom" ? "custom" : "none";
      return (
        draft.soundMode !== expectedMode ||
        (draft.soundEffectDescription ?? "") !==
          (overlay?.soundEffectDescription ?? "") ||
        (draft.voicePhrase ?? "") !== (overlay?.voicePhrase ?? "")
      );
    });
    return contentDirty || voiceDirty || soundDirty;
  }, [
    review,
    voiceoverEdit,
    sceneDrafts,
    readOnly,
    isT2v,
    voiceStyle,
    voiceInstruction,
    t2v,
  ]);

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
  const t2vState =
    isT2v && t2v && review
      ? textToVideoOperatorApprovalState({
          review,
          planStatus: t2v.planStatus,
          repetitionStatus: t2v.repetitionStatus,
          origin: t2v.origin,
          sceneVoiceoverBinding: t2v.sceneVoiceoverBinding,
          canRestoreCanonicalPlan: t2v.canRestoreCanonicalPlan,
        })
      : null;
  const t2vApproveBlocked =
    isT2v &&
    (Boolean(t2v?.canRestoreCanonicalPlan) ||
      t2v?.origin === "sentence_fallback" ||
      t2v?.sceneVoiceoverBinding === "needs_review" ||
      !t2v?.voiceCategoryLabel ||
      t2vState === "in_progress" ||
      t2vState === "waiting_for_translation" ||
      Boolean(
        review?.scenes.some((scene) => scene.intent.english_preview_outdated),
      ));
  const t2vSceneCount = review?.scenes.length ?? t2v?.scenes.length ?? 0;

  const duration = useMemo(() => {
    if (!review) return null;
    return computeCreativeReviewDurationEstimate({
      originalAi: review.voiceover.original_ai,
      localizedEdit: voiceoverEdit,
    });
  }, [review, voiceoverEdit]);

  function updateScene(
    sceneId: string,
    patch: Partial<SceneDraft>,
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
          ...(isT2v
            ? {
                voiceDirectionStyle: voiceStyle,
                voiceDirectionInstruction: voiceInstruction,
                confirmSceneVoiceoverBinding: true,
                sceneSounds: Object.fromEntries(
                  sceneDrafts.map((scene) => [
                    scene.id,
                    {
                      mode: scene.soundMode,
                      ...(scene.soundEffectDescription.trim()
                        ? {
                            custom_effect_description:
                              scene.soundEffectDescription.trim(),
                          }
                        : {}),
                      ...(scene.soundAnchor
                        ? { anchor: scene.soundAnchor }
                        : {}),
                      ...(scene.voicePhrase.trim()
                        ? { voice_phrase: scene.voicePhrase.trim() }
                        : {}),
                    },
                  ]),
                ),
              }
            : {}),
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
    setSceneDrafts(buildSceneDrafts(review, t2v));
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
        {t2vState ? (
          <span
            className={styles.pill}
            data-tone={
              t2vState === "approved"
                ? "ok"
                : t2vState === "ready_to_approve"
                  ? "ready"
                  : "waiting"
            }
          >
            T2V: {t2vApprovalLabel(t2vState)}
          </span>
        ) : null}
        <span className={styles.pill} data-tone={pkg.voiceoverStatus}>
          VO: {voiceoverStatusLabel}
        </span>
        <span className={styles.pill}>
          Scenes: {isT2v ? t2vSceneCount : pkg.sceneCount}
        </span>
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
                <span className={styles.label}>
                  {isT2v ? "Pracovní verze (čeština)" : "Localized"}
                </span>
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
                  {isT2v
                    ? `Finální produkční verze (angličtina)${
                        review!.voiceover.english_preview_outdated
                          ? " — zastaralá"
                          : ""
                      }`
                    : `English Preview${
                        review!.voiceover.english_preview_outdated
                          ? " (outdated)"
                          : ""
                      }`}
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
              {isT2v ? (
                <p className={styles.muted} role="status">
                  {englishOutdated
                    ? "Stav překladu: čeká na překlad — uložte pracovní text."
                    : englishConfirmed
                      ? "Stav překladu: aktuální anglická produkční verze."
                      : "Stav překladu: čeká na překlad."}
                </p>
              ) : (
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
              )}
            </section>

            {isT2v && t2v ? (
              <>
                <section
                  className={styles.section}
                  aria-labelledby={`${pkg.packageId}-voice`}
                >
                  <h3 id={`${pkg.packageId}-voice`} className={styles.sectionTitle}>
                    Hlas
                  </h3>
                  <p className={styles.muted}>
                    Jazyk: {t2v.voiceLanguageLabel ?? "—"}
                  </p>
                  <p className={styles.muted}>
                    Kategorie hlasu: {t2v.voiceCategoryLabel ?? "—"}
                  </p>
                  <label className={styles.field}>
                    <span className={styles.label}>Emoce / režie</span>
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
                </section>

                <section
                  className={styles.section}
                  aria-labelledby={`${pkg.packageId}-t2v-scenes`}
                >
                  <h3
                    id={`${pkg.packageId}-t2v-scenes`}
                    className={styles.sectionTitle}
                  >
                    Video scény
                  </h3>
                  {t2v.canRestoreCanonicalPlan ? (
                    <p className={styles.muted} role="status">
                      Tento draft vznikl rozdělením voiceoveru. Obnovte videoplán
                      z původního Claude storyboardu, pak uložte a schvalte.{" "}
                      <button
                        type="button"
                        className={styles.save}
                        disabled={!editable || isPending || !review}
                        onClick={() => {
                          if (!review) return;
                          startTransition(async () => {
                            const result = await restoreCanonicalVideoPlanAction(
                              projectId,
                              runId,
                              pkg.packageId,
                              review.version,
                            );
                            handleMutationResult(result);
                          });
                        }}
                      >
                        Obnovit videoplán z původního storyboardu
                      </button>
                    </p>
                  ) : null}
                  {t2v.sceneVoiceoverBinding === "needs_review" ? (
                    <p className={styles.muted} role="status">
                      Voiceover se změnil — zkontrolujte, že scény stále sedí,
                      pak uložte. Approve je zakázáno, dokud vazbu nepotvrdíte.
                    </p>
                  ) : null}
                  {t2v.t2vRepetitionBlockedBanner ? (
                    <p className={styles.muted}>{t2v.t2vRepetitionBlockedBanner}</p>
                  ) : null}
                  <ul className={styles.sceneList}>
                    {review!.scenes.map((scene, index) => {
                      const draft = sceneDrafts.find((item) => item.id === scene.id);
                      const overlay = t2v.scenes.find(
                        (item) => item.sceneId === scene.id,
                      );
                      if (!draft) return null;
                      return (
                        <li key={scene.id} className={styles.sceneCard}>
                          <strong>Scéna {index + 1}</strong>
                          <p className={styles.muted}>
                            Část voiceoveru: {overlay?.voiceoverExcerpt || "—"}
                          </p>
                          <p className={styles.muted}>
                            {overlay
                              ? sceneDurationLabel(
                                  overlay.approximateDurationSeconds,
                                  t2v.timingStatus,
                                )
                              : "Délka: —"}
                          </p>
                          <label className={styles.field}>
                            <span className={styles.label}>
                              Co se ve scéně děje (čeština)
                            </span>
                            <textarea
                              className={styles.textarea}
                              rows={3}
                              value={draft.intentLocalizedEdit}
                              disabled={!editable || isPending}
                              onChange={(e) =>
                                updateScene(scene.id, {
                                  intentLocalizedEdit: e.target.value,
                                })
                              }
                            />
                          </label>
                          <label className={styles.field}>
                            <span className={styles.label}>
                              Anglická produkční verze
                            </span>
                            <textarea
                              className={styles.textarea}
                              rows={2}
                              value={scene.intent.english_preview ?? ""}
                              readOnly
                              aria-readonly="true"
                            />
                          </label>
                          <p className={styles.muted}>
                            Pohyb / změna: {overlay?.motionPrompt || "—"}
                          </p>
                          <label className={styles.field}>
                            <span className={styles.label}>Zvuk</span>
                            <select
                              className={styles.textarea}
                              value={draft.soundMode}
                              disabled={!editable || isPending}
                              onChange={(e) =>
                                updateScene(scene.id, {
                                  soundMode:
                                    e.target.value === "custom"
                                      ? "custom"
                                      : "none",
                                })
                              }
                            >
                              <option value="none">Bez zvukového efektu</option>
                              <option value="custom">Vlastní efekt</option>
                            </select>
                          </label>
                          <label className={styles.field}>
                            <span className={styles.label}>Popis efektu</span>
                            <textarea
                              className={styles.textarea}
                              rows={2}
                              value={draft.soundEffectDescription}
                              disabled={!editable || isPending}
                              onChange={(e) =>
                                updateScene(scene.id, {
                                  soundEffectDescription: e.target.value,
                                })
                              }
                              placeholder="Jen pokud je zvolen vlastní efekt"
                            />
                          </label>
                          <details className={styles.diagnostics}>
                            <summary>Technický Runway prompt (jen anglicky)</summary>
                            <pre>{overlay?.providerPrompt ?? ""}</pre>
                          </details>
                        </li>
                      );
                    })}
                  </ul>
                </section>

                <section
                  className={styles.section}
                  aria-labelledby={`${pkg.packageId}-t2v-run`}
                >
                  <h3 id={`${pkg.packageId}-t2v-run`} className={styles.sectionTitle}>
                    Kontrola a spuštění
                  </h3>
                  <p className={styles.muted}>{musicOperatorLabel(t2v.musicMode)}</p>
                  {t2v.budgetEstimateLabel ? (
                    <p className={styles.muted}>{t2v.budgetEstimateLabel}</p>
                  ) : (
                    <p className={styles.muted}>Odhad ceny: —</p>
                  )}
                  <p className={styles.muted}>
                    Rozpočet:{" "}
                    {typeof t2v.maxBudgetUsd === "number"
                      ? `${t2v.maxBudgetUsd.toFixed(2)} USD`
                      : "není nastaven"}
                  </p>
                  <p className={styles.muted}>
                    Stav schválení: {t2vState ? t2vApprovalLabel(t2vState) : "—"}
                    {t2v.hook ? ` · Hook: ${t2v.hook}` : ""}
                  </p>
                  <p className={styles.muted}>
                    Continue Generation je v záhlaví běhu. Použije schválený T2V
                    plán beze změny a bez nového překladu.
                  </p>
                </section>
              </>
            ) : null}

            {!isT2v ? (
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
            ) : null}

            {!isT2v ? (
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
            ) : null}

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
                disabled={
                  isPending ||
                  !dirty ||
                  review!.approved ||
                  readOnly ||
                  Boolean(isT2v && t2v?.canRestoreCanonicalPlan)
                }
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
                  disabled={!canRunWorkflow || englishOutdated || t2vApproveBlocked}
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
