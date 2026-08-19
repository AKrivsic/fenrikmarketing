"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { BrandVisualProfile } from "@/lib/ai-media-benchmark/brandVisualProfile";
import type { TextToVideoPlusPlan } from "@/lib/ai-media-benchmark/textVideoPlus";
import {
  DEFAULT_TEXT_VIDEO_CASE_ID,
  isTextToVideoBenchmarkSettings,
  type AiMediaBenchmarkRunPublicView,
} from "@/lib/ai-media-benchmark/types";
import styles from "./AiMediaBenchmarkPanel.module.css";

interface TextVideoModel {
  modelId: string;
  displayName: string;
  status: string;
  returnsAudio: boolean;
  documentedImageReferences?: boolean;
  hasSeedField?: boolean;
  unsupportedReason: string | null;
  defaultQuote: {
    usd: number;
    credits: number;
    formula: string;
    generateAudio: boolean;
  } | null;
}

interface CatalogSlice {
  catalog: {
    roundT?: { totalUsd: number; totalCredits: number };
    textVideo?: TextVideoModel[];
  };
  flags: { textVideo?: boolean };
}

interface PreviewPayload {
  preview?: {
    profile: BrandVisualProfile;
    sceneIdeaId: string;
    sceneIdeaLabel: string;
    coreIdea: string;
    promptText: string;
    caseId: string;
    locked: boolean;
    lockedByModel: string | null;
    lockedByRunId: string | null;
    fromProjectData: boolean;
  };
  sceneIdeas?: Array<{ id: string; label: string; coreIdea: string }>;
  error?: string;
}

function newClientRequestId(): string {
  return crypto.randomUUID();
}

function newRoundTCaseId(): string {
  return `${DEFAULT_TEXT_VIDEO_CASE_ID}-${crypto.randomUUID()}`;
}

function mapTextVideoError(code: string | undefined, fallback: string): string {
  if (code === "benchmark_request_input_mismatch") {
    return "Stejné client_request_id už existuje s jinými vstupy (benchmark_request_input_mismatch). Provider POST neproběhl.";
  }
  if (code === "round_t_case_snapshot_conflict") {
    return "Existují konfliktní snapshoty tohoto Kola T (round_t_case_snapshot_conflict). Nic se nehádá a nic se neodesílá.";
  }
  if (code === "round_t_scene_idea_locked") {
    return "Scénická myšlenka tohoto Kola T je uzamčená. Pro jinou myšlenku začněte nové Kolo T s novým case_id.";
  }
  return code || fallback;
}

function profileSummary(profile: BrandVisualProfile): string {
  const color = profile.primaryColor
    ? `${profile.primaryColor}${profile.secondaryColor ? ` / ${profile.secondaryColor}` : ""}`
    : "bez ověřených hex barev (oborový fallback)";
  return `${profile.industryHint ?? "oborový fallback"} · ${color}`;
}

export function TextVideoRoundSection({
  projectId,
  catalog,
}: {
  projectId: string;
  catalog: CatalogSlice;
}) {
  const models = (catalog.catalog.textVideo ?? []).filter((m) => m.status === "testable");
  const [modelId, setModelId] = useState(models[0]?.modelId ?? "");
  const [caseId, setCaseId] = useState(DEFAULT_TEXT_VIDEO_CASE_ID);
  const [sceneIdeaId, setSceneIdeaId] = useState("arrival-and-task");
  const [ideas, setIdeas] = useState<Array<{ id: string; label: string; coreIdea: string }>>([]);
  const [promptText, setPromptText] = useState("");
  const [profile, setProfile] = useState<BrandVisualProfile | null>(null);
  const [locked, setLocked] = useState(false);
  const [lockedByModel, setLockedByModel] = useState<string | null>(null);
  const [plusPlan, setPlusPlan] = useState<TextToVideoPlusPlan | null>(null);
  const [runs, setRuns] = useState<AiMediaBenchmarkRunPublicView[]>([]);
  const [active, setActive] = useState<AiMediaBenchmarkRunPublicView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [previewNonce, setPreviewNonce] = useState(0);
  const submitLock = useRef(false);
  const clientRequestIdRef = useRef(newClientRequestId());
  const pollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const selected = models.find((m) => m.modelId === modelId) ?? models[0] ?? null;
  const flagOn = catalog.flags.textVideo === true;
  const roundTMax = catalog.catalog.roundT?.totalUsd ?? null;

  const refreshRuns = useCallback(async (pid: string, roundCaseId: string) => {
    const res = await fetch(
      `/api/admin/ai-media-benchmark/runs?projectId=${encodeURIComponent(pid)}&testType=video&caseId=${encodeURIComponent(roundCaseId)}`,
    );
    if (!res.ok) return;
    const data = (await res.json()) as { runs?: AiMediaBenchmarkRunPublicView[] };
    setRuns(data.runs ?? []);
  }, []);

  useEffect(() => {
    if (!projectId) return;
    let cancelled = false;
    void (async () => {
      const params = new URLSearchParams({
        projectId,
        sceneIdeaId,
        caseId,
      });
      const [previewRes, plusRes] = await Promise.all([
        fetch(`/api/admin/ai-media-benchmark/text-video/preview?${params.toString()}`),
        fetch("/api/admin/ai-media-benchmark/text-video-plus"),
      ]);
      const previewData = (await previewRes.json()) as PreviewPayload;
      const plusData = (await plusRes.json()) as { plan?: TextToVideoPlusPlan };
      if (cancelled) return;
      if (!previewRes.ok) {
        setError(mapTextVideoError(previewData.error, "Náhled promptu selhal"));
        return;
      }
      setError(null);
      setProfile(previewData.preview?.profile ?? null);
      setPromptText(previewData.preview?.promptText ?? "");
      setIdeas(previewData.sceneIdeas ?? []);
      setLocked(previewData.preview?.locked === true);
      setLockedByModel(previewData.preview?.lockedByModel ?? null);
      if (previewData.preview?.sceneIdeaId) {
        setSceneIdeaId(previewData.preview.sceneIdeaId);
      }
      setPlusPlan(plusData.plan ?? null);
      await refreshRuns(projectId, caseId);
    })();
    return () => {
      cancelled = true;
    };
  }, [projectId, sceneIdeaId, caseId, previewNonce, refreshRuns]);

  const stopPolling = useCallback(() => {
    if (pollTimer.current) {
      clearTimeout(pollTimer.current);
      pollTimer.current = null;
    }
  }, []);

  const pollStatus = useCallback(
    (run: AiMediaBenchmarkRunPublicView) => {
      stopPolling();
      const tick = async () => {
        const res = await fetch(
          `/api/admin/ai-media-benchmark/runs/${encodeURIComponent(run.id)}/status?projectId=${encodeURIComponent(run.projectId ?? "")}`,
        );
        const data = (await res.json()) as {
          run?: AiMediaBenchmarkRunPublicView;
          error?: string;
        };
        if (!res.ok || !data.run) {
          setError(data.error ?? "Status selhal");
          setSubmitting(false);
          return;
        }
        setActive(data.run);
        await refreshRuns(projectId, caseId);
        if (data.run.status === "download_failed") {
          if (data.run.failureCode === "download_too_large") {
            setSubmitting(false);
            setError(
              "Soubor je příliš velký. Stažení lze vědomě zkusit znovu bez nové placené generace.",
            );
            return;
          }
          pollTimer.current = setTimeout(() => void tick(), 2500);
          return;
        }
        const terminal = ["succeeded", "failed", "cancelled", "submission_unknown"];
        if (terminal.includes(data.run.status)) {
          setSubmitting(false);
          setPreviewNonce((n) => n + 1);
          if (data.run.status === "submission_unknown") {
            setError(
              "Odeslání je nejasné (submission_unknown). Stejný request se automaticky neopakuje.",
            );
            return;
          }
          clientRequestIdRef.current = newClientRequestId();
          return;
        }
        pollTimer.current = setTimeout(() => void tick(), 2500);
      };
      void tick();
    },
    [projectId, caseId, refreshRuns, stopPolling],
  );

  async function submitOne(): Promise<void> {
    if (submitLock.current || submitting || !selected) return;
    submitLock.current = true;
    setSubmitting(true);
    setError(null);
    try {
      const usd = selected.defaultQuote?.usd ?? 0;
      const res = await fetch("/api/admin/ai-media-benchmark/text-video", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          projectId,
          modelId: selected.modelId,
          sceneIdeaId,
          durationSeconds: 4,
          ratio: "720:1280",
          caseId,
          clientRequestId: clientRequestIdRef.current,
          confirmPaidGeneration: true,
          maxCostUsd: Number(usd.toFixed(4)),
        }),
      });
      const data = (await res.json()) as {
        run?: AiMediaBenchmarkRunPublicView;
        error?: string;
      };
      if (!res.ok || !data.run) {
        setError(mapTextVideoError(data.error, "Spuštění selhalo"));
        setSubmitting(false);
        return;
      }
      setActive(data.run);
      setConfirmOpen(false);
      setPreviewNonce((n) => n + 1);
      if (data.run.status === "submission_unknown") {
        setSubmitting(false);
        setError(
          "Odeslání je nejasné (submission_unknown). Stejný request se automaticky neopakuje.",
        );
        return;
      }
      if (data.run.status === "succeeded") {
        setSubmitting(false);
        clientRequestIdRef.current = newClientRequestId();
        await refreshRuns(projectId, caseId);
        return;
      }
      pollStatus(data.run);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Spuštění selhalo");
      setSubmitting(false);
    } finally {
      submitLock.current = false;
    }
  }

  async function saveRating(
    run: AiMediaBenchmarkRunPublicView,
    rating: number,
    note: string,
  ): Promise<void> {
    const res = await fetch(
      `/api/admin/ai-media-benchmark/runs/${encodeURIComponent(run.id)}/rate`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ projectId: run.projectId, rating, note }),
      },
    );
    const data = (await res.json()) as {
      run?: AiMediaBenchmarkRunPublicView;
      error?: string;
    };
    if (!res.ok) {
      setError(data.error ?? "Hodnocení se neuložilo");
      return;
    }
    if (data.run) {
      setRuns((prev) => prev.map((item) => (item.id === data.run!.id ? data.run! : item)));
      if (active?.id === data.run.id) setActive(data.run);
    }
  }

  const selectedIdea = useMemo(
    () => ideas.find((idea) => idea.id === sceneIdeaId) ?? ideas[0] ?? null,
    [ideas, sceneIdeaId],
  );

  return (
    <>
      <p className={styles.roundNote}>
        Kolo T: stejná scénická myšlenka, stejný automatický prompt, stejný
        vizuální profil, portrait 720:1280, 4 s. Každý model se spouští
        samostatně. Prompt se nesestavuje ručně a prohlížeč ho neposílá —
        server načte nebo vytvoří snapshot.
      </p>
      {locked ? (
        <p className={styles.lockNote}>
          První spuštěný model uzamkl prompt a vizuální profil tohoto Kola T
          {lockedByModel ? ` (${lockedByModel})` : ""}. Další modely stejného{" "}
          <code>case_id</code> používají přesně tento snapshot. Liší se jen
          modelem, cenou a modelovým audiem. Jiná scénická myšlenka vyžaduje
          nové Kolo T — existující porovnání se nepřepisuje.
        </p>
      ) : (
        <p className={styles.lockNote}>
          První spuštěný model uzamkne prompt a vizuální profil tohoto Kola T.
          Další modely stejného <code>case_id</code> dostanou tentýž snapshot,
          i kdyby se mezitím změnila data projektu. Pro jinou scénickou
          myšlenku začněte nové Kolo T s novým <code>case_id</code>.
        </p>
      )}
      <p className={styles.meta}>
        case_id: {caseId}
        {lockedByModel ? ` · snapshot vytvořil ${lockedByModel}` : ""}
      </p>
      {!flagOn && (
        <p className={styles.flagOff}>
          Text-to-video test je vypnutý (`AI_MEDIA_BENCHMARK_TEXT_VIDEO_ENABLED`
          je false). Nic se nespustí, dokud flag nezapnete v prostředí.
        </p>
      )}
      <label className={styles.field}>
        <span className={styles.label}>Scénická myšlenka</span>
        <select
          className={styles.select}
          value={sceneIdeaId}
          disabled={locked}
          onChange={(e) => setSceneIdeaId(e.target.value)}
        >
          {(ideas.length > 0 ? ideas : [{ id: "arrival-and-task", label: "Příchod a krátký úkol" }]).map(
            (idea) => (
              <option key={idea.id} value={idea.id}>
                {idea.label}
              </option>
            ),
          )}
        </select>
      </label>
      <label className={styles.field}>
        <span className={styles.label}>Jeden text-to-video model</span>
        <select
          className={styles.select}
          value={selected?.modelId ?? ""}
          onChange={(e) => setModelId(e.target.value)}
        >
          {models.map((m) => (
            <option key={m.modelId} value={m.modelId}>
              {m.displayName}
            </option>
          ))}
        </select>
      </label>
      {selected && (
        <dl className={styles.readonly}>
          <div>
            <dt>Cena tohoto modelu</dt>
            <dd>
              {selected.defaultQuote
                ? `$${selected.defaultQuote.usd.toFixed(2)} · 4 s`
                : "nelze nacenit"}
            </dd>
          </div>
          <div>
            <dt>Maximální cena celého Kola T</dt>
            <dd>
              {roundTMax != null
                ? `$${roundTMax.toFixed(2)} (3 modely × 4 s, po jednom)`
                : "—"}
            </dd>
          </div>
          <div>
            <dt>Vlastní audio modelu</dt>
            <dd>{selected.returnsAudio ? "Ano (dokumentované)" : "Ne — v Kole A+ společný hlas a sound"}</dd>
          </div>
          <div>
            <dt>Vizuální profil</dt>
            <dd>{profile ? profileSummary(profile) : "načítá se"}</dd>
          </div>
        </dl>
      )}
      {profile && (
        <dl className={styles.readonly}>
          <div>
            <dt>Prostředí</dt>
            <dd>{profile.environment}</dd>
          </div>
          <div>
            <dt>Oblečení</dt>
            <dd>{profile.wardrobeStyle}</dd>
          </div>
          <div>
            <dt>Kamera / světlo</dt>
            <dd>
              {profile.cameraStyle} · {profile.lighting}
            </dd>
          </div>
          <div>
            <dt>Zakázáno</dt>
            <dd>{profile.forbiddenVisualElements.join(", ")}</dd>
          </div>
        </dl>
      )}
      <label className={styles.fieldWide}>
        <span className={styles.label}>
          {locked ? "Uzamčený prompt odesílaný všem modelům tohoto Kola T" : "Přesný prompt odesílaný modelu"}
        </span>
        <textarea className={styles.textarea} value={promptText} readOnly />
      </label>
      {selectedIdea && (
        <p className={styles.meta}>Jádro scény: {selectedIdea.coreIdea}</p>
      )}
      {error && <p className={styles.error}>{error}</p>}
      <div className={styles.actions}>
        <button
          className={styles.primary}
          type="button"
          disabled={!flagOn || !selected || !projectId || submitting}
          onClick={() => setConfirmOpen(true)}
        >
          Spustit jeden text-to-video test
        </button>
        <button
          className={styles.secondary}
          type="button"
          disabled={submitting}
          onClick={() => {
            setCaseId(newRoundTCaseId());
            setSceneIdeaId("arrival-and-task");
            setLocked(false);
            setLockedByModel(null);
            setActive(null);
            setRuns([]);
            setConfirmOpen(false);
            setError(null);
            clientRequestIdRef.current = newClientRequestId();
          }}
        >
          Nové Kolo T s novým case_id
        </button>
      </div>
      {confirmOpen && selected && (
        <div className={styles.confirmBox}>
          <p className={styles.confirmText}>
            Potvrzuji jeden placený text-to-video request modelu {selected.displayName} za{" "}
            {selected.defaultQuote ? `$${selected.defaultQuote.usd.toFixed(2)}` : "neznámou cenu"}.
          </p>
          <div className={styles.actions}>
            <button
              className={styles.primary}
              type="button"
              disabled={submitting}
              onClick={() => void submitOne()}
            >
              Potvrzuji jeden placený request
            </button>
            <button
              className={styles.secondary}
              type="button"
              onClick={() => setConfirmOpen(false)}
            >
              Zrušit
            </button>
          </div>
        </div>
      )}
      {active?.status === "download_failed" && active.providerTaskId && (
        <button
          className={styles.secondary}
          type="button"
          disabled={submitting}
          onClick={() => {
            setError(null);
            setSubmitting(true);
            pollStatus(active);
          }}
        >
          Znovu stáhnout bez nové generace
        </button>
      )}
      {active && <TextVideoResultCard run={active} onRate={saveRating} />}
      <section className={styles.card}>
        <h3 className={styles.title}>Kolo T+ · reference-guided vítěz</h3>
        <p className={styles.roundNote}>
          Až po výběru vítěze Kola T. Nejvýše jeden další test. Seed je náhodné
          číslo, ne obrazová reference. Obrazová reference a first-frame image
          jsou oddělené. Teď se žádný provider request neodesílá.
        </p>
        <dl className={styles.readonly}>
          <div>
            <dt>Random seed</dt>
            <dd>celé číslo pro opakovatelnost, není to obrázek</dd>
          </div>
          <div>
            <dt>Reference image</dt>
            <dd>později: barvy / uniforma / produkt / asset</dd>
          </div>
          <div>
            <dt>First-frame image</dt>
            <dd>později: startovní políčko, ne totéž co seed</dd>
          </div>
        </dl>
        <button className={styles.secondary} type="button" disabled>
          Kolo T+ zatím nelze spustit
        </button>
        {plusPlan && <p className={styles.meta}>{plusPlan.blockedReason}</p>}
      </section>
      <div className={styles.compare}>
        {runs.map((run) => (
          <div key={run.id} className={styles.compareItem}>
            <strong>{run.model}</strong>
            <span className={styles.meta}>
              {isTextToVideoBenchmarkSettings(run.settings) ? "text_to_video" : run.testType}
              {run.estimatedCostUsd != null
                ? ` · $${Number(run.estimatedCostUsd).toFixed(2)}`
                : ""}
              {run.rating ? ` · ${run.rating}/5` : ""}
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

function TextVideoResultCard({
  run,
  onRate,
}: {
  run: AiMediaBenchmarkRunPublicView;
  onRate: (run: AiMediaBenchmarkRunPublicView, rating: number, note: string) => Promise<void>;
}) {
  const [note, setNote] = useState(run.note ?? "");
  const settings = run.settings ?? {};
  const profile = settings.brandVisualProfile as BrandVisualProfile | undefined;
  const prompt =
    typeof settings.promptText === "string" ? settings.promptText : "";
  const regenerationCount =
    typeof settings.regenerationCount === "number" ? settings.regenerationCount : 0;
  return (
    <div>
      <p className={styles.meta}>
        Stav: {run.status}
        {run.outputContainsAudio ? " · obsahuje audio" : ""}
      </p>
      {run.playbackUrl && (
        <video className={styles.video} src={run.playbackUrl} controls />
      )}
      <dl className={styles.readonly}>
        <div>
          <dt>Model</dt>
          <dd>{run.model}</dd>
        </div>
        <div>
          <dt>Režim</dt>
          <dd>
            {isTextToVideoBenchmarkSettings(run.settings) ? "text_to_video" : "video"}
          </dd>
        </div>
        <div>
          <dt>Cena</dt>
          <dd>
            {run.estimatedCostUsd != null
              ? `$${Number(run.estimatedCostUsd).toFixed(2)}`
              : "—"}
          </dd>
        </div>
        <div>
          <dt>Počet generací</dt>
          <dd>{regenerationCount + 1}</dd>
        </div>
        <div>
          <dt>Regenerace</dt>
          <dd>{regenerationCount > 0 ? "ano" : "ne"}</dd>
        </div>
        <div>
          <dt>Vizuální profil</dt>
          <dd>{profile ? profileSummary(profile) : "—"}</dd>
        </div>
      </dl>
      {prompt && (
        <label className={styles.fieldWide}>
          <span className={styles.label}>Použitý prompt</span>
          <textarea className={styles.textarea} value={prompt} readOnly />
        </label>
      )}
      <div className={styles.stars}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            className={run.rating && run.rating >= n ? styles.starOn : styles.star}
            onClick={() => void onRate(run, n, note)}
          >
            ★
          </button>
        ))}
      </div>
      <textarea
        className={styles.note}
        maxLength={500}
        placeholder="Poznámka (model, text_to_video, cena, prompt, profil, regenerace)"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        onBlur={() => {
          if (run.rating) void onRate(run, run.rating, note);
        }}
      />
    </div>
  );
}
