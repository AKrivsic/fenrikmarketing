import { ReviewRunCard } from "@/components/review/ReviewRunCard/ReviewRunCard";
import { ProjectContentCard } from "@/components/projects/ProjectContentCard/ProjectContentCard";
import type { ReviewRunGroup } from "@/lib/api/project-review-admin";
import styles from "./ReviewGroupedList.module.css";

interface ReviewGroupedListProps {
  projectId: string;
  groups: ReviewRunGroup[];
}

// Renders the project review tab as Production Run → Package → Content item.
// Reuses ReviewRunCard for the run header and ProjectContentCard (with the
// Step 2 actions) for each item — no card UI is rewritten.
export function ReviewGroupedList({
  projectId,
  groups,
}: ReviewGroupedListProps) {
  if (groups.length === 0) {
    return (
      <div className={styles.empty}>
        <p className={styles.emptyText}>
          Tento projekt zatím nemá žádné production runs.
        </p>
      </div>
    );
  }

  return (
    <div className={styles.groups}>
      {groups.map((group, index) => {
        const key = group.run?.id ?? `no-run-${index}`;
        const packagesWithItems = group.packages.filter(
          (pkg) => pkg.items.length > 0,
        );

        return (
          <section key={key} className={styles.runGroup}>
            {group.run ? (
              <ReviewRunCard run={group.run} />
            ) : (
              <h3 className={styles.noRunTitle}>Bez production runu</h3>
            )}

            {packagesWithItems.length > 0 ? (
              <div className={styles.packages}>
                {packagesWithItems.map((pkg) => (
                  <div
                    key={pkg.packageId ?? "no-package"}
                    className={styles.package}
                  >
                    <header className={styles.packageHeader}>
                      <h4 className={styles.packageTitle}>{pkg.title}</h4>
                      <span className={styles.packageCount}>
                        {pkg.items.length}{" "}
                        {pkg.items.length === 1 ? "položka" : "položek"}
                      </span>
                    </header>
                    <div className={styles.items}>
                      {pkg.items.map((entry) => (
                        <ProjectContentCard
                          key={entry.id}
                          projectId={projectId}
                          entry={entry}
                          showActions
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className={styles.runEmpty}>
                Žádný obsah čekající na review v tomto runu.
              </p>
            )}
          </section>
        );
      })}
    </div>
  );
}
