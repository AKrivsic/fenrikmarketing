import Link from "next/link";
import styles from "./ReviewViewTabs.module.css";

export type ReviewView = "pending" | "approved";

interface ReviewViewTabsProps {
  projectId: string;
  active: ReviewView;
}

// Minimal Pending / Approved switch for the project review tab. Pending shows
// draft + in_review (the active review flow); Approved shows approved items in
// the SAME Run → Package grouping so the user can mark them published with run
// context. Uses a plain query param (?view=approved) so the page stays a server
// component and the grouped structure is reused unchanged.
const VIEWS: { value: ReviewView; label: string; query: string }[] = [
  { value: "pending", label: "Pending", query: "" },
  { value: "approved", label: "Approved", query: "?view=approved" },
];

export function ReviewViewTabs({ projectId, active }: ReviewViewTabsProps) {
  const base = `/projects/${projectId}/review`;
  return (
    <nav className={styles.tabs} aria-label="Review filtr stavu">
      {VIEWS.map((view) => {
        const isActive = view.value === active;
        return (
          <Link
            key={view.value}
            href={`${base}${view.query}`}
            className={isActive ? `${styles.tab} ${styles.active}` : styles.tab}
            aria-current={isActive ? "page" : undefined}
          >
            {view.label}
          </Link>
        );
      })}
    </nav>
  );
}
