"use client";

import { useCallback, useEffect, useState } from "react";
import type { AssetView } from "@/lib/api/assets-admin";
import { PRODUCT_ROLE_LABELS } from "@/lib/assets/productRole";
import styles from "./AssetPreviewModal.module.css";

interface AssetPreviewModalProps {
  asset: AssetView | null;
  onClose: () => void;
}

export function AssetPreviewModal({ asset, onClose }: AssetPreviewModalProps) {
  const [zoom, setZoom] = useState(1);

  useEffect(() => {
    setZoom(1);
  }, [asset?.id]);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    },
    [onClose],
  );

  useEffect(() => {
    if (!asset) return;
    document.addEventListener("keydown", handleKeyDown);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = prev;
    };
  }, [asset, handleKeyDown]);

  if (!asset) return null;

  const originalUrl = asset.previewUrl;
  const roleLabel = asset.productRole
    ? PRODUCT_ROLE_LABELS[asset.productRole]
    : "—";

  return (
    <div
      className={styles.backdrop}
      role="presentation"
      onClick={onClose}
    >
      <div
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="asset-preview-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className={styles.header}>
          <h2 id="asset-preview-title" className={styles.title}>
            {asset.title}
          </h2>
          <button type="button" className={styles.closeBtn} onClick={onClose}>
            Zavřít
          </button>
        </header>

        <div className={styles.imagePanel}>
          {originalUrl ? (
            <div className={styles.imageScroll}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={originalUrl}
                alt={asset.title}
                className={styles.image}
                style={{ transform: `scale(${zoom})` }}
              />
            </div>
          ) : (
            <p className={styles.noPreview}>Náhled není k dispozici.</p>
          )}
          <label className={styles.zoomLabel}>
            Zoom
            <input
              type="range"
              min={0.5}
              max={2}
              step={0.05}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
            />
          </label>
        </div>

        <div className={styles.metaGrid}>
          <MetaRow label="Rozměry" value={asset.dimensionsLabel ?? "—"} />
          <MetaRow label="Asset class" value={asset.assetClass} />
          <MetaRow label="Product role" value={roleLabel} />
          <MetaRow label="Source" value={asset.sourceLabel} />
          <MetaRow label="Capture viewport" value={asset.captureViewport ?? "—"} />
          <MetaRow label="Preferred video usage" value={asset.preferredVideoUsage} />
          <MetaRow label="Created" value={formatDate(asset.createdAt)} />
          <MetaRow
            label="AI status"
            value={asset.analysisStatus ?? "—"}
          />
        </div>

        {asset.analysisStatus ? (
          <div className={styles.analysis}>
            <h3 className={styles.sectionTitle}>AI analysis</h3>
            <p>{asset.aiDescription ?? "—"}</p>
            {asset.suggestedUsage ? (
              <p className={styles.muted}>{asset.suggestedUsage}</p>
            ) : null}
          </div>
        ) : null}

        {asset.tags.length > 0 ? (
          <div className={styles.tags}>
            <span className={styles.tagsLabel}>Tags</span>
            <ul className={styles.tagList}>
              {asset.tags.map((tag) => (
                <li key={tag}>{tag}</li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className={styles.actions}>
          {originalUrl ? (
            <>
              <a className={styles.primaryLink} href={originalUrl} download>
                Download original
              </a>
              <a
                className={styles.secondaryLink}
                href={originalUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                Open original
              </a>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div className={styles.metaRow}>
      <dt className={styles.metaLabel}>{label}</dt>
      <dd className={styles.metaValue}>{value}</dd>
    </div>
  );
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString("cs-CZ");
  } catch {
    return iso;
  }
}
