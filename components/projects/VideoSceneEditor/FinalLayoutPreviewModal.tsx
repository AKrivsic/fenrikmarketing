"use client";

import { useEffect } from "react";
import type { FinalLayoutPreviewPayload } from "@/app/projects/[id]/videos/actions";
import styles from "./FinalLayoutPreviewModal.module.css";

interface FinalLayoutPreviewModalProps {
  open: boolean;
  payload: FinalLayoutPreviewPayload | null;
  loading: boolean;
  error: string | null;
  onClose: () => void;
}

export function FinalLayoutPreviewModal({
  open,
  payload,
  loading,
  error,
  onClose,
}: FinalLayoutPreviewModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const info = payload?.info;

  return (
    <div
      className={styles.backdrop}
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className={styles.panel} role="dialog" aria-modal="true" aria-labelledby="final-layout-title">
        <header className={styles.header}>
          <h3 id="final-layout-title" className={styles.title}>
            Preview Final Layout
          </h3>
          <button type="button" className={styles.closeBtn} onClick={onClose}>
            Zavřít
          </button>
        </header>

        {loading ? <p className={styles.status}>Generuji náhled…</p> : null}
        {error ? <p className={styles.error}>{error}</p> : null}

        {payload ? (
          <div className={styles.body}>
            <div className={styles.previewColumn}>
              <img
                className={styles.previewImage}
                src={`data:image/png;base64,${payload.pngBase64}`}
                alt="Final layout preview 1080×1920"
              />
              <p className={styles.meta}>
                {payload.elapsedMs} ms · 1080×1920 PNG (stejný compositor jako video)
              </p>
            </div>
            {info ? (
              <dl className={styles.infoPanel}>
                <div className={styles.infoRow}>
                  <dt>Presentation</dt>
                  <dd>{info.presentationLabel}</dd>
                </div>
                <div className={styles.infoRow}>
                  <dt>Effective UI area</dt>
                  <dd>
                    {info.effectiveUiAreaPercent !== null
                      ? `${info.effectiveUiAreaPercent}%`
                      : "—"}
                  </dd>
                </div>
                <div className={styles.infoRow}>
                  <dt>Motion</dt>
                  <dd>{info.motionLabel}</dd>
                </div>
                <div className={styles.infoRow}>
                  <dt>Background</dt>
                  <dd>{info.backgroundLabel}</dd>
                </div>
                <div className={styles.infoRow}>
                  <dt>Device frame detected</dt>
                  <dd>{info.deviceFrameDetected ? "Yes" : "No"}</dd>
                </div>
                <div className={styles.infoRow}>
                  <dt>Double framing prevented</dt>
                  <dd>{info.doubleFramingPrevented ? "Yes" : "No"}</dd>
                </div>
                {info.guardNote ? (
                  <p className={styles.guardNote}>{info.guardNote}</p>
                ) : null}
              </dl>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
