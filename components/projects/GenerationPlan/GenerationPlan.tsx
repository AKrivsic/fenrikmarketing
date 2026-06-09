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
  const videosLabel =
    plan.expectedVideos === 0
      ? "0 (text-only — no video)"
      : plan.videosMode === "every_package"
        ? `${plan.expectedVideos} (one per package)`
        : `${plan.expectedVideos}`;

  return (
    <section className={styles.panel}>
      <h2 className={styles.title}>Current Generation Plan</h2>
      <p className={styles.note}>
        Realistický odhad pro jeden týdenní cyklus. Skutečný počet závisí na
        výstupu AI.
      </p>

      <div className={styles.grid}>
        <div className={styles.field}>
          <span className={styles.label}>Platforms</span>
          <ul className={styles.list}>
            {plan.packagePlatforms.map((platform) => (
              <li key={platform} className={styles.value}>
                {PLATFORM_LABEL[platform] ?? platform}
              </li>
            ))}
          </ul>
        </div>

        <div className={styles.field}>
          <span className={styles.label}>Posts per week</span>
          <span className={styles.big}>{plan.postsPerWeek}</span>
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
        <span className={styles.label}>Expected output</span>
        <ul className={styles.list}>
          <li className={styles.value}>
            {plan.expectedPackages} content packages
          </li>
          {plan.perPlatformOutputs.map((output) => (
            <li key={output.platform} className={styles.value}>
              {output.count} {PLATFORM_LABEL[output.platform] ?? output.platform}{" "}
              outputs
              <span className={styles.contentType}>
                {output.contentType === "video" ? "video" : "text"}
              </span>
            </li>
          ))}
          <li className={styles.value}>{videosLabel} videos</li>
        </ul>
      </div>
    </section>
  );
}
