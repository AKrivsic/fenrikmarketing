"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  formatRunwayTestCostLabel,
  RUNWAY_SCENE_TEST_CONFIG,
  RUNWAY_SCENE_TEST_COST,
} from "@/lib/runway-test/config";
import { RUNWAY_TEST_PRICING } from "@/lib/runway-test/constants";
import type {
  RunwayTestJobPublicView,
  RunwayTestSceneOption,
} from "@/lib/runway-test/types";
import styles from "./RunwayTestPanel.module.css";

export interface RunwayTestProjectOption {
  id: string;
  name: string;
}

interface Props {
  projects: RunwayTestProjectOption[];
  initialJobs: RunwayTestJobPublicView[];
}

function newClientRequestId(): string {
  return crypto.randomUUID();
}

export function RunwayTestPanel({ projects, initialJobs }: Props) {
  const [projectId, setProjectId] = useState("");
  const [scenes, setScenes] = useState<RunwayTestSceneOption[]>([]);
  const [scenesLoading, setScenesLoading] = useState(false);
  const [sceneKey, setSceneKey] = useState("");
  const [motionPrompt, setMotionPrompt] = useState("");
  const [jobs, setJobs] = useState(initialJobs);
  const [activeJob, setActiveJob] = useState<RunwayTestJobPublicView | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const submitLock = useRef(false);
  const clientRequestIdRef = useRef(newClientRequestId());
  const pollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const selectedScene = useMemo(
    () => scenes.find((s) => `${s.videoJobId}::${s.sceneId}` === sceneKey) ?? null,
    [scenes, sceneKey],
  );

  const loadScenes = useCallback(async (pid: string) => {
    setScenesLoading(true);
    setScenes([]);
    setSceneKey("");
    setError(null);
    try {
      const res = await fetch(
        `/api/admin/runway-test/scenes?projectId=${encodeURIComponent(pid)}`,
      );
      const data = (await res.json()) as {
        scenes?: RunwayTestSceneOption[];
        error?: string;
      };
      if (!res.ok) {
        setError(data.error ?? "Nepodařilo se načíst scény");
        return;
      }
      setScenes(data.scenes ?? []);
    } catch {
      setError("Nepodařilo se načíst scény");
    } finally {
      setScenesLoading(false);
    }
  }, []);

  function onProjectChange(nextId: string): void {
    setProjectId(nextId);
    setSceneKey("");
    setScenes([]);
    setConfirmOpen(false);
    if (nextId) void loadScenes(nextId);
  }

  const refreshHistory = useCallback(async (pid?: string) => {
    const qs = pid ? `?projectId=${encodeURIComponent(pid)}` : "";
    const res = await fetch(`/api/admin/runway-test/jobs${qs}`);
    if (!res.ok) return;
    const data = (await res.json()) as { jobs?: RunwayTestJobPublicView[] };
    setJobs(data.jobs ?? []);
  }, []);

  const stopPolling = useCallback(() => {
    if (pollTimer.current) {
      clearTimeout(pollTimer.current);
      pollTimer.current = null;
    }
  }, []);

  const pollStatus = useCallback(
    (job: RunwayTestJobPublicView) => {
      stopPolling();
      const tick = async () => {
        try {
          const res = await fetch(
            `/api/admin/runway-test/${encodeURIComponent(job.id)}/status?projectId=${encodeURIComponent(job.projectId)}`,
          );
          const data = (await res.json()) as {
            job?: RunwayTestJobPublicView;
            error?: string;
          };
          if (!res.ok || !data.job) {
            setError(data.error ?? "Status selhal");
            setSubmitting(false);
            return;
          }
          setActiveJob(data.job);
          await refreshHistory(data.job.projectId);
          const terminal = [
            "succeeded",
            "failed",
            "cancelled",
            "download_failed",
          ].includes(data.job.status);
          if (terminal) {
            setSubmitting(false);
            clientRequestIdRef.current = newClientRequestId();
            return;
          }
          pollTimer.current = setTimeout(() => {
            void tick();
          }, 2500);
        } catch {
          setError("Status selhal");
          setSubmitting(false);
        }
      };
      void tick();
    },
    [refreshHistory, stopPolling],
  );

  useEffect(() => () => stopPolling(), [stopPolling]);

  async function runCreate(): Promise<void> {
    if (submitLock.current || submitting) return;
    if (!selectedScene || !projectId) {
      setError("Vyberte projekt a scénu");
      return;
    }
    if (!motionPrompt.trim()) {
      setError("Motion prompt je povinný");
      return;
    }
    if (motionPrompt.trim().length > RUNWAY_SCENE_TEST_CONFIG.motionPromptMaxUtf16) {
      setError("Motion prompt je příliš dlouhý");
      return;
    }

    submitLock.current = true;
    setSubmitting(true);
    setConfirmOpen(false);
    setError(null);

    try {
      const res = await fetch("/api/admin/runway-test/create", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          projectId,
          videoJobId: selectedScene.videoJobId,
          sceneId: selectedScene.sceneId,
          motionPrompt: motionPrompt.trim(),
          clientRequestId: clientRequestIdRef.current,
          confirmPaidGeneration: true,
        }),
      });
      const data = (await res.json()) as {
        job?: RunwayTestJobPublicView;
        error?: string;
      };
      if (!res.ok || !data.job) {
        setError(data.error ?? "Create selhal");
        setSubmitting(false);
        submitLock.current = false;
        return;
      }
      setActiveJob(data.job);
      await refreshHistory(data.job.projectId);
      if (
        data.job.status === "succeeded" ||
        data.job.status === "failed" ||
        data.job.status === "cancelled" ||
        data.job.status === "download_failed"
      ) {
        setSubmitting(false);
        clientRequestIdRef.current = newClientRequestId();
      } else {
        pollStatus(data.job);
      }
    } catch {
      setError("Create selhal");
      setSubmitting(false);
    } finally {
      submitLock.current = false;
    }
  }

  return (
    <div className={styles.wrap}>
      <section className={styles.card}>
        <h2 className={styles.title}>Runway — test jedné scény</h2>
        <p className={styles.description}>
          Interní test: jeden existující still → jeden 5s{" "}
          <code>gen4_turbo</code> klip. Generace se nespouští při načtení ani
          změně formuláře — pouze po potvrzení placené akce.
        </p>

        <label className={styles.field}>
          <span className={styles.label}>Projekt</span>
          <select
            className={styles.select}
            value={projectId}
            onChange={(e) => onProjectChange(e.target.value)}
            disabled={submitting}
          >
            <option value="">— vyberte —</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>

        <label className={styles.field}>
          <span className={styles.label}>Scéna (video job + still)</span>
          <select
            className={styles.select}
            value={sceneKey}
            onChange={(e) => setSceneKey(e.target.value)}
            disabled={!projectId || scenesLoading || submitting}
          >
            <option value="">
              {scenesLoading
                ? "Načítám…"
                : scenes.length === 0
                  ? "Žádné použitelné scény"
                  : "— vyberte —"}
            </option>
            {scenes.map((s) => (
              <option
                key={`${s.videoJobId}::${s.sceneId}`}
                value={`${s.videoJobId}::${s.sceneId}`}
              >
                {s.sceneId} · job {s.videoJobId.slice(0, 8)}… ·{" "}
                {new Date(s.videoJobCreatedAt).toLocaleString()}
              </option>
            ))}
          </select>
        </label>

        {selectedScene?.previewUrl ? (
          <div className={styles.preview}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={selectedScene.previewUrl}
              alt={`Náhled ${selectedScene.sceneId}`}
              className={styles.previewImg}
            />
            <p className={styles.meta}>
              {selectedScene.imageBucket}/{selectedScene.imagePath}
            </p>
          </div>
        ) : null}

        <label className={styles.fieldWide}>
          <span className={styles.label}>
            Motion prompt (max {RUNWAY_SCENE_TEST_CONFIG.motionPromptMaxUtf16}{" "}
            UTF-16)
          </span>
          <textarea
            className={styles.textarea}
            rows={4}
            value={motionPrompt}
            onChange={(e) => setMotionPrompt(e.target.value)}
            disabled={submitting}
            placeholder="Příklad: Slow camera push-in, subtle product motion, soft daylight"
          />
        </label>

        <dl className={styles.readonly}>
          <div>
            <dt>Provider</dt>
            <dd>Runway</dd>
          </div>
          <div>
            <dt>Model</dt>
            <dd>{RUNWAY_SCENE_TEST_CONFIG.model}</dd>
          </div>
          <div>
            <dt>Duration</dt>
            <dd>{RUNWAY_SCENE_TEST_CONFIG.durationSeconds}s</dd>
          </div>
          <div>
            <dt>Ratio</dt>
            <dd>{RUNWAY_SCENE_TEST_CONFIG.ratio}</dd>
          </div>
          <div>
            <dt>Odhad ceny</dt>
            <dd>
              {RUNWAY_SCENE_TEST_COST.credits} kreditů ·{" "}
              {formatRunwayTestCostLabel()} ({RUNWAY_TEST_PRICING.creditsPerSecond}{" "}
              kred/s, ceník {RUNWAY_TEST_PRICING.asOfDate})
            </dd>
          </div>
        </dl>

        {!confirmOpen ? (
          <button
            type="button"
            className={styles.primary}
            disabled={
              submitting || !selectedScene || !motionPrompt.trim() || !projectId
            }
            onClick={() => setConfirmOpen(true)}
          >
            {RUNWAY_SCENE_TEST_CONFIG.buttonLabel}
          </button>
        ) : (
          <div className={styles.confirmBox}>
            <p className={styles.confirmText}>
              Potvrďte placenou generaci. Kliknutí odešle jeden Runway create
              request s odhadovanou cenou {formatRunwayTestCostLabel()} (
              {RUNWAY_SCENE_TEST_COST.credits} kreditů).
            </p>
            <div className={styles.actions}>
              <button
                type="button"
                className={styles.primary}
                disabled={submitting}
                onClick={() => void runCreate()}
              >
                {submitting
                  ? "Generuji…"
                  : `Potvrdit — ${formatRunwayTestCostLabel()}`}
              </button>
              <button
                type="button"
                className={styles.secondary}
                disabled={submitting}
                onClick={() => setConfirmOpen(false)}
              >
                Zrušit
              </button>
            </div>
          </div>
        )}

        {error ? <p className={styles.error}>{error}</p> : null}

        {activeJob ? (
          <div className={styles.active}>
            <h3 className={styles.subTitle}>Aktivní test</h3>
            <p className={styles.meta}>
              Stav: <strong>{activeJob.status}</strong>
              {activeJob.runwayTaskId
                ? ` · task ${activeJob.runwayTaskId}`
                : null}
              {activeJob.reusedExistingRequest
                ? " · stejný request (bez nového create)"
                : null}
            </p>
            {activeJob.errorMessage ? (
              <p className={styles.error}>{activeJob.errorMessage}</p>
            ) : null}
            {activeJob.playbackUrl ? (
              <video
                className={styles.video}
                src={activeJob.playbackUrl}
                controls
                playsInline
              />
            ) : null}
          </div>
        ) : null}
      </section>

      <section className={styles.card}>
        <h2 className={styles.title}>Historie testů</h2>
        {jobs.length === 0 ? (
          <p className={styles.description}>Zatím žádné testy.</p>
        ) : (
          <ul className={styles.history}>
            {jobs.map((job) => (
              <li key={job.id} className={styles.historyItem}>
                <div className={styles.historyHead}>
                  <span>{new Date(job.createdAt).toLocaleString()}</span>
                  <span className={styles.status}>{job.status}</span>
                  <span>
                    {job.estimatedCostUsd != null
                      ? `$${Number(job.estimatedCostUsd).toFixed(2)}`
                      : "—"}
                  </span>
                </div>
                <p className={styles.meta}>
                  project {job.projectId.slice(0, 8)}… · {job.sourceSceneId} ·{" "}
                  {job.model}
                </p>
                <p className={styles.prompt}>{job.motionPrompt}</p>
                {job.sourcePreviewUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={job.sourcePreviewUrl}
                    alt=""
                    className={styles.thumb}
                  />
                ) : null}
                {job.playbackUrl ? (
                  <video
                    className={styles.videoSmall}
                    src={job.playbackUrl}
                    controls
                    playsInline
                  />
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
