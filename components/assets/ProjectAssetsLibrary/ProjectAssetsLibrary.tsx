"use client";

import { useMemo, useState } from "react";
import { AssetGrid } from "@/components/assets/AssetGrid/AssetGrid";
import { AssetPreviewModal } from "@/components/assets/AssetPreviewModal/AssetPreviewModal";
import type { AssetView } from "@/lib/api/assets-admin";
import {
  ASSET_LIBRARY_SOURCE_LABELS,
  countAssetsBySource,
  type AssetLibrarySource,
} from "@/lib/assets/assetLibraryPresentation";
import { PRODUCT_ROLE_LABELS, PRODUCT_ROLES } from "@/lib/assets/productRole";
import type { AssetClass } from "@/lib/ai/guardrails";
import styles from "./ProjectAssetsLibrary.module.css";

type SortOrder = "newest" | "oldest";

interface ProjectAssetsLibraryProps {
  projectId: string;
  assets: AssetView[];
  emptyText?: string;
}

const ASSET_CLASS_OPTIONS: AssetClass[] = ["static", "editable", "reference"];

export function ProjectAssetsLibrary({
  projectId,
  assets,
  emptyText,
}: ProjectAssetsLibraryProps) {
  const [query, setQuery] = useState("");
  const [sourceFilter, setSourceFilter] = useState<AssetLibrarySource | "">("");
  const [roleFilter, setRoleFilter] = useState("");
  const [classFilter, setClassFilter] = useState("");
  const [sortOrder, setSortOrder] = useState<SortOrder>("newest");
  const [previewAsset, setPreviewAsset] = useState<AssetView | null>(null);

  const counts = useMemo(
    () => countAssetsBySource(assets.map((a) => ({ source: a.source }))),
    [assets],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = assets.filter((asset) => {
      if (sourceFilter && asset.source !== sourceFilter) return false;
      if (roleFilter && asset.productRole !== roleFilter) return false;
      if (classFilter && asset.assetClass !== classFilter) return false;
      if (!q) return true;
      const haystack = [
        asset.title,
        asset.sourceLabel,
        asset.aiDescription ?? "",
        asset.tags.join(" "),
        asset.preferredVideoUsage,
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
    list = [...list].sort((a, b) => {
      const ta = new Date(a.createdAt).getTime();
      const tb = new Date(b.createdAt).getTime();
      return sortOrder === "newest" ? tb - ta : ta - tb;
    });
    return list;
  }, [assets, query, sourceFilter, roleFilter, classFilter, sortOrder]);

  return (
    <div className={styles.wrap}>
      <div className={styles.counters}>
        <Counter label="Total" value={counts.total} />
        <Counter label="Website" value={counts.websiteIngestion} />
        <Counter label="Capture" value={counts.componentCapture} />
        <Counter label="Manual" value={counts.manualUpload} />
      </div>

      <div className={styles.toolbar}>
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
        <select
          className={styles.select}
          value={sortOrder}
          onChange={(e) => setSortOrder(e.target.value as SortOrder)}
        >
          <option value="newest">Newest</option>
          <option value="oldest">Oldest</option>
        </select>
      </div>

      <AssetGrid
        projectId={projectId}
        assets={filtered}
        emptyText={emptyText}
        onPreview={setPreviewAsset}
      />

      <AssetPreviewModal
        asset={previewAsset}
        onClose={() => setPreviewAsset(null)}
      />
    </div>
  );
}

function Counter({ label, value }: { label: string; value: number }) {
  return (
    <div className={styles.counter}>
      <span className={styles.counterValue}>{value}</span>
      <span className={styles.counterLabel}>{label}</span>
    </div>
  );
}
