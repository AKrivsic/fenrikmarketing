import { PageHeader } from "@/components/PageHeader/PageHeader";
import { HistoryList } from "@/components/history/HistoryList/HistoryList";
import { listHistoryEntries } from "@/lib/api/history-admin";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";

export default async function HistoryPage() {
  const entries = await listHistoryEntries();

  return (
    <div className={styles.page}>
      <PageHeader title="History" description="Historie změn obsahu." />
      <HistoryList entries={entries} />
    </div>
  );
}
