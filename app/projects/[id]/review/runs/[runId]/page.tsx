import Link from "next/link";
import { notFound } from "next/navigation";
import { ReviewGroupedListClient } from "@/components/review/ReviewGroupedListClient/ReviewGroupedListClient";
import { listProjectReviewGroupForRun } from "@/lib/api/project-review-admin";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";

export const maxDuration = 300;

interface ReviewRunPageProps {
  params: Promise<{ id: string; runId: string }>;
}

// Dedicated single-run review workspace. Loads every package for one production
// run (no overview budget), so older runs stay fully inspectable without
// bloating the multi-run Review tab.
export default async function ReviewRunPage({ params }: ReviewRunPageProps) {
  const { id, runId } = await params;
  const group = await listProjectReviewGroupForRun(id, runId);
  if (!group) notFound();

  return (
    <div className={styles.page}>
      <div className={styles.toolbar}>
        <Link href={`/projects/${id}/review`} className={styles.back}>
          ← Zpět na Review
        </Link>
        <p className={styles.hint}>
          Samostatný run — všechny packages a stejné review akce jako na
          přehledu.
        </p>
      </div>
      <ReviewGroupedListClient projectId={id} groups={[group]} />
    </div>
  );
}
