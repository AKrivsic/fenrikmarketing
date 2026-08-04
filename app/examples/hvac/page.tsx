import type { Metadata } from "next";
import { IndustryExamplePage } from "@/components/industry-examples/IndustryExamplePage/IndustryExamplePage";
import { hvacExample } from "@/lib/industry-examples/hvac";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: hvacExample.metadata.title,
  description: hvacExample.metadata.description,
};

export default function HvacExamplesPage() {
  return (
    <div className={styles.page}>
      <IndustryExamplePage data={hvacExample} />
    </div>
  );
}
