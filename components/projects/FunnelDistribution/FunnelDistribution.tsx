import styles from "./FunnelDistribution.module.css";

interface FunnelDistributionProps {
  distribution: Record<string, number>;
}

// Read-only view of strategy_brief.funnel_distribution. Keys are rendered as
// provided (free-form jsonb); only numeric values reach this component.
export function FunnelDistribution({ distribution }: FunnelDistributionProps) {
  const entries = Object.entries(distribution);
  if (entries.length === 0) return null;

  return (
    <div className={styles.field}>
      <span className={styles.label}>Funnel distribution</span>
      <ul className={styles.list}>
        {entries.map(([stage, value]) => (
          <li key={stage} className={styles.row}>
            <span className={styles.stage}>{stage.replace(/_/g, " ")}</span>
            <span className={styles.value}>{value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
