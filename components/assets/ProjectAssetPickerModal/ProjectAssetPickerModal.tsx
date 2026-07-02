"use client";

import { useEffect, useMemo, useState } from "react";
import type { AssetView } from "@/lib/api/assets-admin";
import {
  ASSET_LIBRARY_SOURCE_LABELS,
  type AssetLibrarySource,
} from "@/lib/assets/assetLibraryPresentation";
import { PRODUCT_ROLE_LABELS, PRODUCT_ROLES } from "@/lib/assets/productRole";
import type { AssetClass } from "@/lib/ai/guardrails";
import styles from "./ProjectAssetPickerModal.module.css";

export type ProjectAssetPickerMode = "single" | "multiple";

interface ProjectAssetPickerModalProps {
  open: boolean;
  assets: AssetView[];
  mode: ProjectAssetPickerMode;
  title: string;
  selectedIds?: string[];
  onClose: () => void;
  onConfirm: (assetIds: string[]) => void;
}

const ASSET_CLASS_OPTIONS: AssetClass[] = ["static", "editable", "reference"];

export function ProjectAssetPickerModal({
  open,
  assets,
  mode,
  title,
  selectedIds = [],
  onClose,
  onConfirm,
}: ProjectAssetPickerModalProps) {
  const [query, setQuery] = useState("");
  const [sourceFilter, setSourceFilter] = useState<AssetLibrarySource | "">("");
  const [roleFilter, setRoleFilter] = useState("");
  const [classFilter, setClassFilter] = useState("");
  const [picked, setPicked] = useState<string[]>(selectedIds);

  useEffect(() => {
    if (open) setPicked(selectedIds);
  }, [open, selectedIds]);

  const imageAssets = useMemo(
    () => assets.filter((a) => a.mediaType === "image" && a.previewUrl),
    [assets],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return imageAssets.filter((asset) => {
      if (sourceFilter && asset.source !== sourceFilter) return false;
      if (roleFilter && asset.productRole !== roleFilter) return false;
      if (classFilter && asset.assetClass !== classFilter) return false;
      if (!q) return true;
      const haystack = [
        asset.title,
        asset.sourceLabel,
        asset.aiDescription ?? "",
        asset.tags.join(" "),
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [imageAssets, query, sourceFilter, roleFilter, classFilter]);

  if (!open) return null;

  function toggleAsset(id: string): void {
    if (mode === "single") {
      setPicked([id]);
      return;
    }
    setPicked((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  function handleConfirm(): void {
    if (picked.length === 0) return;
    onConfirm(mode === "single" ? [picked[0]!] : picked);
    onClose();
  }

  return (
    <div className={styles.backdrop} role="presentation" onClick={onClose}>
      <div
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        <header className={styles.header}>
          <h2 className={styles.title}>{title}</h2>
          <button type="button" className={styles.closeBtn} onClick={onClose}>
            Zavřít
          </button>
        </header>

        <div className={styles.filters}>
          <input
            className={styles.input}
            type="search"
            placeholder="Search assets…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <select
            className={styles.select}
            value={sourceFilter}
            onChange={(e) =>
              setSourceFilter(e.target.value as AssetLibrarySource | "")
            }
          >
            <option value="">All sources</option>
            {(Object.keys(ASSET_LIBRARY_SOURCE_LABELS) as AssetLibrarySource[]).map(
              (key) => (
                <option key={key} value={key}>
                  {ASSET_LIBRARY_SOURCE_LABELS[key]}
                </option>
              ),
            )}
          </select>
          <select
            className={styles.select}
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
          >
            <option value="">All product roles</option>
            {PRODUCT_ROLES.map((role) => (
              <option key={role} value={role}>
                {PRODUCT_ROLE_LABELS[role]}
              </option>
            ))}
          </select>
          <select
            className={styles.select}
            value={classFilter}
            onChange={(e) => setClassFilter(e.target.value)}
          >
            <option value="">All classes</option>
            {ASSET_CLASS_OPTIONS.map((cls) => (
              <option key={cls} value={cls}>
                {cls}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.grid}>
          {filtered.length === 0 ? (
            <p className={styles.empty}>Žádné assety neodpovídají filtru.</p>
          ) : (
            filtered.map((asset) => {
              const selected = picked.includes(asset.id);
              return (
                <button
                  key={asset.id}
                  type="button"
                  className={
                    selected ? `${styles.card} ${styles.cardSelected}` : styles.card
                  }
                  onClick={() => toggleAsset(asset.id)}
                >
                  {asset.previewUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={asset.previewUrl}
                      alt=""
                      className={styles.thumb}
                    />
                  ) : null}
                  <span className={styles.cardTitle}>{asset.title}</span>
                  <span className={styles.cardMeta}>{asset.sourceLabel}</span>
                  {asset.dimensionsLabel ? (
                    <span className={styles.cardDetail}>{asset.dimensionsLabel}</span>
                  ) : null}
                  {asset.captureViewport ? (
                    <span className={styles.cardDetail}>
                      viewport: {asset.captureViewport}
                    </span>
                  ) : null}
                  <span className={styles.cardDetail}>
                    usage: {asset.preferredVideoUsage}
                  </span>
                  {asset.aiDescription ? (
                    <span className={styles.cardDetailMuted}>
                      {asset.aiDescription.length > 120
                        ? `${asset.aiDescription.slice(0, 120)}…`
                        : asset.aiDescription}
                    </span>
                  ) : null}
                </button>
              );
            })
          )}
        </div>

        <footer className={styles.footer}>
          <span className={styles.count}>
            {mode === "multiple"
              ? `${picked.length} selected`
              : picked[0]
                ? "1 selected"
                : "None selected"}
          </span>
          <button
            type="button"
            className={styles.confirmBtn}
            disabled={picked.length === 0}
            onClick={handleConfirm}
          >
            Use selected
          </button>
        </footer>
      </div>
    </div>
  );
}
