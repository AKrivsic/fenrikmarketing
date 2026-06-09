import {
  CONTENT_TYPE_PLATFORM_LABELS,
  WEEKDAY_OPTIONS,
  type GenerationPlan as GenerationPlanModel,
} from "@/lib/projects/contentControls";
import styles from "./GenerationPlan.module.css";

interface GenerationPlanProps {
  plan: GenerationPlanModel;
}

const PLATFORM_LABEL: Record<string, string> = CONTENT_TYPE_PLATFORM_LABELS;

function weekdayLabels(weekdays: number[]): string {
  if (weekdays.length === 0) return "—";
  return weekdays
    .map((d) => WEEKDAY_OPTIONS.find((o) => o.value === d)?.label ?? "")
    .filter(Boolean)
    .join("/");
}

export function GenerationPlan({ plan }: GenerationPlanProps) {
  return (
    <section className={styles.panel}>
      <h2 className={styles.title}>Current Generation Plan</h2>
      <p className={styles.note}>
        <strong>Target</strong> objem na jeden týdenní cyklus — AI se pokusí
        tato čísla naplnit, ale přesný počet není garantován. Generate Content
        Packages může běžet postupně podle strategy items.
      </p>

      <div className={styles.grid}>
        <div className={styles.field}>
          <span className={styles.label}>Total outputs / week (target)</span>
          <span className={styles.big}>{plan.totalOutputs}</span>
        </div>

        <div className={styles.field}>
          <span className={styles.label}>Video outputs / week</span>
          <span className={styles.big}>{plan.videoOutputs}</span>
        </div>

        <div className={styles.field}>
          <span className={styles.label}>Text outputs / week</span>
          <span className={styles.big}>{plan.textOutputs}</span>
        </div>

        <div className={styles.field}>
          <span className={styles.label}>Publishing</span>
          <span className={styles.value}>
            {weekdayLabels(plan.publishingWeekdays)} {plan.publishingTime}
          </span>
        </div>

        <div className={styles.field}>
          <span className={styles.label}>Languages available</span>
          {plan.languagesAvailable.length > 0 ? (
            <ul className={styles.inlineList}>
              {plan.languagesAvailable.map((lang) => (
                <li key={lang} className={styles.tag}>
                  {lang.toUpperCase()}
                </li>
              ))}
            </ul>
          ) : (
            <span className={styles.value}>Pouze primární jazyk</span>
          )}
        </div>
      </div>

      <div className={styles.field}>
        <span className={styles.label}>Per-platform weekly target</span>
        {plan.platformTargets.length > 0 ? (
          <ul className={styles.list}>
            {plan.platformTargets.map((entry) => (
              <li key={entry.platform} className={styles.value}>
                {PLATFORM_LABEL[entry.platform] ?? entry.label}: {entry.target}{" "}
                {entry.contentType === "video" ? "videos" : "text posts"}
              </li>
            ))}
          </ul>
        ) : (
          <span className={styles.value}>
            Žádná aktivní platforma s targetem &gt; 0.
          </span>
        )}
      </div>
    </section>
  );
}
