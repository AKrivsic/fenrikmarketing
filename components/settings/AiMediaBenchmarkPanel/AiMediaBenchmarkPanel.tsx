"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { AiMediaBenchmarkRunPublicView } from "@/lib/ai-media-benchmark/types";
import {
  DEFAULT_SOUND_PROMPT,
  DEFAULT_VIDEO_CASE_ID,
  DEFAULT_VOICE_SCRIPT,
} from "@/lib/ai-media-benchmark/types";
import type { RunwayTestSceneOption } from "@/lib/runway-test/types";
import { CombinedRoundSection } from "./CombinedRoundSection";
import { TextVideoRoundSection } from "./TextVideoRoundSection";
import styles from "./AiMediaBenchmarkPanel.module.css";

type Tab = "video" | "voice" | "sound" | "combined" | "text-video";

interface CatalogPayload {
  catalog: {
    roundA?: {
      durationSeconds: number;
      ratio: string;
      totalUsd: number;
      totalCredits: number;
    };
    roundT?: {
      durationSeconds: number;
      ratio: string;
      totalUsd: number;
      totalCredits: number;
    };
    video: Array<{
      modelId: string;
      displayName: string;
      status: string;
      returnsAudio: boolean;
      defaultDurationSeconds: number;
      defaultPortraitRatio: string;
      duration:
        | { kind: "range"; min: number; max: number }
        | { kind: "enum"; values: number[] };
      defaultQuote: {
        usd: number;
        credits: number;
        formula: string;
        durationSeconds: number;
        generateAudio: boolean;
      } | null;
      unsupportedReason: string | null;
    }>;
    voice: Array<{
      candidateId: string;
      displayName: string;
      status: string;
      ttsHost?: string;
      ttsHostNote?: string;
      defaultQuote: {
        usd: number | null;
        formula: string;
        completeness: string;
      } | null;
      unsupportedReason: string | null;
    }>;
    sound: Array<{
      candidateId: string;
      displayName: string;
      status: string;
      defaultDurationSeconds: number;
      defaultQuote: { usd: number; formula: string } | null;
      unsupportedReason: string | null;
    }>;
    textVideo?: Array<{
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
    }>;
  };
  flags: { video: boolean; voice: boolean; sound: boolean; textVideo?: boolean };
}

interface ProjectOption {
  id: string;
  name: string;
}

interface Props {
  projects: ProjectOption[];
}

function newClientRequestId(): string {
  return crypto.randomUUID();
}

export function AiMediaBenchmarkPanel({ projects }: Props) {
  const [tab, setTab] = useState<Tab>("video");
  const [catalog, setCatalog] = useState<CatalogPayload | null>(null);
  const [projectId, setProjectId] = useState("");
  const [scenes, setScenes] = useState<RunwayTestSceneOption[]>([]);
  const [sceneKey, setSceneKey] = useState("");
  const [motionPrompt, setMotionPrompt] = useState("");
  const [modelId, setModelId] = useState("");
  const [durationSeconds, setDurationSeconds] = useState(4);
  const [voiceCandidateId, setVoiceCandidateId] = useState("");
  const [voiceText, setVoiceText] = useState(DEFAULT_VOICE_SCRIPT);
  const [soundCandidateId, setSoundCandidateId] = useState("");
  const [soundPrompt, setSoundPrompt] = useState(DEFAULT_SOUND_PROMPT);
  const [soundDuration, setSoundDuration] = useState(4);
  const [runs, setRuns] = useState<AiMediaBenchmarkRunPublicView[]>([]);
  const [active, setActive] = useState<AiMediaBenchmarkRunPublicView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const submitLock = useRef(false);
  const clientRequestIdRef = useRef(newClientRequestId());
  const pollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const selectedScene = useMemo(
    () => scenes.find((s) => `${s.videoJobId}::${s.sceneId}` === sceneKey) ?? null,
    [scenes, sceneKey],
  );

  const videoModels = catalog?.catalog.video.filter((m) => m.status === "testable") ?? [];
  const voiceCandidates =
    catalog?.catalog.voice.filter((m) => m.status === "testable") ?? [];
  const soundCandidates =
    catalog?.catalog.sound.filter((m) => m.status === "testable") ?? [];
  const selectedModel = videoModels.find((m) => m.modelId === modelId) ?? null;
  const selectedVoice =
    voiceCandidates.find((m) => m.candidateId === voiceCandidateId) ?? null;
  const selectedSound =
    soundCandidates.find((m) => m.candidateId === soundCandidateId) ?? null;

  useEffect(() => {
    void (async () => {
      const res = await fetch("/api/admin/ai-media-benchmark/catalog");
      if (!res.ok) return;
      const data = (await res.json()) as CatalogPayload;
      setCatalog(data);
      const firstVideo = data.catalog.video.find((m) => m.status === "testable");
      const firstVoice = data.catalog.voice.find((m) => m.status === "testable");
      const firstSound = data.catalog.sound.find((m) => m.status === "testable");
      if (firstVideo) {
        setModelId(firstVideo.modelId);
        setDurationSeconds(
          data.catalog.roundA?.durationSeconds ?? firstVideo.defaultDurationSeconds,
        );
      }
      if (firstVoice) setVoiceCandidateId(firstVoice.candidateId);
      if (firstSound) {
        setSoundCandidateId(firstSound.candidateId);
        setSoundDuration(firstSound.defaultDurationSeconds);
      }
    })();
  }, []);

  const loadScenes = useCallback(async (pid: string) => {
    setScenes([]);
    setSceneKey("");
    const res = await fetch(
      `/api/admin/ai-media-benchmark/scenes?projectId=${encodeURIComponent(pid)}`,
    );
    const data = (await res.json()) as {
      scenes?: RunwayTestSceneOption[];
      error?: string;
    };
    if (!res.ok) {
      setError(data.error ?? "Scény se nepodařilo načíst");
      return;
    }
    setScenes(data.scenes ?? []);
  }, []);

  const refreshRuns = useCallback(async (pid: string, type: Tab) => {
    if (type === "combined" || type === "text-video") return;
    const caseId =
      type === "video"
        ? DEFAULT_VIDEO_CASE_ID
        : type === "voice"
          ? "voice-script-a"
          : "sound-ambient-a";
    const res = await fetch(
      `/api/admin/ai-media-benchmark/runs?projectId=${encodeURIComponent(pid)}&testType=${type}&caseId=${encodeURIComponent(caseId)}`,
    );
    if (!res.ok) return;
    const data = (await res.json()) as { runs?: AiMediaBenchmarkRunPublicView[] };
    setRuns(data.runs ?? []);
  }, []);

  function onProjectChange(nextId: string): void {
    setProjectId(nextId);
    setConfirmOpen(false);
    if (nextId) {
      void loadScenes(nextId);
      void refreshRuns(nextId, tab);
    } else {
      setScenes([]);
      setRuns([]);
    }
  }

  function onTab(next: Tab): void {
    setTab(next);
    setConfirmOpen(false);
    setActive(null);
    if (projectId) void refreshRuns(projectId, next);
  }

  function priceLabel(): string {
    if (tab === "video" && selectedModel?.defaultQuote) {
      return `$${selectedModel.defaultQuote.usd.toFixed(2)} · 4 s · ${
        selectedModel.returnsAudio ? "s audiem scény" : "bez audia scény"
      }`;
    }
    if (tab === "voice" && selectedVoice?.defaultQuote) {
      if (selectedVoice.defaultQuote.usd == null) {
        return selectedVoice.defaultQuote.formula;
      }
      return `$${selectedVoice.defaultQuote.usd.toFixed(2)}`;
    }
    if (tab === "sound" && selectedSound?.defaultQuote) {
      return `$${selectedSound.defaultQuote.usd.toFixed(2)}`;
    }
    return "Cena se nedá spočítat";
  }

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
        if (projectId) await refreshRuns(projectId, tab);
        const terminal = [
          "succeeded",
          "failed",
          "cancelled",
          "submission_unknown",
        ];
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
        if (terminal.includes(data.run.status)) {
          setSubmitting(false);
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
    [projectId, refreshRuns, stopPolling, tab],
  );

  async function submitOne(): Promise<void> {
    if (submitLock.current || submitting) return;
    submitLock.current = true;
    setSubmitting(true);
    setError(null);
    try {
      let path = "";
      let payload: Record<string, unknown> = {};
      if (tab === "video") {
        if (!selectedScene || !selectedModel) throw new Error("Vyberte scénu a model");
        path = "/api/admin/ai-media-benchmark/video";
        const usd = selectedModel.defaultQuote?.usd ?? 0;
        payload = {
          projectId,
          videoJobId: selectedScene.videoJobId,
          sceneId: selectedScene.sceneId,
          motionPrompt,
          modelId: selectedModel.modelId,
          durationSeconds,
          ratio: selectedModel.defaultPortraitRatio,
          caseId: DEFAULT_VIDEO_CASE_ID,
          clientRequestId: clientRequestIdRef.current,
          confirmPaidGeneration: true,
          maxCostUsd: Number(usd.toFixed(4)),
        };
      } else if (tab === "voice") {
        if (!selectedVoice) throw new Error("Vyberte hlas");
        path = "/api/admin/ai-media-benchmark/voice";
        payload = {
          projectId,
          candidateId: selectedVoice.candidateId,
          text: voiceText,
          caseId: "voice-script-a",
          clientRequestId: clientRequestIdRef.current,
          confirmPaidGeneration: true,
          maxCostUsd: selectedVoice.defaultQuote?.usd ?? undefined,
        };
      } else {
        if (!selectedSound) throw new Error("Vyberte zvukový model");
        path = "/api/admin/ai-media-benchmark/sound";
        payload = {
          projectId,
          candidateId: selectedSound.candidateId,
          promptText: soundPrompt,
          durationSeconds: soundDuration,
          caseId: "sound-ambient-a",
          clientRequestId: clientRequestIdRef.current,
          confirmPaidGeneration: true,
          maxCostUsd: selectedSound.defaultQuote?.usd ?? 0,
        };
      }
      const res = await fetch(path, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as {
        run?: AiMediaBenchmarkRunPublicView;
        error?: string;
      };
      if (!res.ok || !data.run) {
        setError(data.error ?? "Spuštění selhalo");
        setSubmitting(false);
        if (data.error === "submission_unknown") {
          return;
        }
        return;
      }
      setActive(data.run);
      setConfirmOpen(false);
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
        if (projectId) await refreshRuns(projectId, tab);
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

  const flagOn =
    tab === "video"
      ? catalog?.flags.video
      : tab === "voice"
        ? catalog?.flags.voice
        : catalog?.flags.sound;

  return (
    <div className={styles.wrap}>
      <section className={styles.card}>
        <h2 className={styles.title}>Benchmark Lab</h2>
        <p className={styles.description}>
          Interní srovnání jednoho modelu po druhém. Nikdy nespouští všechny
          kombinace najednou. Kolo D (celé video) se tady automaticky negeneruje.
        </p>
        <div className={styles.tabs}>
          <button className={tab === "video" ? styles.tabActive : styles.tab} type="button" onClick={() => onTab("video")}>
            Kolo A · obraz
          </button>
          <button className={tab === "voice" ? styles.tabActive : styles.tab} type="button" onClick={() => onTab("voice")}>
            Kolo B · hlas
          </button>
          <button className={tab === "sound" ? styles.tabActive : styles.tab} type="button" onClick={() => onTab("sound")}>
            Kolo C · zvuk
          </button>
          <button className={tab === "combined" ? styles.tabActive : styles.tab} type="button" onClick={() => onTab("combined")}>
            Kolo A+ · kombinovaná scéna
          </button>
          <button className={tab === "text-video" ? styles.tabActive : styles.tab} type="button" onClick={() => onTab("text-video")}>
            Kolo T · text-to-video
          </button>
        </div>
        <p className={styles.roundNote}>
          {tab === "video"
            ? "Kolo A: jedna scéna, stejný obrázek, stejný prompt, 720:1280, 4 s. Vyberte právě jeden video model. Spouští se vždy jen jeden."
            : tab === "voice"
              ? "Kolo B porovnává jeden reprezentativní energický hlas od každého poskytovatele (OpenAI Alloy vs ElevenLabs Maya na Runway) na stejném textu. Výsledkem je volba poskytovatele a modelu, ne jednoho univerzálního produkčního hlasu. OpenAI instrukce platí jen v tomto labu."
              : tab === "sound"
                ? "Samostatný ambient / sound effect. Není to audio scény z video modelu ani hudba."
                : tab === "text-video"
                  ? "Kolo T: text-to-video bez zdrojového obrázku. Stejný automatický prompt a vizuální profil, 720:1280, 4 s, jeden model na spuštění."
                : "Kolo A+: jedna 4s scéna z už hotového videa, stejného hlasu a volitelného soundu. Sestavení není placené AI volání."}
        </p>
        <label className={styles.field}>
          <span className={styles.label}>Projekt</span>
          <select
            className={styles.select}
            value={projectId}
            onChange={(e) => onProjectChange(e.target.value)}
          >
            <option value="">Vyberte projekt</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
        {tab === "combined" ? (
          projectId ? (
            <CombinedRoundSection projectId={projectId} />
          ) : (
            <p className={styles.meta}>Nejdřív vyberte projekt.</p>
          )
        ) : tab === "text-video" ? (
          projectId && catalog ? (
            <TextVideoRoundSection projectId={projectId} catalog={catalog} />
          ) : (
            <p className={styles.meta}>Nejdřív vyberte projekt.</p>
          )
        ) : (
          <>
        {!flagOn && (
          <p className={styles.flagOff}>
            Tento typ testu je vypnutý (feature flag je false). Nic se nespustí,
            dokud flag nezapnete v prostředí.
          </p>
        )}
        {tab === "video" && (
          <>
            <label className={styles.field}>
              <span className={styles.label}>Testovací scéna</span>
              <select
                className={styles.select}
                value={sceneKey}
                onChange={(e) => setSceneKey(e.target.value)}
                disabled={!projectId}
              >
                <option value="">Vyberte scénu</option>
                {scenes.map((s) => (
                  <option key={`${s.videoJobId}::${s.sceneId}`} value={`${s.videoJobId}::${s.sceneId}`}>
                    {s.sceneId}
                  </option>
                ))}
              </select>
            </label>
            {selectedScene?.previewUrl && (
              <div className={styles.preview}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img className={styles.previewImg} src={selectedScene.previewUrl} alt="Zdrojový obrázek" />
                <p className={styles.meta}>{selectedScene.imagePath}</p>
              </div>
            )}
            <label className={styles.fieldWide}>
              <span className={styles.label}>Motion prompt</span>
              <textarea
                className={styles.textarea}
                value={motionPrompt}
                onChange={(e) => setMotionPrompt(e.target.value)}
              />
            </label>
            <label className={styles.field}>
              <span className={styles.label}>Jeden video model</span>
              <select
                className={styles.select}
                value={modelId}
                onChange={(e) => {
                  setModelId(e.target.value);
                }}
              >
                {videoModels.map((m) => (
                  <option key={m.modelId} value={m.modelId}>
                    {m.displayName}
                  </option>
                ))}
              </select>
            </label>
            {selectedModel && (
              <dl className={styles.readonly}>
                <div>
                  <dt>Délka Kola A</dt>
                  <dd>4 s (stejná pro všechny čtyři kandidáty)</dd>
                </div>
                <div>
                  <dt>Audio scény</dt>
                  <dd>{selectedModel.returnsAudio ? "Ano, model ho vytvoří" : "Ne"}</dd>
                </div>
                <div>
                  <dt>Cena tohoto modelu</dt>
                  <dd>{priceLabel()}</dd>
                </div>
                <div>
                  <dt>Maximální cena celého Kola A</dt>
                  <dd>
                    {catalog?.catalog.roundA
                      ? `$${catalog.catalog.roundA.totalUsd.toFixed(2)} (4 modely × 4 s, po jednom)`
                      : "—"}
                  </dd>
                </div>
                <div>
                  <dt>Formát</dt>
                  <dd>{selectedModel.defaultPortraitRatio}</dd>
                </div>
              </dl>
            )}
          </>
        )}
        {tab === "voice" && (
          <>
            <label className={styles.fieldWide}>
              <span className={styles.label}>Stejný testovací text pro oba poskytovatele</span>
              <textarea
                className={styles.textarea}
                value={voiceText}
                onChange={(e) => setVoiceText(e.target.value)}
              />
            </label>
            <label className={styles.field}>
              <span className={styles.label}>Jeden hlas</span>
              <select
                className={styles.select}
                value={voiceCandidateId}
                onChange={(e) => setVoiceCandidateId(e.target.value)}
              >
                {voiceCandidates.map((m) => (
                  <option key={m.candidateId} value={m.candidateId}>
                    {m.displayName}
                  </option>
                ))}
              </select>
            </label>
            <dl className={styles.readonly}>
              <div>
                <dt>Hostitel</dt>
                <dd>{selectedVoice?.ttsHostNote ?? "—"}</dd>
              </div>
              <div>
                <dt>Cena</dt>
                <dd>{priceLabel()}</dd>
              </div>
            </dl>
          </>
        )}
        {tab === "sound" && (
          <>
            <label className={styles.fieldWide}>
              <span className={styles.label}>Prompt pro ambient / SFX</span>
              <textarea
                className={styles.textarea}
                value={soundPrompt}
                onChange={(e) => setSoundPrompt(e.target.value)}
              />
            </label>
            <label className={styles.field}>
              <span className={styles.label}>Jeden zvukový model</span>
              <select
                className={styles.select}
                value={soundCandidateId}
                onChange={(e) => setSoundCandidateId(e.target.value)}
              >
                {soundCandidates.map((m) => (
                  <option key={m.candidateId} value={m.candidateId}>
                    {m.displayName}
                  </option>
                ))}
              </select>
            </label>
            <dl className={styles.readonly}>
              <div>
                <dt>Role zvuku</dt>
                <dd>ambient / SFX (ne hudba, ne audio scény)</dd>
              </div>
              <div>
                <dt>Cena</dt>
                <dd>{priceLabel()}</dd>
              </div>
            </dl>
          </>
        )}
        {error && <p className={styles.error}>{error}</p>}
        {!confirmOpen ? (
          <button
            className={styles.primary}
            type="button"
            disabled={!flagOn || !projectId || submitting}
            onClick={() => setConfirmOpen(true)}
          >
            Připravit jeden placený request
          </button>
        ) : (
          <div className={styles.confirmBox}>
            <p className={styles.confirmText}>
              Spustí se právě jeden model. Odhad: {priceLabel()}. Žádné „spustit
              vše“. Pokračovat?
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
        {active && <ResultCard run={active} onRate={saveRating} />}
          </>
        )}
      </section>
      {tab !== "combined" && tab !== "text-video" && (
      <section className={styles.card}>
        <h2 className={styles.title}>Stejný test case vedle sebe</h2>
        <div className={styles.compare}>
          {runs.map((run) => (
            <div key={run.id} className={styles.compareItem}>
              <strong>{run.model}</strong>
              <span className={styles.meta}>
                {run.status}
                {run.estimatedCostUsd != null
                  ? ` · $${Number(run.estimatedCostUsd).toFixed(2)}`
                  : ""}
                {run.rating ? ` · ${run.rating}/5` : ""}
              </span>
              {run.playbackUrl && run.testType === "video" && (
                <video className={styles.video} src={run.playbackUrl} controls />
              )}
              {run.playbackUrl && run.testType !== "video" && (
                <audio className={styles.audio} src={run.playbackUrl} controls />
              )}
              {run.note && <p className={styles.meta}>{run.note}</p>}
            </div>
          ))}
          {runs.length === 0 && (
            <p className={styles.meta}>Zatím žádné výsledky tohoto kola.</p>
          )}
        </div>
      </section>
      )}
    </div>
  );
}

function ResultCard({
  run,
  onRate,
}: {
  run: AiMediaBenchmarkRunPublicView;
  onRate: (
    run: AiMediaBenchmarkRunPublicView,
    rating: number,
    note: string,
  ) => Promise<void>;
}) {
  const [note, setNote] = useState(run.note ?? "");
  return (
    <div>
      <p className={styles.meta}>
        Stav: {run.status}
        {run.outputContainsAudio ? " · obsahuje audio" : ""}
      </p>
      {run.playbackUrl && run.testType === "video" && (
        <video className={styles.video} src={run.playbackUrl} controls />
      )}
      {run.playbackUrl && run.testType !== "video" && (
        <audio className={styles.audio} src={run.playbackUrl} controls />
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
        placeholder="Krátká interní poznámka"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        onBlur={() => {
          if (run.rating) void onRate(run, run.rating, note);
        }}
      />
    </div>
  );
}
