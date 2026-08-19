"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DEFAULT_COMBINED_CASE_ID } from "@/lib/ai-media-benchmark/constants";
import type { CombinedScenePlan } from "@/lib/ai-media-benchmark/combinedPlan";
import type { AiMediaBenchmarkCombinedRunPublicView } from "@/lib/ai-media-benchmark/combinedTypes";
import {
  DEFAULT_SOUND_CASE_ID,
  DEFAULT_VOICE_CASE_ID,
  isTextToVideoBenchmarkSettings,
  type AiMediaBenchmarkRunPublicView,
} from "@/lib/ai-media-benchmark/types";
import styles from "./AiMediaBenchmarkPanel.module.css";

function newClientRequestId(): string {
  return crypto.randomUUID();
}

function runLabel(run: AiMediaBenchmarkRunPublicView): string {
  const model = run.model;
  const when = run.createdAt.slice(0, 16).replace("T", " ");
  const mode = isTextToVideoBenchmarkSettings(run.settings)
    ? "text_to_video"
    : "image_to_video";
  return `${model} · ${mode} · ${run.status} · ${when}`;
}

function Stars({
  value,
  onChange,
}: {
  value: number | null;
  onChange: (n: number) => void;
}) {
  return (
    <div className={styles.stars}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          className={value && value >= n ? styles.starOn : styles.star}
          onClick={() => onChange(n)}
        >
          ★
        </button>
      ))}
    </div>
  );
}

export function CombinedRoundSection({ projectId }: { projectId: string }) {
  const [videos, setVideos] = useState<AiMediaBenchmarkRunPublicView[]>([]);
  const [voices, setVoices] = useState<AiMediaBenchmarkRunPublicView[]>([]);
  const [sounds, setSounds] = useState<AiMediaBenchmarkRunPublicView[]>([]);
  const [combined, setCombined] = useState<AiMediaBenchmarkCombinedRunPublicView[]>([]);
  const [videoRunId, setVideoRunId] = useState("");
  const [voiceRunId, setVoiceRunId] = useState("");
  const [soundRunId, setSoundRunId] = useState("");
  const [plan, setPlan] = useState<CombinedScenePlan | null>(null);
  const [active, setActive] = useState<AiMediaBenchmarkCombinedRunPublicView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const clientRequestIdRef = useRef(newClientRequestId());
  const submitLock = useRef(false);

  const loadCombined = useCallback(async (pid: string) => {
    const res = await fetch(
      `/api/admin/ai-media-benchmark/combined?projectId=${encodeURIComponent(pid)}&caseId=${encodeURIComponent(DEFAULT_COMBINED_CASE_ID)}`,
    );
    if (!res.ok) return;
    const data = (await res.json()) as { runs?: AiMediaBenchmarkCombinedRunPublicView[] };
    setCombined(data.runs ?? []);
  }, []);

  useEffect(() => {
    if (!projectId) return;
    let cancelled = false;
    void (async () => {
      const load = async (testType: string, caseId?: string) => {
        const params = new URLSearchParams({
          projectId,
          testType,
        });
        if (caseId) params.set("caseId", caseId);
        const res = await fetch(
          `/api/admin/ai-media-benchmark/runs?${params.toString()}`,
        );
        if (!res.ok) return [] as AiMediaBenchmarkRunPublicView[];
        const data = (await res.json()) as { runs?: AiMediaBenchmarkRunPublicView[] };
        return (data.runs ?? []).filter((r) => r.status === "succeeded" && r.outputPath);
      };
      const [v, vo, s] = await Promise.all([
        load("video"),
        load("voice", DEFAULT_VOICE_CASE_ID),
        load("sound", DEFAULT_SOUND_CASE_ID),
      ]);
      if (cancelled) return;
      setVideos(v);
      setVoices(vo);
      setSounds(s);
      setVideoRunId((cur) => cur || v[0]?.id || "");
      setVoiceRunId((cur) => cur || vo[0]?.id || "");
      await loadCombined(projectId);
    })();
    return () => {
      cancelled = true;
    };
  }, [projectId, loadCombined]);

  useEffect(() => {
    if (!projectId || !videoRunId || !voiceRunId) return;
    let cancelled = false;
    const params = new URLSearchParams({
      projectId,
      videoRunId,
      voiceRunId,
    });
    if (soundRunId) params.set("soundRunId", soundRunId);
    void (async () => {
      const res = await fetch(`/api/admin/ai-media-benchmark/combined/preview?${params}`);
      const data = (await res.json()) as { plan?: CombinedScenePlan; error?: string };
      if (cancelled) return;
      setPlan(res.ok ? (data.plan ?? null) : null);
    })();
    return () => {
      cancelled = true;
    };
  }, [projectId, videoRunId, voiceRunId, soundRunId]);

  const selectedVideo = useMemo(
    () => videos.find((r) => r.id === videoRunId) ?? null,
    [videos, videoRunId],
  );

  async function assembleOne(): Promise<void> {
    if (submitLock.current || submitting) return;
    submitLock.current = true;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/ai-media-benchmark/combined", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          projectId,
          videoRunId,
          voiceRunId,
          soundRunId: soundRunId || null,
          clientRequestId: clientRequestIdRef.current,
        }),
      });
      const data = (await res.json()) as {
        run?: AiMediaBenchmarkCombinedRunPublicView;
        error?: string;
      };
      if (!res.ok || !data.run) {
        setError(
          data.error === "voiceover_too_long_for_scene"
            ? "Hlas je delší než 3,90 s. Voiceover se neořízne ani nezrychlí (voiceover_too_long_for_scene)."
            : data.error === "combined_request_input_mismatch"
              ? "Stejný client_request_id už patří jiným vstupům (combined_request_input_mismatch)."
              : (data.error ?? "Sestavení selhalo"),
        );
        setSubmitting(false);
        return;
      }
      setActive(data.run);
      if (data.run.status === "succeeded") {
        clientRequestIdRef.current = newClientRequestId();
        await loadCombined(projectId);
        setSubmitting(false);
        return;
      }
      if (data.run.status === "failed") {
        setError(data.run.errorMessage ?? data.run.failureCode ?? "Sestavení selhalo");
        setSubmitting(false);
        return;
      }
      await loadCombined(projectId);
      setSubmitting(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sestavení selhalo");
      setSubmitting(false);
    } finally {
      submitLock.current = false;
    }
  }

  async function saveRatings(
    run: AiMediaBenchmarkCombinedRunPublicView,
    patch: Partial<{
      ratingImage: number;
      ratingAvFit: number;
      ratingOverall: number;
      note: string;
    }>,
  ): Promise<void> {
    const res = await fetch(
      `/api/admin/ai-media-benchmark/combined/${encodeURIComponent(run.id)}/rate`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ projectId: run.projectId, ...patch, note: patch.note ?? run.note }),
      },
    );
    const data = (await res.json()) as {
      run?: AiMediaBenchmarkCombinedRunPublicView;
      error?: string;
    };
    if (!res.ok || !data.run) {
      setError(data.error ?? "Hodnocení se neuložilo");
      return;
    }
    setCombined((prev) => prev.map((item) => (item.id === data.run!.id ? data.run! : item)));
    if (active?.id === data.run.id) setActive(data.run);
  }

  return (
    <>
      <p className={styles.roundNote}>
        Kolo A+ sestaví jednu 4s scénu z už hotových výstupů. Není to placené
        provider volání. Lze vybrat image-to-video i succeeded text-to-video
        run. Hlasový výstup smí mít maximálně 3,90 s — delší hlas se neořízne
        ani nezrychlí a sestavení ho odmítne. Pro srovnání video modelů
        použijte stejný hlasový run. Pro Gen-4.5 bez modelového audia stejný
        sound run. Veo a Seedance se hodnotí s vlastním generovaným ambientním
        zvukem — společný sound se jim automaticky nepřidává. Hodnocení obrazu
        držte oddělené od celkového dojmu.
      </p>
      <label className={styles.field}>
        <span className={styles.label}>Hotový video run</span>
        <select
          className={styles.select}
          value={videoRunId}
          onChange={(e) => setVideoRunId(e.target.value)}
        >
          <option value="">Vyberte video</option>
          {videos.map((r) => (
            <option key={r.id} value={r.id}>
              {runLabel(r)}
            </option>
          ))}
        </select>
      </label>
      <label className={styles.field}>
        <span className={styles.label}>Stejný hotový hlasový run</span>
        <select
          className={styles.select}
          value={voiceRunId}
          onChange={(e) => setVoiceRunId(e.target.value)}
        >
          <option value="">Vyberte hlas</option>
          {voices.map((r) => (
            <option key={r.id} value={r.id}>
              {runLabel(r)}
            </option>
          ))}
        </select>
      </label>
      <label className={styles.field}>
        <span className={styles.label}>Sound run (volitelně, hlavně Gen-4)</span>
        <select
          className={styles.select}
          value={soundRunId}
          onChange={(e) => setSoundRunId(e.target.value)}
        >
          <option value="">Bez společného soundu</option>
          {sounds.map((r) => (
            <option key={r.id} value={r.id}>
              {runLabel(r)}
            </option>
          ))}
        </select>
      </label>
      {plan && (
        <dl className={styles.readonly}>
          {plan.layers.map((layer) => (
            <div key={layer.kind}>
              <dt>{layer.kind}</dt>
              <dd>
                {layer.used ? "Použije se" : "Nepoužije se"} · {layer.label}
                {layer.gain != null ? ` · gain ${layer.gain}` : ""}
                {layer.duckedUnderVoiceover ? " · pod hlasem" : ""}
              </dd>
            </div>
          ))}
          <div>
            <dt>Délka</dt>
            <dd>{plan.targetDurationSeconds} s · voiceover od {plan.voiceoverStartSeconds} s</dd>
          </div>
          {selectedVideo && (
            <div>
              <dt>Video model</dt>
              <dd>
                {selectedVideo.model}
                {isTextToVideoBenchmarkSettings(selectedVideo.settings)
                  ? " · text_to_video"
                  : " · image_to_video"}
              </dd>
            </div>
          )}
        </dl>
      )}
      {error && <p className={styles.error}>{error}</p>}
      <button
        className={styles.primary}
        type="button"
        disabled={!projectId || !videoRunId || !voiceRunId || submitting}
        onClick={() => void assembleOne()}
      >
        Sestavit kombinovanou scénu
      </button>
      {active && (
        <CombinedResultCard run={active} onRate={saveRatings} />
      )}
      <div className={styles.compare}>
        {combined.map((run) => (
          <div key={run.id} className={styles.compareItem}>
            <strong>{run.videoRunId.slice(0, 8)}</strong>
            <span className={styles.meta}>
              {run.status}
              {run.ratingOverall ? ` · dojem ${run.ratingOverall}/5` : ""}
            </span>
            {run.playbackUrl && (
              <video className={styles.video} src={run.playbackUrl} controls />
            )}
          </div>
        ))}
      </div>
    </>
  );
}

function CombinedResultCard({
  run,
  onRate,
}: {
  run: AiMediaBenchmarkCombinedRunPublicView;
  onRate: (
    run: AiMediaBenchmarkCombinedRunPublicView,
    patch: Partial<{
      ratingImage: number;
      ratingAvFit: number;
      ratingOverall: number;
      note: string;
    }>,
  ) => Promise<void>;
}) {
  const [note, setNote] = useState(run.note ?? "");
  return (
    <div>
      <p className={styles.meta}>
        Stav: {run.status}
        {run.failureCode ? ` · ${run.failureCode}` : ""}
      </p>
      {run.playbackUrl && (
        <video className={styles.video} src={run.playbackUrl} controls />
      )}
      <p className={styles.meta}>Obraz (odděleně od celkového dojmu)</p>
      <Stars
        value={run.ratingImage}
        onChange={(n) => void onRate(run, { ratingImage: n, note })}
      />
      <p className={styles.meta}>Soulad zvuku a obrazu</p>
      <Stars
        value={run.ratingAvFit}
        onChange={(n) => void onRate(run, { ratingAvFit: n, note })}
      />
      <p className={styles.meta}>Celkový dojem</p>
      <Stars
        value={run.ratingOverall}
        onChange={(n) => void onRate(run, { ratingOverall: n, note })}
      />
      <textarea
        className={styles.note}
        maxLength={500}
        placeholder="Krátká interní poznámka"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        onBlur={() => {
          if (run.ratingImage || run.ratingAvFit || run.ratingOverall) {
            void onRate(run, { note });
          }
        }}
      />
    </div>
  );
}
