"use client";

import dynamic from "next/dynamic";
import type { ReviewRunGroup } from "@/lib/api/project-review-admin";
import styles from "./ReviewGroupedListClient.module.css";

const ReviewGroupedList = dynamic(
  () =>
    import("../ReviewGroupedList/ReviewGroupedList").then(
      (mod) => mod.ReviewGroupedList,
    ),
  {
    ssr: false,
    loading: () => (
      <p className={styles.loading}>Načítání review workspace…</p>
    ),
  },
);

interface ReviewGroupedListClientProps {
  projectId: string;
  groups: ReviewRunGroup[];
}

export function ReviewGroupedListClient({
  projectId,
  groups,
}: ReviewGroupedListClientProps) {
  return <ReviewGroupedList projectId={projectId} groups={groups} />;
}
