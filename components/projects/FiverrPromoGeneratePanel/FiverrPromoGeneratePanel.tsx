"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import {
  generateFiverrPromoPackage,
  pollFiverrPromoVideoJob,
} from "@/app/projects/[id]/production/actions";
import type { FiverrPromoGenerationResult } from "@/lib/internal/fiverrPromoPackage";
import styles from "./FiverrPromoGeneratePanel.module.css";

const POLL_INTERVAL_MS = 3000;

const VIDEO_STATUS_LABEL: Record<string, string> = {
  queued: "Video ve frontě",
  processing: "Render probíhá",
  completed: "Video hotovo",
  failed: "Render selhal",
};

function isVideoJobActive(status: string | null): boolean {
  return status === "queued" || status === "processing";
}

interface FiverrPromoGeneratePanelProps {
  projectId: string;
  /** True while the main production run is queued/running — blocks promo. */
  productionBusy: boolean;
  /** True while GENERATE CONTENT / SAMPLE is starting — blocks promo. */
  productionStarting: boolean;
  onBusyChange?: (busy: boolean) => void;
}

export function FiverrPromoGeneratePanel({
  projectId,
  productionBusy,
  productionStarting,
  onBusyChange,
}: FiverrPromoGeneratePanelProps) {
  const router = useRouter();
  const [isPromoPending, startPromoTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [success, setSuccess] = useState<FiverrPromoGenerationResult | null>(
    null,
  );
  const [videoStatus, setVideoStatus] = useState<string | null>(null);
  const [mp4Url, setMp4Url] = useState<string | null>(null);
  const videoJobIdRef = useRef<string | null>(null);

  const promoBusy = isPromoPending || isVideoJobActive(videoStatus);
  const disabled = productionBusy || productionStarting || promoBusy;

  useEffect(() => {
    onBusyChange?.(promoBusy);
  }, [promoBusy, onBusyChange]);

  useEffect(() => {
    const jobId = videoJobIdRef.current;
    if (!jobId || !isVideoJobActive(videoStatus)) return;

    let cancelled = false;
    const timer = setInterval(async () => {
      const next = await pollFiverrPromoVideoJob(projectId, jobId);
      if (cancelled || !next) return;
      setVideoStatus(next.status);
      setMp4Url(next.mp4Url);
    }, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [projectId, videoStatus]);

  const handleGenerate = useCallback(() => {
    setError(null);
    setWarning(null);
    setSuccess(null);
    setVideoStatus(null);
    setMp4Url(null);
    videoJobIdRef.current = null;

    startPromoTransition(async () => {
      const result = await generateFiverrPromoPackage(projectId);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setSuccess(result.data);
      setVideoStatus(result.data.videoJobStatus);
      setMp4Url(result.data.mp4Url);
      videoJobIdRef.current = result.data.videoJobId;
      if (result.data.videoDispatchWarning) {
        setWarning(result.data.videoDispatchWarning);
      }
      router.refresh();
    });
  }, [projectId, router]);

  const openReview = useCallback(() => {
    if (!success) return;
    router.push(success.paths.projectReview);
  }, [router, success]);

  const buttonLabel = isPromoPending
    ? "Generuji Fiverr promo…"
    : isVideoJobActive(videoStatus)
      ? "Render probíhá…"
      : "Generate Fiverr Promo";

  return (
    <section className={styles.section}>
      <h3 className={styles.title}>Fiverr gig promo (interní)</h3>
      <p className={styles.note}>
        Vytvoří nový content package s titulkem „Fiverr Gig Promo Video“ (tiktok
        reel, conversion, EN). Každé kliknutí = nová varianta. AI generování běží
        synchronně (~2–3 min); poté se spustí render videa, pokud je worker
        nakonfigurován.
      </p>

      <div className={styles.actions}>
        <button
          type="button"
          className={styles.promoButton}
          onClick={handleGenerate}
          disabled={disabled}
        >
          {buttonLabel}
        </button>
        {productionBusy ? (
          <span className={styles.hint}>
            Počkejte na dokončení production běhu.
          </span>
        ) : null}
        {error ? <span className={styles.error}>{error}</span> : null}
        {warning ? <span className={styles.hint}>{warning}</span> : null}
      </div>

      {success ? (
        <div className={styles.result}>
          <p className={styles.success}>
            Balíček vytvořen — status: {success.packageStatus}
            {success.funnelStage ? ` · funnel: ${success.funnelStage}` : ""}
          </p>
          <dl className={styles.meta}>
            <div>
              <dt>package_id</dt>
              <dd>{success.packageId}</dd>
            </div>
            <div>
              <dt>strategy_item_id</dt>
              <dd>{success.strategyItemId}</dd>
            </div>
            {success.videoJobId ? (
              <div>
                <dt>video_job_id</dt>
                <dd>{success.videoJobId}</dd>
              </div>
            ) : null}
            {videoStatus ? (
              <div>
                <dt>render</dt>
                <dd>
                  {VIDEO_STATUS_LABEL[videoStatus] ?? videoStatus}
                  {mp4Url ? (
                    <>
                      {" "}
                      ·{" "}
                      <a href={mp4Url} className={styles.link}>
                        MP4
                      </a>
                    </>
                  ) : null}
                </dd>
              </div>
            ) : null}
          </dl>
          <div className={styles.links}>
            <button type="button" className={styles.linkButton} onClick={openReview}>
              Otevřít Review
            </button>
            <Link
              href={success.paths.contentPackagesTab}
              className={styles.textLink}
            >
              Content packages
            </Link>
          </div>
        </div>
      ) : null}
    </section>
  );
}
