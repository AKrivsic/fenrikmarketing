import type { DashboardSummary } from "@/lib/api/dashboard-admin";
import { StatCard } from "@/components/dashboard/StatCard/StatCard";
import styles from "./StatGrid.module.css";

interface StatGridProps {
  summary: DashboardSummary;
}

export function StatGrid({ summary }: StatGridProps) {
  return (
    <div className={styles.grid}>
      <StatCard label="Projekty" value={summary.projectCount} />
      <StatCard label="Čeká na review" value={summary.pendingReviewCount} />
      <StatCard label="Schváleno" value={summary.approvedCount} />
      <StatCard label="Assety" value={summary.assetCount} />
      <StatCard label="Naplánované publikace" value={summary.scheduledCount} />
    </div>
  );
}
