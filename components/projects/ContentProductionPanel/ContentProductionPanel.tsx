"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTransition } from "react";
import {
  getProductionRunStatus,
  startProductionRun,
  stopProductionRun,
} from "@/app/projects/[id]/production/actions";
import {
  DEFAULT_MULTIPLIERS,
  MULTIPLIER_MAX,
  MULTIPLIER_MIN,
  PACKAGE_COUNT_MAX,
  PACKAGE_COUNT_MIN,
  PRODUCTION_PLATFORMS,
  computeProductionPlan,
  normalizeProductionConfig,
  resolveProductionPlatformKind,
  type ProductionConfig,
  type ProductionPlatformId,
} from "@/lib/projects/productionRun";
import type { ProductionRunView } from "@/lib/api/production-run-admin";
import type { ProductionRunStatus } from "@/lib/supabase/types";
import { FiverrPromoGeneratePanel } from "@/components/projects/FiverrPromoGeneratePanel/FiverrPromoGeneratePanel";
import styles from "./ContentProductionPanel.module.css";

interface ContentProductionPanelProps {
  projectId: string;
  initialConfig: ProductionConfig;
  initialRun: ProductionRunView | null;
}

const RUN_STATUS_LABEL: Record<ProductionRunStatus, string> = {
  queued: "Ve frontě",
  running: "Probíhá",
  completed: "Hotovo",
  failed: "Selhalo",
  cancelled: "Zastaveno",
};

const POLL_INTERVAL_MS = 3000;

function isActive(run: ProductionRunView | null): boolean {
  return run !== null && (run.status === "queued" || run.status === "running");
}

export function ContentProductionPanel({
  projectId,
  initialConfig,
  initialRun,
}: ContentProductionPanelProps) {
  const [packageCount, setPackageCount] = useState<number>(
    initialConfig.packageCount,
  );
  const [packagesWithAssetSupport, setPackagesWithAssetSupport] = useState<number>(
    initialConfig.packagesWithAssetSupport ??
      initialConfig.packagesWithAssets ??
      0,
  );
  const [activePlatforms, setActivePlatforms] = useState<
    Record<ProductionPlatformId, boolean>
  >(() => {
    const map = {} as Record<ProductionPlatformId, boolean>;
    for (const def of PRODUCTION_PLATFORMS) {
      map[def.id] = initialConfig.platforms.includes(def.id);
    }
    return map;
  });
  const [multipliers, setMultipliers] = useState<
    Record<ProductionPlatformId, number>
  >(() => {
    const map = {} as Record<ProductionPlatformId, number>;
    for (const def of PRODUCTION_PLATFORMS) {
      map[def.id] =
        initialConfig.multipliers[def.id] ?? DEFAULT_MULTIPLIERS[def.id];
    }
    return map;
  });

  const [run, setRun] = useState<ProductionRunView | null>(initialRun);
  const [error, setError] = useState<string | null>(null);
  const [promoBusy, setPromoBusy] = useState(false);
  const [isPending, startTransition] = useTransition();

  const runIdRef = useRef<string | null>(initialRun?.id ?? null);

  const config = useMemo<ProductionConfig>(() => {
    const platforms = PRODUCTION_PLATFORMS.filter(
      (d) => activePlatforms[d.id],
    ).map((d) => d.id);
    return {
      packageCount,
      packagesWithAssetSupport: Math.min(packagesWithAssetSupport, packageCount),
      platforms,
      multipliers,
      platformContentTypes: initialConfig.platformContentTypes,
    };
  }, [
    packageCount,
    packagesWithAssetSupport,
    activePlatforms,
    multipliers,
    initialConfig.platformContentTypes,
  ]);

  const plan = useMemo(
    () => computeProductionPlan(normalizeProductionConfig(config)),
    [config],
  );

  const active = isActive(run);

  // Poll the run status while it is active. Stops when the run reaches a
  // terminal state or the component unmounts.
  useEffect(() => {
    const runId = runIdRef.current;
    if (!runId || !isActive(run)) return;

    let cancelled = false;
    const timer = setInterval(async () => {
      const next = await getProductionRunStatus(runId);
      if (cancelled || !next) return;
      setRun(next);
    }, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [run]);

  const onPackageCount = useCallback((raw: string) => {
    const parsed = Number.parseInt(raw, 10);
    const value = Number.isFinite(parsed)
      ? Math.min(PACKAGE_COUNT_MAX, Math.max(PACKAGE_COUNT_MIN, parsed))
      : 0;
    setPackageCount(value);
    setPackagesWithAssetSupport((prev) => Math.min(prev, value));
  }, []);

  const onPackagesWithAssetSupport = useCallback(
    (raw: string) => {
      const parsed = Number.parseInt(raw, 10);
      const value = Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
      setPackagesWithAssetSupport(Math.min(value, packageCount));
    },
    [packageCount],
  );

  const onTogglePlatform = useCallback((id: ProductionPlatformId) => {
    setActivePlatforms((prev) => ({ ...prev, [id]: !prev[id] }));
  }, []);

  const onMultiplier = useCallback((id: ProductionPlatformId, raw: string) => {
    const parsed = Number.parseFloat(raw);
    const value = Number.isFinite(parsed)
      ? Math.min(MULTIPLIER_MAX, Math.max(MULTIPLIER_MIN, parsed))
      : 0;
    setMultipliers((prev) => ({ ...prev, [id]: value }));
  }, []);

  const handleGenerate = useCallback(() => {
    setError(null);
    startTransition(async () => {
      const result = await startProductionRun(projectId, {
        ...config,
        generationMode: "production",
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      runIdRef.current = result.runId;
      const next = await getProductionRunStatus(result.runId);
      setRun(next);
    });
  }, [projectId, config]);

  const handleGenerateSample = useCallback(() => {
    setError(null);
    startTransition(async () => {
      const result = await startProductionRun(projectId, {
        ...config,
        generationMode: "sample",
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      runIdRef.current = result.runId;
      const next = await getProductionRunStatus(result.runId);
      setRun(next);
    });
  }, [projectId, config]);

  const handleStopRun = useCallback(() => {
    const runId = runIdRef.current ?? run?.id;
    if (!runId) return;
    const confirmed = window.confirm(
      "Opravdu zastavit tento běh?\n\nUž vygenerované balíčky zůstanou v projektu. Další balíčky z tohoto běhu se negenerují a můžete spustit nový běh.",
    );
    if (!confirmed) return;
    setError(null);
    startTransition(async () => {
      const result = await stopProductionRun(projectId, runId);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      const next = await getProductionRunStatus(runId);
      setRun(next);
    });
  }, [projectId, run?.id]);

  const canGenerate = plan.packageCount > 0 && plan.platformOutputs.length > 0;
  const generateDisabled = isPending || active || !canGenerate || promoBusy;

  return (
    <div className={styles.panel}>
      {/* --- Packages per week --------------------------------------------- */}
      <div className={styles.primary}>
        <label className={styles.primaryLabel} htmlFor="packageCount">
          Packages
        </label>
        <input
          id="packageCount"
          type="number"
          min={PACKAGE_COUNT_MIN}
          max={PACKAGE_COUNT_MAX}
          className={styles.primaryInput}
          value={packageCount}
          onChange={(e) => onPackageCount(e.target.value)}
          disabled={active}
        />
        <span className={styles.primaryHint}>1 package = 1 téma = 1 video</span>
      </div>

      <div className={styles.primary}>
        <label className={styles.primaryLabel} htmlFor="packagesWithAssetSupport">
          Packages with Asset Support
        </label>
        <input
          id="packagesWithAssetSupport"
          type="number"
          min={0}
          max={packageCount}
          className={styles.primaryInput}
          value={packagesWithAssetSupport}
          onChange={(e) => onPackagesWithAssetSupport(e.target.value)}
          disabled={active}
        />
        <span className={styles.primaryHint}>
          0 = beze změny. Vyšší číslo jen označí, u kolika packages je povolen
          asset workflow pro pozdější ruční re-render — negeneruje se vynucené
          asset_usage.
        </span>
      </div>

      {/* --- Platforms + multipliers --------------------------------------- */}
      <fieldset className={styles.group}>
        <legend className={styles.groupTitle}>Platformy &amp; multipliery</legend>
        <div className={styles.platformHead}>
          <span>Platforma</span>
          <span>Multiplier</span>
          <span className={styles.outputsCol}>Outputs</span>
        </div>
        {PRODUCTION_PLATFORMS.map((def) => {
          const isOn = activePlatforms[def.id];
          const isVideo =
            resolveProductionPlatformKind(
              def.id,
              config.platformContentTypes,
            ) === "video";
          // Video platforms are fixed at 1 output per package (one shared
          // package video); only text platforms expose an editable multiplier.
          const mult = isVideo
            ? 1
            : (multipliers[def.id] ?? DEFAULT_MULTIPLIERS[def.id]);
          const outputs =
            plan.platformOutputs.find((p) => p.platform === def.id)?.outputs ??
            0;
          return (
            <div
              key={def.id}
              className={styles.platformRow}
              data-active={isOn}
            >
              <label className={styles.platformLabel}>
                <input
                  type="checkbox"
                  checked={isOn}
                  onChange={() => onTogglePlatform(def.id)}
                  disabled={active}
                />
                <span>{def.label}</span>
                <span className={styles.kindBadge}>
                  {isVideo ? "video" : "text"}
                </span>
              </label>
              <input
                type="number"
                min={MULTIPLIER_MIN}
                max={MULTIPLIER_MAX}
                step={0.25}
                className={styles.multInput}
                value={mult}
                onChange={(e) => onMultiplier(def.id, e.target.value)}
                disabled={active || !isOn || isVideo}
                title={
                  isVideo
                    ? "Video platformy mají vždy 1 výstup na package (sdílené video)."
                    : undefined
                }
              />
              <span className={styles.outputsCol}>{outputs}</span>
            </div>
          );
        })}
      </fieldset>

      {/* --- Production summary -------------------------------------------- */}
      <dl className={styles.summary}>
        <div className={styles.summaryItem}>
          <dt>Packages</dt>
          <dd className={styles.bigNumber}>{plan.packageCount}</dd>
        </div>
        <div className={styles.summaryItem}>
          <dt>Packages with assets</dt>
          <dd>
            {config.packagesWithAssetSupport && config.packagesWithAssetSupport > 0
              ? `${config.packagesWithAssetSupport} with asset support · ${Math.max(0, plan.packageCount - config.packagesWithAssetSupport)} standard`
              : "asset support: automatic (unchanged)"}
          </dd>
        </div>
        <div className={styles.summaryItem}>
          <dt>Videos</dt>
          <dd className={styles.bigNumber}>{plan.videoCount}</dd>
        </div>
        <div className={styles.summaryItem}>
          <dt>Outputs</dt>
          <dd>
            {plan.platformOutputs.length > 0
              ? plan.platformOutputs
                  .map((e) => `${e.label} ${e.outputs}`)
                  .join(" · ")
              : "—"}
          </dd>
        </div>
        <div className={styles.summaryItem}>
          <dt>Total outputs</dt>
          <dd className={styles.bigNumber}>{plan.totalOutputs}</dd>
        </div>
      </dl>

      <div className={styles.actions}>
        <button
          type="button"
          className={styles.generateButton}
          onClick={handleGenerate}
          disabled={generateDisabled}
        >
          {isPending
            ? "Spouštím…"
            : active
              ? "Generování probíhá…"
              : "GENERATE CONTENT"}
        </button>
        <button
          type="button"
          className={styles.sampleButton}
          onClick={handleGenerateSample}
          disabled={generateDisabled}
        >
          {isPending
            ? "Spouštím…"
            : active
              ? "Generování probíhá…"
              : "GENERATE SAMPLE"}
        </button>
        {!canGenerate ? (
          <span className={styles.hint}>
            Nastavte počet packages &gt; 0 a vyberte alespoň jednu platformu.
          </span>
        ) : null}
        {error ? <span className={styles.error}>{error}</span> : null}
      </div>

      {/* --- Status / progress --------------------------------------------- */}
      {run ? (
        <RunStatus run={run} active={active} onStop={handleStopRun} stopping={isPending} />
      ) : null}

      <FiverrPromoGeneratePanel
        projectId={projectId}
        productionBusy={active}
        productionStarting={isPending}
        onBusyChange={setPromoBusy}
      />
    </div>
  );
}

function RunStatus({
  run,
  active,
  onStop,
  stopping,
}: {
  run: ProductionRunView;
  active: boolean;
  onStop: () => void;
  stopping: boolean;
}) {
  return (
    <div className={styles.status}>
      <div className={styles.statusHead}>
        <span className={styles.statusBadge} data-status={run.status}>
          {RUN_STATUS_LABEL[run.status]}
        </span>
        <span className={styles.statusTotals}>
          {run.videosCompleted} / {run.videoCount} videí
          {run.totalOutputsRequested > 0
            ? ` · ${run.totalOutputsCompleted} / ${run.totalOutputsRequested} outputs`
            : ""}
          {run.failedTotal > 0 ? ` · ${run.failedTotal} selhalo` : ""}
        </span>
        {active ? (
          <button
            type="button"
            className={styles.stopButton}
            onClick={onStop}
            disabled={stopping}
          >
            {stopping ? "Zastavuji…" : "Zastavit běh"}
          </button>
        ) : null}
      </div>

      {run.status === "cancelled" ? (
        <p className={styles.cancelNote}>
          Běh byl zastaven. Už vygenerované balíčky zůstávají v projektu; můžete
          spustit nový běh.
        </p>
      ) : null}

      {run.errorMessage ? (
        <p className={styles.error}>{run.errorMessage}</p>
      ) : null}

      <ProgressRow
        label="Videos (packages)"
        done={run.videosCompleted}
        failed={run.packagesFailed}
        total={run.videoCount}
        emphasis
      />

      {run.platforms.map((p) => (
        <ProgressRow
          key={p.platform}
          label={`${p.label} (×${p.multiplier})`}
          done={p.completed}
          failed={p.failed}
          total={p.requested}
        />
      ))}
    </div>
  );
}

function ProgressRow({
  label,
  done,
  total,
  failed = 0,
  emphasis = false,
}: {
  label: string;
  done: number;
  total: number;
  failed?: number;
  emphasis?: boolean;
}) {
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  return (
    <div className={styles.progressRow}>
      <div className={styles.progressHead}>
        <span
          className={
            emphasis
              ? `${styles.progressLabel} ${styles.progressLabelStrong}`
              : styles.progressLabel
          }
        >
          {label}
        </span>
        <span className={styles.progressCount}>
          {done} / {total}
          {failed > 0 ? ` (${failed} selhalo)` : ""}
        </span>
      </div>
      <div className={styles.progressTrack}>
        <div className={styles.progressFill} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
