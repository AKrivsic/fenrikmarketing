import type { AssetView } from "@/lib/api/assets-admin";
import { PRODUCT_ROLE_LABELS } from "@/lib/assets/productRole";
import styles from "./AssetCard.module.css";

interface AssetCardProps {
  asset: AssetView;
}

const EMPTY = "—";

function formatDate(value: string | null): string {
  return value ? new Date(value).toLocaleDateString() : EMPTY;
}

export function AssetCard({ asset }: AssetCardProps) {
  return (
    <article className={styles.card}>
      <div className={styles.preview}>
        {asset.previewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            className={styles.image}
            src={asset.previewUrl}
            alt={asset.title}
            loading="lazy"
          />
        ) : (
          <div className={styles.fallback}>
            <span className={styles.fallbackType}>
              {asset.mediaType.toUpperCase()}
            </span>
          </div>
        )}
      </div>

      <div className={styles.body}>
        <h3 className={styles.title}>{asset.title}</h3>

        <div className={styles.meta}>
          <span className={styles.metaItem}>{asset.mediaType}</span>
          <span className={styles.metaItem}>{asset.assetClass}</span>
          {asset.trustSignal ? (
            <span className={styles.metaItem}>proof</span>
          ) : null}
          {asset.productRole ? (
            <span className={styles.metaItem}>
              {PRODUCT_ROLE_LABELS[asset.productRole]}
            </span>
          ) : null}
        </div>

        {asset.analysisStatus ? (
          <div className={styles.field}>
            <span className={styles.label}>AI analysis</span>
            <p className={styles.value}>{asset.aiDescription ?? EMPTY}</p>
            {asset.suggestedUsage ? (
              <p className={styles.value}>{asset.suggestedUsage}</p>
            ) : null}
          </div>
        ) : null}

        <div className={styles.field}>
          <span className={styles.label}>Tags</span>
          {asset.tags.length > 0 ? (
            <ul className={styles.tags}>
              {asset.tags.map((tag) => (
                <li key={tag} className={styles.tag}>
                  {tag}
                </li>
              ))}
            </ul>
          ) : (
            <p className={styles.value}>{EMPTY}</p>
          )}
        </div>

        <dl className={styles.stats}>
          <div className={styles.stat}>
            <dt className={styles.statLabel}>Usage</dt>
            <dd className={styles.statValue}>{asset.usageCount}</dd>
          </div>
          <div className={styles.stat}>
            <dt className={styles.statLabel}>Reuse score</dt>
            <dd className={styles.statValue}>{asset.reuseScore.toFixed(2)}</dd>
          </div>
          <div className={styles.stat}>
            <dt className={styles.statLabel}>Last used</dt>
            <dd className={styles.statValue}>{formatDate(asset.lastUsedAt)}</dd>
          </div>
          <div className={styles.stat}>
            <dt className={styles.statLabel}>Created</dt>
            <dd className={styles.statValue}>{formatDate(asset.createdAt)}</dd>
          </div>
        </dl>
      </div>
    </article>
  );
}
