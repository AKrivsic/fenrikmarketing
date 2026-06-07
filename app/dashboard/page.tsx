import { PageHeader } from "@/components/PageHeader/PageHeader";
import { StatGrid } from "@/components/dashboard/StatGrid/StatGrid";
import { QuickLinks } from "@/components/dashboard/QuickLinks/QuickLinks";
import { RecentActivity } from "@/components/dashboard/RecentActivity/RecentActivity";
import { getDashboardSummary } from "@/lib/api/dashboard-admin";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const summary = await getDashboardSummary();

  return (
    <div className={styles.page}>
      <PageHeader title="Dashboard" description="Přehled stavu AI obsahu." />
      <div className={styles.sections}>
        <StatGrid summary={summary} />
        <QuickLinks />
        <RecentActivity entries={summary.recentActivity} />
      </div>
    </div>
  );
}
