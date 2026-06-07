import type { ProjectWeeklyStrategy } from "@/lib/api/projects-admin";
import { FunnelDistribution } from "@/components/projects/FunnelDistribution/FunnelDistribution";
import { StrategyItemList } from "@/components/projects/StrategyItemList/StrategyItemList";
import styles from "./WeeklyStrategyPanel.module.css";

interface WeeklyStrategyPanelProps {
  strategy: ProjectWeeklyStrategy | null;
}

function formatDate(value: string | null): string | null {
  if (!value) return null;
  return new Date(value).toLocaleDateString();
}

function formatPeriod(start: string | null, end: string | null): string | null {
  const startLabel = formatDate(start);
  const endLabel = formatDate(end);
  if (startLabel && endLabel) return `${startLabel} – ${endLabel}`;
  return startLabel ?? endLabel;
}

export function WeeklyStrategyPanel({ strategy }: WeeklyStrategyPanelProps) {
  if (!strategy) {
    return (
      <div className={styles.empty}>
        <p className={styles.emptyText}>
          Tento projekt zatím nemá žádnou týdenní strategii.
        </p>
      </div>
    );
  }

  const period = formatPeriod(strategy.periodStart, strategy.periodEnd);
  const createdAt = formatDate(strategy.createdAt);

  return (
    <article className={styles.panel}>
      <header className={styles.header}>
        <h2 className={styles.title}>{strategy.name}</h2>
        <div className={styles.meta}>
          <span className={styles.metaItem}>Cíl: {strategy.objective}</span>
          {period ? (
            <span className={styles.metaItem}>Období: {period}</span>
          ) : null}
          {createdAt ? (
            <span className={styles.metaItem}>Vytvořeno: {createdAt}</span>
          ) : null}
        </div>
      </header>

      {strategy.theme ? (
        <div className={styles.field}>
          <span className={styles.label}>Téma</span>
          <p className={styles.value}>{strategy.theme}</p>
        </div>
      ) : null}

      {strategy.funnelDistribution ? (
        <FunnelDistribution distribution={strategy.funnelDistribution} />
      ) : null}

      <div className={styles.field}>
        <span className={styles.label}>Položky strategie</span>
        <StrategyItemList items={strategy.items} />
      </div>
    </article>
  );
}
